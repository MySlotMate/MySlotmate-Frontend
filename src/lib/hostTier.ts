/**
 * Host tiers.
 *
 * Anyone signed in can host *free* events ("free" tier). Selling tickets,
 * payouts and the other money features unlock once their host application
 * (community or professional) is approved ("verified" tier).
 *
 * The UI gates below are a convenience only: the backend must enforce the
 * same rules (free-only events and the limits) for unverified hosts.
 */

export type HostTier = "guest" | "free" | "verified";

/** Limits for unverified hosts, until they are approved. */
export const FREE_HOST_LIMITS = {
  /** Most guests one free-host event can take. */
  maxGuests: 50,
  /** Most live or upcoming events a free host can have at once. */
  maxActiveEvents: 3,
} as const;

/** Where a free host goes to become verified. */
export const VERIFY_HREF = "/become-host";

export function tierFor(
  signedIn: boolean,
  applicationStatus: string | null | undefined,
): HostTier {
  if (!signedIn) return "guest";
  return applicationStatus === "approved" ? "verified" : "free";
}

/**
 * Whether a public host is unverified. The backend doesn't send this yet; until
 * it does every host on the site was approved under the old rules, so missing
 * data counts as verified.
 */
export function isUnverifiedHost(
  host:
    | { host_tier?: string | null; application_status?: string | null }
    | null
    | undefined,
): boolean {
  if (!host) return false;
  if (host.host_tier) return host.host_tier === "unverified";
  return Boolean(
    host.application_status && host.application_status !== "approved",
  );
}

/**
 * Payment details that free events must not carry: UPI IDs, phone numbers,
 * payment links. Scams on free listings usually move the money off-platform.
 */
const OFF_PLATFORM_PAYMENT = [
  /\b[\w.-]{2,}@(?:ok\w+|ybl|ibl|axl|upi|paytm|apl|yapl|ikwik|fbl|pthdfc|ptsbi|ptyes|ptaxis)\b/i,
  /(?:\+?91[\s-]?)?\b[6-9]\d{9}\b/,
  /\b(?:upi|gpay|google pay|phonepe|paytm|bank transfer|neft|imps|account no\.?)\b/i,
  /\b(?:rzp\.io|razorpay\.me|paypal\.me|buymeacoffee\.com|instamojo\.com)\b/i,
];

/** Returns why the text looks like it asks for payment outside the app. */
export function findOffPlatformPayment(text: string): string | null {
  const plain = text.replace(/<[^>]+>/g, " ");
  return OFF_PLATFORM_PAYMENT.some((rx) => rx.test(plain))
    ? "Free events can't include phone numbers, UPI IDs or payment links. Guests should never pay outside MySlotMate."
    : null;
}
