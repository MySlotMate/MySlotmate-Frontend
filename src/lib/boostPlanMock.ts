/**
 * In-browser stand-in for the paid-budget Boost and Premium API, used until
 * the backend serves the PRD's routes (NEXT_PUBLIC_BOOST_PLAN_MOCK, on by
 * default in development only). It follows the PRD's rules closely enough to
 * walk through every screen, and keeps its data in this browser's storage.
 *
 * The team's steps (go live, log a day, add a report, close) have no host
 * screen, so `mockTeamStep` plays them from the dev controls on the Boost card.
 */
import type { BoostChannel } from "~/lib/api";
import type {
  BoostPlanApi,
  BudgetInvoiceDTO,
  CreativeDTO,
  CreativePayload,
  FeeLine,
  PaymentOrder,
  PlanBoostDTO,
  PlanRequestPayload,
  PremiumDTO,
  ReportDTO,
  ResultsDay,
  ResultsDTO,
  StoredFile,
} from "~/lib/boostPlan";

const KEY = "msm_boost_plan_mock_v1";
const GST_BPS = 1800;

interface Store {
  premium: PremiumDTO;
  boosts: PlanBoostDTO[];
  creatives: CreativeDTO[];
  reports: ReportDTO[];
  days: Record<string, ResultsDay[]>;
  invoices: Record<string, BudgetInvoiceDTO[]>;
  payments: Record<
    string,
    { boostId: string; amount: number; days?: number; daily?: number }
  >;
}

const empty = (): Store => ({
  premium: {
    status: "none",
    applied_at: null,
    decided_at: null,
    manager_name: null,
    manager_contact: null,
    decline_reason: null,
    remove_reason: null,
  },
  boosts: [],
  creatives: [],
  reports: [],
  days: {},
  invoices: {},
  payments: {},
});

// Files picked in this tab stay viewable until the page reloads.
const objectUrls = new Map<string, string>();

function load(): Store {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...empty(), ...(JSON.parse(raw) as Store) } : empty();
  } catch {
    return empty();
  }
}

function save(s: Store) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked: the mock just forgets */
  }
}

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const wait = <T>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 250));
const gst = (c: number) => Math.round((c * GST_BPS) / 10_000);
const fail = (status: number, message: string) => {
  const e = new Error(message);
  (e as Error & { status: number }).status = status;
  return e;
};
const days = (from: string, until: string) =>
  Math.floor(
    (new Date(`${until}T00:00:00Z`).getTime() -
      new Date(`${from}T00:00:00Z`).getTime()) /
      86_400_000,
  ) + 1;

function withCounts(s: Store, b: PlanBoostDTO): PlanBoostDTO {
  const cr = s.creatives.filter((c) => c.boost_id === b.id);
  return {
    ...b,
    creatives_count: cr.length,
    creatives_need_action: cr.filter(
      (c) => c.status === "awaiting_approval" || c.status === "needs_changes",
    ).length,
    reports_count: s.reports.filter((r) => r.id.startsWith(b.id)).length,
  };
}

function boostOr404(s: Store, boostId: string) {
  const b = s.boosts.find((x) => x.id === boostId);
  if (!b) throw fail(404, "Boost not found.");
  return b;
}

function file(
  name: string,
  mime: string,
  size: number,
  url: string,
): StoredFile {
  return { key: `mock/${id()}`, url, name, mime_type: mime, size };
}

export const boostPlanMock: BoostPlanApi = {
  getPremium: async () => wait(load().premium),

  applyPremium: async () => {
    const s = load();
    // The team approves in the admin; the stand-in approves at once.
    s.premium = {
      ...s.premium,
      status: "active",
      applied_at: now(),
      decided_at: now(),
      manager_name: "Riya (Myslotmate)",
      manager_contact: "partners@myslotmate.com",
      decline_reason: null,
      remove_reason: null,
    };
    save(s);
    return wait(s.premium);
  },

  getEventBoost: async (eventId) => {
    const s = load();
    const list = s.boosts
      .filter((b) => b.event_id === eventId)
      .sort((a, b) => b.requested_at.localeCompare(a.requested_at));
    return wait(list[0] ? withCounts(s, list[0]) : null);
  },

  getHostBoosts: async () => {
    const s = load();
    return wait(s.boosts.map((b) => withCounts(s, b)));
  },

  request: async (
    eventId: string,
    body: PlanRequestPayload,
    _t: string,
    rates?: FeeLine[],
  ) => {
    const s = load();
    if (s.premium.status !== "active")
      throw fail(403, "Boost is for Premium hosts. Join Premium to unlock it.");
    if (
      s.boosts.some(
        (b) =>
          b.event_id === eventId &&
          ["under_review", "quote_ready", "live"].includes(b.status),
      )
    )
      throw fail(
        409,
        "This event already has a Boost request or a live Boost.",
      );
    const total =
      body.daily_budget_cents * days(body.budget_from, body.budget_until);
    // The team proposes at the guide rates; the stand-in does so at once.
    const b: PlanBoostDTO = {
      id: id(),
      event_id: eventId,
      status: "quote_ready",
      rates: (rates ?? []).map((r) => ({
        ticket_type_id: r.ticket_key || null,
        ticket_name: r.ticket_name,
        price_cents: r.price_cents,
        rate_bps: r.rate_bps,
        guide_rate_bps: r.rate_bps,
        reason: null,
      })),
      topup_reason: null,
      admin_note: "Mock proposal: sent at the guide rates for your plan.",
      decline_reason: null,
      goal_text: body.goal_text ?? null,
      audience_notes: body.audience_notes ?? null,
      channels: body.channels,
      requested_at: now(),
      accepted_at: null,
      live_from: null,
      live_until: null,
      reach: 0,
      clicks: 0,
      tickets_sold: 0,
      commission_cents: 0,
      pricing_model: "budget",
      daily_budget_cents: body.daily_budget_cents,
      budget_from: body.budget_from,
      budget_until: body.budget_until,
      budget_total_cents: total,
      budget_gst_cents: gst(total),
      budget_status: "unpaid",
      payment_due_by: null,
      spent_cents: 0,
      closed_at: null,
      creatives_count: 0,
      creatives_need_action: 0,
      reports_count: 0,
    };
    s.boosts.push(b);
    save(s);
    return wait(withCounts(s, b));
  },

  accept: async (boostId) => {
    const s = load();
    const b = boostOr404(s, boostId);
    if (b.status !== "quote_ready" || b.accepted_at)
      throw fail(409, "There's no proposal waiting for you to accept.");
    b.accepted_at = now();
    b.payment_due_by = new Date(Date.now() + 7 * 86_400_000).toISOString();
    save(s);
    return wait(withCounts(s, b));
  },

  stop: async (boostId) => {
    const s = load();
    const b = boostOr404(s, boostId);
    if (b.status === "live") {
      b.status = "ended";
      b.live_until = now();
    } else if (b.status === "under_review" || b.status === "quote_ready") {
      if (b.budget_status === "paid")
        throw fail(
          409,
          "The budget is paid; ask your manager to change the plan.",
        );
      b.status = "cancelled";
    } else throw fail(409, "This Boost has already finished.");
    save(s);
    return wait(withCounts(s, b));
  },

  createPayment: async (boostId, body) => {
    const s = load();
    const b = boostOr404(s, boostId);
    let amount: number;
    let extraDays: number | undefined;
    let daily: number | undefined;
    if (body.kind === "budget") {
      if (!b.accepted_at) throw fail(409, "Accept the proposal first.");
      amount = b.budget_total_cents + b.budget_gst_cents;
    } else {
      const t = body;
      extraDays = t.days_added ?? 0;
      daily = t.daily_budget_cents ?? b.daily_budget_cents ?? 0;
      const base = (b.daily_budget_cents ?? 0) * extraDays;
      amount = base + gst(base);
    }
    const order: PaymentOrder = {
      payment_id: id(),
      key_id: "mock",
      order_id: `order_mock_${id().slice(0, 8)}`,
      amount_cents: amount,
      currency: "INR",
    };
    s.payments[order.payment_id] = { boostId, amount, days: extraDays, daily };
    save(s);
    return wait(order);
  },

  verifyPayment: async (boostId, paymentId) => {
    const s = load();
    const b = boostOr404(s, boostId);
    const p = s.payments[paymentId];
    if (!p) throw fail(404, "Payment not found.");
    if (p.days && b.budget_until) {
      const until = new Date(`${b.budget_until}T00:00:00Z`);
      until.setUTCDate(until.getUTCDate() + p.days);
      b.budget_until = until.toISOString().slice(0, 10);
      const base = (b.daily_budget_cents ?? 0) * p.days;
      b.budget_total_cents += base;
      b.budget_gst_cents += gst(base);
    } else b.budget_status = "paid";
    const inv: BudgetInvoiceDTO = {
      id: id(),
      number: `MSM/AD/26-27/${String(Object.keys(s.payments).length).padStart(4, "0")}`,
      amount_cents: p.amount,
      gst_cents: Math.round((p.amount * GST_BPS) / (10_000 + GST_BPS)),
      issued_at: now(),
      pdf_url: null,
    };
    (s.invoices[boostId] ??= []).push(inv);
    delete s.payments[paymentId];
    save(s);
    return wait(withCounts(s, b));
  },

  results: async (boostId) => {
    const s = load();
    const list = s.days[boostId] ?? [];
    const sum = (k: keyof Omit<ResultsDay, "day">) =>
      list.reduce((a, d) => a + d[k], 0);
    const per = (n: number, share: number) => Math.round(n * share);
    const b = boostOr404(s, boostId);
    const share = 1 / Math.max(1, b.channels.length);
    const res: ResultsDTO = {
      days: list,
      channels: b.channels.map((c: BoostChannel) => ({
        channel: c,
        spend_cents: per(sum("spend_cents"), share),
        impressions: per(sum("impressions"), share),
        reach: per(sum("reach"), share),
        clicks: per(sum("clicks"), share),
      })),
      totals: {
        spend_cents: sum("spend_cents"),
        impressions: sum("impressions"),
        reach: sum("reach"),
        clicks: sum("clicks"),
        tickets_sold: sum("tickets_sold"),
      },
    };
    return wait(res);
  },

  creatives: async (boostId) =>
    wait(load().creatives.filter((c) => c.boost_id === boostId)),

  uploadCreativeFile: async (_boostId, f) => {
    const url = URL.createObjectURL(f);
    const stored = file(f.name, f.type, f.size, url);
    objectUrls.set(stored.key, url);
    return wait(stored);
  },

  saveCreative: async (boostId, body: CreativePayload) => {
    const s = load();
    boostOr404(s, boostId);
    const c: CreativeDTO = {
      id: id(),
      boost_id: boostId,
      type: body.type,
      files: body.file_keys.map((k, i) => ({
        key: k,
        url: objectUrls.get(k) ?? "",
        name: `${body.type}-${i + 1}`,
        mime_type: "",
        size: 0,
      })),
      caption: body.caption ?? null,
      channels: body.channels ?? [],
      uploaded_by_kind: "host",
      status: "submitted",
      status_note: null,
      created_at: now(),
    };
    s.creatives.push(c);
    save(s);
    return wait(c);
  },

  approveCreative: async (_boostId, cid) => {
    const s = load();
    const c = s.creatives.find((x) => x.id === cid);
    if (!c) throw fail(404, "Creative not found.");
    c.status = "approved";
    c.status_note = null;
    save(s);
    return wait(c);
  },

  requestCreativeChanges: async (_boostId, cid, note) => {
    const s = load();
    const c = s.creatives.find((x) => x.id === cid);
    if (!c) throw fail(404, "Creative not found.");
    c.status = "changes_requested";
    c.status_note = note;
    save(s);
    return wait(c);
  },

  deleteCreative: async (_boostId, cid) => {
    const s = load();
    const c = s.creatives.find((x) => x.id === cid);
    if (c?.status === "in_use") throw fail(409, "It's in use in the ads now.");
    s.creatives = s.creatives.filter((x) => x.id !== cid);
    save(s);
    await wait(null);
  },

  reports: async (boostId) =>
    wait(load().reports.filter((r) => r.id.startsWith(boostId))),

  documents: async (boostId) => wait(load().invoices[boostId] ?? []),
};

// ─── The team's steps, for the dev controls ─────────────────────────────────

export type MockTeamStep =
  | "go_live"
  | "use_creatives"
  | "team_creative"
  | "log_day"
  | "add_report"
  | "end_and_close"
  | "premium_off";

export async function mockTeamStep(step: MockTeamStep, boostId?: string) {
  const s = load();
  if (step === "premium_off") {
    s.premium = { ...s.premium, status: "none" };
    save(s);
    return;
  }
  if (!boostId) return;
  const b = boostOr404(s, boostId);
  const pixel =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='500'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#7038F5'/><stop offset='1' stop-color='#B724EA'/></linearGradient></defs><rect width='400' height='500' fill='url(#g)'/><text x='200' y='260' font-family='sans-serif' font-size='28' fill='white' text-anchor='middle'>Team poster</text></svg>",
    );
  switch (step) {
    case "go_live":
      b.status = "live";
      b.live_from = now();
      b.live_until = b.budget_until ? `${b.budget_until}T18:29:59.000Z` : null;
      break;
    case "use_creatives":
      s.creatives
        .filter(
          (c) =>
            c.boost_id === boostId &&
            ["submitted", "approved"].includes(c.status),
        )
        .forEach((c) => (c.status = "in_use"));
      break;
    case "team_creative":
      s.creatives.push({
        id: id(),
        boost_id: boostId,
        type: "post",
        files: [file("team-poster.svg", "image/svg+xml", 1200, pixel)],
        caption: "Poster made by your campaign manager",
        channels: ["instagram"],
        uploaded_by_kind: "admin",
        status: "awaiting_approval",
        status_note: null,
        created_at: now(),
      });
      break;
    case "log_day": {
      const list = (s.days[boostId] ??= []);
      const daily = b.daily_budget_cents ?? 50_000;
      const left = b.budget_total_cents - b.spent_cents;
      const spend = Math.min(daily, left);
      const last =
        list.at(-1)?.day ??
        b.budget_from ??
        new Date().toISOString().slice(0, 10);
      const next = new Date(`${last}T00:00:00Z`);
      if (list.length) next.setUTCDate(next.getUTCDate() + 1);
      const reach = Math.round(spend / 8);
      const day: ResultsDay = {
        day: next.toISOString().slice(0, 10),
        spend_cents: spend,
        impressions: reach * 3,
        reach,
        clicks: Math.round(reach / 25),
        tickets_sold: Math.max(1, Math.round(reach / 900)),
      };
      list.push(day);
      b.spent_cents += spend;
      b.reach += day.reach;
      b.clicks += day.clicks;
      b.tickets_sold += day.tickets_sold;
      const avgFee = b.rates.length
        ? Math.round(
            b.rates.reduce(
              (a, r) => a + (r.price_cents * r.rate_bps) / 10_000,
              0,
            ) / b.rates.length,
          )
        : 0;
      b.commission_cents += avgFee * day.tickets_sold;
      break;
    }
    case "add_report":
      s.reports.push({
        id: `${boostId}:${id()}`,
        kind: b.status === "ended" ? "final" : "update",
        title: b.status === "ended" ? "Final campaign report" : "Week 1 update",
        covers_from: b.budget_from,
        covers_until:
          s.days[boostId]?.at(-1)?.day ?? new Date().toISOString().slice(0, 10),
        note: "Ads Manager export with spend, reach and clicks per channel.",
        file: file("ads-manager-export.svg", "image/svg+xml", 2400, pixel),
        created_at: now(),
      });
      break;
    case "end_and_close":
      b.status = "ended";
      b.live_until = now();
      if (
        !s.reports.some((r) => r.id.startsWith(boostId) && r.kind === "final")
      )
        s.reports.push({
          id: `${boostId}:${id()}`,
          kind: "final",
          title: "Final campaign report",
          covers_from: b.budget_from,
          covers_until: new Date().toISOString().slice(0, 10),
          note: "Everything the budget did, by day and channel.",
          file: file("final-report.svg", "image/svg+xml", 2400, pixel),
          created_at: now(),
        });
      b.closed_at = now();
      break;
  }
  save(s);
}

export function mockReset() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
