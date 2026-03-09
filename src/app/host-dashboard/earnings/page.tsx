"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HostNavbar } from "~/components/host-dashboard";
import { useEarnings, usePayoutHistory, usePayoutMethods } from "~/hooks/useApi";
import { format } from "date-fns";
import { FiDollarSign, FiCreditCard, FiClock, FiFilter, FiCheck } from "react-icons/fi";
import { LuWallet, LuBuilding2 } from "react-icons/lu";

export default function HostEarningsPage() {
  const [hostId, setHostId] = useState<string | null>(null);
  useEffect(() => {
    setHostId(localStorage.getItem("msm_host_id"));
  }, []);

  const { data: earnings, isLoading: loadingEarnings } = useEarnings(hostId);
  const { data: payoutHistory, isLoading: loadingHistory } = usePayoutHistory(
    hostId,
    { limit: 50, offset: 0 },
  );
  const { data: payoutMethods, isLoading: loadingMethods } = usePayoutMethods(hostId);

  const fmtCurrency = useMemo(() => {
    const nf = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });
    return (cents: number) => nf.format(cents / 100);
  }, []);

  const payoutsOnly = useMemo(() => {
    return (payoutHistory ?? []).filter(
      (p) => p.type === "payout" || p.type === "withdrawal",
    );
  }, [payoutHistory]);

  // Calculate available balance (total - pending)
  const availableBalance = (earnings?.total_earnings_cents ?? 0) - (earnings?.pending_clearance_cents ?? 0);

  // Platform fee calculation (assuming 15% platform fee)
  const platformFeePercent = 15;
  const hostPercent = 100 - platformFeePercent;
  const avgBookingValue = 15000; // $150 in cents - placeholder
  const serviceFee = Math.round(avgBookingValue * (platformFeePercent / 100));
  const netEarning = avgBookingValue - serviceFee;

  const isLoading = loadingEarnings || loadingHistory || loadingMethods;

  if (!hostId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HostNavbar />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No host profile found. Please apply as a host first.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HostNavbar />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Earnings & Payouts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your revenue, track pending payments, and configure your payout methods securely.
          </p>
        </div>

        {isLoading && (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0094CA] border-t-transparent" />
          </div>
        )}

        {!isLoading && (
          <>
            {/* Three stat cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
              {/* Total Earnings */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <FiDollarSign className="h-4 w-4" />
                  Total Earnings
                </div>
                <p className="mt-3 text-3xl font-bold text-gray-900">
                  {fmtCurrency(earnings?.total_earnings_cents ?? 0)}
                </p>
                <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                  <span>↑</span> +12% from last month
                </p>
              </div>

              {/* Available Balance - Highlighted */}
              <div className="rounded-xl border-2 border-[#0094CA] bg-white p-5 relative">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#0094CA] uppercase tracking-wide">
                  <LuWallet className="h-4 w-4" />
                  Available Balance
                </div>
                <p className="mt-3 text-3xl font-bold text-gray-900">
                  {fmtCurrency(availableBalance)}
                </p>
                <button className="mt-3 w-full rounded-lg bg-[#0094CA] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#007dab] flex items-center justify-center gap-2">
                  Request Payout
                  <span>→</span>
                </button>
              </div>

              {/* Pending Clearance */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <FiClock className="h-4 w-4" />
                  Pending Clearance
                </div>
                <p className="mt-3 text-3xl font-bold text-gray-400">
                  {fmtCurrency(earnings?.pending_clearance_cents ?? 0)}
                </p>
                {earnings?.estimated_clearance_at && (
                  <p className="mt-1 text-xs text-gray-500">
                    Est. arrival: {format(new Date(earnings.estimated_clearance_at), "MMM d")}
                  </p>
                )}
              </div>
            </div>

            {/* Two columns: Fee Breakdown + Payout Methods */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
              {/* Platform Fee Breakdown */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-gray-900">Platform Fee Breakdown</h3>
                <p className="mt-1 text-xs text-gray-500">Transparency on how your earnings are calculated.</p>

                {/* Progress bar */}
                <div className="mt-4 h-3 w-full rounded-full bg-gray-100 overflow-hidden flex">
                  <div
                    className="h-full bg-[#1e3a5f] rounded-l-full"
                    style={{ width: `${hostPercent}%` }}
                  />
                  <div
                    className="h-full bg-[#0094CA]"
                    style={{ width: `${platformFeePercent}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#1e3a5f]" />
                    You ({hostPercent}%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0094CA]" />
                    Platform Fee ({platformFeePercent}%)
                  </span>
                </div>

                {/* Fee details */}
                <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Average Booking Value</span>
                    <span className="font-semibold text-gray-900">{fmtCurrency(avgBookingValue)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Service Fee</span>
                    <span className="font-semibold text-gray-900">-{fmtCurrency(serviceFee)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">Your Net Earning</span>
                    <span className="font-bold text-[#0094CA]">{fmtCurrency(netEarning)}</span>
                  </div>
                </div>
              </div>

              {/* Payout Methods */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Payout Methods</h3>
                  <Link href="/host-dashboard/settings/payouts" className="text-xs font-semibold text-[#0094CA] hover:underline">
                    Manage
                  </Link>
                </div>

                <div className="mt-4 space-y-3">
                  {payoutMethods && payoutMethods.length > 0 ? (
                    payoutMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 ${
                          method.is_primary ? "border-[#0094CA] bg-[#e6f8ff]" : "border-gray-200"
                        }`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                          {method.type === "bank" ? (
                            <LuBuilding2 className="h-5 w-5 text-gray-600" />
                          ) : (
                            <FiCreditCard className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {method.type === "bank" ? method.bank_name ?? "Bank Account" : "UPI Transfer"}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {method.type === "bank"
                              ? `${method.account_type ?? "Checking"} •••• ${method.last_four_digits ?? "****"}`
                              : method.upi_id ?? "upiid@bank"}
                          </p>
                        </div>
                        {method.is_primary && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0094CA]">
                            <FiCheck className="h-3.5 w-3.5 text-white" />
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                          <LuBuilding2 className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-400">No bank account</p>
                          <p className="text-xs text-gray-400">Add a bank account</p>
                        </div>
                      </div>
                    </>
                  )}

                  <button className="w-full rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition">
                    + Add new method
                  </button>
                </div>

                <p className="mt-4 text-xs text-gray-400 flex items-center gap-1">
                  <span>🔒</span> Your financial data is encrypted and secure.
                </p>
              </div>
            </div>

            {/* Payout History Table */}
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <h3 className="text-sm font-semibold text-gray-900">Payout History</h3>
                <button className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700">
                  <FiFilter className="h-4 w-4" />
                  Filter
                </button>
              </div>

              {payoutsOnly.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  No payouts yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Reference ID</th>
                        <th className="px-5 py-3">Method</th>
                        <th className="px-5 py-3 text-right">Amount</th>
                        <th className="px-5 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payoutsOnly.map((p) => {
                        const statusColor =
                          p.status === "completed"
                            ? "text-green-600"
                            : p.status === "failed"
                              ? "text-red-600"
                              : "text-amber-600";

                        return (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-5 py-4 text-sm text-gray-900">
                              {format(new Date(p.created_at), "MMM d, yyyy")}
                            </td>
                            <td className="px-5 py-4 text-sm text-gray-500">
                              {p.display_reference ?? `#TXN-${p.id.slice(0, 5).toUpperCase()}`}
                            </td>
                            <td className="px-5 py-4 text-sm text-gray-500">
                              {p.payout_method_id ? "Bank •••• ****" : "Default"}
                            </td>
                            <td className="px-5 py-4 text-sm font-semibold text-gray-900 text-right">
                              {fmtCurrency(p.amount_cents)}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <span className={`text-xs font-semibold ${statusColor}`}>
                                • {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
