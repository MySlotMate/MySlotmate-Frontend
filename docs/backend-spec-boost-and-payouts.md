# Backend spec: Marketing Boost and payout timing

**For:** backend team · **From:** frontend · **Status:** ready to build
**Source of truth for the rules:** *MySlotmate Host Partnership PRD — Marketing Boost (v2)*. This document is the API contract the frontend already calls, plus the server-side rules behind it.

The frontend is built and switched off in production behind two flags (`NEXT_PUBLIC_ENABLE_BOOST`, `NEXT_PUBLIC_ENABLE_WEEKLY_PAYOUTS`). Until these endpoints exist, the UI treats `404`, `405` and `501` as "not available yet" and falls back quietly. Turn the flags on once the endpoints below are live.

Frontend files that consume this contract: `src/lib/api.ts` (types and calls), `src/hooks/useApi.ts`, `src/lib/boost.ts` (rates and guardrails mirrored on the client).

---

## 1. Conventions

- Every response uses the existing envelope: `{ "success": bool, "data": T, "message"?: string, "error"?: string }`.
- Auth: `Authorization: Bearer <Firebase ID token>`, same as `/payouts/*`. Every host route checks that the caller owns the host or event (co-hosts: read-only unless they have `can_withdraw`).
- Money is integer **paise** (`*_cents`), like the rest of the API. Rates are **basis points** (`2000` = 20%).
- Errors: return a non-2xx status with `error` set to a stable code (listed per endpoint). The frontend shows `error` or `message` in a toast, so keep `message` human-readable.
- Timestamps: RFC 3339 UTC strings.

---

## 2. Endpoints the frontend calls

### 2.1 `GET /hosts/{hostID}/payout-eligibility`

Whether the host can pick weekly payouts, plus strikes and anything owed. Used by Create/Edit event, the Boost card, Promote and Earnings.

```ts
interface PayoutEligibilityDTO {
  weekly_eligible: boolean;
  reasons: string[];               // shown verbatim, e.g. "Complete 3 events on MySlotmate (1 done)."
  completed_events: number;
  strikes_90d: number;             // host cancellations, rolling 90 days
  strikes_12m: number;             // host cancellations, rolling 12 months
  paused_until: string | null;     // set after the 2nd strike in 90 days
  boost_blocked: boolean;          // true after the 3rd strike in 12 months, until ops clears it
  recovery_balance_cents: number;  // owed to MySlotmate after a cancellation
  early_outstanding_cents: number; // paid early across all upcoming weekly-payout events
  early_backstop_cents: number;    // 5000000 (₹50,000)
}
```

`weekly_eligible` is true only when **all** hold (one `reasons` entry per failure):

| Check | Reason text (suggested) |
|---|---|
| ≥ 3 completed events (event date passed, not host-cancelled) | `Complete 3 events on MySlotmate ({n} done).` |
| No host cancellation in the last 6 months | `No host cancellations in the last 6 months.` |
| PAN on the tax profile | `Add your PAN in Earnings.` |
| Verified primary bank payout method | `Add a verified bank account.` |
| `recovery_balance_cents == 0` | `Clear the amount you owe from a cancelled event.` |
| Not paused (`paused_until` null or past) | `Weekly payouts are paused until {date}.` |

Return `200` with zeros for a host with no history. Never `404` for an existing host (the UI reads `404` as "feature not live").

### 2.2 `GET /experiences/{eventID}/boost`

The event's **current** Boost: the newest one, whatever its status.

- `200` with `BoostDTO`
- `404` when the event has never had a Boost
- `403 not_event_owner`

```ts
type BoostStatus = "under_review" | "quote_ready" | "live" | "ended" | "declined" | "cancelled";
type BoostChannel = "instagram" | "facebook" | "google" | "whatsapp" | "influencers";

interface BoostRateDTO {
  ticket_type_id: string | null; // null = the event's single base price
  ticket_name: string;           // tier name, or "Ticket"
  price_cents: number;
  rate_bps: number;
}

interface BoostDTO {
  id: string;
  event_id: string;
  status: BoostStatus;
  rates: BoostRateDTO[];         // empty until quoted; locked at acceptance
  topup_reason: string | null;   // why a ₹5,000+ ticket was quoted above 12%
  decline_reason: string | null; // admin decline
  goal_text: string | null;
  channels: BoostChannel[];
  requested_at: string;
  accepted_at: string | null;    // set on accept; status stays quote_ready until go-live
  live_from: string | null;
  live_until: string | null;
  reach: number;
  clicks: number;
  tickets_sold: number;          // net of refunds, while live only
  commission_cents: number;      // net of reversals
}
```

### 2.3 `POST /experiences/{eventID}/boost`

Host requests a Boost.

```ts
interface BoostRequestPayload {
  goal_text?: string;       // ≤ 200 chars
  audience_notes?: string;  // ≤ 500 chars
  channels: BoostChannel[]; // ≥ 1
}
```

- `201`/`200` with the new `BoostDTO`, status `under_review`.
- Server fills `rates` immediately with the **base** rate per active ticket type (section 3.1), so the request already shows the expected cost.
- Notify admins (new request).

| Error | When |
|---|---|
| `400 invalid_channels` | empty or unknown channel |
| `409 boost_already_open` | event already has a Boost in `under_review`, `quote_ready` or `live` |
| `422 event_not_eligible` | any guardrail in 3.2 fails; put the first reason in `message` |
| `403 boost_paused` | host `paused_until` in the future, `boost_blocked`, or `recovery_balance_cents > 0` |

### 2.4 `POST /boosts/{boostID}/accept`

Host accepts the final quote. Allowed only from `quote_ready`.

- Locks `rates` (store `tier_version`), writes a `boost_acceptances` row (`accepted_at`, `terms_version`, IP, user agent).
- Sets `accepted_at` on the Boost (add `accepted_at: string | null` to `BoostDTO`). Status **stays `quote_ready`** until ops calls go-live (2.7), so commission starts only when ads actually run. The frontend shows "accepted, ads launching" whenever `status = quote_ready` and `accepted_at` is set.
- `409 invalid_state` from any other status. `422 quote_expired` if the event price changed after the quote (see 3.3).

### 2.5 `POST /boosts/{boostID}/stop`

One endpoint, meaning depends on status:

| From | To | Effect |
|---|---|---|
| `under_review` | `cancelled` | request withdrawn, no charge |
| `quote_ready` | `cancelled` | quote declined by host, no charge |
| `live` | `ended` | `live_until = now()`; tickets paid after this carry no commission; notify admins |
| anything else | — | `409 invalid_state` |

Returns the updated `BoostDTO`.

### 2.6 `GET /host/boosts`

Every Boost for the caller's host (all events, all statuses), newest first. `200` with `[]` when none. Powers the Promote page and the "Boosted" badges.

### 2.7 Admin endpoints (ops queue)

Not called by the host app yet; needed for ops to run campaigns.

| Method + path | Purpose |
|---|---|
| `GET /admin/boosts?status=` | Review queue |
| `POST /admin/boosts/{id}/review` | Body `{ action: "approve" \| "topup" \| "decline", rates?: {ticket_type_id, rate_bps}[], topup_reason?, decline_reason? }`. `approve` → `quote_ready` at base rates. `topup` only for tickets ≥ ₹5,000, ≤ 2000 bps, reason required. `decline` → `declined`. |
| `POST /admin/boosts/{id}/go-live` | Accepted quote → `live`, sets `live_from`, `spend_cap_cents`, first budget tranche (3.6) |
| `PATCH /admin/boosts/{id}/campaign` | Log `spend_cents`, `reach`, `clicks`; refuse spend above the released budget |
| `POST /admin/hosts/{id}/strikes/{strikeID}/clear` | Ops clears a strike for a genuine reason (weather, venue closed); recompute pause |

### 2.8 Event create / update: `payout_mode`

Add to `POST /events`, `PUT /events/{id}` and `EventDTO`:

```ts
payout_mode?: "after_event" | "weekly"; // absent or null = "after_event"
```

Validation (return `422` with these codes):

| Code | Rule |
|---|---|
| `weekly_requires_no_refund` | `payout_mode = "weekly"` ⇒ `cancellation_policy` must be `"no_refund"`. Server enforces; don't trust the client. |
| `weekly_not_eligible` | host fails 2.1 eligibility (don't block an event that is **already** weekly from being edited for other fields) |
| `weekly_not_for_free_events` | free events are always `after_event` |
| `payout_mode_locked` | can't switch weekly → after_event (or back) once the event has confirmed bookings, because guests booked under its refund policy |

Return `payout_mode` on every `EventDTO` read.

### 2.9 Payout breakdown fields

Extend `PayoutBreakdownDTO` (on `PaymentDTO.breakdown` in payout history). All optional; send when non-zero:

```ts
ad_cost_recovery_cents?: number; // ad spend repaid after the host cancelled a Boosted event
recovery_cents?: number;         // earlier guest refunds / balance owed, netted here
held_cents?: number;             // weekly events: the 50% held until after the event
```

Invariant: `paid = earnings − boost_commission − tcs − tds − ad_cost_recovery − recovery − held`.

---

## 3. Server rules

### 3.1 Boost rates (seed `boost_rate_tiers`, versioned)

| Ticket price | Base rate | Max (top-up) |
|---|---|---|
| < ₹500 | 2000 | 2000 |
| ₹500–999 | 2000 | 2000 |
| ₹1,000–1,999 | 1500 | 1500 |
| ₹2,000–4,999 | 1200 | 1200 |
| ₹5,000+ | 1200 | 2000 |

Rate is per ticket type, on the **net** ticket price (after host discounts/coupons, excluding the guest's 8% fee).

### 3.2 Eligibility guardrails (request time)

- Paid event (`is_free = false`), status `live`.
- Next date ≥ 10 days away.
- ≥ 20 unsold tickets; ≥ 50 if every ticket type is under ₹500.
- Host verified, payout method on file, not paused/blocked, no recovery balance.
- One open Boost per event.

The frontend checks the first three it can see (paid, live, 10 days) only to explain a "no". The server decides.

### 3.3 Rate lock and re-quote

If the host changes a ticket price or adds a ticket type while a Boost is `quote_ready` or `live`, pause ads (`live` stays `live` but stop stamping commission on the changed type) and move to a re-quote: set the Boost back to `quote_ready` with new rates. Commission resumes only after the host accepts again.

### 3.4 Commission stamping

On payment success for a booking, if the event has a `live` Boost and `live_from ≤ paid_at < live_until`:

```
commission     = round(net_ticket_price × rate_bps / 10000)   // per ticket, half-up to the paisa
comm_gst       = round(commission × 18 / 118)                  // internal, never shown to host
```

Store `boost_id`, `boost_rate_bps`, `boost_commission_cents` on the booking. Comped (₹0) tickets and host on-spot bookings carry none.

### 3.5 Refunds by cause

Add `refund_cause` on every refund: `guest | host_cancel | platform | fraud`.

| Cause | Commission | Ad spend | Strike |
|---|---|---|---|
| `guest` (host's refund policy) | **kept**, still deducted from host | — | no |
| `host_cancel` (host cancels, or reschedules and guests take a refund) | becomes **ad cost recovery**: host repays actual `spend_cents`, capped at the commission on the refunded tickets | recovered | **yes** |
| `platform` (payment error, duplicate, our fault) | reversed (negative row) | MySlotmate bears it | no |
| `fraud` / chargeback | ops decides | ops decides | no |

TCS and TDS reverse on every refund, whatever the cause (unchanged from the tax spec).

### 3.6 Staged ad spend

At go-live release **25%** of `spend_cap_cents` (cap = 70% of projected commission, already reduced by an expected refund rate, start 10%). Release more only as commission is earned: `released ≤ 25% × cap + commission_earned_so_far`, never above the cap. `PATCH …/campaign` refuses spend beyond `released`.

### 3.7 Weekly payouts: 50% early, 50% held

Runs weekly (suggest Monday 06:00 IST) for every event with `payout_mode = "weekly"` and a future date:

```
earned_net      = Σ confirmed bookings (ticket − commission − tcs − tds)   // to date
early_allowed   = floor(earned_net × 0.5) − already_paid_early_for_event
backstop_left   = 5000000 − early_outstanding_cents(host)                   // ₹50,000 across all upcoming events
pay_now         = max(0, min(early_allowed, backstop_left))
```

- First net off any `recovery_balance_cents` before paying.
- Skip hosts that are paused, blocked or no longer eligible: their events fall back to after-event release (see 3.8).
- After the event ends, release the rest (the held 50% and anything above the backstop) in the normal after-event payout.
- `early_outstanding_cents` drops when an event's date passes and it's settled.

### 3.8 Host cancellation of a weekly-payout event

1. Refund every guest in full (guests' legal right; the No refunds policy covers guest cancellations only).
2. Fund refunds from money still held for that event first.
3. Shortfall + ad cost recovery → `recovery_balance_cents` on the host, netted from the next payouts.
4. Record a strike.
5. If the balance is not cleared in 30 days, flag the host for ops collection and account review.

### 3.9 Cancellation strikes

A strike = an event the **host** cancels, or reschedules where guests take refunds. Boosted or not. Guest cancellations and `platform` refunds never count.

| Count | Consequence |
|---|---|
| 1st | warning (email + in-app); ad cost recovery if Boosted |
| 2nd in 90 days | `paused_until = now + 90 days`: no new Boosts, no weekly payouts; switch the host's **other** weekly events to after-event release for their remaining sales. Boosts already `live` on other events keep running. |
| 3rd in 12 months | `boost_blocked = true`, ops review |

Ops can clear a strike (2.7); recompute `paused_until` / `boost_blocked` after.

### 3.10 Scheduled jobs

| Job | When | Does |
|---|---|---|
| Weekly early payout | weekly | 3.7 |
| After-event release | daily | pay held amounts for events that ended (existing clearance window applies) |
| Boost auto-end | every 15 min | `live` Boosts whose event has started → `ended`, `live_until = start time`; send final report |
| Pause expiry | daily | clear `paused_until` in the past |
| Recovery follow-up | daily | flag balances older than 30 days |

---

## 4. Data model (paise; bps)

| Table | Key fields |
|---|---|
| `boost_rate_tiers` | `min_price_cents, max_price_cents, base_rate_bps, max_rate_bps, active_from, version` |
| `boosts` | `id, event_id, host_id, status, goal_text, audience_notes, channels[], requested_at, reviewed_by, decline_reason, topup_reason, accepted_at, live_from, live_until, spend_cap_cents, released_cents, spend_cents, reach, clicks` |
| `boost_rates` | `boost_id, ticket_type_id, price_cents, rate_bps, tier_version` |
| `boost_acceptances` | `boost_id, host_id, accepted_at, terms_version, ip, user_agent` |
| `events` (existing) | `+ payout_mode` (`after_event` default) |
| `bookings` (existing) | `+ boost_id, boost_rate_bps, boost_commission_cents, boost_commission_gst_cents, ad_cost_recovery_cents` |
| `refunds` (existing) | `+ refund_cause` |
| `host_strikes` | `id, host_id, event_id, created_at, cleared_at, cleared_by, reason` |
| `hosts` (existing) | `+ paused_until, boost_blocked, recovery_balance_cents` |
| `early_payouts` | `id, host_id, event_id, amount_cents, paid_at` (sum per event = already paid early) |

`tickets_sold` and `commission_cents` on `BoostDTO` are derived from `bookings` (net of refunds).

---

## 5. Notifications

| To | When |
|---|---|
| Host | quote ready · go-live · daily summary while live · Boost ended (final report) · strike recorded · paused / unpaused · recovery balance created |
| Admin | new Boost request · host stopped a live Boost · host cancelled a Boosted event · recovery balance older than 30 days |

---

## 6. Acceptance checklist

- [ ] `GET /hosts/{id}/payout-eligibility` returns 200 for every host, with reasons when not eligible.
- [ ] Creating or editing an event with `payout_mode: "weekly"` and any policy other than `no_refund` returns `422 weekly_requires_no_refund`.
- [ ] A Boost can't be requested for a free event, an event < 10 days away, or by a paused/blocked/owing host.
- [ ] Only bookings paid while `live` carry commission; rates never change after acceptance without a re-quote.
- [ ] Guest refunds keep commission; host cancellations create ad cost recovery ≤ commission on refunded tickets; platform refunds reverse it.
- [ ] A weekly payout never takes an event above 50% of its net earnings to date, or a host above ₹50,000 paid early across upcoming events.
- [ ] Host-cancelling a weekly event refunds every guest in full, funds from held money first, and books the rest as a recovery balance.
- [ ] 2nd strike in 90 days pauses Boost and weekly payouts for 90 days and moves other weekly events to after-event release; 3rd in 12 months sets `boost_blocked`.
- [ ] Every payout's breakdown lines sum to `paid_cents`.
- [ ] `/host/boosts` and `/experiences/{id}/boost` return only the caller's data.

## 7. Open decisions (from the PRD)

- Starting limits to confirm after the pilot: 3 events / 6 clean months, 50% early, ₹50,000 backstop, 25% first ad tranche, 10% refund allowance, strikes at 2-in-90 and 3-in-12.
- Days after the event before the held 50% is released.
- Lawyer sign-off on the No refunds wording and recovering money from hosts; CA sign-off on TCS/TDS and GST on ad cost recovery.
