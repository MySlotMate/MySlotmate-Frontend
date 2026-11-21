"use client";

/**
 * Promote — every Marketing Boost in one place (PRD: Promote tab).
 * Open and past Boosts with their numbers, and the events a host can boost.
 */

import { useMemo } from "react";
import Link from "next/link";
import { FiTrendingUp } from "react-icons/fi";
import {
  useEventsByHost,
  useHostBoosts,
  usePayoutEligibility,
} from "~/hooks/useApi";
import { useIdToken } from "~/hooks/useIdToken";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import BoostButton, {
  boostHref,
} from "~/components/host-dashboard/boost/BoostButton";
import type { BoostDTO, EventDTO } from "~/lib/api";
import {
  BOOST_ENABLED,
  BOOST_STATUS_LABEL,
  boostBlockers,
  isOpenBoost,
  pct,
  previewQuote,
  rupees,
} from "~/lib/boost";

const card = "rounded-2xl border border-white/10 bg-[#121426]";

function EventThumb({ event }: { event?: EventDTO }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={event?.cover_image_url ?? "/assets/home/hiking.webp"}
      alt=""
      className="h-14 w-12 shrink-0 rounded-lg object-cover"
    />
  );
}

function BoostRow({ boost, event }: { boost: BoostDTO; event?: EventDTO }) {
  const top = boost.rates.length
    ? Math.max(...boost.rates.map((r) => r.rate_bps))
    : null;
  const live = boost.status === "live";
  return (
    <Link
      href={boostHref(boost.event_id)}
      className={`${card} flex items-center gap-4 p-3 transition hover:border-white/20`}
    >
      <EventThumb event={event} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">
          {event?.title ?? "Event"}
        </p>
        <p className="mt-0.5 text-xs text-[#A5A8C3]">
          <span className={live ? "font-semibold text-[#E9D5FF]" : ""}>
            {BOOST_STATUS_LABEL[boost.status]}
          </span>
          {top !== null && <> · {pct(top)} rate</>}
        </p>
      </div>
      <div className="hidden shrink-0 gap-6 text-right sm:flex">
        <div>
          <p className="text-[11px] text-[#777B98] uppercase">Tickets</p>
          <p className="text-sm font-semibold text-white">
            {boost.tickets_sold}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-[#777B98] uppercase">Commission</p>
          <p className="text-sm font-semibold text-white">
            {rupees(boost.commission_cents)}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function PromotePage() {
  const { hostId } = useStoredAuth();
  const idToken = useIdToken();
  const { data: events, isLoading: loadingEvents } = useEventsByHost(hostId);
  const { data: boosts, isLoading: loadingBoosts } = useHostBoosts(idToken);
  const { data: elig } = usePayoutEligibility(hostId, idToken);

  const byId = useMemo(
    () => new Map((events ?? []).map((e) => [e.id, e])),
    [events],
  );
  const sorted = useMemo(
    () =>
      [...(boosts ?? [])].sort((a, b) =>
        b.requested_at.localeCompare(a.requested_at),
      ),
    [boosts],
  );
  const open = sorted.filter((b) => isOpenBoost(b.status));
  const past = sorted.filter((b) => !isOpenBoost(b.status));
  const openIds = new Set(open.map((b) => b.event_id));

  const paidLive = (events ?? []).filter(
    (e) => e.status === "live" && !e.is_free && !openIds.has(e.id),
  );
  const ready = paidLive.filter((e) => boostBlockers(e).length === 0);
  const notYet = paidLive.filter((e) => boostBlockers(e).length > 0);

  const pausedNow =
    !!elig?.paused_until && new Date(elig.paused_until) > new Date();
  const paused =
    !!elig?.boost_blocked ||
    pausedNow ||
    (elig?.recovery_balance_cents ?? 0) > 0;

  const commissionTotal = sorted.reduce((s, b) => s + b.commission_cents, 0);
  const ticketsTotal = sorted.reduce((s, b) => s + b.tickets_sold, 0);

  if (!BOOST_ENABLED)
    return (
      <main className="mx-auto w-full max-w-[1240px] px-4 py-10 sm:px-6 lg:px-10">
        <p className="text-sm text-[#A5A8C3]">
          Marketing Boost is coming soon.
        </p>
      </main>
    );

  const loading = loadingEvents || loadingBoosts;

  return (
    <div className="min-h-screen bg-[#080914]">
      <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 md:py-10 lg:px-10">
        <div className="mb-8">
          <h1 className="font-outfit text-[26px] leading-tight font-semibold tracking-[-0.01em] text-white sm:text-[32px]">
            Promote
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#A5A8C3]">
            Want help selling out? Our team runs ads for your event. You pay a
            commission only on tickets sold while the Boost is live, 12–20%
            depending on ticket price. Nothing upfront, stop anytime.
          </p>
        </div>

        {paused && (
          <div className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-500/[0.08] p-4 text-sm text-amber-100">
            {elig?.boost_blocked
              ? "Boost is switched off on your account after repeated cancellations. Our team will be in touch."
              : (elig?.recovery_balance_cents ?? 0) > 0
                ? `You owe ${rupees(elig!.recovery_balance_cents)} from a cancelled event. It comes off your next payouts; Boost reopens once it’s cleared.`
                : `Boost is paused after two host cancellations in 90 days. It reopens on ${new Date(elig!.paused_until!).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}.`}
          </div>
        )}

        {sorted.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className={`${card} p-4`}>
              <p className="text-xs text-[#777B98]">Live now</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {sorted.filter((b) => b.status === "live").length}
              </p>
            </div>
            <div className={`${card} p-4`}>
              <p className="text-xs text-[#777B98]">Tickets from Boosts</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {ticketsTotal}
              </p>
            </div>
            <div className={`${card} col-span-2 p-4 sm:col-span-1`}>
              <p className="text-xs text-[#777B98]">Commission to date</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {rupees(commissionTotal)}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl bg-white/[0.04]"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {open.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-bold text-white">
                  Your Boosts
                </h2>
                <div className="space-y-3">
                  {open.map((b) => (
                    <BoostRow
                      key={b.id}
                      boost={b}
                      event={byId.get(b.event_id)}
                    />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-3 text-lg font-bold text-white">
                Ready to boost
              </h2>
              {ready.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#121426] p-6 text-center text-sm text-[#777B98]">
                  No events ready right now. Paid, live events with at least 10
                  days to go can be boosted.{" "}
                  <Link
                    href="/host-dashboard/experiences/new"
                    className="text-[#D8B4FE] hover:underline"
                  >
                    Create an event
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {ready.map((e) => {
                    const q = previewQuote(e);
                    const first = q[0];
                    return (
                      <div
                        key={e.id}
                        className={`${card} flex items-center gap-4 p-3`}
                      >
                        <EventThumb event={e} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {e.title}
                          </p>
                          {first && (
                            <p className="mt-0.5 text-xs text-[#A5A8C3]">
                              {pct(first.bps)}, {rupees(first.commissionCents)}{" "}
                              per {rupees(first.priceCents)} ticket
                              {q.length > 1 && ` · ${q.length} ticket types`}
                            </p>
                          )}
                        </div>
                        {!paused && <BoostButton eventId={e.id} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {notYet.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-bold text-white">
                  Not ready yet
                </h2>
                <div className="space-y-3">
                  {notYet.map((e) => (
                    <div
                      key={e.id}
                      className={`${card} flex items-center gap-4 p-3 opacity-80`}
                    >
                      <EventThumb event={e} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {e.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[#777B98]">
                          {boostBlockers(e)[0]}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-bold text-white">
                  Past Boosts
                </h2>
                <div className="space-y-3">
                  {past.map((b) => (
                    <BoostRow
                      key={b.id}
                      boost={b}
                      event={byId.get(b.event_id)}
                    />
                  ))}
                </div>
              </section>
            )}

            <p className="flex items-start gap-2 text-xs leading-5 text-[#777B98]">
              <FiTrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Guest refunds still pay commission. If you cancel or reschedule a
              Boosted event, you repay our actual ad spend, never more than the
              commission. Repeated host cancellations pause Boost.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
