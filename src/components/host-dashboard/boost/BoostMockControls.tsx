"use client";

/**
 * Test-mode controls on the Boost card, shown only while the screens run on
 * the in-browser stand-in (NEXT_PUBLIC_BOOST_PLAN_MOCK). They play the steps
 * our team takes in the admin, so every host screen can be walked through.
 * Hosts never see this.
 */

import {
  mockReset,
  mockTeamStep,
  type MockTeamStep,
} from "~/lib/boostPlanMock";
import { useRefreshPlan } from "~/hooks/useBoostPlan";
import type { PlanBoostDTO } from "~/lib/boostPlan";

const STEPS: {
  step: MockTeamStep;
  label: string;
  when: (b: PlanBoostDTO | null) => boolean;
}[] = [
  {
    step: "use_creatives",
    label: "Mark creatives in use",
    when: (b) => !!b && b.creatives_count > 0,
  },
  {
    step: "team_creative",
    label: "Team uploads a poster",
    when: (b) => !!b && ["quote_ready", "live"].includes(b.status),
  },
  {
    step: "go_live",
    label: "Go live",
    when: (b) => b?.status === "quote_ready" && b.budget_status === "paid",
  },
  {
    step: "log_day",
    label: "Log a day of results",
    when: (b) => b?.status === "live",
  },
  {
    step: "add_report",
    label: "Add a report",
    when: (b) => !!b && ["live", "ended"].includes(b.status),
  },
  {
    step: "end_and_close",
    label: "End and close",
    when: (b) =>
      b?.status === "live" || (b?.status === "ended" && !b.closed_at),
  },
  { step: "premium_off", label: "Turn Premium off", when: () => true },
];

export default function BoostMockControls({
  boost,
}: {
  boost: PlanBoostDTO | null;
}) {
  const refresh = useRefreshPlan();
  const run = async (step: MockTeamStep) => {
    await mockTeamStep(step, boost?.id);
    refresh();
  };
  return (
    <div className="space-y-2 rounded-2xl border border-dashed border-amber-300/40 p-3">
      <p className="text-[11px] font-semibold tracking-wide text-amber-200 uppercase">
        Test mode · not shown to hosts
      </p>
      <p className="text-xs text-white/50">
        The backend isn’t ready yet, so these play our team’s steps.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {STEPS.filter((s) => s.when(boost)).map((s) => (
          <button
            key={s.step}
            type="button"
            onClick={() => void run(s.step)}
            className="rounded-full border border-amber-300/30 px-3 py-1 text-xs text-amber-100 hover:bg-amber-300/10"
          >
            {s.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            mockReset();
            refresh();
          }}
          className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/60 hover:bg-white/[0.06]"
        >
          Reset test data
        </button>
      </div>
    </div>
  );
}
