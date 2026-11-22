// When a guest cancel earns a refund. Mirrors RefundDueOnCancel in
// myslotmate-backend/internal/service/cancellation_policy.go and
// refundDueOnCancel in Myslotmate-backend-node — the server decides; this only
// lets the cancel dialog say the same thing before the guest confirms.

const HOUR = 60 * 60 * 1000;

/** Hours before the session a full refund is still due. null = never refunded. */
const FULL_REFUND_HOURS: Record<string, number | null> = {
  flexible: 24,
  moderate: 5 * 24,
  strict: null,
  no_refund: null,
};

/** True when cancelling now refunds the guest in full. Unset/unknown → refund. */
export function refundDueOnCancel(
  policy: string | null | undefined,
  occurrence: string | Date,
  now = Date.now(),
): boolean {
  if (!policy || !(policy in FULL_REFUND_HOURS)) return true;
  const hours = FULL_REFUND_HOURS[policy];
  if (hours == null) return false;
  return new Date(occurrence).getTime() - now >= hours * HOUR;
}
