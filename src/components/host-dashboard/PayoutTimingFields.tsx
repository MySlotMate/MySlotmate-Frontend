"use client";

/**
 * Refund policy + payout timing for one event (PRD: Refunds, cancellations
 * and payout timing). Paid after the event, a host can offer any refund
 * policy. Paid weekly (up to 50% early), the policy is fixed to No refunds,
 * because money already paid out can't be held back for guest refunds.
 */

import { FiLock } from "react-icons/fi";
import { usePayoutEligibility } from "~/hooks/useApi";
import { useIdToken } from "~/hooks/useIdToken";
import type { PayoutMode } from "~/lib/api";
import {
  NO_REFUND_POLICY,
  PAYOUT_MODES,
  WEEKLY_PAYOUTS_ENABLED,
  rupees,
} from "~/lib/boost";
import { CANCELLATION_POLICIES, Chip } from "./EventFormKit";

/** One-line summary for the collapsed "Refunds & payout" row. */
export function refundPayoutSummary(policy: string, mode: PayoutMode) {
  const label =
    CANCELLATION_POLICIES.find((p) => p.value === policy)?.label ?? "Flexible";
  if (!WEEKLY_PAYOUTS_ENABLED) return label;
  return `${label} · ${mode === "weekly" ? "Paid weekly, 50% early" : "Paid after the event"}`;
}

export default function PayoutTimingFields({
  hostId,
  isFree,
  policy,
  mode,
  onChange,
}: {
  hostId: string | null;
  isFree: boolean;
  policy: string;
  mode: PayoutMode;
  onChange: (patch: { policy?: string; mode?: PayoutMode }) => void;
}) {
  const idToken = useIdToken();
  const { data: elig, isLoading } = usePayoutEligibility(hostId, idToken);
  const showTiming = WEEKLY_PAYOUTS_ENABLED && !isFree;
  const weekly = showTiming && mode === "weekly";

  // Weekly needs the backend's yes. Unknown (no answer yet) counts as no,
  // but an event already on weekly keeps showing it as selected.
  const weeklyAllowed = !!elig?.weekly_eligible;
  const reasons = elig?.reasons?.length
    ? elig.reasons
    : elig
      ? []
      : isLoading
        ? []
        : ["Weekly payouts aren’t available on your account yet."];

  const pickMode = (m: PayoutMode) => {
    if (m === "weekly" && !weeklyAllowed) return;
    onChange(
      m === "weekly" ? { mode: m, policy: NO_REFUND_POLICY } : { mode: m },
    );
  };

  return (
    <div className="space-y-4">
      {showTiming && (
        <div className="space-y-2">
          <p className="px-1 text-sm text-white/60">When you get paid</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PAYOUT_MODES.map((m) => {
              const on = mode === m.value;
              const locked = m.value === "weekly" && !weeklyAllowed && !on;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => pickMode(m.value)}
                  disabled={locked}
                  aria-pressed={on}
                  className={`rounded-2xl border p-3.5 text-left transition disabled:cursor-not-allowed ${
                    on
                      ? "border-[#B724EA] bg-[#B724EA]/[0.12]"
                      : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                  } ${locked ? "opacity-55" : ""}`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                    {locked && <FiLock className="h-3.5 w-3.5" />}
                    {m.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-white/55">
                    {m.description}
                  </span>
                </button>
              );
            })}
          </div>
          {!weeklyAllowed && reasons.length > 0 && (
            <ul className="space-y-0.5 px-1 text-xs text-white/45">
              {reasons.map((r) => (
                <li key={r}>Weekly payouts: {r}</li>
              ))}
            </ul>
          )}
          {weekly && elig && elig.early_backstop_cents > 0 && (
            <p className="px-1 text-xs text-white/45">
              Paid early so far across your events:{" "}
              {rupees(elig.early_outstanding_cents)} of{" "}
              {rupees(elig.early_backstop_cents)}.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        {showTiming && <p className="px-1 text-sm text-white/60">Refunds</p>}
        <div className="flex flex-wrap gap-2">
          {CANCELLATION_POLICIES.map((p) => (
            <Chip
              key={p.value}
              active={policy === p.value}
              disabled={weekly && p.value !== NO_REFUND_POLICY}
              onClick={() => onChange({ policy: p.value })}
            >
              {p.label}
            </Chip>
          ))}
        </div>
        <p className="px-1 text-xs text-white/45">
          {weekly
            ? "Weekly payouts are always No refunds, and guests see it before they book. If you cancel the event, every guest is refunded in full."
            : (CANCELLATION_POLICIES.find((p) => p.value === policy)
                ?.description ?? "Pick how refunds work for guests.")}
        </p>
      </div>
    </div>
  );
}
