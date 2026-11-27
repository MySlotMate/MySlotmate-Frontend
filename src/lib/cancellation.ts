/** One-line guest-facing copy for an event's cancellation_policy. */
const COPY: Record<string, string> = {
  flexible: "Free cancellation up to 24 hours before the experience starts.",
  moderate: "Free cancellation up to 5 days before the experience starts.",
  strict: "50% refund up to 1 week before the experience starts.",
  no_refund: "This experience is non-refundable once booked.",
};

export const cancellationCopy = (policy: string | null | undefined) =>
  COPY[policy ?? ""] ?? "Standard cancellation policy applies.";
