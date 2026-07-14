import type { EventDTO } from "./api";

/**
 * Display price label for an event card. Accounts for ticket tiers: a tiered
 * event stores price_cents = 0 with the real prices in price_tiers, so we show
 * the cheapest tier ("₹500") instead of falsely reading it as Free.
 */
export function eventPriceLabel(
  event: Pick<EventDTO, "is_free" | "price_cents" | "price_tiers">,
): string {
  if (event.is_free) return "Free";

  const tiers = event.price_tiers ?? [];
  if (tiers.length > 0) {
    const prices = tiers.map((t) => t.price_cents);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    // Append "+" when tiers span more than one price so the card signals a
    // "from" / dynamic price rather than a single fixed one.
    const suffix = max > min ? "+" : "";
    return `₹${Math.round(min / 100)}${suffix}`;
  }

  if (!event.price_cents) return "Free";
  return `₹${Math.round(event.price_cents / 100)}`;
}
