/**
 * Marketing Boost and payout-timing rules shared by the host dashboard.
 * Source: Host Partnership PRD — Marketing Boost (v2).
 *
 * The backend is the authority: it quotes, locks rates and decides
 * eligibility. These helpers only preview the same numbers so a host sees
 * the rupee cost before asking, and so the UI can explain a "no".
 */
import { env } from "~/env";
import type { BoostStatus, EventDTO, PayoutMode } from "~/lib/api";

const isProd = process.env.NODE_ENV === "production";

/** Unset flag: on in development, off in production. */
const flag = (v: "true" | "false" | undefined) =>
  v === "true" || (v === undefined && !isProd);

export const BOOST_ENABLED = flag(env.NEXT_PUBLIC_ENABLE_BOOST);
export const WEEKLY_PAYOUTS_ENABLED = flag(
  env.NEXT_PUBLIC_ENABLE_WEEKLY_PAYOUTS,
);

// ─── Rates ───────────────────────────────────────────────────────────────────

/** Base Boost rate by ticket price (paise → basis points). */
const TIERS: { maxCents: number; bps: number }[] = [
  { maxCents: 49_999, bps: 2000 }, // under ₹500
  { maxCents: 99_999, bps: 2000 }, // ₹500–999
  { maxCents: 199_999, bps: 1500 }, // ₹1,000–1,999
  { maxCents: 499_999, bps: 1200 }, // ₹2,000–4,999
  { maxCents: Number.POSITIVE_INFINITY, bps: 1200 }, // ₹5,000+ (may be topped up to 20%)
];

export const PREMIUM_PRICE_CENTS = 500_000;

export function boostRateBps(priceCents: number) {
  return TIERS.find((t) => priceCents <= t.maxCents)!.bps;
}

export const commissionCents = (priceCents: number, bps: number) =>
  Math.round((priceCents * bps) / 10_000);

export interface QuoteLine {
  name: string;
  priceCents: number;
  bps: number;
  commissionCents: number;
}

/** One line per active ticket type, or the event's single price. */
export function previewQuote(event: EventDTO): QuoteLine[] {
  const tiers = (event.price_tiers ?? []).filter(
    (t) => t.is_active && t.price_cents > 0,
  );
  const sources =
    tiers.length > 0
      ? tiers.map((t) => ({ name: t.name, priceCents: t.price_cents }))
      : event.price_cents
        ? [{ name: "Ticket", priceCents: event.price_cents }]
        : [];
  return sources.map((s) => {
    const bps = boostRateBps(s.priceCents);
    return { ...s, bps, commissionCents: commissionCents(s.priceCents, bps) };
  });
}

// ─── Eligibility (PRD guardrails) ────────────────────────────────────────────

export const MIN_DAYS_BEFORE_EVENT = 10;
export const MIN_UNSOLD = 20;
export const MIN_UNSOLD_UNDER_500 = 50;

/** First upcoming date of an event, or null when it has none. */
export function nextEventDate(event: EventDTO): Date | null {
  const now = Date.now();
  const candidates = [
    event.next_available_date,
    event.time,
    ...(event.custom_dates ?? []),
  ]
    .filter((d): d is string => !!d)
    .map((d) => new Date(d))
    .filter((d) => d.getTime() > now)
    .sort((a, b) => a.getTime() - b.getTime());
  return candidates[0] ?? null;
}

/** Reasons this event can't be Boosted yet, empty when it can. Unsold
 *  tickets need live availability, so that check stays with the backend. */
export function boostBlockers(event: EventDTO): string[] {
  const out: string[] = [];
  if (event.is_free || !event.price_cents)
    out.push("Free events can’t be boosted.");
  if (event.status !== "live") out.push("Publish the event first.");
  const next = nextEventDate(event);
  if (!next) out.push("This event has no upcoming dates.");
  else if (
    next.getTime() - Date.now() <
    MIN_DAYS_BEFORE_EVENT * 24 * 60 * 60 * 1000
  )
    out.push(`Less than ${MIN_DAYS_BEFORE_EVENT} days to go.`);
  return out;
}

export const canBoost = (event: EventDTO) => boostBlockers(event).length === 0;

// ─── Status copy ─────────────────────────────────────────────────────────────

export const BOOST_STATUS_LABEL: Record<BoostStatus, string> = {
  under_review: "Under review",
  quote_ready: "Quote ready",
  live: "Boosted",
  ended: "Boost ended",
  declined: "Not approved",
  cancelled: "Cancelled",
};

/** Statuses where the host has an open Boost on the event. */
export const isOpenBoost = (s: BoostStatus | undefined) =>
  s === "under_review" || s === "quote_ready" || s === "live";

// ─── Payout timing ───────────────────────────────────────────────────────────

/** Share of an event's earnings a weekly-payout host can take before it. */
export const EARLY_PAYOUT_SHARE = 0.5;

export const PAYOUT_MODES: {
  value: PayoutMode;
  label: string;
  description: string;
}[] = [
  {
    value: "after_event",
    label: "After the event",
    description:
      "Paid once the event is over. Pick any refund policy you like.",
  },
  {
    value: "weekly",
    label: "Weekly, 50% early",
    description:
      "Up to 50% of your earnings paid weekly as tickets sell, the rest after the event. Refunds are fixed to No refunds.",
  },
];

export const NO_REFUND_POLICY = "no_refund";

// ─── Formatting ──────────────────────────────────────────────────────────────

export const rupees = (cents: number) =>
  `₹${(cents / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const pct = (bps: number) => `${bps / 100}%`;
