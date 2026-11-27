"use client";

/**
 * Results, reports and invoices of a Boost (PRD: Reports; Money flows).
 * Day by day spend and tickets sold, totals per channel, the files our team
 * shares, and the tax invoices for the ad budget.
 */

import { FiDownload, FiFileText } from "react-icons/fi";
import { useIdToken } from "~/hooks/useIdToken";
import {
  usePlanDocuments,
  usePlanReports,
  usePlanResults,
} from "~/hooks/useBoostPlan";
import { rupees } from "~/lib/boost";
import type { PlanBoostDTO } from "~/lib/boostPlan";
import { CHANNELS, GRADIENT } from "./parts";

const day = (d: string) =>
  new Date(`${d}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

export default function BoostPlanResults({ boost }: { boost: PlanBoostDTO }) {
  const idToken = useIdToken();
  const { data: results } = usePlanResults(boost.id, idToken);
  const { data: reports = [] } = usePlanReports(boost.id, idToken);
  const { data: docs = [] } = usePlanDocuments(boost.id, idToken);
  const days = results?.days ?? [];
  const maxSpend = Math.max(1, ...days.map((d) => d.spend_cents));
  const totals = results?.totals;
  const costPerTicket =
    totals && totals.tickets_sold > 0
      ? rupees(Math.round(totals.spend_cents / totals.tickets_sold))
      : "—";

  return (
    <div className="space-y-4 border-t border-white/[0.06] pt-4">
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Results</h3>
          <span className="text-xs text-white/50">
            Cost per ticket {costPerTicket}
          </span>
        </div>
        {days.length === 0 ? (
          <p className="text-sm text-white/55">
            Your manager adds each day’s numbers from the ad platforms. The
            first day shows here tomorrow.
          </p>
        ) : (
          <>
            <div
              className="flex h-28 items-end gap-1 rounded-2xl bg-black/20 px-3 pt-3 pb-2"
              role="img"
              aria-label={`Ad spend by day, ${days.length} days`}
            >
              {days.map((d) => (
                <div
                  key={d.day}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1"
                  title={`${day(d.day)}: ${rupees(d.spend_cents)} spent, ${d.tickets_sold} tickets`}
                >
                  <span className="text-[10px] text-white/60">
                    {d.tickets_sold}
                  </span>
                  <div
                    className={`w-full rounded-t ${GRADIENT}`}
                    style={{
                      height: `${Math.max(4, (d.spend_cents / maxSpend) * 64)}px`,
                    }}
                  />
                  <span className="truncate text-[10px] text-white/40">
                    {day(d.day)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-white/40">
              Bars show spend per day; the number above each is tickets sold.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
              <table className="w-full min-w-[320px] text-left text-xs">
                <thead className="text-white/45">
                  <tr>
                    <th className="px-3 py-2 font-medium">Channel</th>
                    <th className="px-3 py-2 text-right font-medium">Spent</th>
                    <th className="px-3 py-2 text-right font-medium">Reach</th>
                    <th className="px-3 py-2 text-right font-medium">Clicks</th>
                  </tr>
                </thead>
                <tbody className="text-white/80">
                  {results?.channels.map((c) => (
                    <tr
                      key={c.channel}
                      className="border-t border-white/[0.06]"
                    >
                      <td className="px-3 py-2">
                        {CHANNELS.find((x) => x.value === c.channel)?.label ??
                          c.channel}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {rupees(c.spend_cents)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {c.reach.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {c.clicks.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-white">
          Reports from your manager
        </h3>
        {reports.length === 0 ? (
          <p className="text-sm text-white/55">
            Ad platform exports, screenshots and the final report appear here.
          </p>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-2.5"
              >
                <FiFileText className="h-4 w-4 shrink-0 text-[#D8B4FE]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">
                    {r.title}
                    {r.kind === "final" && (
                      <span className="ml-2 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                        Final
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-white/50">
                    {r.covers_from && r.covers_until
                      ? `${day(r.covers_from)} – ${day(r.covers_until)}`
                      : ""}
                    {r.note ? ` · ${r.note}` : ""}
                  </p>
                </div>
                <a
                  href={r.file.url}
                  target="_blank"
                  rel="noreferrer"
                  download={r.file.name}
                  aria-label={`Download ${r.title}`}
                  className="rounded-full p-2 text-white/60 hover:bg-white/[0.06] hover:text-white"
                >
                  <FiDownload className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {docs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white">
            Ad budget invoices
          </h3>
          <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-black/20 text-sm">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <span className="min-w-0 truncate text-white/80">
                  {d.number} ·{" "}
                  {new Date(d.issued_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                {d.pdf_url ? (
                  <a
                    href={d.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-[#D8B4FE] hover:underline"
                  >
                    {rupees(d.amount_cents)}
                  </a>
                ) : (
                  <span className="shrink-0 text-white">
                    {rupees(d.amount_cents)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
