"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LuTicket } from "react-icons/lu";
import { FiCheck } from "react-icons/fi";
import {
  cancelPass,
  getPassForEvent,
  purchasePass,
  type OccurrenceAvailability,
} from "~/lib/api";
import { formatIST } from "~/lib/datetime";
import { useIdToken } from "~/hooks/useIdToken";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import {
  useCreateTopupOrder,
  usePlatformSetting,
  useVerifyTopupPayment,
  useWalletBalance,
} from "~/hooks/useApi";

// Razorpay types (mirror TopUpModal — no shared loader in this repo). The
// Window augmentation lives in TopUpModal; read it through a cast so this file
// does not re-declare a conflicting global.
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}
interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

function getRazorpay():
  | (new (options: RazorpayOptions) => RazorpayInstance)
  | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window as unknown as {
      Razorpay?: new (o: RazorpayOptions) => RazorpayInstance;
    }
  ).Razorpay;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const rupees = (cents: number) => `₹${(cents / 100).toLocaleString("en-IN")}`;

/**
 * The monthly-pass half of the price area: buy a balance of sessions once, then
 * pick any session and choose "Use my pass" at checkout. Only rendered for
 * events whose host switched a pass on.
 */
export default function MonthlyPassCard({
  eventId,
  priceCents,
  sessionLimit,
  singleSessionPriceCents,
  availability,
  onRequireLogin,
  privateAccess = null,
}: {
  eventId: string;
  priceCents: number;
  sessionLimit: number | null;
  singleSessionPriceCents: number | null;
  availability?: OccurrenceAvailability[];
  onRequireLogin: () => void;
  /** null = public. A private experience gates the pass like a booking. */
  privateAccess?: "passkey" | "rsvp" | null;
}) {
  const idToken = useIdToken();
  const { userId } = useStoredAuth();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [paying, setPaying] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const needsCode = privateAccess === "passkey";

  const { data: wallet, refetch: refetchWallet } = useWalletBalance(userId);
  const createOrder = useCreateTopupOrder();
  const verifyPayment = useVerifyTopupPayment();
  const walletBalance = wallet?.balance_cents ?? 0;

  // Guest booking fee, charged on a pass exactly as on a ticket (flat, or a
  // floored percentage of the price; 0 = off). Must match the server, or the
  // card top-up below comes up short and the purchase fails.
  const { data: bookingFee, isSuccess: feeReady } = usePlatformSetting<{
    type?: "flat" | "percentage";
    amount_cents?: number;
    percentage?: number;
  }>("booking_fee");
  const feeCents =
    priceCents <= 0
      ? 0
      : bookingFee?.type === "percentage"
        ? Math.floor((priceCents * (bookingFee.percentage ?? 0)) / 100)
        : Math.max(0, bookingFee?.amount_cents ?? 0);
  /** What the guest actually pays for the pass: price + platform fee (GST included). */
  const payCents = priceCents + feeCents;

  // Razorpay's checkout script, loaded the same way the booking page does it.
  useEffect(() => {
    if (!document.getElementById("razorpay-script")) {
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const { data } = useQuery({
    queryKey: ["pass", eventId, idToken],
    queryFn: () => getPassForEvent(eventId, idToken!),
    enabled: !!idToken,
  });
  const pass = data?.data?.pass ?? null;
  const passesLeft = data?.data?.passes_left ?? null;

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["pass", eventId] });

  const buy = useMutation({
    mutationFn: () =>
      purchasePass(
        eventId,
        idToken!,
        undefined,
        needsCode ? accessCode : undefined,
      ),
    onSuccess: async () => {
      setConfirming(false);
      toast.success("Pass active — pick a session and use it at checkout");
      await refresh();
      // The pass moved wallet money; the cached balance is now wrong.
      await refetchWallet();
    },
    onError: (e: Error) => {
      setConfirming(false);
      toast.error(e.message);
    },
  });

  const refund = useMutation({
    mutationFn: () => cancelPass(pass!.id, idToken!),
    onSuccess: async () => {
      toast.success("Pass cancelled — refunded to your wallet");
      await refresh();
      // The pass moved wallet money; the cached balance is now wrong.
      await refetchWallet();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /**
   * Waits for the wallet credit to land after a verified top-up. The webhook and
   * the verify call race, so the balance can lag the payment by a beat.
   */
  const waitForBalance = async (needCents: number, knownCents: number) => {
    if (knownCents >= needCents) return;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await wait(800);
      const refreshed = await refetchWallet();
      if ((refreshed.data?.balance_cents ?? 0) >= needCents) return;
    }
    throw new Error("wallet did not refresh in time");
  };

  /**
   * Tops the wallet up by exactly what is missing, through Razorpay, then buys
   * the pass. The pass purchase itself is always a wallet debit — this only
   * funds the wallet first, which is the same two-step the booking page uses.
   */
  const payShortfallThenBuy = async (shortfallCents: number) => {
    const Razorpay = getRazorpay();
    if (!Razorpay || !userId) {
      toast.error("Payment is still loading. Please try again in a moment.");
      return;
    }

    setPaying(true);
    try {
      const orderRes = await createOrder.mutateAsync({
        user_id: userId,
        amount_cents: shortfallCents,
        idempotency_key: crypto.randomUUID(),
      });
      const order = orderRes.data;
      let paid = false;

      const checkout = new Razorpay({
        key: order.key_id,
        amount: order.amount_cents,
        currency: order.currency ?? "INR",
        name: "MySlotMate",
        description: "Monthly Pass",
        order_id: order.order_id,
        handler: (response: RazorpayResponse) => {
          paid = true;
          void (async () => {
            try {
              const verified = await verifyPayment.mutateAsync({
                user_id: userId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              await waitForBalance(payCents, verified.data.balance_cents ?? 0);
              await buy.mutateAsync();
            } catch {
              toast.error(
                "Payment went through, but the pass could not be issued yet. Your money is in your wallet — try Get Pass again in a moment.",
              );
            }
            setPaying(false);
          })();
        },
        theme: { color: "#A020F0" },
        modal: {
          ondismiss: () => {
            if (!paid) setPaying(false);
          },
        },
      });
      checkout.open();
    } catch {
      toast.error("Could not start the payment. Please try again.");
      setPaying(false);
    }
  };

  /** Wallet first; Razorpay only for whatever the wallet cannot cover. */
  const handleConfirm = async () => {
    const fresh = await refetchWallet();
    const balance = fresh.data?.balance_cents ?? walletBalance;
    if (balance < payCents) {
      await payShortfallThenBuy(payCents - balance);
      return;
    }
    await buy.mutateAsync().catch(() => undefined); // onError already toasts
  };

  // How many sessions the pass would actually cover: the experience's own
  // occurrences inside the 30-day window, not the window itself. An experience
  // that only runs three more times covers three sessions, however long the
  // pass is valid — saying "all sessions for 30 days" there oversells it.
  const windowEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const sessionsInWindow = (availability ?? []).filter((a) => {
    const at = new Date(a.date);
    return !a.is_paused && at > new Date() && at <= windowEnd;
  }).length;

  // What the guest is buying, in the plainest words the data supports.
  // Availability still loading: don't claim there is nothing to cover.
  const sessionsKnown = availability !== undefined;
  const noSessions = sessionsKnown && sessionsInWindow === 0;

  const coverage =
    sessionLimit != null
      ? `${sessionLimit} ${sessionLimit === 1 ? "session" : "sessions"} to use within 30 days`
      : !sessionsKnown
        ? "All sessions"
        : sessionsInWindow === 0
          ? "No sessions scheduled"
          : sessionsInWindow === 1
            ? "Covers 1 session"
            : `Covers all ${sessionsInWindow} sessions`;

  // Savings against paying per session, measured on what is actually covered.
  // Shown only when it genuinely is a saving.
  const coveredForValue = sessionLimit ?? sessionsInWindow;
  const savingPct =
    singleSessionPriceCents && coveredForValue > 0
      ? Math.round(
          (1 - priceCents / (singleSessionPriceCents * coveredForValue)) * 100,
        )
      : null;

  // Buying books every covered session, so "unused" can no longer mean zero
  // sessions used. The refund offer follows the 48-hour window instead; the
  // server still refuses once a covered session has started.
  const canRefund =
    !!pass &&
    Date.now() - new Date(pass.created_at).getTime() <= 48 * 60 * 60 * 1000;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#121426] via-[#080914] to-[#080914] p-5 shadow-[0_24px_60px_rgba(58,119,172,0.12)]">
      <div className="mb-3 flex items-start gap-2.5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#121426] shadow-[0_8px_20px_rgba(31,167,255,0.18)]">
          <LuTicket className="h-4 w-4 -rotate-12 text-[#D8B4FE]" />
        </div>
        <div className="flex-1">
          <h3 className="font-outfit text-lg leading-none font-extrabold tracking-tight text-white">
            Monthly Pass
          </h3>
          <p className="mt-1 text-[11px] text-[#5f7e9a]">
            One payment, a month of sessions
          </p>
        </div>
      </div>

      {pass ? (
        <>
          <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-white">
            <FiCheck className="h-4 w-4 text-green-300" />
            Active until {formatIST(pass.valid_until, "d MMM")}
          </p>
          <p className="mb-4 text-sm text-[#5f7e9a]">
            {pass.sessions_included != null
              ? `${Math.max(0, pass.sessions_included - pass.sessions_used)} of ${pass.sessions_included} sessions left. `
              : "Unlimited sessions. "}
            Pick a session above and choose &ldquo;Use my pass&rdquo; at
            checkout.
          </p>

          <Link
            href="/activities"
            className="block w-full rounded-2xl bg-gradient-to-r from-[#A020F0] to-[#A020F0] py-2.5 text-center text-sm font-semibold text-white shadow-[0_16px_32px_rgba(31,167,255,0.32)] transition hover:shadow-[0_20px_40px_rgba(31,167,255,0.4)]"
          >
            View my tickets
          </Link>

          {canRefund && (
            <button
              type="button"
              disabled={refund.isPending}
              onClick={() => refund.mutate()}
              className="mt-2 w-full text-xs text-[#5f7e9a] underline disabled:opacity-50"
            >
              Cancel pass and refund
            </button>
          )}
        </>
      ) : (
        <>
          <p className="font-outfit mb-1 text-2xl leading-none font-extrabold text-white">
            {rupees(priceCents)}
          </p>
          {feeCents > 0 && (
            <p className="mb-1 text-xs text-[#5f7e9a]">
              + {rupees(feeCents)} platform fee (incl. GST)
            </p>
          )}
          <p className="mb-4 text-sm text-[#5f7e9a]">
            {coverage}
            {savingPct && savingPct > 0 ? ` · save ${savingPct}%` : ""}
          </p>
          {passesLeft !== null && passesLeft <= 5 && (
            <p className="mb-3 text-xs font-medium text-orange-300">
              Only {passesLeft} {passesLeft === 1 ? "pass" : "passes"} left
            </p>
          )}

          {confirming ? (
            <div className="rounded-2xl border border-white/10 bg-[#121426] p-3">
              <p className="mb-3 text-sm text-[#5f7e9a]">
                {feeCents > 0 &&
                  `${rupees(priceCents)} + ${rupees(feeCents)} platform fee (incl. GST) = ${rupees(payCents)}. `}
                {walletBalance >= payCents
                  ? `${rupees(payCents)} comes out of your wallet now.`
                  : `Your wallet has ${rupees(walletBalance)}, so the remaining ${rupees(payCents - walletBalance)} is paid by card or UPI and topped into your wallet first.`}{" "}
                You can cancel for a full refund within 48 hours, before using a
                session.
              </p>
              {needsCode && (
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Access code from the host"
                  aria-label="Access code"
                  autoComplete="off"
                  className="mb-3 w-full rounded-xl border border-white/10 bg-[#080914] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-[#A020F0] focus:outline-none"
                />
              )}
              {privateAccess === "rsvp" && (
                <p className="mb-3 text-xs text-amber-200/90">
                  Only guests the host has approved can buy a pass for this
                  experience.
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={
                    buy.isPending ||
                    paying ||
                    !feeReady ||
                    (needsCode && !accessCode.trim())
                  }
                  onClick={() => void handleConfirm()}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-[#A020F0] to-[#A020F0] py-2.5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(31,167,255,0.32)] transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {paying
                    ? "Paying…"
                    : buy.isPending
                      ? "Buying…"
                      : walletBalance >= payCents
                        ? "Confirm"
                        : "Pay & get pass"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-2xl border border-white/10 bg-[#121426] px-4 py-2.5 text-sm font-medium text-white"
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={passesLeft === 0 || noSessions}
              onClick={() => {
                if (!idToken) {
                  onRequireLogin();
                  return;
                }
                setConfirming(true);
              }}
              className="w-full rounded-2xl bg-gradient-to-r from-[#A020F0] to-[#A020F0] py-2.5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(31,167,255,0.32)] transition hover:shadow-[0_20px_40px_rgba(31,167,255,0.4)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {passesLeft === 0
                ? "Passes sold out"
                : noSessions
                  ? "No sessions to cover"
                  : "Get Pass"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
