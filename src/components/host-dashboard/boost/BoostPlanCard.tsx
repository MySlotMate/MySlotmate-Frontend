"use client";

/**
 * The Boost card for the paid-budget Boost (PRD: Premium Hosts and paid Boost
 * marketing). Boost is for Premium hosts: everyone else sees it locked with an
 * invitation. A Premium host plans a daily ad budget and dates, our team sends
 * a proposal, the host accepts and pays the budget, the team goes live, and
 * the host follows spend, results, creatives and reports here.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FiCheck, FiClock, FiLock, FiTrendingUp, FiZap } from "react-icons/fi";
import { useIdToken } from "~/hooks/useIdToken";
import {
  useAcceptPlanBoost,
  useCreatePlanPayment,
  usePlanBoost,
  usePremium,
  useRequestPlanBoost,
  useStopPlanBoost,
  useVerifyPlanPayment,
} from "~/hooks/useBoostPlan";
import type { BoostChannel, EventDTO } from "~/lib/api";
import { boostBlockers, pct, rupees } from "~/lib/boost";
import {
  BOOST_PLAN_MOCK,
  DAILY_BUDGET_STEP_CENTS,
  MIN_BUDGET_DAYS,
  MIN_DAILY_BUDGET_CENTS,
  addDays,
  estimatePlan,
  feeLines,
  isoDay,
  lastBoostDay,
  type PlanBoostDTO,
  type TopUpPayload,
} from "~/lib/boostPlan";
import { DatePill } from "~/components/host-dashboard/DateTimePills";
import { CHANNELS, GRADIENT, Note, RateRows, Shell, Stat } from "./parts";
import BoostCreatives from "./BoostCreatives";
import BoostPlanResults from "./BoostPlanResults";
import BoostMockControls from "./BoostMockControls";

const field =
  "w-full rounded-xl border border-white/10 bg-[#0D0E1C] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#B57BFF]";

const shortDate = (iso: string | null | undefined) =>
  iso
    ? new Date(
        iso.length === 10 ? `${iso}T00:00:00+05:30` : iso,
      ).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : "";

const PREMIUM_PERKS = [
  "Our team plans and runs ads for your events on Instagram, Facebook, Google and WhatsApp",
  "A named campaign manager, and same-day review of your plans",
  "Up to 2 posters or reels a month made by our team",
  "A Premium host badge and a featured slot on the home page",
];

// ─── Razorpay ────────────────────────────────────────────────────────────────

function loadRazorpay() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window !== "undefined" && "Razorpay" in window) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load the payment window."));
    document.body.appendChild(s);
  });
}

/** Pays the budget or a top-up: Razorpay, or a confirm on the stand-in. */
function usePay() {
  const idToken = useIdToken();
  const create = useCreatePlanPayment(idToken);
  const verify = useVerifyPlanPayment(idToken);
  const [busy, setBusy] = useState(false);

  const pay = async (
    b: PlanBoostDTO,
    body: { kind: "budget" } | TopUpPayload,
    what: string,
  ) => {
    setBusy(true);
    try {
      const order = await create.mutateAsync({ boostId: b.id, body });
      const done = async (r: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        await verify.mutateAsync({
          boostId: b.id,
          paymentId: order.payment_id,
          razorpay: r,
        });
        toast.success(`Paid ${rupees(order.amount_cents)}. ${what}`);
      };
      if (BOOST_PLAN_MOCK || order.key_id === "mock") {
        if (
          window.confirm(
            `Test payment: pay ${rupees(order.amount_cents)}? No money moves in test mode.`,
          )
        )
          await done({
            razorpay_order_id: order.order_id,
            razorpay_payment_id: "pay_mock",
            razorpay_signature: "mock",
          });
        setBusy(false);
        return;
      }
      await loadRazorpay();
      new window.Razorpay({
        key: order.key_id,
        amount: order.amount_cents,
        currency: order.currency,
        name: "MySlotMate",
        description: "Boost ad budget",
        order_id: order.order_id,
        theme: { color: "#A020F0" },
        handler: (r) => {
          void done(r)
            .catch((e: Error) =>
              toast.error(
                e.message ||
                  "We couldn't confirm the payment. If money left your account, it will show here shortly.",
              ),
            )
            .finally(() => setBusy(false));
        },
        modal: { ondismiss: () => setBusy(false) },
      }).open();
    } catch (e) {
      toast.error((e as Error).message || "Payment didn't start. Try again.");
      setBusy(false);
    }
  };
  return { pay, busy };
}

// ─── Small pieces ────────────────────────────────────────────────────────────

function PlanSummary({ b }: { b: PlanBoostDTO }) {
  const days =
    b.budget_from && b.budget_until
      ? Math.round(
          (new Date(b.budget_until).getTime() -
            new Date(b.budget_from).getTime()) /
            86_400_000,
        ) + 1
      : 0;
  return (
    <div className="grid grid-cols-2 gap-2">
      <Stat label="Daily budget" value={rupees(b.daily_budget_cents ?? 0)} />
      <Stat
        label="Dates"
        value={`${shortDate(b.budget_from)} – ${shortDate(b.budget_until)}`}
      />
      <Stat
        label="Ad budget"
        value={`${rupees(b.budget_total_cents)} · ${days}d`}
      />
      <Stat
        label={
          b.budget_status === "paid" ? "Paid, with GST" : "To pay, with GST"
        }
        value={rupees(b.budget_total_cents + b.budget_gst_cents)}
      />
    </div>
  );
}

function SpendBar({ b }: { b: PlanBoostDTO }) {
  const pctUsed = b.budget_total_cents
    ? Math.min(100, Math.round((b.spent_cents / b.budget_total_cents) * 100))
    : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-white/60">
        <span>
          Spent {rupees(b.spent_cents)} of {rupees(b.budget_total_cents)}
        </span>
        <span>{pctUsed}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-white/[0.08]"
        role="progressbar"
        aria-valuenow={pctUsed}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Ad budget spent"
      >
        <div
          className={`h-full ${GRADIENT}`}
          style={{ width: `${pctUsed}%` }}
        />
      </div>
    </div>
  );
}

function Locked({
  status,
  reason,
}: {
  status: "none" | "applied" | "declined" | "removed";
  reason: string | null;
}) {
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-white">
        <FiLock className="h-4 w-4 text-[#D8B4FE]" /> Boost is for Premium hosts
      </p>
      {status === "applied" ? (
        <p className="text-sm text-white/70">
          Your Premium application is with our team. We’ll email you as soon as
          it’s approved, usually within a day.
        </p>
      ) : (
        <>
          <p className="text-sm text-white/70">
            {status === "declined" && reason
              ? `Your Premium application wasn’t approved: ${reason}`
              : status === "removed" && reason
                ? `Premium was switched off on your account: ${reason}`
                : "Premium makes MySlotMate your marketing partner. It’s free to join; you pay only for the ads you choose to run and a fee on the tickets they sell."}
          </p>
          <ul className="space-y-1.5 text-sm text-white/75">
            {PREMIUM_PERKS.map((p) => (
              <li key={p} className="flex gap-2">
                <FiCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D8B4FE]" />
                {p}
              </li>
            ))}
          </ul>
          <Link
            href="/host-dashboard/premium"
            className={`flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-white transition hover:opacity-90 ${GRADIENT}`}
          >
            <FiZap className="h-4 w-4" /> Join Premium
          </Link>
        </>
      )}
    </div>
  );
}

// ─── The planner ─────────────────────────────────────────────────────────────

function Planner({
  event,
  onDone,
  onCancel,
}: {
  event: EventDTO;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const idToken = useIdToken();
  const request = useRequestPlanBoost(idToken);
  const lines = useMemo(() => feeLines(event), [event]);
  const lastDay = lastBoostDay(event);
  const today = isoDay(new Date());
  const [daily, setDaily] = useState(1000);
  const [from, setFrom] = useState(addDays(today, 1));
  const [until, setUntil] = useState(() => {
    const want = addDays(today, 7);
    return lastDay && want > lastDay ? lastDay : want;
  });
  const [channels, setChannels] = useState<BoostChannel[]>([
    "instagram",
    "facebook",
  ]);
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");

  const plan = {
    daily_budget_cents: Math.round(daily * 100),
    budget_from: from,
    budget_until: until,
  };
  const est = estimatePlan(plan, lastDay);
  const problems = [
    ...est.problems,
    ...(channels.length === 0 ? ["Pick at least one channel."] : []),
  ];

  const submit = () =>
    request.mutate(
      {
        eventId: event.id,
        body: {
          ...plan,
          channels,
          goal_text: goal.trim() || undefined,
          audience_notes: audience.trim() || undefined,
        },
        rates: lines,
      },
      {
        onSuccess: () => {
          toast.success("Plan sent. Your manager will reply today.");
          onDone();
        },
        onError: (e) => toast.error(e.message || "Couldn't send the plan."),
      },
    );

  return (
    <div className="space-y-3">
      <p className="text-sm text-white/70">
        Plan your ads. You pay the ad budget upfront and it all goes into your
        ads; our fee is a share of each ticket sold while the Boost runs.
      </p>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3">
        <label className="block space-y-1">
          <span className="text-xs text-white/55">Daily ad budget (₹)</span>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_DAILY_BUDGET_CENTS / 100}
            step={DAILY_BUDGET_STEP_CENTS / 100}
            value={daily}
            onChange={(e) => setDaily(Number(e.target.value))}
            className={field}
          />
          <span className="text-[11px] text-white/40">
            At least ₹{MIN_DAILY_BUDGET_CENTS / 100} a day, in steps of ₹
            {DAILY_BUDGET_STEP_CENTS / 100}
          </span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-xs text-white/55">Starts</span>
            <DatePill
              value={from}
              onChange={(v) => {
                setFrom(v);
                if (v > until) setUntil(addDays(v, MIN_BUDGET_DAYS - 1));
              }}
              min={today}
              max={lastDay ?? undefined}
              ariaLabel="Start date"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-white/55">Ends</span>
            <DatePill
              value={until}
              onChange={setUntil}
              min={from}
              max={lastDay ?? undefined}
              ariaLabel="End date"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="text-xs text-white/55">Where to advertise</span>
          <div className="flex flex-wrap gap-1.5">
            {CHANNELS.map((c) => {
              const on = channels.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setChannels((prev) =>
                      on
                        ? prev.filter((x) => x !== c.value)
                        : [...prev, c.value],
                    )
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    on
                      ? "border-[#B724EA] bg-[#B724EA]/20 text-white"
                      : "border-white/15 text-white/60 hover:text-white"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
        <label className="block space-y-1">
          <span className="text-xs text-white/55">Goal (optional)</span>
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Sell 50 more tickets"
            className={field}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-white/55">
            Who should see it (optional)
          </span>
          <textarea
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            rows={2}
            placeholder="College students in Guwahati who like live music"
            className={`${field} resize-none`}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat
          label="Ad budget"
          value={`${rupees(est.budget_total_cents)} · ${est.days}d`}
        />
        <Stat
          label="To pay, with 18% GST"
          value={rupees(est.total_payable_cents)}
        />
      </div>
      <p className="text-xs text-white/50">
        Our fee on each ticket sold while live:
      </p>
      <RateRows
        rows={lines.map((l) => ({
          name: l.ticket_name,
          priceCents: l.price_cents,
          bps: l.rate_bps,
        }))}
      />

      {problems.length > 0 && (
        <ul className="space-y-1 text-xs text-amber-300/90">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          disabled={request.isPending || problems.length > 0}
          onClick={submit}
          className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${GRADIENT}`}
        >
          <FiTrendingUp className="h-4 w-4" />
          {request.isPending ? "Sending…" : "Send plan to our team"}
        </button>
      </div>
      <Note>
        The ad budget is not refundable: all of it is spent on your ads, and you
        get the reports to see how. Nothing is charged until you accept our
        proposal and pay. Boosted events need a Moderate, Strict or No refunds
        policy.
      </Note>
    </div>
  );
}

// ─── The card ────────────────────────────────────────────────────────────────

export default function BoostPlanCard({
  event,
  autoOpen = false,
}: {
  event: EventDTO;
  hostId: string | null;
  autoOpen?: boolean;
}) {
  const idToken = useIdToken();
  const {
    data: premium,
    isLoading: premiumLoading,
    isError: premiumFailed,
  } = usePremium(idToken);
  const { data: boost, isLoading } = usePlanBoost(event.id, idToken);
  const accept = useAcceptPlanBoost(idToken);
  const stop = useStopPlanBoost(idToken);
  const { pay, busy: paying } = usePay();
  const [replanning, setReplanning] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [topUpDays, setTopUpDays] = useState(3);

  useEffect(() => {
    if (autoOpen)
      document.getElementById("boost")?.scrollIntoView({ behavior: "smooth" });
  }, [autoOpen]);

  if (isLoading || premiumLoading || (!idToken && !BOOST_PLAN_MOCK))
    return (
      <Shell>
        <div className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
      </Shell>
    );

  if (premiumFailed)
    return (
      <Shell>
        <p className="text-sm text-white/70">
          We couldn’t load your Boost details. Refresh the page to try again.
        </p>
      </Shell>
    );

  const b = boost ?? null;
  const active = premium?.status === "active";
  const open = b && ["under_review", "quote_ready", "live"].includes(b.status);
  const onError = (e: unknown) =>
    toast.error((e as Error).message || "Something went wrong. Try again.");
  const blockers = boostBlockers(event);
  const totalToPay = b ? b.budget_total_cents + b.budget_gst_cents : 0;

  let content: React.ReactNode;

  if (!open && !active) {
    content = (
      <Locked
        status={
          (premium?.status ?? "none") as
            | "none"
            | "applied"
            | "declined"
            | "removed"
        }
        reason={premium?.decline_reason ?? premium?.remove_reason ?? null}
      />
    );
  } else if (!b || (!open && (replanning || !b))) {
    content =
      blockers.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-white/70">
            This event can’t be boosted right now.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-white/55">
            {blockers.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : (
        <Planner
          event={event}
          onDone={() => setReplanning(false)}
          onCancel={b ? () => setReplanning(false) : undefined}
        />
      );
  } else if (b.status === "under_review") {
    content = (
      <div className="space-y-3">
        <p className="text-sm text-white/70">
          Your manager is reviewing your plan and will send a proposal today.
          Nothing is charged until you accept and pay.
        </p>
        <PlanSummary b={b} />
        <button
          type="button"
          disabled={stop.isPending}
          onClick={() =>
            stop.mutate(b.id, {
              onSuccess: () => toast.success("Plan withdrawn."),
              onError,
            })
          }
          className="w-full rounded-full border border-white/15 py-2.5 text-sm font-semibold text-white/85 transition hover:bg-white/[0.06] disabled:opacity-50"
        >
          Withdraw plan
        </button>
      </div>
    );
  } else if (b.status === "quote_ready" && !b.accepted_at) {
    const top = Math.max(...b.rates.map((r) => r.rate_bps), 0);
    content = (
      <div className="space-y-3">
        <p className="text-sm text-white/70">
          Our proposal is ready. Accept it and pay the ad budget to start.
        </p>
        <PlanSummary b={b} />
        <p className="text-xs text-white/50">
          Our fee on each ticket sold while live:
        </p>
        <RateRows
          rows={b.rates.map((r) => ({
            name: r.ticket_name,
            priceCents: r.price_cents,
            bps: r.rate_bps,
            guideBps: r.guide_rate_bps,
            reason: r.reason,
          }))}
        />
        {b.admin_note && (
          <p className="rounded-2xl bg-white/[0.04] px-3 py-2 text-sm whitespace-pre-line text-white/80">
            <span className="text-white/50">From your manager: </span>
            {b.admin_note}
          </p>
        )}
        <div className="rounded-2xl border border-[#B724EA]/30 bg-[#B724EA]/[0.08] p-3 text-xs leading-5 text-white/80">
          You pay {rupees(totalToPay)} now (the ad budget plus 18% GST). It is
          all spent on your ads and is not refundable, including if the Boost
          ends early. MySlotMate keeps {pct(top)} or less of each ticket sold
          while the Boost is live; it comes out of your share and guests pay the
          same price. If a guest cancels in time for a full refund, its fee is
          returned. Your refund policy must stay Moderate, Strict or No refunds
          while the Boost runs.
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={stop.isPending}
            onClick={() =>
              stop.mutate(b.id, {
                onSuccess: () => toast.success("Proposal declined."),
                onError,
              })
            }
            className="rounded-full bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Decline
          </button>
          <button
            type="button"
            disabled={accept.isPending || paying}
            onClick={() =>
              accept.mutate(b.id, {
                onSuccess: (acc) =>
                  void pay(
                    acc,
                    { kind: "budget" },
                    "Your manager will start the ads.",
                  ),
                onError,
              })
            }
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${GRADIENT}`}
          >
            <FiCheck className="h-4 w-4" />
            {accept.isPending || paying
              ? "Opening payment…"
              : `Accept and pay ${rupees(totalToPay)}`}
          </button>
        </div>
      </div>
    );
  } else if (b.status === "quote_ready" && b.budget_status === "unpaid") {
    content = (
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm text-white/80">
          <FiClock className="h-4 w-4 text-amber-300" />
          You accepted. Pay {rupees(totalToPay)} by{" "}
          {shortDate(b.payment_due_by)} to start, or the plan expires.
        </p>
        <PlanSummary b={b} />
        <button
          type="button"
          disabled={paying}
          onClick={() =>
            void pay(b, { kind: "budget" }, "Your manager will start the ads.")
          }
          className={`w-full rounded-full py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${GRADIENT}`}
        >
          {paying ? "Opening payment…" : `Pay ${rupees(totalToPay)}`}
        </button>
      </div>
    );
  } else if (b.status === "quote_ready") {
    content = (
      <div className="space-y-3">
        <p className="text-sm text-white/70">
          Paid, thank you. Your manager is setting up the ads and will go live
          on {shortDate(b.budget_from)}.
        </p>
        {b.creatives_count === 0 && (
          <p className="rounded-2xl border border-amber-300/30 bg-amber-300/[0.08] px-3 py-2 text-sm text-amber-100">
            Upload at least one reel, post or story below. The ads can’t start
            without one.
          </p>
        )}
        <PlanSummary b={b} />
      </div>
    );
  } else if (b.status === "live") {
    const daysLeft = b.budget_until
      ? Math.max(
          0,
          Math.ceil(
            (new Date(`${b.budget_until}T23:59:59+05:30`).getTime() -
              Date.now()) /
              86_400_000,
          ),
        )
      : 0;
    const lastDay = lastBoostDay(event);
    const canTopUp = !!b.budget_until && (!lastDay || b.budget_until < lastDay);
    const topUpCents = (b.daily_budget_cents ?? 0) * topUpDays;
    content = (
      <div className="space-y-3">
        <p className="text-sm text-white/70">
          Live until {shortDate(b.budget_until)} · {daysLeft} day
          {daysLeft === 1 ? "" : "s"} left.
        </p>
        <SpendBar b={b} />
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Reach" value={b.reach.toLocaleString("en-IN")} />
          <Stat label="Clicks" value={b.clicks.toLocaleString("en-IN")} />
          <Stat label="Tickets sold" value={String(b.tickets_sold)} />
          <Stat label="Our fee" value={rupees(b.commission_cents)} />
        </div>
        {canTopUp && (
          <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-white/10 bg-black/20 p-3">
            <label className="min-w-0 flex-1 space-y-1">
              <span className="text-xs text-white/55">
                Add days at {rupees(b.daily_budget_cents ?? 0)} a day
              </span>
              <input
                type="number"
                min={1}
                value={topUpDays}
                onChange={(e) =>
                  setTopUpDays(Math.max(1, Number(e.target.value)))
                }
                className={field}
              />
            </label>
            <button
              type="button"
              disabled={paying}
              onClick={() =>
                void pay(
                  b,
                  { kind: "top_up", days_added: topUpDays },
                  "The extra days are added to your Boost.",
                )
              }
              className={`rounded-full px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${GRADIENT}`}
            >
              Top up {rupees(topUpCents + Math.round(topUpCents * 0.18))}
            </button>
          </div>
        )}
        {confirmStop ? (
          <div className="space-y-2 rounded-2xl border border-white/10 bg-black/25 p-3">
            <p className="text-sm text-white">
              Stop the Boost? The ads stop today. The budget isn’t refunded;
              what’s left is noted in your final report.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmStop(false)}
                className="flex-1 rounded-full bg-white/[0.06] py-2 text-sm font-semibold text-white"
              >
                Keep it running
              </button>
              <button
                type="button"
                disabled={stop.isPending}
                onClick={() =>
                  stop.mutate(b.id, {
                    onSuccess: () => {
                      toast.success("Boost stopped.");
                      setConfirmStop(false);
                    },
                    onError,
                  })
                }
                className="flex-1 rounded-full bg-rose-500/80 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {stop.isPending ? "Stopping…" : "Stop Boost"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmStop(true)}
            className="w-full rounded-full border border-white/15 py-2.5 text-sm font-semibold text-white/85 transition hover:bg-white/[0.06]"
          >
            Stop Boost
          </button>
        )}
      </div>
    );
  } else {
    // ended, declined, cancelled
    content = (
      <div className="space-y-3">
        {b.status === "ended" ? (
          <>
            <p className="text-sm text-white/70">
              {b.closed_at
                ? "Your Boost has ended and the final report is ready below."
                : "Your Boost has ended. Your manager is preparing the final report."}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Ad budget spent" value={rupees(b.spent_cents)} />
              <Stat label="Tickets sold" value={String(b.tickets_sold)} />
              <Stat label="Reach" value={b.reach.toLocaleString("en-IN")} />
              <Stat label="Our fee" value={rupees(b.commission_cents)} />
            </div>
          </>
        ) : (
          <p className="text-sm text-white/70">
            {b.status === "declined"
              ? `Our team couldn’t take this one on${b.decline_reason ? `: ${b.decline_reason}` : "."}`
              : "This Boost was cancelled before it started."}
          </p>
        )}
        {active && blockers.length === 0 && (
          <button
            type="button"
            onClick={() => setReplanning(true)}
            className="w-full rounded-full border border-white/15 py-2.5 text-sm font-semibold text-white/85 transition hover:bg-white/[0.06]"
          >
            Boost this event again
          </button>
        )}
      </div>
    );
    if (replanning)
      content = (
        <Planner
          event={event}
          onDone={() => setReplanning(false)}
          onCancel={() => setReplanning(false)}
        />
      );
  }

  const showWork =
    b?.pricing_model === "budget" &&
    (b.status === "quote_ready" ||
      b.status === "live" ||
      b.status === "ended") &&
    !replanning;

  return (
    <Shell tone={b?.status === "live" ? "live" : "default"}>
      <div className="space-y-4">
        {content}
        {showWork && b && (
          <>
            <BoostCreatives boost={b} />
            {(b.status === "live" || b.status === "ended") && (
              <BoostPlanResults boost={b} />
            )}
          </>
        )}
        {BOOST_PLAN_MOCK && <BoostMockControls boost={b} />}
      </div>
    </Shell>
  );
}
