"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import { Navbar, Breadcrumb } from "~/components";
import Link from "next/link";
import { FiArrowLeft, FiDownload, FiCheckCircle, FiXCircle, FiAlertCircle, FiCreditCard, FiClock, FiCheck, FiTrash2, FiX } from "react-icons/fi";
import { LuLoader2, LuWallet, LuBuilding2 } from "react-icons/lu";
import { toast } from "sonner";
import {
  usePendingHostApplications,
  useApproveHostApplication,
  useRejectHostApplication,
  usePlatformBalance,
  usePlatformPayoutMethods,
  useAddPlatformPayoutMethod,
  useSetPlatformPrimaryPayoutMethod,
  useDeletePlatformPayoutMethod,
  useWithdrawPlatformFees,
} from "~/hooks/useApi";
import { env } from "~/env";
import type { HostDTO, PayoutMethodDTO, PlatformAddPayoutMethodPayload } from "~/lib/api";

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

export default function AdminPage() {
  const [user] = useAuthState(auth);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<HostDTO | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isDeciding, setIsDeciding] = useState(false);
  const [activeTab, setActiveTab] = useState<'applications' | 'earnings'>('applications');

  // Earnings modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

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

  // Check if user is admin
  const isAdmin =
    !!user?.email &&
    user.email.toLowerCase() === String(env.NEXT_PUBLIC_ADMIN_EMAIL ?? "").toLowerCase();

  // Get Firebase ID token for admin requests
  useEffect(() => {
    if (user) {
      void user.getIdToken().then((token) => {
        setIdToken(token);
      });
    }
  }, [user]);

  // Fetch data
  const { data: balance, isLoading: loadingBalance, refetch: refetchBalance } = usePlatformBalance(idToken);
  const { data: payoutMethods, isLoading: loadingMethods, refetch: refetchMethods } = usePlatformPayoutMethods(
    idToken,
  );
  const { data: applications, isLoading, refetch } = usePendingHostApplications(idToken);
  const approveAppMutation = useApproveHostApplication();
  const rejectAppMutation = useRejectHostApplication();
  const addMethodMutation = useAddPlatformPayoutMethod();
  const setPrimaryMutation = useSetPlatformPrimaryPayoutMethod();
  const deleteMethodMutation = useDeletePlatformPayoutMethod();
  const withdrawMutation = useWithdrawPlatformFees();

  // ── Currency formatter (INR) ──
  const fmtCurrency = useMemo(() => {
    const nf = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    });
    return (cents: number) => nf.format(cents / 100).replace("$", "₹");
  }, []);

  const availableBalance = Number(
    balance?.balance_cents ?? 0,
  );
  const platformFeesCollected = Number(
    balance?.collected_from_bookings ?? 0,
  );


  const clearFeedback = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const handleApprove = async (app: HostDTO) => {
    if (!idToken) {
      toast.error("Authentication failed. Please refresh the page.");
      return;
    }

    setIsDeciding(true);
    try {
      await approveAppMutation.mutateAsync({ hostId: app.id, idToken });
      toast.success(`✅ Approved ${app.first_name} ${app.last_name}`);
      setSelectedApp(null);
      await refetch();
    } catch (err) {
      console.error("Approval failed:", err);
      toast.error("Failed to approve application");
    } finally {
      setIsDeciding(false);
    }
  };

  const handleReject = async (app: HostDTO) => {
    if (!idToken) {
      toast.error("Authentication failed. Please refresh the page.");
      return;
    }

    setIsDeciding(true);
    try {
      await rejectAppMutation.mutateAsync({
        hostId: app.id,
        idToken,
        reason: rejectReason || undefined,
      });
      toast.success(`❌ Rejected ${app.first_name} ${app.last_name}`);
      setSelectedApp(null);
      setRejectReason("");
      await refetch();
    } catch (err) {
      console.error("Rejection failed:", err);
      toast.error("Failed to reject application");
    } finally {
      setIsDeciding(false);
    }
  };

  // ── Action: Add payout method ──
  const handleAddMethod = async () => {
    if (!idToken) return;
    setActionLoading(true);
    clearFeedback();
    try {
      const body: PlatformAddPayoutMethodPayload = addForm.type === "bank"
        ? {
            type: addForm.type,
            beneficiary_name: addForm.beneficiary_name,
            bank_name: addForm.bank_name,
            account_type: addForm.account_type,
            account_number: addForm.account_number,
            ifsc: addForm.ifsc,
          }
        : {
            type: addForm.type,
            beneficiary_name: addForm.beneficiary_name,
            upi_id: addForm.upi_id,
          };
      await addMethodMutation.mutateAsync({ body, idToken } as Parameters<
        typeof addMethodMutation.mutateAsync
      >[0]);
      setActionSuccess("Payout method added successfully.");
      setShowAddModal(false);
      void refetchMethods?.();
      setAddForm({
        type: "bank", bank_name: "", account_type: "savings",
        account_number: "", ifsc: "", beneficiary_name: "", upi_id: "",
      });
    } catch (e: unknown) {
      console.error("❌ Add method failed:", e);
      setActionError(e instanceof Error ? e.message : "Failed to add method.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Action: Set primary ──
  const handleSetPrimary = async (methodId: string) => {
    if (!idToken) return;
    setActionLoading(true);
    clearFeedback();
    try {
      await setPrimaryMutation.mutateAsync({ methodId, idToken });
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
    if (!idToken) return;
    setActionLoading(true);
    clearFeedback();
    try {
      await deleteMethodMutation.mutateAsync({ methodId, idToken });
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
    if (!idToken) return;
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
      await withdrawMutation.mutateAsync({ body: { amount_cents: amountCents }, idToken });
      setActionSuccess(`Payout of ${fmtCurrency(amountCents)} requested successfully.`);
      setShowPayoutModal(false);
      setPayoutAmountCents("");
      void refetchBalance?.();
    } catch (e: unknown) {
      console.error("❌ Payout request failed:", e);
      setActionError(e instanceof Error ? e.message : "Failed to request payout.");
    } finally {
      setActionLoading(false);
    }
  };

  if (!user) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Access Required</h1>
          <p className="max-w-md text-gray-500">Please log in to access the admin panel.</p>
          <Link href="/" className="rounded-full bg-[#0094CA] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#007dab]">
            Go Home
          </Link>
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="max-w-md text-gray-500">You do not have permission to access this page.</p>
          <Link href="/" className="rounded-full bg-[#0094CA] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#007dab]">
            Go Home
          </Link>
        </div>
      </>
    );
  }

  const isLoadingEarnings = (loadingBalance ?? false) || (loadingMethods ?? false);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-7xl site-x">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Admin" }]} className="mb-6" />
          
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

          {/* Tabs Navigation */}
          <div className="mb-8 flex border-b border-gray-200">
            <button 
              onClick={() => setActiveTab('applications')}
              className={`px-4 py-3 border-b-2 text-sm font-semibold transition ${
                activeTab === 'applications'
                  ? 'border-[#0094CA] text-[#0094CA]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Host Applications
            </button>
            <button 
              onClick={() => setActiveTab('earnings')}
              className={`px-4 py-3 border-b-2 text-sm font-semibold transition ${
                activeTab === 'earnings'
                  ? 'border-[#0094CA] text-[#0094CA]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Platform Earnings
            </button>
          </div>

          {/* HOST APPLICATIONS SECTION */}
          {activeTab === 'applications' && <>
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Host Applications</h1>
                <p className="mt-1 text-gray-600">Review and manage pending host applications</p>
              </div>
              <Link
                href="/"
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 border border-gray-200 hover:bg-gray-50 transition"
              >
                <FiArrowLeft size={16} />
                Back Home
              </Link>
            </div>

            {/* Applications List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <LuLoader2 className="h-8 w-8 animate-spin text-[#0094CA]" />
              </div>
            ) : !applications || applications.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                <FiCheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
                <p className="text-lg font-medium text-gray-900">No Pending Applications</p>
                <p className="mt-1 text-gray-600">All host applications have been reviewed!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {applications.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className="rounded-lg border border-gray-200 bg-white p-6 text-left hover:border-[#0094CA] hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {app.first_name} {app.last_name}
                        </h3>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <p>📍 {app.city}</p>
                          <p>📞 {app.phn_number}</p>
                          <p>✨ Experiences: {app.experience_desc}</p>
                          {app.moods && app.moods.length > 0 && (
                            <p>🎯 Moods: {app.moods.map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(", ")}</p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                          app.application_status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        <FiAlertCircle size={12} />
                        {app.application_status.toUpperCase()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
          }

          {/* PLATFORM EARNINGS SECTION */}
          {activeTab === 'earnings' && <div className="mt-0">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">Platform Earnings & Payouts</h2>

            {isLoadingEarnings ? (
              <div className="flex min-h-[40vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0094CA] border-t-transparent" />
              </div>
            ) : (
              <>
                {/* ── Stat cards ── */}
                {(console.log("📊 RENDERING STAT CARDS"), console.log("Balance Object:", balance), console.log("Platform Fees Collected (INR):", platformFeesCollected / 100), console.log("Available Balance (INR):", availableBalance / 100), true) && (
                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* Total Fees Collected */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <span className="text-base">₹</span>
                      Total Fees Collected
                    </div>
                    <p className="mt-3 text-3xl font-bold text-gray-900">
                      {fmtCurrency(Number(platformFeesCollected))}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                      <span>↑</span> Platform revenue
                    </p>
                  </div>

                  {/* Available Balance */}
                  <div className="relative rounded-xl border-2 border-[#0094CA] bg-white p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#0094CA]">
                      <LuWallet className="h-4 w-4" />
                      Available Balance
                    </div>
                    <p className="mt-3 text-3xl font-bold text-gray-900">
                      {fmtCurrency(Number(availableBalance))}
                    </p>
                    <button
                      onClick={() => { clearFeedback(); setShowPayoutModal(true); }}
                      disabled={availableBalance <= 0}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0094CA] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#007dab] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Withdraw <span>→</span>
                    </button>
                  </div>

                  {/* Pending Clearance */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <FiClock className="h-4 w-4" />
                      Pending Clearance
                    </div>
                    <p className="mt-3 text-3xl font-bold text-gray-400">
                      {fmtCurrency(0)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Instant settlement for platform
                    </p>
                  </div>
                </div>
                )}

                {/* ── Payout Methods ── */}
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">Payout Methods</h3>
                  </div>

                  <div className="space-y-3">
                    {payoutMethods && payoutMethods.length > 0 ? (
                      payoutMethods.map((method: PayoutMethodDTO) => (
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
              </>
            )}
          </div>
          }
        </div>

        {/* Application Detail Modal */}
        {selectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
              {/* Header */}
              <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedApp.first_name} {selectedApp.last_name}
                </h2>
                <button
                  onClick={() => {
                    setSelectedApp(null);
                    setRejectReason("");
                  }}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="space-y-6 px-6 py-6">
                {/* Personal Info */}
                <div>
                  <h3 className="mb-3 font-semibold text-gray-900">Personal Information</h3>
                  <div className="grid gap-3 text-sm text-gray-600">
                    <p>
                      <span className="font-medium text-gray-900">Name:</span> {selectedApp.first_name} {selectedApp.last_name}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Phone:</span> {selectedApp.phn_number}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">City:</span> {selectedApp.city}
                    </p>
                  </div>
                </div>

                {/* Experience Details */}
                <div>
                  <h3 className="mb-3 font-semibold text-gray-900">Experience Details</h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p>
                      <span className="font-medium text-gray-900">Description:</span> {selectedApp.experience_desc}
                    </p>
                    {selectedApp.moods && selectedApp.moods.length > 0 && (
                      <p>
                        <span className="font-medium text-gray-900">Moods:</span>{" "}
                        {selectedApp.moods.map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(", ")}
                      </p>
                    )}
                    {selectedApp.preferred_days && selectedApp.preferred_days.length > 0 && (
                      <p>
                        <span className="font-medium text-gray-900">Preferred Days:</span>{" "}
                        {selectedApp.preferred_days.map((d) => d.toUpperCase()).join(", ")}
                      </p>
                    )}
                    {selectedApp.group_size && (
                      <p>
                        <span className="font-medium text-gray-900">Group Size:</span> Up to {selectedApp.group_size} people
                      </p>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {selectedApp.description && (
                  <div>
                    <h3 className="mb-3 font-semibold text-gray-900">About</h3>
                    <p className="text-sm text-gray-600">{selectedApp.description}</p>
                  </div>
                )}

                {/* Government ID */}
                {selectedApp.government_id_url && (
                  <div>
                    <h3 className="mb-3 font-semibold text-gray-900">Government ID</h3>
                    <a
                      href={selectedApp.government_id_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-[#0094CA] px-4 py-2 text-sm font-semibold text-white hover:bg-[#007dab] transition"
                    >
                      <FiDownload size={16} />
                      View Document
                    </a>
                  </div>
                )}

                {/* Reject Reason */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-900">
                    Rejection Reason (if rejecting)
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter reason for rejection (optional)"
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-[#0094CA] focus:ring-1 focus:ring-[#0094CA]"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 border-t border-gray-200 pt-6">
                  <button
                    onClick={() => handleReject(selectedApp)}
                    disabled={isDeciding}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-100 px-4 py-3 font-semibold text-red-700 hover:bg-red-200 transition disabled:opacity-50"
                  >
                    {isDeciding ? (
                      <>
                        <LuLoader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FiXCircle size={18} />
                        Reject
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleApprove(selectedApp)}
                    disabled={isDeciding}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-100 px-4 py-3 font-semibold text-green-700 hover:bg-green-200 transition disabled:opacity-50"
                  >
                    {isDeciding ? (
                      <>
                        <LuLoader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FiCheckCircle size={18} />
                        Approve
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            MODAL: Request Payout
        ════════════════════════════════════════════════ */}
        {showPayoutModal && (
          <Modal title="Request Withdrawal" onClose={() => { setShowPayoutModal(false); clearFeedback(); }}>
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Available balance:{" "}
                <span className="font-bold text-gray-900">{fmtCurrency(Number(availableBalance))}</span>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">₹</span>
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
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestPayout}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#0094CA] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#007dab] transition disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <LuLoader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Request Withdrawal"
                  )}
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
              {/* Method Type Toggle */}
              <div className="flex rounded-lg border border-gray-200 p-1">
                <button
                  onClick={() => setAddForm((f) => ({ ...f, type: "bank" }))}
                  className={`flex-1 rounded px-3 py-2 text-sm font-medium transition ${addForm.type === "bank" ? "bg-[#0094CA] text-white" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  Bank Account
                </button>
                <button
                  onClick={() => setAddForm((f) => ({ ...f, type: "upi" }))}
                  className={`flex-1 rounded px-3 py-2 text-sm font-medium transition ${addForm.type === "upi" ? "bg-[#0094CA] text-white" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  UPI
                </button>
              </div>

              {/* Beneficiary Name */}
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
                    placeholder="e.g. HDFC, SBI"
                    value={addForm.bank_name}
                    onChange={(e) => setAddForm((f) => ({ ...f, bank_name: e.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-600">Account Type</label>
                      <select
                        value={addForm.account_type}
                        onChange={(e) => setAddForm((f) => ({ ...f, account_type: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#0094CA] focus:ring-2 focus:ring-[#0094CA]/20 transition"
                      >
                        <option value="savings">Savings</option>
                        <option value="current">Current</option>
                      </select>
                    </div>
                    <InputField
                      label="Account Number"
                      placeholder="1234567890"
                      value={addForm.account_number}
                      onChange={(e) => setAddForm((f) => ({ ...f, account_number: e.target.value }))}
                    />
                  </div>
                  <InputField
                    label="IFSC Code"
                    placeholder="HDFC0000001"
                    value={addForm.ifsc}
                    onChange={(e) => setAddForm((f) => ({ ...f, ifsc: e.target.value }))}
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
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMethod}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#0094CA] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#007dab] transition disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <LuLoader2 className="h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Method"
                  )}
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
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteMethod(showDeleteConfirm)}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <LuLoader2 className="h-4 w-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    "Remove Method"
                  )}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </main>
    </>
  );
}


