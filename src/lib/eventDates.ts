/**
 * "Is this experience over?" — one answer, used by every listing.
 *
 * The naive check is `event.time < now`, and it is wrong for two of the three
 * schedule types:
 *
 *  - **custom_dates**: `time` (and `end_time`) hold only the FIRST date and are
 *    never rolled forward. A trip running 16, 23 and 30 Aug would read as over
 *    on the 17th, with two sessions still on sale.
 *  - **recurring**: `time` is rolled forward server-side, so it is usually fine,
 *    but a rule that has generated nothing yet can still look stale.
 *
 * `next_available_date` is the server's own answer to "when can someone next
 * book this", computed across custom dates, recurrence and per-occurrence
 * capacity. When it is present it is authoritative, so prefer it. It is null
 * only when nothing is bookable — which is exactly "passed".
 */

type EventLike = {
  time: string;
  end_time?: string | null;
  next_available_date?: string | null;
  is_recurring?: boolean;
};

export function eventHasPassed(event: EventLike, now = Date.now()): boolean {
  // The server already worked out the next bookable moment — trust it.
  if (event.next_available_date) {
    const next = new Date(event.next_available_date).getTime();
    return Number.isFinite(next) && next < now;
  }

  // A recurring event keeps generating occurrences, so a stale `time` alone
  // never means it is finished.
  if (event.is_recurring) return false;

  const ref = event.end_time ?? event.time;
  const t = new Date(ref).getTime();
  return Number.isFinite(t) && t < now;
}
