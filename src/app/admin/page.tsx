"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import { Navbar, Breadcrumb } from "~/components";
import Link from "next/link";
import {
  FiArrowLeft,
  FiDownload,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiCreditCard,
  FiClock,
  FiCheck,
  FiTrash2,
  FiX,
} from "react-icons/fi";
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
import type {
  HostDTO,
  PayoutMethodDTO,
  PlatformAddPayoutMethodPayload,
} from "~/lib/api";

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

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="msm-modal fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#121426] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#777B98] transition hover:bg-white/[0.06] hover:text-[#A5A8C3]"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function InputField({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[#A5A8C3]">
        {label}
      </label>
      <input
        {...props}
        className="w-full rounded-lg border border-white/10 px-3 py-2.5 text-sm text-white placeholder-[#777B98] transition outline-none focus:border-[#A020F0] focus:ring-2 focus:ring-[#A020F0]/20"
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
  const [activeTab, setActiveTab] = useState<"applications" | "earnings">(
    "applications",
  );

  // Earnings modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );

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
  const isAdmin = useMemo(() => {
    if (!user?.email) return false;
    const adminEmails = String(env.NEXT_PUBLIC_ADMIN_EMAIL ?? "")
      .toLowerCase()
      .split(",")
      .map((e) => e.trim());
    return adminEmails.includes(user.email.toLowerCase());
  }, [user?.email]);

  // Get Firebase ID token for admin requests
  useEffect(() => {
    if (user) {
      void user.getIdToken().then((token) => {
        setIdToken(token);
      });
    }
  }, [user]);

  // Fetch data
  const {
    data: balance,
    isLoading: loadingBalance,
    refetch: refetchBalance,
  } = usePlatformBalance(idToken);
  const {
    data: payoutMethods,
    isLoading: loadingMethods,
    refetch: refetchMethods,
  } = usePlatformPayoutMethods(idToken);
  const {
    data: applications,
    isLoading,
    refetch,
  } = usePendingHostApplications(idToken);
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

  const availableBalance = Number(balance?.balance_cents ?? 0);
  const platformFeesCollected = Number(balance?.collected_from_bookings ?? 0);

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
      const body: PlatformAddPayoutMethodPayload =
        addForm.type === "bank"
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
        type: "bank",
        bank_name: "",
        account_type: "savings",
        account_number: "",
        ifsc: "",
        beneficiary_name: "",
        upi_id: "",
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
      setActionError(
        e instanceof Error ? e.message : "Failed to delete method.",
      );
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
      await withdrawMutation.mutateAsync({
        body: { amount_cents: amountCents },
        idToken,
      });
      setActionSuccess(
        `Payout of ${fmtCurrency(amountCents)} requested successfully.`,
      );
      setShowPayoutModal(false);
      setPayoutAmountCents("");
      void refetchBalance?.();
    } catch (e: unknown) {
      console.error("❌ Payout request failed:", e);
      setActionError(
        e instanceof Error ? e.message : "Failed to request payout.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (!user) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-2xl font-bold text-white">
            Admin Access Required
          </h1>
          <p className="max-w-md text-[#A5A8C3]">
            Please log in to access the admin panel.
          </p>
          <Link
            href="/"
            className="rounded-full bg-[#A020F0] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#8A1AD0]"
          >
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
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="max-w-md text-[#A5A8C3]">
            You do not have permission to access this page.
          </p>
          <Link
            href="/"
            className="rounded-full bg-[#A020F0] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#8A1AD0]"
          >
            Go Home
          </Link>
        </div>
      </>
    );
  }

  const isLoadingEarnings =
    (loadingBalance ?? false) || (loadingMethods ?? false);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#080914] py-10">
        <div className="site-x mx-auto max-w-7xl">
          <Breadcrumb
            items={[{ label: "Home", href: "/" }, { label: "Admin" }]}
            className="mb-6"
          />

          {/* Global feedback banners */}
          {actionSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              <FiCheck className="h-4 w-4 shrink-0" />
              {actionSuccess}
              <button
                onClick={() => setActionSuccess(null)}
                className="ml-auto text-green-400 hover:text-green-300"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
          )}
          {actionError && !showAddModal && !showPayoutModal && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <FiAlertCircle className="h-4 w-4 shrink-0" />
              {actionError}
              <button
                onClick={() => setActionError(null)}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Tabs Navigation */}
          <div className="mb-8 flex border-b border-white/10">
            <button
              onClick={() => setActiveTab("applications")}
              className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === "applications"
                  ? "border-[#A020F0] text-[#D8B4FE]"
                  : "border-transparent text-[#A5A8C3] hover:text-white"
              }`}
            >
              Host Applications
            </button>
            <button
              onClick={() => setActiveTab("earnings")}
              className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === "earnings"
                  ? "border-[#A020F0] text-[#D8B4FE]"
                  : "border-transparent text-[#A5A8C3] hover:text-white"
              }`}
            >
              Platform Earnings
            </button>
          </div>

          {/* HOST APPLICATIONS SECTION */}
          {activeTab === "applications" && (
            <>
              {/* Header */}
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Host Applications
                  </h1>
                  <p className="mt-1 text-[#A5A8C3]">
                    Review and manage pending host applications
                  </p>
                </div>
                <Link
                  href="/"
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#121426] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.04]"
                >
                  <FiArrowLeft size={16} />
                  Back Home
                </Link>
              </div>

              {/* Applications List */}
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <LuLoader2 className="h-8 w-8 animate-spin text-[#D8B4FE]" />
                </div>
              ) : !applications || applications.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-[#121426] p-12 text-center">
                  <FiCheckCircle className="mx-auto mb-3 h-12 w-12 text-green-400" />
                  <p className="text-lg font-medium text-white">
                    No Pending Applications
                  </p>
                  <p className="mt-1 text-[#A5A8C3]">
                    All host applications have been reviewed!
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {applications.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className="rounded-lg border border-white/10 bg-[#121426] p-6 text-left transition hover:border-[#A020F0] hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {app.first_name} {app.last_name}
                          </h3>
                          <div className="mt-2 space-y-1 text-sm text-[#A5A8C3]">
                            <p>📍 {app.city}</p>
                            <p>📞 {app.phn_number}</p>
                            <p>✨ Experiences: {app.experience_desc}</p>
                            {app.moods && app.moods.length > 0 && (
                              <p>
                                🎯 Moods:{" "}
                                {app.moods
                                  .map(
                                    (m) =>
                                      m.charAt(0).toUpperCase() + m.slice(1),
                                  )
                                  .join(", ")}
                              </p>
                            )}
                            {(app.social_instagram ??
                              app.social_linkedin ??
                              app.social_website) && (
                              <p>🔗 Social links included</p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                            app.application_status === "pending"
                              ? "bg-yellow-500/15 text-yellow-300"
                              : "bg-[#241333] text-[#D8B4FE]"
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
          )}

          {/* PLATFORM EARNINGS SECTION */}
          {activeTab === "earnings" && (
            <div className="mt-0">
              <h2 className="mb-6 text-2xl font-bold text-white">
                Platform Earnings & Payouts
              </h2>

              {isLoadingEarnings ? (
                <div className="flex min-h-[40vh] items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A020F0] border-t-transparent" />
                </div>
              ) : (
                <>
                  {/* ── Stat cards ── */}
                  {(console.log("📊 RENDERING STAT CARDS"),
                  console.log("Balance Object:", balance),
                  console.log(
                    "Platform Fees Collected (INR):",
                    platformFeesCollected / 100,
                  ),
                  console.log(
                    "Available Balance (INR):",
                    availableBalance / 100,
                  ),
                  true) && (
                    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                      {/* Total Fees Collected */}
                      <div className="rounded-xl border border-white/10 bg-[#121426] p-5">
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[#A5A8C3] uppercase">
                          <span className="text-base">₹</span>
                          Total Fees Collected
                        </div>
                        <p className="mt-3 text-3xl font-bold text-white">
                          {fmtCurrency(Number(platformFeesCollected))}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-green-300">
                          <span>↑</span> Platform revenue
                        </p>
                      </div>

                      {/* Available Balance */}
                      <div className="relative rounded-xl border-2 border-[#A020F0] bg-[#121426] p-5">
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[#D8B4FE] uppercase">
                          <LuWallet className="h-4 w-4" />
                          Available Balance
                        </div>
                        <p className="mt-3 text-3xl font-bold text-white">
                          {fmtCurrency(Number(availableBalance))}
                        </p>
                        <button
                          onClick={() => {
                            clearFeedback();
                            setShowPayoutModal(true);
                          }}
                          disabled={availableBalance <= 0}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#A020F0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8A1AD0] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Withdraw <span>→</span>
                        </button>
                      </div>

                      {/* Pending Clearance */}
                      <div className="rounded-xl border border-white/10 bg-[#121426] p-5">
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[#A5A8C3] uppercase">
                          <FiClock className="h-4 w-4" />
                          Pending Clearance
                        </div>
                        <p className="mt-3 text-3xl font-bold text-[#777B98]">
                          {fmtCurrency(0)}
                        </p>
                        <p className="mt-1 text-xs text-[#A5A8C3]">
                          Instant settlement for platform
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ── Payout Methods ── */}
                  <div className="rounded-xl border border-white/10 bg-[#121426] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">
                        Payout Methods
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {payoutMethods && payoutMethods.length > 0 ? (
                        payoutMethods.map((method: PayoutMethodDTO) => (
                          <div
                            key={method.id}
                            className={`flex items-center gap-3 rounded-lg border p-3 transition ${
                              method.is_primary
                                ? "border-[#A020F0] bg-[#241333]"
                                : "border-white/10"
                            }`}
                          >
                            {/* Icon */}
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                              {method.type === "bank" ? (
                                <LuBuilding2 className="h-5 w-5 text-[#A5A8C3]" />
                              ) : (
                                <FiCreditCard className="h-5 w-5 text-[#A5A8C3]" />
                              )}
                            </div>

                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-white">
                                {method.type === "bank"
                                  ? (method.bank_name ?? "Bank Account")
                                  : "UPI Transfer"}
                              </p>
                              <p className="truncate text-xs text-[#A5A8C3]">
                                {method.type === "bank"
                                  ? `${method.account_type ?? "Savings"} •••• ${method.last_four_digits ?? "****"}`
                                  : (method.upi_id ?? "upiid@bank")}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex shrink-0 items-center gap-1.5">
                              {!method.is_primary && (
                                <button
                                  onClick={() => handleSetPrimary(method.id)}
                                  disabled={actionLoading}
                                  title="Set as primary"
                                  className="rounded-lg border border-[#A020F0] px-2 py-1 text-xs font-semibold text-[#D8B4FE] transition hover:bg-[#241333] disabled:opacity-50"
                                >
                                  Set primary
                                </button>
                              )}
                              {method.is_primary && (
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#A020F0]">
                                  <FiCheck className="h-3.5 w-3.5 text-white" />
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  clearFeedback();
                                  setShowDeleteConfirm(method.id);
                                }}
                                disabled={actionLoading}
                                title="Delete method"
                                className="rounded-lg p-1.5 text-[#777B98] transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                              >
                                <FiTrash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center gap-3 rounded-lg border border-white/10 p-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06]">
                            <LuBuilding2 className="h-5 w-5 text-[#777B98]" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#777B98]">
                              No payout method
                            </p>
                            <p className="text-xs text-[#777B98]">
                              Add a bank account or UPI ID
                            </p>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          clearFeedback();
                          setShowAddModal(true);
                        }}
                        className="w-full rounded-lg border border-dashed border-white/15 px-4 py-3 text-sm font-medium text-[#A5A8C3] transition hover:border-[#A020F0] hover:text-[#D8B4FE]"
                      >
                        + Add new method
                      </button>
                    </div>

                    <p className="mt-4 flex items-center gap-1 text-xs text-[#777B98]">
                      <span>🔒</span> Your financial data is encrypted and
                      secure.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Application Detail Modal */}
        {selectedApp && (
          <div className="msm-modal fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[#121426] shadow-2xl">
              {/* Header */}
              <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-[#121426] px-6 py-4">
                <h2 className="text-xl font-bold text-white">
                  {selectedApp.first_name} {selectedApp.last_name}
                </h2>
                <button
                  onClick={() => {
                    setSelectedApp(null);
                    setRejectReason("");
                  }}
                  className="text-[#777B98] transition hover:text-[#A5A8C3]"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="space-y-6 px-6 py-6">
                {/* Personal Info */}
                <div>
                  <h3 className="mb-3 font-semibold text-white">
                    Personal Information
                  </h3>
                  <div className="grid gap-3 text-sm text-[#A5A8C3]">
                    <p>
                      <span className="font-medium text-white">Name:</span>{" "}
                      {selectedApp.first_name} {selectedApp.last_name}
                    </p>
                    <p>
                      <span className="font-medium text-white">Phone:</span>{" "}
                      {selectedApp.phn_number}
                    </p>
                    <p>
                      <span className="font-medium text-white">City:</span>{" "}
                      {selectedApp.city}
                    </p>
                  </div>
                </div>

                {/* Experience Details */}
                <div>
                  <h3 className="mb-3 font-semibold text-white">
                    Experience Details
                  </h3>
                  <div className="space-y-3 text-sm text-[#A5A8C3]">
                    <p>
                      <span className="font-medium text-white">
                        Description:
                      </span>{" "}
                      {selectedApp.experience_desc}
                    </p>
                    {selectedApp.moods && selectedApp.moods.length > 0 && (
                      <p>
                        <span className="font-medium text-white">Moods:</span>{" "}
                        {selectedApp.moods
                          .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
                          .join(", ")}
                      </p>
                    )}
                    {selectedApp.preferred_days &&
                      selectedApp.preferred_days.length > 0 && (
                        <p>
                          <span className="font-medium text-white">
                            Preferred Days:
                          </span>{" "}
                          {selectedApp.preferred_days
                            .map((d) => d.toUpperCase())
                            .join(", ")}
                        </p>
                      )}
                    {selectedApp.group_size && (
                      <p>
                        <span className="font-medium text-white">
                          Group Size:
                        </span>{" "}
                        Up to {selectedApp.group_size} people
                      </p>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {selectedApp.description && (
                  <div>
                    <h3 className="mb-3 font-semibold text-white">About</h3>
                    <p className="text-sm text-[#A5A8C3]">
                      {selectedApp.description}
                    </p>
                  </div>
                )}

                {(selectedApp.social_instagram ??
                  selectedApp.social_linkedin ??
                  selectedApp.social_website) && (
                  <div>
                    <h3 className="mb-3 font-semibold text-white">
                      Social Links
                    </h3>
                    <div className="space-y-3 text-sm text-[#A5A8C3]">
                      {selectedApp.social_instagram && (
                        <p>
                          <span className="font-medium text-white">
                            Instagram:
                          </span>{" "}
                          <a
                            href={selectedApp.social_instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-[#D8B4FE] hover:underline"
                          >
                            {selectedApp.social_instagram}
                          </a>
                        </p>
                      )}
                      {selectedApp.social_linkedin && (
                        <p>
                          <span className="font-medium text-white">
                            LinkedIn:
                          </span>{" "}
                          <a
                            href={selectedApp.social_linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-[#D8B4FE] hover:underline"
                          >
                            {selectedApp.social_linkedin}
                          </a>
                        </p>
                      )}
                      {selectedApp.social_website && (
                        <p>
                          <span className="font-medium text-white">
                            Website:
                          </span>{" "}
                          <a
                            href={selectedApp.social_website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-[#D8B4FE] hover:underline"
                          >
                            {selectedApp.social_website}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Government ID */}
                {selectedApp.government_id_url && (
                  <div>
                    <h3 className="mb-3 font-semibold text-white">
                      Government ID
                    </h3>
                    <a
                      href={selectedApp.government_id_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-[#A020F0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8A1AD0]"
                    >
                      <FiDownload size={16} />
                      View Document
                    </a>
                  </div>
                )}

                {/* Reject Reason */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-white">
                    Rejection Reason (if rejecting)
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter reason for rejection (optional)"
                    rows={3}
                    className="w-full rounded-lg border border-white/15 px-4 py-2 text-sm outline-none focus:border-[#A020F0] focus:ring-1 focus:ring-[#A020F0]"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 border-t border-white/10 pt-6">
                  <button
                    onClick={() => handleReject(selectedApp)}
                    disabled={isDeciding}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500/15 px-4 py-3 font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
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
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-500/15 px-4 py-3 font-semibold text-green-300 transition hover:bg-green-500/20 disabled:opacity-50"
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
          <Modal
            title="Request Withdrawal"
            onClose={() => {
              setShowPayoutModal(false);
              clearFeedback();
            }}
          >
            <div className="space-y-4">
              <div className="rounded-lg bg-white/[0.04] px-4 py-3 text-sm text-[#A5A8C3]">
                Available balance:{" "}
                <span className="font-bold text-white">
                  {fmtCurrency(Number(availableBalance))}
                </span>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#A5A8C3]">
                  Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#A5A8C3]">
                    ₹
                  </span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={payoutAmountCents}
                    onChange={(e) => setPayoutAmountCents(e.target.value)}
                    className="w-full rounded-lg border border-white/10 py-2.5 pr-3 pl-7 text-sm text-white transition outline-none focus:border-[#A020F0] focus:ring-2 focus:ring-[#A020F0]/20"
                  />
                </div>
              </div>

              {actionError && (
                <p className="flex items-center gap-1.5 text-xs text-red-300">
                  <FiAlertCircle className="h-3.5 w-3.5" /> {actionError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    setShowPayoutModal(false);
                    clearFeedback();
                  }}
                  className="flex-1 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/[0.04]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestPayout}
                  disabled={actionLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#A020F0] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#8A1AD0] disabled:opacity-50"
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
          <Modal
            title="Add Payout Method"
            onClose={() => {
              setShowAddModal(false);
              clearFeedback();
            }}
          >
            <div className="space-y-4">
              {/* Method Type Toggle */}
              <div className="flex rounded-lg border border-white/10 p-1">
                <button
                  onClick={() => setAddForm((f) => ({ ...f, type: "bank" }))}
                  className={`flex-1 rounded px-3 py-2 text-sm font-medium transition ${addForm.type === "bank" ? "bg-[#A020F0] text-white" : "text-white/80 hover:bg-white/[0.04]"}`}
                >
                  Bank Account
                </button>
                <button
                  onClick={() => setAddForm((f) => ({ ...f, type: "upi" }))}
                  className={`flex-1 rounded px-3 py-2 text-sm font-medium transition ${addForm.type === "upi" ? "bg-[#A020F0] text-white" : "text-white/80 hover:bg-white/[0.04]"}`}
                >
                  UPI
                </button>
              </div>

              {/* Beneficiary Name */}
              <InputField
                label="Beneficiary Name"
                placeholder="As per bank records"
                value={addForm.beneficiary_name}
                onChange={(e) =>
                  setAddForm((f) => ({
                    ...f,
                    beneficiary_name: e.target.value,
                  }))
                }
              />

              {addForm.type === "bank" ? (
                <>
                  <InputField
                    label="Bank Name"
                    placeholder="e.g. HDFC, SBI"
                    value={addForm.bank_name}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, bank_name: e.target.value }))
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#A5A8C3]">
                        Account Type
                      </label>
                      <select
                        value={addForm.account_type}
                        onChange={(e) =>
                          setAddForm((f) => ({
                            ...f,
                            account_type: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-white/10 px-3 py-2.5 text-sm text-white transition outline-none focus:border-[#A020F0] focus:ring-2 focus:ring-[#A020F0]/20"
                      >
                        <option value="savings">Savings</option>
                        <option value="current">Current</option>
                      </select>
                    </div>
                    <InputField
                      label="Account Number"
                      placeholder="1234567890"
                      value={addForm.account_number}
                      onChange={(e) =>
                        setAddForm((f) => ({
                          ...f,
                          account_number: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <InputField
                    label="IFSC Code"
                    placeholder="HDFC0000001"
                    value={addForm.ifsc}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, ifsc: e.target.value }))
                    }
                  />
                </>
              ) : (
                <InputField
                  label="UPI ID"
                  placeholder="e.g. yourname@upi"
                  value={addForm.upi_id}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, upi_id: e.target.value }))
                  }
                />
              )}

              {actionError && (
                <p className="flex items-center gap-1.5 text-xs text-red-300">
                  <FiAlertCircle className="h-3.5 w-3.5" /> {actionError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    clearFeedback();
                  }}
                  className="flex-1 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/[0.04]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMethod}
                  disabled={actionLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#A020F0] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#8A1AD0] disabled:opacity-50"
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
          <Modal
            title="Remove Payout Method"
            onClose={() => setShowDeleteConfirm(null)}
          >
            <div className="space-y-4">
              <p className="text-sm text-[#A5A8C3]">
                Are you sure you want to remove this payout method? This action
                cannot be undone.
              </p>
              {actionError && (
                <p className="flex items-center gap-1.5 text-xs text-red-300">
                  <FiAlertCircle className="h-3.5 w-3.5" /> {actionError}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/[0.04]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteMethod(showDeleteConfirm)}
                  disabled={actionLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
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
