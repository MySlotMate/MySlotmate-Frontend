"use client";

import { useState } from "react";
import { FiDownload } from "react-icons/fi";
import { toast } from "sonner";
import { downloadHostStatement } from "~/lib/api";
import { MonthPill } from "~/components/host-dashboard/DateTimePills";

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/**
 * Monthly payout statement: every paid sale that month, refunds, any
 * commission, TCS/TDS withheld, what the host earned and the payouts sent.
 */
export default function MonthlyStatementCard() {
  const [month, setMonth] = useState(thisMonth());
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      await downloadHostStatement(month);
    } catch {
      toast.error("Couldn't download the statement. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#121426] p-5">
      <h3 className="text-sm font-semibold text-white">Monthly statement</h3>
      <p className="mt-1 text-xs leading-5 text-[#A5A8C3]">
        Every sale that month, refunds, tax withheld, what you earned and the
        payouts sent to you, as a PDF.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <MonthPill
          value={month}
          max={thisMonth()}
          onChange={setMonth}
          ariaLabel="Statement month"
        />
        <button
          type="button"
          onClick={() => void download()}
          disabled={busy || !month}
          className="flex items-center gap-2 rounded-xl bg-[#1B1C33] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#232445] disabled:opacity-50"
        >
          <FiDownload className="h-4 w-4" />
          {busy ? "Preparing…" : "Download PDF"}
        </button>
      </div>
    </div>
  );
}
