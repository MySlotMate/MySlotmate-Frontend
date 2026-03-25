"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HostNavbar } from "~/components/host-dashboard";
import { useEarnings, usePayoutHistory, usePayoutMethods } from "~/hooks/useApi";
import { format } from "date-fns";
import {
  FiCreditCard, FiClock, FiFilter, FiCheck,
  FiTrash2, FiX, FiAlertCircle,
} from "react-icons/fi";
import { LuWallet, LuBuilding2 } from "react-icons/lu";

// ─── Types ────────────────────────────────────────────────────────────────────
type PayoutMethodType = "bank" | "upi";

interface AddMethodForm {
  type: PayoutMethodType;
  bank_name: string;
  account_type: string;
  account_number: string;
  ifsc: string;
  beneficiary_name: string;
  upi_id: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function apiPost(path: string, body: object) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return null;
}

async function apiPut(path: string, body: object): Promise<null> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return null;
}

async function apiDelete(path: string): Promise<null> {
  const res = await fetch(`${BASE}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
            <FiX className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function InputField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-600">{label}</label>
      <input
        {...props}
        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#0094CA] focus:ring-2 focus:ring-[#0094CA]/20 transition"
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HostEarningsPage() {
  const [hostId, setHostId] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null); // methodID to delete

  // Form + loading states
  const [addForm, setAddForm] = useState<AddMethodForm>({
    type: "bank",
    bank_name: "",
    account_type: "savings",
    account_number: "",
    ifsc: "",
    beneficiary_name: "",
    upi_id: "",
  });
  const [payoutAmountCents, setPayoutAmountCents] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    setHostId(localStorage.getItem("msm_host_id"));
  }, []);

  const { data: earnings, isLoading: loadingEarnings, refetch: refetchEarnings } = useEarnings(hostId);
  const { data: payoutHistory, isLoading: loadingHistory, refetch: refetchHistory } = usePayoutHistory(
    hostId, { limit: 50, offset: 0 },
  );
  const { data: payoutMethods, isLoading: loadingMethods, refetch: refetchMethods } = usePayoutMethods(hostId);

  // ── Currency formatter (INR) ──
  const fmtCurrency = useMemo(() => {
    const nf = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    });
    return (cents: number) => nf.format(cents / 100).replace("$", "₹");
  }, []);

  const payoutsOnly = useMemo(
    () => (payoutHistory ?? []).filter((p) => p.type === "payout" || p.type === "withdrawal"),
    [payoutHistory],
  );

  const availableBalance = earnings?.total_earnings_cents ?? 0;

  const platformFeePercent = 15;
  const hostPercent = 100 - platformFeePercent;
  const avgBookingValue = 15000;
  const serviceFee = Math.round(avgBookingValue * (platformFeePercent / 100));
  const netEarning = avgBookingValue - serviceFee;

  const isLoading = loadingEarnings || loadingHistory || loadingMethods;

  const clearFeedback = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  // ── Action: Add payout method ──
  const handleAddMethod = async () => {
    if (!hostId) return;
    setActionLoading(true);
    clearFeedback();
    try {
      const body: Record<string, string> = {
        host_id: hostId,
        type: addForm.type,
        beneficiary_name: addForm.beneficiary_name,
      };
      if (addForm.type === "bank") {
        body.bank_name = addForm.bank_name;
        body.account_type = addForm.account_type;
        body.account_number = addForm.account_number;
        body.ifsc = addForm.ifsc;
      } else {
        body.upi_id = addForm.upi_id;
      }
      await apiPost("/payouts/methods", body);
      setActionSuccess("Payout method added successfully.");
      setShowAddModal(false);
      void refetchMethods?.();
      setAddForm({
        type: "bank", bank_name: "", account_type: "savings",
        account_number: "", ifsc: "", beneficiary_name: "", upi_id: "",
      });
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Failed to add method.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Action: Set primary ──
  const handleSetPrimary = async (methodId: string) => {
    if (!hostId) return;
    setActionLoading(true);
    clearFeedback();
    try {
      await apiPut(`/payouts/methods/${methodId}/primary?host_id=${hostId}`, {});
      setActionSuccess("Primary payout method updated.");
      await refetchMethods?.();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Failed to set primary.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Action: Delete method ──
  const handleDeleteMethod = async (methodId: string) => {
    if (!hostId) return;
    setActionLoading(true);
    clearFeedback();
    try {
      await apiDelete(`/payouts/methods/${methodId}?host_id=${hostId}`);
      setActionSuccess("Payout method removed.");
      setShowDeleteConfirm(null);
      void refetchMethods?.();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Failed to delete method.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Action: Request payout ──
  const handleRequestPayout = async () => {
    if (!hostId) return;
    const amountCents = Math.round(parseFloat(payoutAmountCents) * 100);
    if (!amountCents || amountCents <= 0) {
      setActionError("Please enter a valid amount.");
      return;
    }
    if (amountCents > availableBalance) {
      setActionError("Amount exceeds available balance.");
      return;
    }
    setActionLoading(true);
    clearFeedback();
    try {
      await apiPost("/payouts/withdraw", { host_id: hostId, amount_cents: amountCents });
      setActionSuccess(`Payout of ${fmtCurrency(amountCents)} requested successfully.`);
      setShowPayoutModal(false);
      setPayoutAmountCents("");
      void refetchEarnings?.();
      void refetchHistory?.();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Failed to request payout.");
    } finally {
      setActionLoading(false);
    }
  };

  if (!hostId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HostNavbar />
        <main className="mx-auto max-w-6xl site-x py-8">
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

      <main className="mx-auto max-w-6xl site-x py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Earnings & Payouts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your revenue, track pending payments, and configure your payout methods securely.
          </p>
        </div>

        {/* Global feedback banners */}
        {actionSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <FiCheck className="h-4 w-4 shrink-0" />
            {actionSuccess}
            <button onClick={() => setActionSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">
              <FiX className="h-4 w-4" />
            </button>
          </div>
        )}
        {actionError && !showAddModal && !showPayoutModal && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <FiAlertCircle className="h-4 w-4 shrink-0" />
            {actionError}
            <button onClick={() => setActionError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <FiX className="h-4 w-4" />
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0094CA] border-t-transparent" />
          </div>
        )}

        {!isLoading && (
          <>
            {/* ── Stat cards ── */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Total Earnings */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <span className="text-base">₹</span>
                  Total Earnings
                </div>
                <p className="mt-3 text-3xl font-bold text-gray-900">
                  {fmtCurrency(earnings?.total_earnings_cents ?? 0)}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                  <span>↑</span> +12% from last month
                </p>
              </div>

              {/* Available Balance */}
              <div className="relative rounded-xl border-2 border-[#0094CA] bg-white p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#0094CA]">
                  <LuWallet className="h-4 w-4" />
                  Available Balance
                </div>
                <p className="mt-3 text-3xl font-bold text-gray-900">
                  {fmtCurrency(availableBalance)}
                </p>
                <button
                  onClick={() => { clearFeedback(); setShowPayoutModal(true); }}
                  disabled={availableBalance <= 0}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0094CA] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#007dab] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Request Payout <span>→</span>
                </button>
              </div>

              {/* Pending Clearance */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
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

            {/* ── Fee Breakdown + Payout Methods ── */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Platform Fee Breakdown */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-gray-900">Platform Fee Breakdown</h3>
                <p className="mt-1 text-xs text-gray-500">Transparency on how your earnings are calculated.</p>
                <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-l-full bg-[#1e3a5f]" style={{ width: `${hostPercent}%` }} />
                  <div className="h-full bg-[#0094CA]" style={{ width: `${platformFeePercent}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#1e3a5f]" /> You ({hostPercent}%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#0094CA]" /> Platform Fee ({platformFeePercent}%)
                  </span>
                </div>
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
                        className={`flex items-center gap-3 rounded-lg border p-3 transition ${method.is_primary ? "border-[#0094CA] bg-[#e6f8ff]" : "border-gray-200"
                          }`}
                      >
                        {/* Icon */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                          {method.type === "bank"
                            ? <LuBuilding2 className="h-5 w-5 text-gray-600" />
                            : <FiCreditCard className="h-5 w-5 text-gray-600" />}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {method.type === "bank" ? method.bank_name ?? "Bank Account" : "UPI Transfer"}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {method.type === "bank"
                              ? `${method.account_type ?? "Savings"} •••• ${method.last_four_digits ?? "****"}`
                              : method.upi_id ?? "upiid@bank"}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!method.is_primary && (
                            <button
                              onClick={() => handleSetPrimary(method.id)}
                              disabled={actionLoading}
                              title="Set as primary"
                              className="rounded-lg px-2 py-1 text-xs font-semibold text-[#0094CA] border border-[#0094CA]/30 hover:bg-[#e6f8ff] transition disabled:opacity-50"
                            >
                              Set primary
                            </button>
                          )}
                          {method.is_primary && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0094CA]">
                              <FiCheck className="h-3.5 w-3.5 text-white" />
                            </span>
                          )}
                          <button
                            onClick={() => { clearFeedback(); setShowDeleteConfirm(method.id); }}
                            disabled={actionLoading}
                            title="Delete method"
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-50"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                        <LuBuilding2 className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-400">No payout method</p>
                        <p className="text-xs text-gray-400">Add a bank account or UPI ID</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => { clearFeedback(); setShowAddModal(true); }}
                    className="w-full rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 transition hover:border-[#0094CA] hover:text-[#0094CA]"
                  >
                    + Add new method
                  </button>
                </div>

                <p className="mt-4 flex items-center gap-1 text-xs text-gray-400">
                  <span>🔒</span> Your financial data is encrypted and secure.
                </p>
              </div>
            </div>

            {/* ── Payout History ── */}
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <h3 className="text-sm font-semibold text-gray-900">Payout History</h3>
                <button className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700">
                  <FiFilter className="h-4 w-4" /> Filter
                </button>
              </div>

              {payoutsOnly.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">No payouts yet.</div>
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
                          p.status === "completed" ? "text-green-600"
                            : p.status === "failed" ? "text-red-600"
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
                            <td className="px-5 py-4 text-right text-sm font-semibold text-gray-900">
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

      {/* ════════════════════════════════════════════════
          MODAL: Request Payout
      ════════════════════════════════════════════════ */}
      {showPayoutModal && (
        <Modal title="Request Payout" onClose={() => { setShowPayoutModal(false); clearFeedback(); }}>
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Available balance:{" "}
              <span className="font-bold text-gray-900">{fmtCurrency(availableBalance)}</span>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">₹</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={payoutAmountCents}
                  onChange={(e) => setPayoutAmountCents(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2.5 pl-7 pr-3 text-sm text-gray-900 outline-none focus:border-[#0094CA] focus:ring-2 focus:ring-[#0094CA]/20 transition"
                />
              </div>
            </div>

            {actionError && (
              <p className="flex items-center gap-1.5 text-xs text-red-600">
                <FiAlertCircle className="h-3.5 w-3.5" /> {actionError}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setShowPayoutModal(false); clearFeedback(); }}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestPayout}
                disabled={actionLoading}
                className="flex-1 rounded-lg bg-[#0094CA] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#007dab] disabled:opacity-60"
              >
                {actionLoading ? "Processing…" : "Confirm Payout"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════
          MODAL: Add Payout Method
      ════════════════════════════════════════════════ */}
      {showAddModal && (
        <Modal title="Add Payout Method" onClose={() => { setShowAddModal(false); clearFeedback(); }}>
          <div className="space-y-4">
            {/* Type toggle */}
            <div className="flex rounded-lg border border-gray-200 p-1">
              {(["bank", "upi"] as PayoutMethodType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setAddForm((f) => ({ ...f, type: t }))}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition ${addForm.type === t
                      ? "bg-[#0094CA] text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  {t === "bank" ? "🏦 Bank Account" : "📱 UPI"}
                </button>
              ))}
            </div>

            {/* Beneficiary name always shown */}
            <InputField
              label="Beneficiary Name"
              placeholder="As per bank records"
              value={addForm.beneficiary_name}
              onChange={(e) => setAddForm((f) => ({ ...f, beneficiary_name: e.target.value }))}
            />

            {addForm.type === "bank" ? (
              <>
                <InputField
                  label="Bank Name"
                  placeholder="e.g. HDFC Bank"
                  value={addForm.bank_name}
                  onChange={(e) => setAddForm((f) => ({ ...f, bank_name: e.target.value }))}
                />
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Account Type</label>
                  <select
                    value={addForm.account_type}
                    onChange={(e) => setAddForm((f) => ({ ...f, account_type: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#0094CA] focus:ring-2 focus:ring-[#0094CA]/20 transition"
                  >
                    <option value="savings">Savings</option>
                    <option value="checking">Current / Checking</option>
                  </select>
                </div>
                <InputField
                  label="Account Number"
                  placeholder="Enter account number"
                  value={addForm.account_number}
                  onChange={(e) => setAddForm((f) => ({ ...f, account_number: e.target.value }))}
                />
                <InputField
                  label="IFSC Code"
                  placeholder="e.g. HDFC0001234"
                  value={addForm.ifsc}
                  onChange={(e) => setAddForm((f) => ({ ...f, ifsc: e.target.value.toUpperCase() }))}
                />
              </>
            ) : (
              <InputField
                label="UPI ID"
                placeholder="e.g. yourname@upi"
                value={addForm.upi_id}
                onChange={(e) => setAddForm((f) => ({ ...f, upi_id: e.target.value }))}
              />
            )}

            {actionError && (
              <p className="flex items-center gap-1.5 text-xs text-red-600">
                <FiAlertCircle className="h-3.5 w-3.5" /> {actionError}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setShowAddModal(false); clearFeedback(); }}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMethod}
                disabled={actionLoading}
                className="flex-1 rounded-lg bg-[#0094CA] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#007dab] disabled:opacity-60"
              >
                {actionLoading ? "Saving…" : "Add Method"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════
          MODAL: Delete Confirmation
      ════════════════════════════════════════════════ */}
      {showDeleteConfirm && (
        <Modal title="Remove Payout Method" onClose={() => setShowDeleteConfirm(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to remove this payout method? This action cannot be undone.
            </p>
            {actionError && (
              <p className="flex items-center gap-1.5 text-xs text-red-600">
                <FiAlertCircle className="h-3.5 w-3.5" /> {actionError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteMethod(showDeleteConfirm)}
                disabled={actionLoading}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
              >
                {actionLoading ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
