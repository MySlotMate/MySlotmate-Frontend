/**
 * Boost with a paid ad budget, for Premium hosts (PRD: Premium Hosts and paid
 * Boost marketing). The host pays the ad budget upfront (not refundable) and a
 * marketing fee on tickets sold while the Boost is live. Only Active Premium
 * hosts can Boost; Premium is free, by approval.
 *
 * The backend is the authority. This file holds the types of the PRD's API,
 * the calls to it, and a preview of the same numbers so the host sees the cost
 * while planning. The backend serves every route (myslotmate-backend
 * docs/premium-and-paid-boost.md); NEXT_PUBLIC_BOOST_PLAN_MOCK="true" swaps in
 * an in-browser stand-in (boostPlanMock.ts) for trying the screens without it.
 */
import { env } from "~/env";
import { apiFetch } from "~/lib/api";
import type { BoostChannel, BoostDTO, BoostStatus, EventDTO } from "~/lib/api";
import { commissionCents, nextEventDate } from "~/lib/boost";
import { boostPlanMock } from "~/lib/boostPlanMock";

const isProd = process.env.NODE_ENV === "production";
/** Unset flag: on in development, off in production. */
const flag = (v: "true" | "false" | undefined) =>
  v === "true" || (v === undefined && !isProd);

/** The paid-budget Boost and Premium. Off in production until the backend ships. */
export const BOOST_PLAN_ENABLED = flag(env.NEXT_PUBLIC_ENABLE_BOOST_PLAN);
/** Test mode, only when asked for: the backend serves every route now. */
export const BOOST_PLAN_MOCK = env.NEXT_PUBLIC_BOOST_PLAN_MOCK === "true";

// ─── Rules (preview only; the backend decides) ──────────────────────────────

/** Marketing fee by ticket price, band version 2: higher price, lower fee. */
const FEE_BANDS: {
  maxCents: number;
  bps: number;
  minBps: number;
  maxBps: number;
}[] = [
  { maxCents: 49_999, bps: 1000, minBps: 800, maxBps: 1200 }, // under ₹500
  { maxCents: 99_999, bps: 800, minBps: 600, maxBps: 1000 }, // ₹500–999
  { maxCents: 199_999, bps: 700, minBps: 500, maxBps: 1000 }, // ₹1,000–1,999
  { maxCents: 499_999, bps: 600, minBps: 500, maxBps: 800 }, // ₹2,000–4,999
  { maxCents: Number.POSITIVE_INFINITY, bps: 500, minBps: 400, maxBps: 800 }, // ₹5,000+
];

export const feeBand = (priceCents: number) =>
  FEE_BANDS.find((b) => priceCents <= b.maxCents)!;

/**
 * The budget rules and upload limits the admin sets (Boost settings), read
 * from GET /boost/settings. DEFAULT_RULES only fills in until that loads.
 */
export interface BoostRules {
  min_daily_budget_cents: number;
  budget_step_cents: number;
  min_days: number;
  payment_window_days: number;
  budget_gst_bps: number;
  budget_required: boolean;
  creative_image_max_mb: number;
  creative_video_max_mb: number;
  creative_other_max_mb: number;
  report_max_mb: number;
}

export const DEFAULT_RULES: BoostRules = {
  min_daily_budget_cents: 50_000, // ₹500
  budget_step_cents: 10_000, // ₹100
  min_days: 3,
  payment_window_days: 7,
  budget_gst_bps: 1800,
  budget_required: false,
  creative_image_max_mb: 20,
  creative_video_max_mb: 200,
  creative_other_max_mb: 50,
  report_max_mb: 50,
};

export const MIN_DAILY_BUDGET_CENTS = DEFAULT_RULES.min_daily_budget_cents;
export const DAILY_BUDGET_STEP_CENTS = DEFAULT_RULES.budget_step_cents;
export const MIN_BUDGET_DAYS = DEFAULT_RULES.min_days;
export const BUDGET_GST_BPS = DEFAULT_RULES.budget_gst_bps;
export const PAYMENT_WINDOW_DAYS = DEFAULT_RULES.payment_window_days;

export const gstOn = (cents: number, bps = BUDGET_GST_BPS) =>
  Math.round((cents * bps) / 10_000);

/** YYYY-MM-DD in India time. */
export function isoDay(d: Date) {
  return new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

export function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Days from `from` to `until`, both included. */
export function daysBetween(from: string, until: string) {
  const ms =
    new Date(`${until}T00:00:00Z`).getTime() -
    new Date(`${from}T00:00:00Z`).getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

export interface FeeLine {
  ticket_key: string;
  ticket_name: string;
  price_cents: number;
  rate_bps: number;
  fee_cents: number;
}

/** One line per active paid ticket type, or the event's single price. */
export function feeLines(event: EventDTO): FeeLine[] {
  const tiers = (event.price_tiers ?? []).filter(
    (t) => t.is_active && t.price_cents > 0,
  );
  const src =
    tiers.length > 0
      ? tiers.map((t) => ({ key: t.id, name: t.name, price: t.price_cents }))
      : event.price_cents
        ? [{ key: "", name: "Ticket", price: event.price_cents }]
        : [];
  return src.map((s) => {
    const bps = feeBand(s.price).bps;
    return {
      ticket_key: s.key,
      ticket_name: s.name,
      price_cents: s.price,
      rate_bps: bps,
      fee_cents: commissionCents(s.price, bps),
    };
  });
}

export interface BudgetPlan {
  daily_budget_cents: number;
  budget_from: string; // YYYY-MM-DD
  budget_until: string; // YYYY-MM-DD, included
}

export interface PlanEstimate {
  days: number;
  budget_total_cents: number;
  budget_gst_cents: number;
  total_payable_cents: number;
  problems: string[];
}

/** The latest day a Boost can run: the event's next date (or last custom date). */
export function lastBoostDay(event: EventDTO): string | null {
  const dates = [
    event.time,
    ...(event.custom_dates ?? []),
    event.next_available_date,
  ]
    .filter((d): d is string => !!d)
    .map((d) => new Date(d))
    .filter((d) => d.getTime() > Date.now())
    .sort((a, b) => b.getTime() - a.getTime());
  const last = dates[0] ?? nextEventDate(event);
  return last ? isoDay(last) : null;
}

export function estimatePlan(
  plan: BudgetPlan,
  lastDay: string | null,
  rules: BoostRules = DEFAULT_RULES,
): PlanEstimate {
  const problems: string[] = [];
  const today = isoDay(new Date());
  const days =
    plan.budget_from && plan.budget_until
      ? Math.max(0, daysBetween(plan.budget_from, plan.budget_until))
      : 0;
  if (plan.daily_budget_cents < rules.min_daily_budget_cents)
    problems.push(
      `The daily budget is at least ₹${rules.min_daily_budget_cents / 100}.`,
    );
  if (plan.daily_budget_cents % rules.budget_step_cents !== 0)
    problems.push(`Use steps of ₹${rules.budget_step_cents / 100}.`);
  if (plan.budget_from && plan.budget_from < today)
    problems.push("The start date can't be in the past.");
  if (days < rules.min_days)
    problems.push(
      `Run it for at least ${rules.min_days} day${rules.min_days === 1 ? "" : "s"}.`,
    );
  if (lastDay && plan.budget_until > lastDay)
    problems.push("The end date can't be after the event's last date.");
  const total = plan.daily_budget_cents * days;
  const gst = gstOn(total, rules.budget_gst_bps);
  return {
    days,
    budget_total_cents: total,
    budget_gst_cents: gst,
    total_payable_cents: total + gst,
    problems,
  };
}

// ─── Types (the PRD's API) ──────────────────────────────────────────────────

export type PremiumStatus =
  | "none"
  | "applied"
  | "active"
  | "declined"
  | "removed";

export interface PremiumDTO {
  status: PremiumStatus;
  applied_at: string | null;
  decided_at: string | null;
  manager_name: string | null;
  manager_contact: string | null;
  decline_reason: string | null;
  remove_reason: string | null;
}

export type BudgetStatus = "unpaid" | "paid" | "not_required";

export interface PlanBoostDTO extends BoostDTO {
  pricing_model: "no_upfront" | "budget";
  daily_budget_cents: number | null;
  budget_from: string | null;
  budget_until: string | null;
  budget_total_cents: number;
  budget_gst_cents: number;
  budget_status: BudgetStatus;
  payment_due_by: string | null;
  spent_cents: number;
  closed_at: string | null;
  creatives_count: number;
  creatives_need_action: number;
  reports_count: number;
  audience_notes?: string | null;
}

export interface PlanRequestPayload extends BudgetPlan {
  channels: BoostChannel[];
  goal_text?: string;
  audience_notes?: string;
}

export type PaymentKind = "budget" | "top_up";

export interface PaymentOrder {
  payment_id: string;
  key_id: string;
  order_id: string;
  amount_cents: number;
  currency: string;
}

export interface TopUpPayload {
  kind: "top_up";
  days_added?: number;
  daily_budget_cents?: number;
}

export type CreativeType = "reel" | "post" | "story" | "brand";
export type CreativeStatus =
  | "submitted"
  | "in_use"
  | "needs_changes"
  | "not_used"
  | "awaiting_approval"
  | "approved"
  | "changes_requested";

export interface StoredFile {
  key: string;
  url: string;
  name: string;
  mime_type: string;
  size: number;
}

export interface CreativeDTO {
  id: string;
  boost_id: string;
  type: CreativeType;
  files: StoredFile[];
  caption: string | null;
  channels: BoostChannel[];
  uploaded_by_kind: "host" | "admin";
  status: CreativeStatus;
  status_note: string | null;
  created_at: string;
}

export interface CreativePayload {
  type: CreativeType;
  file_keys: string[];
  caption?: string;
  channels?: BoostChannel[];
}

export interface ReportDTO {
  id: string;
  kind: "update" | "final";
  title: string;
  covers_from: string | null;
  covers_until: string | null;
  note: string | null;
  file: StoredFile;
  created_at: string;
}

export interface ResultsDay {
  day: string;
  spend_cents: number;
  impressions: number;
  reach: number;
  clicks: number;
  tickets_sold: number;
}

export interface ResultsDTO {
  days: ResultsDay[];
  channels: {
    channel: BoostChannel;
    spend_cents: number;
    impressions: number;
    reach: number;
    clicks: number;
  }[];
  totals: Omit<ResultsDay, "day">;
}

export interface BudgetInvoiceDTO {
  id: string;
  number: string;
  amount_cents: number;
  gst_cents: number;
  issued_at: string;
  pdf_url: string | null;
}

// ─── Creative upload rules (PRD: Creatives) ─────────────────────────────────

const MB = 1024 * 1024;

export const CREATIVE_TYPES: {
  value: CreativeType;
  label: string;
  hint: string;
  accept: string;
  maxFiles: number;
}[] = [
  {
    value: "reel",
    label: "Reel",
    hint: "Vertical video, 9:16, up to 90 seconds",
    accept: "video/mp4,video/quicktime",
    maxFiles: 1,
  },
  {
    value: "post",
    label: "Post",
    hint: "Image 1:1 or 4:5, a carousel of up to 10, or a video up to 60 seconds",
    accept: "image/jpeg,image/png,video/mp4,video/quicktime",
    maxFiles: 10,
  },
  {
    value: "story",
    label: "Story",
    hint: "Vertical image or video, 9:16, video up to 60 seconds",
    accept: "image/jpeg,image/png,video/mp4,video/quicktime",
    maxFiles: 1,
  },
  {
    value: "brand",
    label: "Brand material",
    hint: "Logo, photos or a brand guide",
    accept: "image/jpeg,image/png,application/pdf,application/zip",
    maxFiles: 10,
  },
];

/** Why a file can't be uploaded as this type, or null. */
export function fileProblem(
  type: CreativeType,
  file: File,
  rules: BoostRules = DEFAULT_RULES,
): string | null {
  const t = CREATIVE_TYPES.find((c) => c.value === type)!;
  if (!t.accept.split(",").includes(file.type))
    return `${file.name}: this file type isn't accepted for a ${t.label.toLowerCase()}.`;
  const video = file.type.startsWith("video/");
  const limit =
    (type === "brand"
      ? rules.creative_other_max_mb
      : video
        ? rules.creative_video_max_mb
        : rules.creative_image_max_mb) * MB;
  if (file.size > limit) return `${file.name} is over ${limit / MB} MB.`;
  return null;
}

export const CREATIVE_STATUS_LABEL: Record<CreativeStatus, string> = {
  submitted: "Submitted",
  in_use: "In use",
  needs_changes: "Needs changes",
  not_used: "Not used",
  awaiting_approval: "Waiting for you",
  approved: "Approved",
  changes_requested: "Changes asked",
};

export const PLAN_STATUS_LABEL = (b: PlanBoostDTO): string => {
  if (
    b.status === "quote_ready" &&
    b.accepted_at &&
    b.budget_status === "unpaid"
  )
    return "Awaiting payment";
  if (b.status === "quote_ready" && b.accepted_at) return "Getting ready";
  const base: Record<BoostStatus, string> = {
    under_review: "Under review",
    quote_ready: "Proposal ready",
    live: "Boosted",
    ended: b.closed_at ? "Report ready" : "Boost ended",
    declined: "Not approved",
    cancelled: "Cancelled",
  };
  return base[b.status];
};

// ─── Real API (PRD: Backend APIs, website) ──────────────────────────────────

const auth = (t: string) => ({ headers: { Authorization: `Bearer ${t}` } });
const data = async <T>(p: Promise<{ data: T }>) => (await p).data;

async function nullOn404<T>(p: Promise<{ data: T }>): Promise<T | null> {
  try {
    return (await p).data ?? null;
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
}

/** Puts one file on a signed upload URL and returns its stored record. */
async function putSigned(
  path: string,
  file: File,
  t: string,
): Promise<StoredFile> {
  const signed = await data(
    apiFetch<{ upload_url: string; key: string; url: string }>(path, {
      method: "POST",
      data: { name: file.name, mime_type: file.type, size: file.size },
      ...auth(t),
    }),
  );

  const res = await fetch(signed.upload_url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status}).`);
  return {
    key: signed.key,
    url: signed.url,
    name: file.name,
    mime_type: file.type,
    size: file.size,
  };
}

const realApi = {
  /** The admin's budget rules and upload limits. */
  settings: (t: string) =>
    data(apiFetch<BoostRules>("/boost/settings", auth(t))),
  getPremium: (t: string) =>
    data(apiFetch<PremiumDTO>("/host/premium", auth(t))),
  applyPremium: (note: string, t: string) =>
    data(
      apiFetch<PremiumDTO>("/host/premium/apply", {
        method: "POST",
        data: { note },
        ...auth(t),
      }),
    ),
  getEventBoost: (eventId: string, t: string) =>
    nullOn404(apiFetch<PlanBoostDTO>(`/experiences/${eventId}/boost`, auth(t))),
  getHostBoosts: (t: string) =>
    data(apiFetch<PlanBoostDTO[]>("/host/boosts", auth(t))),
  /** `_rates` lets the stand-in quote like the backend; the backend ignores it. */
  request: (
    eventId: string,
    body: PlanRequestPayload,
    t: string,
    _rates?: FeeLine[],
  ) =>
    data(
      apiFetch<PlanBoostDTO>(`/experiences/${eventId}/boost`, {
        method: "POST",
        data: body,
        ...auth(t),
      }),
    ),
  accept: (boostId: string, t: string) =>
    data(
      apiFetch<PlanBoostDTO>(`/boosts/${boostId}/accept`, {
        method: "POST",
        ...auth(t),
      }),
    ),
  stop: (boostId: string, t: string) =>
    data(
      apiFetch<PlanBoostDTO>(`/boosts/${boostId}/stop`, {
        method: "POST",
        ...auth(t),
      }),
    ),
  createPayment: (
    boostId: string,
    body: { kind: "budget" } | TopUpPayload,
    t: string,
  ) =>
    data(
      apiFetch<PaymentOrder>(`/boosts/${boostId}/payments`, {
        method: "POST",
        data: body,
        ...auth(t),
      }),
    ),
  verifyPayment: (
    boostId: string,
    paymentId: string,
    body: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
    t: string,
  ) =>
    data(
      apiFetch<PlanBoostDTO>(
        `/boosts/${boostId}/payments/${paymentId}/verify`,
        { method: "POST", data: body, ...auth(t) },
      ),
    ),
  results: (boostId: string, t: string) =>
    data(apiFetch<ResultsDTO>(`/boosts/${boostId}/results`, auth(t))),
  creatives: (boostId: string, t: string) =>
    data(apiFetch<CreativeDTO[]>(`/boosts/${boostId}/creatives`, auth(t))),
  uploadCreativeFile: (boostId: string, file: File, t: string) =>
    putSigned(`/boosts/${boostId}/creatives/upload-url`, file, t),
  saveCreative: (boostId: string, body: CreativePayload, t: string) =>
    data(
      apiFetch<CreativeDTO>(`/boosts/${boostId}/creatives`, {
        method: "POST",
        data: body,
        ...auth(t),
      }),
    ),
  approveCreative: (boostId: string, id: string, t: string) =>
    data(
      apiFetch<CreativeDTO>(`/boosts/${boostId}/creatives/${id}/approve`, {
        method: "POST",
        ...auth(t),
      }),
    ),
  requestCreativeChanges: (
    boostId: string,
    id: string,
    note: string,
    t: string,
  ) =>
    data(
      apiFetch<CreativeDTO>(
        `/boosts/${boostId}/creatives/${id}/request-changes`,
        { method: "POST", data: { note }, ...auth(t) },
      ),
    ),
  deleteCreative: async (boostId: string, id: string, t: string) => {
    await apiFetch<unknown>(`/boosts/${boostId}/creatives/${id}`, {
      method: "DELETE",
      ...auth(t),
    });
  },
  reports: (boostId: string, t: string) =>
    data(apiFetch<ReportDTO[]>(`/boosts/${boostId}/reports`, auth(t))),
  documents: (boostId: string, t: string) =>
    data(apiFetch<BudgetInvoiceDTO[]>(`/boosts/${boostId}/documents`, auth(t))),
};

export type BoostPlanApi = typeof realApi;

export const boostPlanApi: BoostPlanApi = BOOST_PLAN_MOCK
  ? boostPlanMock
  : realApi;

export type { BoostChannel };
