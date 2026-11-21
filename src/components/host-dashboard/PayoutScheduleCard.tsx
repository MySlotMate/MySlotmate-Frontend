"use client";

/**
 * Earnings › Payout schedule (PRD: Refunds, cancellations and payout timing).
 * Whether the host can take weekly payouts (up to 50% of an event's
 * earnings early), how much is already paid early, cancellation strikes and
 * anything owed after a cancelled event. Hidden until the backend answers.
 */

import { FiAlertTriangle, FiCheckCircle, FiClock } from "react-icons/fi";
import { usePayoutEligibility } from "~/hooks/useApi";
import { WEEKLY_PAYOUTS_ENABLED, rupees } from "~/lib/boost";

export default function PayoutScheduleCard({
  hostId,
  idToken,
}: {
  hostId: string | null;
  idToken: string | null;
}) {
  const { data: e } = usePayoutEligibility(hostId, idToken);
  if (!WEEKLY_PAYOUTS_ENABLED || !e) return null;

  const pausedUntil =
    e.paused_until && new Date(e.paused_until) > new Date()
      ? new Date(e.paused_until).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
        })
      : null;
  const used =
    e.early_backstop_cents > 0
      ? Math.min(1, e.early_outstanding_cents / e.early_backstop_cents)
      : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#121426] p-5">
      <h3 className="text-sm font-semibold text-white">Payout schedule</h3>
      <p className="mt-1 text-xs leading-5 text-[#A5A8C3]">
        Each event is paid after it ends, or weekly with up to 50% early and the
        rest after the event. Weekly events are always No refunds.
      </p>

      <div className="mt-4 flex items-start gap-2.5 text-sm">
        {e.weekly_eligible && !pausedUntil ? (
          <>
            <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            <span className="text-white">
              Weekly payouts are available. Choose them per event under Refunds
              &amp; payout.
            </span>
          </>
        ) : (
          <>
            <FiClock className="mt-0.5 h-4 w-4 shrink-0 text-[#A5A8C3]" />
            <div className="space-y-1">
              <p className="text-white">
                {pausedUntil
                  ? `Weekly payouts are paused until ${pausedUntil}.`
                  : "Weekly payouts aren’t available yet."}
              </p>
              {!pausedUntil && e.reasons.length > 0 && (
                <ul className="space-y-0.5 text-xs text-[#A5A8C3]">
                  {e.reasons.map((r) => (
                    <li key={r}>· {r}</li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {e.early_backstop_cents > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-[#A5A8C3]">
            <span>Paid early, across upcoming events</span>
            <span className="text-white">
              {rupees(e.early_outstanding_cents)} of{" "}
              {rupees(e.early_backstop_cents)}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7038F5] to-[#B724EA]"
              style={{ width: `${used * 100}%` }}
            />
          </div>
        </div>
      )}

      {(e.strikes_90d > 0 || e.strikes_12m > 0) && (
        <p className="mt-4 text-xs text-[#A5A8C3]">
          Host cancellations: {e.strikes_90d} in the last 90 days,{" "}
          {e.strikes_12m} in 12 months. A 2nd in 90 days pauses Boost and weekly
          payouts for 90 days.
        </p>
      )}

      {e.recovery_balance_cents > 0 && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-400/25 bg-amber-500/[0.08] p-3 text-xs leading-5 text-amber-100">
          <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            You owe {rupees(e.recovery_balance_cents)} from a cancelled event
            (guest refunds and ad spend). It comes off your next payouts; until
            then, Boost and weekly payouts stay off.
          </span>
        </div>
      )}
    </div>
  );
}
