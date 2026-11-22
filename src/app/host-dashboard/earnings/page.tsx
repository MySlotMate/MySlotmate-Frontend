"use client";

import { useHostTier } from "~/hooks/useHostTier";
import { StartEarning } from "~/components/host-dashboard/VerifyToEarn";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { useEffect, useMemo, useState } from "react";
import { env } from "~/env";
import {
  PayoutBreakdownList,
  TaxDetailsCard,
  TaxProfileForm,
  needsTaxProfile,
} from "~/components/host-dashboard/TaxDetails";
import PayoutScheduleCard from "~/components/host-dashboard/PayoutScheduleCard";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import { SharedEventsCard } from "~/components/host-dashboard";
import {
  useEarnings,
  useEventsByHost,
  useHostTaxProfile,
  useInfiniteHostSales,
  usePayoutHistory,
  usePayoutMethods,
} from "~/hooks/useApi";
import type { HostSaleDTO } from "~/lib/api";
import { format } from "date-fns";
import {
  FiCreditCard,
  FiClock,
  FiCheck,
  FiSearch,
  FiTrash2,
  FiX,
  FiAlertCircle,
  FiChevronDown,
} from "react-icons/fi";
import { LuWallet, LuBuilding2 } from "react-icons/lu";

// ─── Types ────────────────────────────────────────────────────────────────────
type PayoutMethodType = "bank" | "upi";

// Payout method types a host is allowed to ADD. UPI is disabled because UPI
// payouts are not enabled on the Cashfree account (transfers get Rejected with an
// "account configuration" error) — re-add "upi" here once Cashfree enables it.
const ENABLED_PAYOUT_METHOD_TYPES: PayoutMethodType[] = ["bank"];

interface AddMethodForm {
  type: PayoutMethodType;
  bank_name: string;
  account_type: string;
  account_number: string;
  ifsc: string;
  beneficiary_name: string;
  upi_id: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────
// eslint-disable-next-line no-restricted-syntax -- reviewed: public endpoint or sends the auth header itself
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

// All three helpers send `Authorization: Bearer <idToken>` so they pass
// the auth.RequireUser middleware on /payouts/* (F6). Callers MUST pass a
// non-null token — guard in the handler before invoking.

/**
 * Turn a failed response into a sentence a host can act on. The server sends
 * `{"success":false,"error":"…"}`; showing that raw makes the app look broken.
 */
async function readError(res: Response): Promise<string> {
  const raw = await res.text();
  let msg = raw;
  try {
    const body = JSON.parse(raw) as { error?: string; message?: string };
    msg = body.error ?? body.message ?? raw;
  } catch {
    // Not JSON: keep the text.
  }
  return friendlyError(msg, res.status);
}

function friendlyError(msg: string, status?: number): string {
  const m = msg.toLowerCase();
  if (m.includes("failed to fetch") || m.includes("network"))
    return "We couldn't reach the server. Check your internet and try again.";
  // Handled by the caller, which opens the PAN form.
  if (m.includes("tax_profile_required")) return "tax_profile_required";
  if (m.includes("no payout method"))
    return "Add a bank account before you withdraw.";
  if (m.includes("insufficient") || m.includes("exceeds"))
    return "That's more than you can withdraw right now.";
  if (m.includes("ifsc")) return "That IFSC code doesn't look right.";
  if (m.includes("account number"))
    return "That account number doesn't look right.";
  if (status === 401 || status === 403 || m.includes("unauthor"))
    return "Your session has expired. Please sign in again.";
  // A short, human server message can be shown as a sentence; anything
  // technical gets a calm fallback.
  const clean = msg.trim();
  if (
    !clean ||
    clean.length > 140 ||
    /[{}<>]|exception|stack|sql|null pointer|status code/i.test(clean) ||
    (status ?? 0) >= 500
  )
    return "Something went wrong on our side. Please try again in a moment.";
  const sentence = clean.charAt(0).toUpperCase() + clean.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function authHeaders(idToken: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  };
}

async function apiPost(path: string, body: object, idToken: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: authHeaders(idToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  return null;
}

async function apiPut(
  path: string,
  body: object,
  idToken: string,
): Promise<null> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: authHeaders(idToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  return null;
}

async function apiDelete(path: string, idToken: string): Promise<null> {
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(await readError(res));
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="msm-modal fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#121426] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#777B98] transition hover:bg-white/[0.06] hover:text-[#A5A8C3]"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function InputField({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[#A5A8C3]">
        {label}
      </label>
      <input
        {...props}
        className="w-full rounded-lg border border-white/10 bg-[#0D0F1E] px-3 py-2.5 text-sm text-white placeholder-[#777B98] transition outline-none focus:border-[#A020F0] focus:ring-2 focus:ring-[#A020F0]/20"
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function EarningsContent() {
  // Reactive: the host id is stored shortly after the status call resolves.
  const { hostId } = useStoredAuth();

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  ); // methodID to delete
  // Tax details modal; `taxReason` says why we're asking (e.g. to withdraw).
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [taxReason, setTaxReason] = useState<string | undefined>();
  const [expandedPayout, setExpandedPayout] = useState<string | null>(null);
  const [tab, setTab] = useState<"sales" | "payouts" | "setup">("sales");

  // Form + loading states
  const [addForm, setAddForm] = useState<AddMethodForm>({
    type: "bank",
    bank_name: "",
    account_type: "savings",
    account_number: "",
    ifsc: "",
    beneficiary_name: "",
    upi_id: "",
  });
  const [payoutAmountCents, setPayoutAmountCents] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Firebase ID token — F6 made /payouts/* auth-protected, so every read needs
  // to send Authorization: Bearer <token>.
  const [authUser] = useAuthState(auth);
  const [idToken, setIdToken] = useState<string | null>(null);
  useEffect(() => {
    if (authUser) {
      void authUser.getIdToken().then(setIdToken);
    } else {
      setIdToken(localStorage.getItem("msm_auth_token"));
    }
  }, [authUser]);

  const {
    data: earnings,
    isLoading: loadingEarnings,
    refetch: refetchEarnings,
  } = useEarnings(hostId, idToken);
  const {
    data: payoutHistory,
    isLoading: loadingHistory,
    refetch: refetchHistory,
  } = usePayoutHistory(hostId, idToken, { limit: 50, offset: 0 });
  const {
    data: payoutMethods,
    isLoading: loadingMethods,
    refetch: refetchMethods,
  } = usePayoutMethods(hostId, idToken);
  const taxProfileQuery = useHostTaxProfile(hostId, idToken);
  const taxProfile = taxProfileQuery.data;

  // PAN is required before withdrawing once the backend supports tax
  // profiles. Never block when the profile couldn't be loaded.
  const mustAddPan =
    env.NEXT_PUBLIC_REQUIRE_TAX_PROFILE === "true" &&
    taxProfileQuery.isSuccess &&
    needsTaxProfile(taxProfile);

  const openTaxModal = (reason?: string) => {
    clearFeedback();
    setTaxReason(reason);
    setShowTaxModal(true);
  };
  const WITHDRAW_PAN_REASON =
    "Add your PAN to withdraw. We need it to send your earnings; it's required by law for online marketplaces.";

  // ── Sales — phase 1 future-proofing ─────────────────────────────────────
  // Date range (default last 90 days; "all" loads everything).
  const [dateRange, setDateRange] = useState<"90d" | "all">("90d");
  const fromDateISO = useMemo(() => {
    if (dateRange === "all") return undefined;
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString();
  }, [dateRange]);

  // Infinite-query pagination — loads 50 sales at a time on demand.
  const salesQuery = useInfiniteHostSales(idToken, fromDateISO, 50);
  const loadingSales = salesQuery.isLoading;
  // Flatten all loaded pages into one list (preserves newest-first order).
  const sales = useMemo<HostSaleDTO[]>(
    () => salesQuery.data?.pages.flatMap((page) => page.data ?? []) ?? [],
    [salesQuery.data],
  );

  // Host's events — fed into the event filter dropdown.
  const { data: hostEvents } = useEventsByHost(hostId);

  // Filter chip + per-status totals + search + event filter.
  const [salesFilter, setSalesFilter] = useState<
    "all" | "confirmed" | "refunded"
  >("all");
  const [salesSearch, setSalesSearch] = useState("");
  const [eventFilter, setEventFilter] = useState<string>("all");

  const salesTotals = useMemo(() => {
    const out = {
      confirmedCount: 0,
      confirmedCents: 0,
      refundedCount: 0,
      refundedCents: 0,
      pendingCount: 0,
      pendingCents: 0,
    };
    sales.forEach((s) => {
      // What reaches the host: after TCS/TDS when the backend sends it.
      const net = s.HostPayoutCents ?? s.NetEarningCents ?? 0;
      if (s.Status === "confirmed") {
        out.confirmedCount += 1;
        out.confirmedCents += net;
      } else if (s.Status === "cancelled" || s.Status === "refunded") {
        out.refundedCount += 1;
        out.refundedCents += net;
      } else {
        out.pendingCount += 1;
        out.pendingCents += net;
      }
    });
    return out;
  }, [sales]);

  const visibleSales = useMemo(() => {
    const q = salesSearch.trim().toLowerCase();
    return sales.filter((s) => {
      if (salesFilter === "confirmed" && s.Status !== "confirmed") return false;
      if (
        salesFilter === "refunded" &&
        s.Status !== "cancelled" &&
        s.Status !== "refunded"
      )
        return false;
      if (eventFilter !== "all" && s.EventID !== eventFilter) return false;
      if (q) {
        const hay = `${s.BuyerName} ${s.BuyerEmail}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sales, salesFilter, salesSearch, eventFilter]);

  // ── Currency formatter (INR) ──
  const fmtCurrency = useMemo(() => {
    const nf = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    });
    return (cents: number) => nf.format(cents / 100).replace("$", "₹");
  }, []);

  const payoutsOnly = useMemo(
    () =>
      (payoutHistory ?? []).filter(
        (p) => p.type === "payout" || p.type === "withdrawal",
      ),
    [payoutHistory],
  );

  // Earnings figures — sourced from the bookings table (see backend
  // GetHostEarningsBreakdown). Defaults to 0 while the API is loading or the
  // user isn't yet authenticated.
  const totalEarnings = earnings?.total_earnings_cents ?? 0;
  const availableBalance = earnings?.available_balance_cents ?? 0;
  const pendingClearance = earnings?.pending_clearance_cents ?? 0;
  const inFlightPayouts = earnings?.in_flight_payouts_cents ?? 0;

  // Effective commission split for THIS host — the backend applies any
  // admin-set per-host override on top of the platform default and returns it
  // as `platform_fee`. Fall back to the 100/0 default only while loading.
  const platformFeePercent = earnings?.platform_fee?.platform_percentage ?? 0;
  const hostPercent =
    earnings?.platform_fee?.host_percentage ?? 100 - platformFeePercent;

  const isLoading = loadingEarnings || loadingHistory || loadingMethods;

  const clearFeedback = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  // ── Action: Add payout method ──
  const handleAddMethod = async () => {
    if (!hostId) return;
    setActionLoading(true);
    clearFeedback();
    try {
      const body: Record<string, string> = {
        host_id: hostId,
        type: addForm.type,
        beneficiary_name: addForm.beneficiary_name,
      };
      if (addForm.type === "bank") {
        body.bank_name = addForm.bank_name;
        body.account_type = addForm.account_type;
        body.account_number = addForm.account_number;
        body.ifsc = addForm.ifsc;
      } else {
        body.upi_id = addForm.upi_id;
      }
      if (!idToken)
        throw new Error("Your session has expired. Please sign in again.");
      await apiPost("/payouts/methods", body, idToken);
      setActionSuccess("Payout method added successfully.");
      setShowAddModal(false);
      void refetchMethods?.();
      setAddForm({
        type: "bank",
        bank_name: "",
        account_type: "savings",
        account_number: "",
        ifsc: "",
        beneficiary_name: "",
        upi_id: "",
      });
    } catch (e: unknown) {
      setActionError(
        e instanceof Error
          ? friendlyError(e.message)
          : "We couldn't add that account. Please try again.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ── Action: Set primary ──
  const handleSetPrimary = async (methodId: string) => {
    if (!hostId) return;
    setActionLoading(true);
    clearFeedback();
    try {
      if (!idToken)
        throw new Error("Your session has expired. Please sign in again.");
      await apiPut(
        `/payouts/methods/${methodId}/primary?host_id=${hostId}`,
        {},
        idToken,
      );
      setActionSuccess("Primary payout method updated.");
      await refetchMethods?.();
    } catch (e: unknown) {
      setActionError(
        e instanceof Error
          ? friendlyError(e.message)
          : "We couldn't change your primary account. Please try again.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ── Action: Delete method ──
  const handleDeleteMethod = async (methodId: string) => {
    if (!hostId) return;
    setActionLoading(true);
    clearFeedback();
    try {
      if (!idToken)
        throw new Error("Your session has expired. Please sign in again.");
      await apiDelete(
        `/payouts/methods/${methodId}?host_id=${hostId}`,
        idToken,
      );
      setActionSuccess("Payout method removed.");
      setShowDeleteConfirm(null);
      void refetchMethods?.();
    } catch (e: unknown) {
      setActionError(
        e instanceof Error
          ? friendlyError(e.message)
          : "We couldn't remove that account. Please try again.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ── Action: Request payout ──
  const handleRequestPayout = async () => {
    if (!hostId) return;
    const amountCents = Math.round(parseFloat(payoutAmountCents) * 100);
    if (!amountCents || amountCents <= 0) {
      setActionError("Enter how much you want to withdraw.");
      return;
    }
    if (amountCents > availableBalance) {
      setActionError("That's more than you can withdraw right now.");
      return;
    }
    setActionLoading(true);
    clearFeedback();
    try {
      if (!idToken)
        throw new Error("Your session has expired. Please sign in again.");
      await apiPost(
        "/payouts/withdraw",
        { host_id: hostId, amount_cents: amountCents },
        idToken,
      );
      setActionSuccess(
        `Payout of ${fmtCurrency(amountCents)} requested successfully.`,
      );
      setShowPayoutModal(false);
      setPayoutAmountCents("");
      void refetchEarnings?.();
      void refetchHistory?.();
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? friendlyError(e.message)
          : "We couldn't start your withdrawal. Please try again.";
      // Backend refuses withdrawals until a PAN is on file.
      if (msg.includes("tax_profile_required")) {
        setShowPayoutModal(false);
        openTaxModal(WITHDRAW_PAN_REASON);
      } else {
        setActionError(msg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (!hostId) {
    return (
      <div className="min-h-screen bg-[#080914]">
        <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 md:py-10 lg:px-10">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            No host profile found. Please apply as a host first.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080914]">
      <main className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:px-6 md:py-10">
        {/* Header */}
        <div className="mb-5">
          <h1 className="font-outfit text-[26px] leading-tight font-semibold tracking-[-0.01em] text-white sm:text-[32px]">
            Earnings
          </h1>
          <p className="mt-1 text-sm text-[#A5A8C3]">
            What you&apos;ve earned, what&apos;s ready to withdraw, and where it
            came from.
          </p>
        </div>

        {/* Feedback */}
        {actionSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            <FiCheck className="h-4 w-4 shrink-0" />
            {actionSuccess}
            <button
              onClick={() => setActionSuccess(null)}
              aria-label="Dismiss"
              className="ml-auto text-green-400 hover:text-green-300"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
        )}
        {actionError && !showAddModal && !showPayoutModal && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <FiAlertCircle className="h-4 w-4 shrink-0" />
            {actionError}
            <button
              onClick={() => setActionError(null)}
              aria-label="Dismiss"
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A020F0] border-t-transparent" />
          </div>
        ) : (
          <>
            {/* ── Balance: one card, one action ──
                Lifetime = Pending + Ready + Paid out/in flight */}
            <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1E1238] to-[#121426] p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="flex items-center gap-1.5 text-sm text-[#D8B4FE]">
                    <LuWallet className="h-4 w-4" aria-hidden />
                    Ready to withdraw
                  </p>
                  <p className="font-outfit mt-1 text-4xl font-semibold text-white">
                    {fmtCurrency(availableBalance)}
                  </p>
                  <p className="mt-1 text-xs text-[#A5A8C3]">
                    From events that have already happened.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (mustAddPan) {
                      openTaxModal(WITHDRAW_PAN_REASON);
                      return;
                    }
                    clearFeedback();
                    setShowPayoutModal(true);
                  }}
                  disabled={availableBalance <= 0}
                  className="rounded-xl bg-[#A020F0] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#8A1AD0] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Withdraw
                </button>
              </div>

              <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
                <div>
                  <dt className="flex items-center gap-1 text-[11px] text-[#777B98] sm:text-xs">
                    <FiClock className="h-3 w-3" aria-hidden />
                    Upcoming
                  </dt>
                  <dd className="mt-0.5 text-base font-semibold text-white sm:text-lg">
                    {fmtCurrency(pendingClearance)}
                  </dd>
                  <dd className="text-[11px] text-[#777B98]">
                    {earnings?.estimated_clearance_at && pendingClearance > 0
                      ? `Ready ≈ ${format(new Date(earnings.estimated_clearance_at), "d MMM")}`
                      : "After your events"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-[#777B98] sm:text-xs">
                    Paid out
                  </dt>
                  <dd className="mt-0.5 text-base font-semibold text-white sm:text-lg">
                    {fmtCurrency(inFlightPayouts)}
                  </dd>
                  <dd className="text-[11px] text-[#777B98]">
                    Sent or on the way
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-[#777B98] sm:text-xs">
                    Total earned
                  </dt>
                  <dd className="mt-0.5 text-base font-semibold text-white sm:text-lg">
                    {fmtCurrency(totalEarnings)}
                  </dd>
                  <dd className="text-[11px] text-[#777B98]">
                    All time, after refunds
                  </dd>
                </div>
              </dl>
            </section>

            {/* Missing setup, said once, up front */}
            {(!payoutMethods || payoutMethods.length === 0 || mustAddPan) && (
              <button
                onClick={() => setTab("setup")}
                className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/[0.08] px-4 py-3 text-left text-sm text-amber-100 transition hover:bg-amber-500/[0.12]"
              >
                <FiAlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                <span className="flex-1">
                  {!payoutMethods || payoutMethods.length === 0
                    ? "Add your bank account so we can pay you."
                    : "Add your PAN before your first withdrawal."}
                </span>
                <span className="text-xs font-semibold">Set up →</span>
              </button>
            )}

            {/* Tabs */}
            <div className="mt-6 flex rounded-full border border-white/10 bg-[#121426] p-1">
              {(
                [
                  ["sales", "Sales"],
                  ["payouts", "Payouts"],
                  ["setup", "Payout settings"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
                    tab === key
                      ? "bg-[#A020F0] text-white"
                      : "text-[#A5A8C3] hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Sales ── */}
            {tab === "sales" && (
              <section className="mt-4">
                {sales.length > 0 && (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      {(
                        [
                          ["all", "All", sales.length],
                          [
                            "confirmed",
                            "Confirmed",
                            salesTotals.confirmedCount,
                          ],
                          ["refunded", "Refunded", salesTotals.refundedCount],
                        ] as const
                      ).map(([key, label, count]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSalesFilter(key)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                            salesFilter === key
                              ? "border-[#A020F0] bg-[#A020F0]/15 text-white"
                              : "border-white/10 text-[#A5A8C3] hover:text-white"
                          }`}
                        >
                          {label} <span className="opacity-60">{count}</span>
                        </button>
                      ))}
                      <select
                        value={dateRange}
                        onChange={(e) =>
                          setDateRange(e.target.value as "90d" | "all")
                        }
                        aria-label="Date range"
                        className="ml-auto rounded-full border border-white/10 bg-[#121426] px-3 py-1.5 text-xs text-white outline-none focus:border-[#A020F0]"
                      >
                        <option value="90d">Last 90 days</option>
                        <option value="all">All time</option>
                      </select>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_220px]">
                      <div className="relative">
                        <FiSearch className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#777B98]" />
                        <input
                          type="search"
                          value={salesSearch}
                          onChange={(e) => setSalesSearch(e.target.value)}
                          placeholder="Search guest name or email"
                          className="w-full rounded-full border border-white/10 bg-[#121426] py-2 pr-4 pl-10 text-sm text-white placeholder:text-[#777B98] focus:border-[#A020F0] focus:outline-none"
                        />
                      </div>
                      <select
                        value={eventFilter}
                        onChange={(e) => setEventFilter(e.target.value)}
                        aria-label="Event"
                        className="rounded-full border border-white/10 bg-[#121426] px-4 py-2 text-sm text-white outline-none focus:border-[#A020F0]"
                      >
                        <option value="all">All events</option>
                        {(hostEvents ?? []).map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            {ev.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#121426]">
                  {loadingSales ? (
                    <p className="px-5 py-8 text-center text-sm text-[#777B98]">
                      Loading sales…
                    </p>
                  ) : sales.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <p className="text-sm font-medium text-white/80">
                        No sales yet
                      </p>
                      <p className="mt-1 text-xs text-[#777B98]">
                        Every ticket someone buys shows up here, with what you
                        earn from it.
                      </p>
                    </div>
                  ) : visibleSales.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-[#777B98]">
                      No sales match this filter.
                    </p>
                  ) : (
                    <ul className="divide-y divide-white/[0.06]">
                      {visibleSales.map((s: HostSaleDTO) => {
                        const isPending = s.Status === "pending";
                        const isRefunded =
                          s.Status === "cancelled" || s.Status === "refunded";
                        const name = s.BuyerName || s.BuyerEmail || "Guest";
                        return (
                          <li
                            key={s.BookingID}
                            className={`flex items-center gap-3 px-4 py-3 ${isRefunded ? "opacity-60" : ""}`}
                          >
                            {s.BuyerAvatarURL ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={s.BuyerAvatarURL}
                                alt=""
                                className="h-9 w-9 shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#A020F0]/15 text-xs font-semibold text-[#D8B4FE]">
                                {name.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-white">
                                {name}
                                <span className="ml-1.5 text-xs font-normal text-[#777B98]">
                                  ×{s.Quantity}
                                </span>
                              </p>
                              <p className="truncate text-xs text-[#777B98]">
                                {s.EventTitle} ·{" "}
                                {format(new Date(s.OccurrenceDate), "d MMM")}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p
                                className={`text-sm font-semibold ${
                                  isRefunded
                                    ? "text-[#777B98] line-through"
                                    : isPending
                                      ? "text-amber-300"
                                      : "text-green-300"
                                }`}
                              >
                                +
                                {fmtCurrency(
                                  s.HostPayoutCents ?? s.NetEarningCents ?? 0,
                                )}
                              </p>
                              <p className="text-[11px] text-[#777B98]">
                                {isRefunded
                                  ? "Refunded"
                                  : isPending
                                    ? "Pending"
                                    : `Guest paid ${fmtCurrency(s.AmountCents)}`}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {sales.length > 0 && salesQuery.hasNextPage && (
                    <div className="border-t border-white/10 px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => void salesQuery.fetchNextPage()}
                        disabled={salesQuery.isFetchingNextPage}
                        className="rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-white/80 transition hover:bg-white/[0.04] disabled:opacity-50"
                      >
                        {salesQuery.isFetchingNextPage
                          ? "Loading…"
                          : "Load more"}
                      </button>
                    </div>
                  )}
                </div>

                {sales.length > 0 && (
                  <p className="mt-2 px-1 text-xs text-[#777B98]">
                    {salesTotals.confirmedCount} confirmed ·{" "}
                    {fmtCurrency(salesTotals.confirmedCents)} to you
                    {salesTotals.refundedCount > 0 &&
                      ` · ${salesTotals.refundedCount} refunded (₹0 to you)`}
                  </p>
                )}

                <div className="mt-4">
                  <SharedEventsCard />
                </div>
              </section>
            )}

            {/* ── Payouts ── */}
            {tab === "payouts" && (
              <section className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#121426]">
                {payoutsOnly.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm font-medium text-white/80">
                      No payouts yet
                    </p>
                    <p className="mt-1 text-xs text-[#777B98]">
                      Money you withdraw shows up here.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-white/[0.06]">
                    {payoutsOnly.map((p) => {
                      const tone =
                        p.status === "completed"
                          ? "bg-green-500/15 text-green-300"
                          : p.status === "failed"
                            ? "bg-red-500/15 text-red-300"
                            : "bg-amber-500/15 text-amber-300";
                      const b = p.breakdown;
                      const isOpen = expandedPayout === p.id;
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() =>
                              b && setExpandedPayout(isOpen ? null : p.id)
                            }
                            aria-expanded={b ? isOpen : undefined}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-left ${b ? "hover:bg-white/[0.03]" : "cursor-default"}`}
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
                              <LuBuilding2
                                className="h-4 w-4 text-[#A5A8C3]"
                                aria-hidden
                              />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-white">
                                {format(new Date(p.created_at), "d MMM yyyy")}
                              </span>
                              <span className="block truncate text-xs text-[#777B98]">
                                {p.display_reference ??
                                  `#TXN-${p.id.slice(0, 5).toUpperCase()}`}
                              </span>
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {fmtCurrency(p.amount_cents)}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${tone}`}
                            >
                              {p.status}
                            </span>
                            {b && (
                              <FiChevronDown
                                className={`h-4 w-4 shrink-0 text-[#777B98] transition ${isOpen ? "rotate-180" : ""}`}
                                aria-hidden
                              />
                            )}
                          </button>
                          {b && isOpen && (
                            <div className="mx-4 mb-3 rounded-xl bg-white/[0.03] p-3">
                              <PayoutBreakdownList b={b} fmt={fmtCurrency} />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}

            {/* ── Payout settings ── */}
            {tab === "setup" && (
              <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Bank account */}
                <div className="rounded-2xl border border-white/10 bg-[#121426] p-5">
                  <h3 className="text-sm font-semibold text-white">
                    Where we pay you
                  </h3>
                  <div className="mt-3 space-y-2">
                    {payoutMethods && payoutMethods.length > 0 ? (
                      payoutMethods.map((method) => (
                        <div
                          key={method.id}
                          className={`flex items-center gap-3 rounded-xl border p-3 ${
                            method.is_primary
                              ? "border-[#A020F0]/60 bg-[#A020F0]/10"
                              : "border-white/10"
                          }`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                            {method.type === "bank" ? (
                              <LuBuilding2 className="h-4 w-4 text-[#A5A8C3]" />
                            ) : (
                              <FiCreditCard className="h-4 w-4 text-[#A5A8C3]" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-white">
                              {method.type === "bank"
                                ? (method.bank_name ?? "Bank account")
                                : "UPI"}
                            </span>
                            <span className="block truncate text-xs text-[#777B98]">
                              {method.type === "bank"
                                ? `•••• ${method.last_four_digits ?? "****"}`
                                : method.upi_id}
                              {method.is_primary && " · Primary"}
                            </span>
                          </span>
                          {!method.is_primary && (
                            <button
                              onClick={() => handleSetPrimary(method.id)}
                              disabled={actionLoading}
                              className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/80 transition hover:bg-white/[0.06] disabled:opacity-50"
                            >
                              Make primary
                            </button>
                          )}
                          <button
                            onClick={() => {
                              clearFeedback();
                              setShowDeleteConfirm(method.id);
                            }}
                            disabled={actionLoading}
                            aria-label="Remove this account"
                            className="rounded-full p-1.5 text-[#777B98] transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-xl bg-white/[0.03] p-3 text-xs text-[#A5A8C3]">
                        No bank account yet. Add one to receive payouts.
                      </p>
                    )}
                    <button
                      onClick={() => {
                        clearFeedback();
                        setShowAddModal(true);
                      }}
                      className="w-full rounded-xl border border-dashed border-white/15 px-4 py-2.5 text-sm font-medium text-[#A5A8C3] transition hover:border-[#A020F0] hover:text-[#D8B4FE]"
                    >
                      + Add bank account
                    </button>
                  </div>
                  <p className="mt-3 text-[11px] text-[#777B98]">
                    Your bank details are encrypted.
                  </p>
                </div>

                {/* How fees work */}
                <div className="rounded-2xl border border-white/10 bg-[#121426] p-5">
                  <h3 className="text-sm font-semibold text-white">
                    How your earnings are worked out
                  </h3>
                  <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full bg-[#A020F0]"
                      style={{ width: `${hostPercent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-white">
                    You keep <b className="font-semibold">{hostPercent}%</b> of
                    each ticket price
                    {platformFeePercent > 0 &&
                      `; ${platformFeePercent}% goes to MySlotmate`}
                    .
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#777B98]">
                    Guests pay the platform fee on top at checkout, and
                    MySlotmate pays the GST on it. Tax deductions (GST TCS,
                    income tax TDS) apply only if you&apos;re GST-registered or
                    sell over ₹5 lakh a year, and are credited back to you.
                  </p>
                </div>

                <PayoutScheduleCard hostId={hostId} idToken={idToken} />

                <TaxDetailsCard
                  profile={taxProfile}
                  earnings={earnings}
                  fmt={fmtCurrency}
                  onEdit={() => openTaxModal()}
                />
              </section>
            )}
          </>
        )}
      </main>

      {/* ════════════════════════════════════════════════
          MODAL: Request Payout
      ════════════════════════════════════════════════ */}
      {showPayoutModal && (
        <Modal
          title="Withdraw"
          onClose={() => {
            setShowPayoutModal(false);
            clearFeedback();
          }}
        >
          {!payoutMethods || payoutMethods.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-[#A5A8C3]">
                Add the bank account we should send your money to. It takes a
                minute, and you only do it once.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPayoutModal(false);
                    clearFeedback();
                  }}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-[#A5A8C3] transition hover:bg-white/[0.04]"
                >
                  Not now
                </button>
                <button
                  onClick={() => {
                    setShowPayoutModal(false);
                    clearFeedback();
                    setShowAddModal(true);
                  }}
                  className="flex-1 rounded-lg bg-[#A020F0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8A1AD0]"
                >
                  Add bank account
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-white/[0.04] px-4 py-3 text-sm text-[#A5A8C3]">
                Available balance:{" "}
                <span className="font-bold text-white">
                  {fmtCurrency(availableBalance)}
                </span>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#A5A8C3]">
                  Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm font-medium text-[#777B98]">
                    ₹
                  </span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={payoutAmountCents}
                    onChange={(e) => setPayoutAmountCents(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#0D0F1E] py-2.5 pr-3 pl-7 text-sm text-white transition outline-none focus:border-[#A020F0] focus:ring-2 focus:ring-[#A020F0]/20"
                  />
                </div>
              </div>

              {actionError && (
                <p className="flex items-center gap-1.5 text-xs text-red-300">
                  <FiAlertCircle className="h-3.5 w-3.5" /> {actionError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    setShowPayoutModal(false);
                    clearFeedback();
                  }}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-[#A5A8C3] transition hover:bg-white/[0.04]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestPayout}
                  disabled={actionLoading}
                  className="flex-1 rounded-lg bg-[#A020F0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8A1AD0] disabled:opacity-60"
                >
                  {actionLoading ? "Processing…" : "Withdraw"}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ════════════════════════════════════════════════
          MODAL: Tax details (PAN / GSTIN)
      ════════════════════════════════════════════════ */}
      {showTaxModal && (
        <Modal title="Tax details" onClose={() => setShowTaxModal(false)}>
          <TaxProfileForm
            hostId={hostId}
            idToken={idToken}
            profile={taxProfile}
            reason={taxReason}
            onCancel={() => setShowTaxModal(false)}
            onSaved={() => {
              setShowTaxModal(false);
              setActionSuccess("Tax details saved.");
            }}
          />
        </Modal>
      )}

      {/* ════════════════════════════════════════════════
          MODAL: Add Payout Method
      ════════════════════════════════════════════════ */}
      {showAddModal && (
        <Modal
          title="Add bank account"
          onClose={() => {
            setShowAddModal(false);
            clearFeedback();
          }}
        >
          <div className="space-y-4">
            {/* Type toggle — hidden when only one method type is enabled */}
            {ENABLED_PAYOUT_METHOD_TYPES.length > 1 && (
              <div className="flex rounded-lg border border-white/10 p-1">
                {ENABLED_PAYOUT_METHOD_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setAddForm((f) => ({ ...f, type: t }))}
                    className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                      addForm.type === t
                        ? "bg-[#A020F0] text-white shadow-sm"
                        : "text-[#A5A8C3] hover:text-white/80"
                    }`}
                  >
                    {t === "bank" ? "🏦 Bank Account" : "📱 UPI"}
                  </button>
                ))}
              </div>
            )}

            {/* Beneficiary name always shown */}
            <InputField
              label="Beneficiary Name"
              placeholder="As per bank records"
              value={addForm.beneficiary_name}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, beneficiary_name: e.target.value }))
              }
            />

            {addForm.type === "bank" ? (
              <>
                <InputField
                  label="Bank Name"
                  placeholder="e.g. HDFC Bank"
                  value={addForm.bank_name}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, bank_name: e.target.value }))
                  }
                />
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#A5A8C3]">
                    Account Type
                  </label>
                  <select
                    value={addForm.account_type}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        account_type: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-[#0D0F1E] px-3 py-2.5 text-sm text-white transition outline-none focus:border-[#A020F0] focus:ring-2 focus:ring-[#A020F0]/20"
                  >
                    <option value="savings">Savings</option>
                    <option value="checking">Current / Checking</option>
                  </select>
                </div>
                <InputField
                  label="Account Number"
                  placeholder="Enter account number"
                  value={addForm.account_number}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      account_number: e.target.value,
                    }))
                  }
                />
                <InputField
                  label="IFSC Code"
                  placeholder="e.g. HDFC0001234"
                  value={addForm.ifsc}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      ifsc: e.target.value.toUpperCase(),
                    }))
                  }
                />
              </>
            ) : (
              <InputField
                label="UPI ID"
                placeholder="e.g. yourname@upi"
                value={addForm.upi_id}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, upi_id: e.target.value }))
                }
              />
            )}

            {actionError && (
              <p className="flex items-center gap-1.5 text-xs text-red-300">
                <FiAlertCircle className="h-3.5 w-3.5" /> {actionError}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  clearFeedback();
                }}
                className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-[#A5A8C3] transition hover:bg-white/[0.04]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMethod}
                disabled={actionLoading}
                className="flex-1 rounded-lg bg-[#A020F0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8A1AD0] disabled:opacity-60"
              >
                {actionLoading ? "Saving…" : "Add account"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════
          MODAL: Delete Confirmation
      ════════════════════════════════════════════════ */}
      {showDeleteConfirm && (
        <Modal
          title="Remove bank account"
          onClose={() => setShowDeleteConfirm(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-[#A5A8C3]">
              Are you sure you want to remove this payout method? This action
              cannot be undone.
            </p>
            {actionError && (
              <p className="flex items-center gap-1.5 text-xs text-red-300">
                <FiAlertCircle className="h-3.5 w-3.5" /> {actionError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-[#A5A8C3] transition hover:bg-white/[0.04]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteMethod(showDeleteConfirm)}
                disabled={actionLoading}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
              >
                {actionLoading ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Earnings are for verified hosts; free hosts see how to start earning. */
export default function HostEarningsPage() {
  const { isVerified, isLoading, applicationStatus } = useHostTier();
  if (isLoading) return <div className="min-h-screen bg-[#080914]" />;
  if (!isVerified)
    return (
      <main className="min-h-screen bg-[#080914] px-4 py-6 sm:px-6 md:py-10">
        <StartEarning applicationStatus={applicationStatus} />
      </main>
    );
  return <EarningsContent />;
}
