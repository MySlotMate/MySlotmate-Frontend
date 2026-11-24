"use client";

import FeeReceiptButton from "~/components/billing/FeeReceiptButton";
import { useHostCommissionDocuments } from "~/hooks/useApi";
import { BOOST_ENABLED, rupees } from "~/lib/boost";

const monthLabel = (period?: string) => {
  if (!period) return "";
  const [y, m] = period.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

/**
 * Monthly GST invoices for the Marketing Boost commission, and credit notes
 * when boosted bookings were refunded later. Shown once the host has any.
 */
export default function BoostInvoicesCard() {
  const { data: docs } = useHostCommissionDocuments(BOOST_ENABLED);
  if (!BOOST_ENABLED || !docs?.length) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-[#121426] p-5">
      <h3 className="text-sm font-semibold text-white">
        Marketing Boost invoices
      </h3>
      <p className="mt-1 text-xs leading-5 text-[#A5A8C3]">
        A GST invoice each month for the Boost commission taken from your
        payouts. If you&apos;re GST-registered, you can claim this GST back.
      </p>
      <ul className="mt-3 divide-y divide-white/[0.06]">
        {docs.map((d) => (
          <li
            key={d.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm"
          >
            <span className="min-w-0">
              <span className="block text-white/85">
                {d.kind === "credit_note" ? "Credit note" : "Invoice"} ·{" "}
                {monthLabel(d.period)}
              </span>
              <span className="text-xs text-white/45">{d.number}</span>
            </span>
            <span className="flex items-center gap-4">
              <span className="text-white/70">
                {d.kind === "credit_note" ? "−" : ""}
                {rupees(d.total_cents)}
              </span>
              <FeeReceiptButton doc={d} label="PDF" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
