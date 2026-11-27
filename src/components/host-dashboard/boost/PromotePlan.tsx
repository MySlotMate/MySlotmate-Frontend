"use client";

/**
 * Promote for the paid-budget Boost (PRD: Premium Hosts and paid Boost
 * marketing). Premium hosts see their Boosts with spend and results, and the
 * events they can boost; everyone else sees Boost locked with the invitation.
 */

import Link from "next/link";
import { FiLock, FiTrendingUp, FiZap } from "react-icons/fi";
import { useEventsByHost } from "~/hooks/useApi";
import { useIdToken } from "~/hooks/useIdToken";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { usePlanBoosts, usePremium } from "~/hooks/useBoostPlan";
import { boostBlockers, rupees } from "~/lib/boost";
import { PLAN_STATUS_LABEL, type PlanBoostDTO } from "~/lib/boostPlan";
import type { EventDTO } from "~/lib/api";
import EventCover from "~/components/EventCover";
import { boostHref } from "./BoostButton";
import { GRADIENT } from "./parts";

const card = "rounded-2xl border border-white/10 bg-[#121426]";

function Thumb({ event }: { event?: EventDTO }) {
  return (
    <EventCover
      src={event?.cover_image_url}
      alt=""
      seed={event?.id}
      mood={event?.mood}
      iconSize="sm"
      blurFill
      className="aspect-[4/5] w-11 shrink-0 rounded-lg"
    />
  );
}

function Row({ b, event }: { b: PlanBoostDTO; event?: EventDTO }) {
  const used = b.budget_total_cents
    ? Math.min(100, Math.round((b.spent_cents / b.budget_total_cents) * 100))
    : 0;
  const needs =
    (b.status === "quote_ready" && !b.accepted_at) ||
    (b.status === "quote_ready" && b.budget_status === "unpaid") ||
    b.creatives_need_action > 0;
  return (
    <Link
      href={boostHref(b.event_id)}
      className={`${card} flex items-center gap-3 p-3 transition hover:border-white/20`}
    >
      <Thumb event={event} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-semibold text-white">
          {event?.title ?? "Event"}
        </p>
        <p className="text-xs text-[#A5A8C3]">
          {PLAN_STATUS_LABEL(b)}
          {b.pricing_model === "budget" && b.budget_total_cents > 0
            ? ` · ${rupees(b.spent_cents)} of ${rupees(b.budget_total_cents)} spent`
            : ""}
          {b.tickets_sold > 0 ? ` · ${b.tickets_sold} sold` : ""}
        </p>
        {b.status === "live" && (
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className={`h-full ${GRADIENT}`}
              style={{ width: `${used}%` }}
            />
          </div>
        )}
      </div>
      {needs && (
        <span className="shrink-0 rounded-full bg-[#B724EA]/25 px-2.5 py-1 text-[11px] font-semibold text-white">
          Needs you
        </span>
      )}
    </Link>
  );
}

export default function PromotePlan() {
  const { hostId } = useStoredAuth();
  const idToken = useIdToken();
  const { data: premium, isLoading: loadingPremium } = usePremium(idToken);
  const { data: events = [] } = useEventsByHost(hostId);
  const { data: boosts = [], isLoading } = usePlanBoosts(idToken);
  const byId = new Map(events.map((e) => [e.id, e]));
  const sorted = [...boosts].sort((a, b) =>
    b.requested_at.localeCompare(a.requested_at),
  );
  const isOpen = (b: PlanBoostDTO) =>
    ["under_review", "quote_ready", "live"].includes(b.status);
  const open = sorted.filter(isOpen);
  const past = sorted.filter((b) => !isOpen(b));
  const openIds = new Set(open.map((b) => b.event_id));
  const ready = events.filter(
    (e) =>
      e.status === "live" &&
      !e.is_free &&
      !openIds.has(e.id) &&
      boostBlockers(e).length === 0,
  );
  const active = premium?.status === "active";
  const spent = sorted.reduce((s, b) => s + b.spent_cents, 0);
  const sold = sorted.reduce((s, b) => s + b.tickets_sold, 0);

  return (
    <div className="min-h-screen bg-[#080914]">
      <main className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:px-6 md:py-10">
        <h1 className="font-outfit text-[26px] leading-tight font-semibold tracking-[-0.01em] text-white sm:text-[32px]">
          Promote
        </h1>
        <p className="mt-1 text-sm text-[#A5A8C3]">
          Our team runs ads for your events. You set the ad budget; we take a
          fee on the tickets they sell.
        </p>

        {!loadingPremium && !active && (
          <section
            className={`${card} mt-5 flex flex-wrap items-center gap-4 p-5`}
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full ${GRADIENT}`}
            >
              <FiLock className="h-5 w-5 text-white" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                Boost is for Premium hosts
              </p>
              <p className="mt-0.5 text-xs text-[#A5A8C3]">
                {premium?.status === "applied"
                  ? "Your application is with our team. We’ll email you within a day."
                  : "Free to join. A named campaign manager, creatives made for you and a featured slot."}
              </p>
            </div>
            {premium?.status !== "applied" && (
              <Link
                href="/host-dashboard/premium"
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white ${GRADIENT}`}
              >
                <FiZap className="h-4 w-4" /> Join Premium
              </Link>
            )}
          </section>
        )}

        {sorted.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className={`${card} p-3`}>
              <p className="text-[11px] tracking-wide text-white/45 uppercase">
                Ad spend
              </p>
              <p className="mt-0.5 text-lg font-semibold text-white">
                {rupees(spent)}
              </p>
            </div>
            <div className={`${card} p-3`}>
              <p className="text-[11px] tracking-wide text-white/45 uppercase">
                Tickets sold
              </p>
              <p className="mt-0.5 text-lg font-semibold text-white">{sold}</p>
            </div>
            <div className={`${card} col-span-2 p-3 sm:col-span-1`}>
              <p className="text-[11px] tracking-wide text-white/45 uppercase">
                Cost per ticket
              </p>
              <p className="mt-0.5 text-lg font-semibold text-white">
                {sold > 0 ? rupees(Math.round(spent / sold)) : "—"}
              </p>
            </div>
          </div>
        )}

        <h2 className="mt-8 text-sm font-semibold text-white">Your Boosts</h2>
        <div className="mt-3 space-y-2">
          {isLoading ? (
            <div className={`${card} h-16 animate-pulse`} />
          ) : open.length === 0 ? (
            <p className="text-sm text-[#777B98]">
              No Boost running right now.
            </p>
          ) : (
            open.map((b) => (
              <Row key={b.id} b={b} event={byId.get(b.event_id)} />
            ))
          )}
        </div>

        {active && (
          <>
            <h2 className="mt-8 text-sm font-semibold text-white">
              Ready to boost
            </h2>
            <div className="mt-3 space-y-2">
              {ready.length === 0 ? (
                <p className="text-sm text-[#777B98]">
                  Paid, published events at least 10 days away show here.
                </p>
              ) : (
                ready.map((e) => (
                  <Link
                    key={e.id}
                    href={boostHref(e.id)}
                    className={`${card} flex items-center gap-3 p-3 transition hover:border-white/20`}
                  >
                    <Thumb event={e} />
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                      {e.title}
                    </p>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#D8B4FE]">
                      <FiTrendingUp className="h-3.5 w-3.5" /> Plan a Boost
                    </span>
                  </Link>
                ))
              )}
            </div>
          </>
        )}

        {past.length > 0 && (
          <>
            <h2 className="mt-8 text-sm font-semibold text-white">
              Past Boosts
            </h2>
            <div className="mt-3 space-y-2">
              {past.map((b) => (
                <Row key={b.id} b={b} event={byId.get(b.event_id)} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
