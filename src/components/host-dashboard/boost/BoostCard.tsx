"use client";

/**
 * The Boost card on a host's event (PRD: Boost card states).
 * Shows eligibility, an instant rate preview, the request form, the quote to
 * accept, live stats with a stop button, and the final report.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FiCheck, FiInfo, FiTrendingUp, FiX } from "react-icons/fi";
import {
  useAcceptBoost,
  useEventBoost,
  usePayoutEligibility,
  useRequestBoost,
  useStopBoost,
} from "~/hooks/useApi";
import { useIdToken } from "~/hooks/useIdToken";
import type { BoostChannel, BoostDTO, EventDTO } from "~/lib/api";
import {
  BOOST_ENABLED,
  PREMIUM_PRICE_CENTS,
  boostBlockers,
  commissionCents,
  pct,
  previewQuote,
  rupees,
} from "~/lib/boost";

const GRADIENT = "bg-gradient-to-r from-[#7038F5] to-[#B724EA]";

const CHANNELS: { value: BoostChannel; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google" },
  { value: "whatsapp", label: "WhatsApp groups" },
  { value: "influencers", label: "Creators" },
];

function Shell({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "live";
}) {
  return (
    <section
      id="boost"
      aria-label="Marketing Boost"
      className={`scroll-mt-24 rounded-3xl border p-5 ${
        tone === "live"
          ? "border-[#B724EA]/40 bg-[#1A1030]"
          : "border-white/10 bg-[#121426]/90"
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full ${GRADIENT}`}
        >
          <FiTrendingUp className="h-4 w-4 text-white" />
        </span>
        <h2 className="font-outfit text-base font-semibold text-white">
          Marketing Boost
        </h2>
      </div>
      {children}
    </section>
  );
}

function RateRows({
  rows,
}: {
  rows: { name: string; priceCents: number; bps: number }[];
}) {
  return (
    <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-black/20 text-sm">
      {rows.map((r) => (
        <div
          key={`${r.name}-${r.priceCents}`}
          className="flex items-center justify-between gap-3 px-3.5 py-2.5"
        >
          <span className="min-w-0 truncate text-white/80">
            {r.name} · {rupees(r.priceCents)}
          </span>
          <span className="shrink-0 text-right text-white">
            {pct(r.bps)},{" "}
            <span className="text-[#D8B4FE]">
              {rupees(commissionCents(r.priceCents, r.bps))}
            </span>{" "}
            <span className="text-white/45">per ticket</span>
          </span>
        </div>
      ))}
    </div>
  );
}

const Note = ({ children }: { children: React.ReactNode }) => (
  <p className="flex gap-2 text-xs leading-5 text-white/50">
    <FiInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
    <span>{children}</span>
  </p>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl bg-black/25 px-3 py-2.5">
    <p className="text-[11px] tracking-wide text-white/45 uppercase">{label}</p>
    <p className="mt-0.5 text-base font-semibold text-white">{value}</p>
  </div>
);

export default function BoostCard({
  event,
  hostId,
  autoOpen = false,
}: {
  event: EventDTO;
  hostId: string | null;
  /** Opened from a "Boost this event" button: show the request form. */
  autoOpen?: boolean;
}) {
  const idToken = useIdToken();
  const { data: boost, isLoading } = useEventBoost(event.id, idToken);
  const { data: eligibility } = usePayoutEligibility(hostId, idToken);
  const request = useRequestBoost(idToken);
  const accept = useAcceptBoost(idToken);
  const stop = useStopBoost(idToken);

  const [formOpen, setFormOpen] = useState(autoOpen);
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [channels, setChannels] = useState<BoostChannel[]>([
    "instagram",
    "whatsapp",
  ]);
  const [confirmStop, setConfirmStop] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoOpen) ref.current?.scrollIntoView({ behavior: "smooth" });
  }, [autoOpen]);

  if (!BOOST_ENABLED) return null;
  if (isLoading)
    return (
      <Shell>
        <div className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
      </Shell>
    );

  const quote = previewQuote(event);
  const blockers = boostBlockers(event);
  const hostBlock = eligibility?.boost_blocked
    ? "Boost is switched off on your account after repeated cancellations. Our team will be in touch."
    : eligibility?.paused_until &&
        new Date(eligibility.paused_until).getTime() > Date.now()
      ? `Boost is paused on your account until ${new Date(
          eligibility.paused_until,
        ).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.`
      : (eligibility?.recovery_balance_cents ?? 0) > 0
        ? `Clear the ${rupees(eligibility!.recovery_balance_cents)} you owe from a cancelled event to Boost again.`
        : null;

  const onError = (e: unknown) =>
    toast.error((e as Error).message || "Something went wrong. Try again.");

  const submit = () => {
    if (channels.length === 0) {
      toast.error("Pick at least one channel.");
      return;
    }
    request.mutate(
      {
        eventId: event.id,
        body: {
          goal_text: goal.trim() || undefined,
          audience_notes: audience.trim() || undefined,
          channels,
        },
      },
      {
        onSuccess: () => {
          toast.success("Boost requested. We’ll review it within 24 hours.");
          setFormOpen(false);
        },
        onError,
      },
    );
  };

  const body = (b: BoostDTO | null | undefined) => {
    // ── Live ──
    if (b?.status === "live")
      return (
        <div className="space-y-3">
          <p className="text-sm text-white/70">
            Live since{" "}
            {b.live_from
              ? new Date(b.live_from).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })
              : "today"}
            . Commission applies to tickets sold until you stop or the event
            starts.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Reach" value={b.reach.toLocaleString("en-IN")} />
            <Stat label="Clicks" value={b.clicks.toLocaleString("en-IN")} />
            <Stat label="Tickets sold" value={String(b.tickets_sold)} />
            <Stat label="Commission" value={rupees(b.commission_cents)} />
          </div>
          {confirmStop ? (
            <div className="space-y-2 rounded-2xl border border-white/10 bg-black/25 p-3">
              <p className="text-sm text-white">
                Stop the Boost? Ads stop now and new tickets carry no
                commission.
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

    // ── Under review ──
    if (b?.status === "under_review")
      return (
        <div className="space-y-3">
          <p className="text-sm text-white/70">
            Our team is reviewing your event, usually within 24 hours. You’ll
            get the final rate to accept before anything goes live.
          </p>
          <button
            type="button"
            disabled={stop.isPending}
            onClick={() =>
              stop.mutate(b.id, {
                onSuccess: () => toast.success("Request cancelled."),
                onError,
              })
            }
            className="w-full rounded-full border border-white/15 py-2.5 text-sm font-semibold text-white/85 transition hover:bg-white/[0.06] disabled:opacity-50"
          >
            Cancel request
          </button>
        </div>
      );

    // ── Quote ready ──
    // ── Accepted, waiting for ops to launch the ads ──
    if (b?.status === "quote_ready" && b.accepted_at)
      return (
        <p className="text-sm text-white/70">
          You’ve accepted. Our team is setting up your ads; commission starts
          only once they go live.
        </p>
      );

    if (b?.status === "quote_ready") {
      const rows = b.rates.map((r) => ({
        name: r.ticket_name,
        priceCents: r.price_cents,
        bps: r.rate_bps,
      }));
      const top = Math.max(...b.rates.map((r) => r.rate_bps));
      return (
        <div className="space-y-3">
          <p className="text-sm text-white/70">Your final rate is ready.</p>
          <RateRows rows={rows} />
          {b.topup_reason && <Note>Premium rate: {b.topup_reason}</Note>}
          <div className="rounded-2xl border border-[#B724EA]/30 bg-[#B724EA]/[0.08] p-3 text-xs leading-5 text-white/80">
            MySlotmate keeps {pct(top)} or less of each ticket sold from go-live
            until you stop or the event starts. Guest refunds still pay
            commission. If you cancel or reschedule, you repay what we spent on
            ads, never more than the commission.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={stop.isPending}
              onClick={() =>
                stop.mutate(b.id, {
                  onSuccess: () => toast.success("Quote declined."),
                  onError,
                })
              }
              className="flex-1 rounded-full bg-white/[0.06] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Decline
            </button>
            <button
              type="button"
              disabled={accept.isPending}
              onClick={() =>
                accept.mutate(b.id, {
                  onSuccess: () =>
                    toast.success("Accepted. Your ads go live soon."),
                  onError,
                })
              }
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${GRADIENT}`}
            >
              <FiCheck className="h-4 w-4" />
              {accept.isPending ? "Accepting…" : "Accept"}
            </button>
          </div>
        </div>
      );
    }

    // ── Ended ──
    if (b?.status === "ended")
      return (
        <div className="space-y-3">
          <p className="text-sm text-white/70">
            Your Boost has ended. Here’s how it did.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Tickets sold" value={String(b.tickets_sold)} />
            <Stat label="Commission" value={rupees(b.commission_cents)} />
          </div>
          <Link
            href="/host-dashboard/promote"
            className="block w-full rounded-full border border-white/15 py-2.5 text-center text-sm font-semibold text-white/85 transition hover:bg-white/[0.06]"
          >
            Boost another event
          </Link>
        </div>
      );

    // ── Declined ──
    const declined = b?.status === "declined" ? b : null;

    // ── Not eligible ──
    if (hostBlock) return <p className="text-sm text-white/70">{hostBlock}</p>;
    if (blockers.length > 0)
      return (
        <div className="space-y-2">
          {declined?.decline_reason && (
            <p className="text-sm text-white/70">
              Not approved: {declined.decline_reason}
            </p>
          )}
          <p className="text-sm text-white/70">
            This event can’t be boosted right now.
          </p>
          <ul className="space-y-1 text-sm text-white/55">
            {blockers.map((r) => (
              <li key={r} className="flex gap-2">
                <FiX className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      );

    // ── Eligible: preview + request ──
    const premium = quote.some((q) => q.priceCents >= PREMIUM_PRICE_CENTS);
    return (
      <div ref={ref} className="space-y-3">
        {declined?.decline_reason && (
          <p className="rounded-2xl bg-white/[0.04] px-3 py-2 text-sm text-white/70">
            Last request wasn’t approved: {declined.decline_reason}
          </p>
        )}
        <p className="text-sm text-white/70">
          Our team runs ads for this event. You pay a commission only on tickets
          sold while the Boost is live. Nothing upfront.
        </p>
        <RateRows rows={quote} />
        {premium && (
          <Note>
            Events at ₹5,000+ with a narrow audience may be quoted up to 20%.
            You’ll see the rate and the reason before you accept.
          </Note>
        )}
        {!formOpen ? (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className={`flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-white transition hover:opacity-90 ${GRADIENT}`}
          >
            <FiTrendingUp className="h-4 w-4" /> Request Boost
          </button>
        ) : (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3">
            <label className="block space-y-1">
              <span className="text-xs text-white/55">Goal (optional)</span>
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Sell 50 more tickets"
                className="w-full rounded-xl border border-white/10 bg-[#0D0E1C] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#B57BFF]"
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
                className="w-full resize-none rounded-xl border border-white/10 bg-[#0D0E1C] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#B57BFF]"
              />
            </label>
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-full bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={request.isPending}
                onClick={submit}
                className={`flex-1 rounded-full py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${GRADIENT}`}
              >
                {request.isPending ? "Sending…" : "Send request"}
              </button>
            </div>
          </div>
        )}
        <Note>
          Guest refunds still pay commission. If you cancel or reschedule, you
          repay our actual ad spend, capped at the commission.
        </Note>
      </div>
    );
  };

  return (
    <Shell tone={boost?.status === "live" ? "live" : "default"}>
      {body(boost)}
    </Shell>
  );
}
