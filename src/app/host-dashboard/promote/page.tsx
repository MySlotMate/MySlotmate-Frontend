"use client";

/**
 * Promote — every Marketing Boost in one place (PRD: Promote tab).
 * Open and past Boosts with their numbers, and the events a host can boost.
 */

import { useEffect, useMemo, useState } from "react";
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
import EventCover from "~/components/EventCover";

const card = "rounded-2xl border border-white/10 bg-[#121426]";

function EventThumb({ event }: { event?: EventDTO }) {
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

function BoostRow({ boost, event }: { boost: BoostDTO; event?: EventDTO }) {
  const top = boost.rates.length
    ? Math.max(...boost.rates.map((r) => r.rate_bps))
    : null;
  const live = boost.status === "live";
  return (
    <Link
      href={boostHref(boost.event_id)}
      className={`${card} flex items-center gap-3 p-3 transition hover:border-white/20`}
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

  const [tab, setTab] = useState<"boost" | "mine">("boost");
  // Hosts with a Boost running land on it first.
  useEffect(() => {
    if (open.length > 0) setTab("mine");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open.length > 0]);

  if (!BOOST_ENABLED)
    return (
      <main className="mx-auto w-full max-w-[1000px] px-4 py-10 sm:px-6">
        <div className={`${card} p-8 text-center`}>
          <FiTrendingUp className="mx-auto h-6 w-6 text-[#D8B4FE]" />
          <p className="mt-3 text-sm font-semibold text-white">
            Marketing Boost is coming soon
          </p>
          <p className="mt-1 text-xs text-[#777B98]">
            We&apos;ll run ads for your events and you&apos;ll pay only on
            tickets sold.
          </p>
        </div>
      </main>
    );

  const loading = loadingEvents || loadingBoosts;

  return (
    <div className="min-h-screen bg-[#080914]">
      <main className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:px-6 md:py-10">
        <h1 className="font-outfit text-[26px] leading-tight font-semibold tracking-[-0.01em] text-white sm:text-[32px]">
          Promote
        </h1>
        <p className="mt-1 text-sm text-[#A5A8C3]">
          Let our team run ads for your event. Nothing upfront.
        </p>

        {/* How it works, in three steps */}
        <ol className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            ["Ask for a Boost", "Pick a paid event at least 10 days away."],
            ["We run the ads", "Our team sets them up and keeps them going."],
            [
              "Pay only on sales",
              "12–20% of each ticket sold while it's live. Stop anytime.",
            ],
          ].map(([title, body], i) => (
            <li key={title} className={`${card} flex gap-3 p-3.5`}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#A020F0]/20 text-xs font-semibold text-[#E9D5FF]">
                {i + 1}
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">
                  {title}
                </span>
                <span className="block text-xs text-[#777B98]">{body}</span>
              </span>
            </li>
          ))}
        </ol>

        {paused && (
          <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/[0.08] p-4 text-sm text-amber-100">
            {elig?.boost_blocked
              ? "Boost is switched off on your account after repeated cancellations. Our team will be in touch."
              : (elig?.recovery_balance_cents ?? 0) > 0
                ? `You owe ${rupees(elig!.recovery_balance_cents)} from a cancelled event. It comes off your next payouts; Boost reopens once it’s cleared.`
                : `Boost is paused after two host cancellations in 90 days. It reopens on ${new Date(elig!.paused_until!).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}.`}
          </div>
        )}

        {sorted.length > 0 && (
          <dl className={`${card} mt-4 grid grid-cols-3 gap-2 p-4`}>
            {[
              ["Live now", sorted.filter((b) => b.status === "live").length],
              ["Tickets from Boosts", ticketsTotal],
              ["Commission so far", rupees(commissionTotal)],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-[11px] text-[#777B98] sm:text-xs">
                  {label}
                </dt>
                <dd className="mt-0.5 text-lg font-semibold text-white">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {/* Tabs */}
        <div className="mt-6 flex rounded-full border border-white/10 bg-[#121426] p-1">
          {(
            [
              ["boost", "Boost an event", ready.length],
              ["mine", "Your Boosts", sorted.length],
            ] as const
          ).map(([key, label, n]) => (
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
              <span className="ml-1.5 text-xs opacity-70">{n}</span>
            </button>
          ))}
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-2xl bg-white/[0.04]"
                />
              ))}
            </div>
          ) : tab === "boost" ? (
            <div className="space-y-2">
              {ready.length === 0 && notYet.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#121426] p-8 text-center text-sm text-[#777B98]">
                  No paid, live events to boost yet.{" "}
                  <Link
                    href="/host-dashboard/experiences/new"
                    className="font-semibold text-[#D8B4FE] hover:underline"
                  >
                    Create an event
                  </Link>
                </div>
              )}
              {ready.map((e) => {
                const q = previewQuote(e);
                const first = q[0];
                return (
                  <div
                    key={e.id}
                    className={`${card} flex items-center gap-3 p-3`}
                  >
                    <EventThumb event={e} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {e.title}
                      </p>
                      {first && (
                        <p className="mt-0.5 text-xs text-[#A5A8C3]">
                          {pct(first.bps)} · {rupees(first.commissionCents)} per{" "}
                          {rupees(first.priceCents)} ticket
                          {q.length > 1 && ` · ${q.length} ticket types`}
                        </p>
                      )}
                    </div>
                    {!paused && <BoostButton eventId={e.id} />}
                  </div>
                );
              })}
              {notYet.length > 0 && (
                <>
                  <p className="px-1 pt-3 text-xs font-medium text-[#777B98]">
                    Not ready yet
                  </p>
                  {notYet.map((e) => (
                    <div
                      key={e.id}
                      className={`${card} flex items-center gap-3 p-3 opacity-70`}
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
                </>
              )}
            </div>
          ) : sorted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#121426] p-8 text-center text-sm text-[#777B98]">
              You haven&apos;t boosted an event yet.
            </div>
          ) : (
            <div className="space-y-2">
              {open.map((b) => (
                <BoostRow key={b.id} boost={b} event={byId.get(b.event_id)} />
              ))}
              {past.length > 0 && (
                <>
                  <p className="px-1 pt-3 text-xs font-medium text-[#777B98]">
                    Past
                  </p>
                  {past.map((b) => (
                    <BoostRow
                      key={b.id}
                      boost={b}
                      event={byId.get(b.event_id)}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <p className="mt-6 text-xs leading-5 text-[#777B98]">
          Guest refunds still pay commission. If you cancel or reschedule a
          Boosted event, you repay our actual ad spend, never more than the
          commission. Repeated host cancellations pause Boost.
        </p>
      </main>
    </div>
  );
}
