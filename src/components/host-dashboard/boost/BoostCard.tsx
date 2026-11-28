"use client";

/**
 * The Boost card on a host's event (PRD: Boost card states).
 * Shows eligibility, an instant rate preview, the request form, the quote to
 * accept, live stats with a stop button, and the final report.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FiCheck, FiTrendingUp, FiX } from "react-icons/fi";
import {
  useAcceptBoost,
  useEventBoost,
  usePayoutEligibility,
  useRequestBoost,
  useStopBoost,
} from "~/hooks/useApi";
import { useIdToken } from "~/hooks/useIdToken";
import type { BoostChannel, BoostDTO, EventDTO } from "~/lib/api";
import { CHANNELS, GRADIENT, Note, RateRows, Shell, Stat } from "./parts";
import BoostPlanCard from "./BoostPlanCard";
import { BOOST_PLAN_ENABLED } from "~/lib/boostPlan";
import {
  BOOST_ENABLED,
  boostBlockers,
  pct,
  previewQuote,
  rupees,
} from "~/lib/boost";

function LegacyBoostCard({
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
            . Commission applies to tickets sold until{" "}
            {b.live_until
              ? new Date(b.live_until).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })
              : "you stop it"}
            . If a guest cancels in time for a full refund, its commission is
            returned. If you cancel the event or pause a session, guests are
            refunded in full but the commission is still charged.
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
        guideBps: r.guide_rate_bps,
        reason: r.reason,
      }));
      const top = Math.max(...b.rates.map((r) => r.rate_bps));
      return (
        <div className="space-y-3">
          <p className="text-sm text-white/70">
            Our team’s proposal is ready. Nothing is charged until you accept
            and the ads go live.
          </p>
          <RateRows rows={rows} />
          {b.admin_note && (
            <p className="rounded-2xl bg-white/[0.04] px-3 py-2 text-sm whitespace-pre-line text-white/80">
              <span className="text-white/50">From the Myslotmate team: </span>
              {b.admin_note}
            </p>
          )}
          <div className="rounded-2xl border border-[#B724EA]/30 bg-[#B724EA]/[0.08] p-3 text-xs leading-5 text-white/80">
            Myslotmate keeps {pct(top)} or less of each ticket sold while the
            Boost is live, from go-live until it ends or you stop it. The
            commission comes out of your share; guests pay the same price. If a
            guest cancels in time for a full refund, its commission is returned.
            If you cancel the event or pause a session, guests are refunded in
            full but the commission is still charged. Your refund policy must
            stay Moderate, Strict or No refunds while the Boost runs.
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
            <Stat label="Reach" value={b.reach.toLocaleString("en-IN")} />
            <Stat label="Clicks" value={b.clicks.toLocaleString("en-IN")} />
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
    if (eligibility?.boost_invited === false)
      return (
        <div className="space-y-2">
          {declined?.decline_reason && (
            <p className="text-sm text-white/70">
              Not approved: {declined.decline_reason}
            </p>
          )}
          <p className="text-sm text-white/70">
            Marketing Boost is in a pilot with a small group of hosts. Write to
            us at support@myslotmate.com if you’d like to join.
          </p>
        </div>
      );
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
    const premium = quote.some((q) => q.priceCents >= 100_000);
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
            For tickets of ₹1,000 or more our team may propose a different rate,
            up to 20%. You’ll see the rate and the reason before you accept.
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
          The commission comes out of your share of tickets sold while the Boost
          is live; guests pay the same price. Boosted events need a Moderate,
          Strict or No refunds policy. If a guest cancels in time for a full
          refund, its commission is returned. If you cancel the event or pause a
          session, guests are refunded in full but the commission is still
          charged.
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

/** The paid-budget Boost for Premium hosts when it's switched on, else today's. */
export default function BoostCard(props: {
  event: EventDTO;
  hostId: string | null;
  autoOpen?: boolean;
}) {
  return BOOST_PLAN_ENABLED ? (
    <BoostPlanCard {...props} />
  ) : (
    <LegacyBoostCard {...props} />
  );
}
