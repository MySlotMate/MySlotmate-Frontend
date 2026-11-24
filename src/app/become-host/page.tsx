"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import { Navbar } from "~/components";
import { Home } from "~/components";
import { SharedEventsCard } from "~/components/host-dashboard";
import HostApplyFlow from "~/components/become-host/HostApplyFlow";
import { FiCheck, FiShield, FiUsers } from "react-icons/fi";
import { useApplicationStatus } from "~/hooks/useApi";

/**
 * Become a host. People who have already applied see where their
 * application stands; everyone else gets the two-path application
 * (community host or verified professional).
 */
export default function BecomeHostPage() {
  const router = useRouter();
  const [, loadingAuth] = useAuthState(auth);
  const [mounted, setMounted] = useState(false);
  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  // A turned-down applicant can apply again; that replaces every answer.
  const [reapplying, setReapplying] = useState(false);
  useEffect(() => {
    setMounted(true);
    setStoredUserId(localStorage.getItem("msm_user_id"));
  }, []);
  const validUserId =
    storedUserId && storedUserId !== "existing" ? storedUserId : null;

  const { data: applicationStatus, isLoading: statusLoading } =
    useApplicationStatus(validUserId);

  if (!mounted || loadingAuth || (validUserId && statusLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080914]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B57BFF] border-t-transparent" />
      </div>
    );
  }

  /* ---- guard: show status if user has already applied (not in draft) ---- */
  const hasExistingApplication =
    applicationStatus?.status?.application_status &&
    applicationStatus.status.application_status !== "draft";

  if (
    !statusLoading &&
    hasExistingApplication &&
    applicationStatus.status!.application_status === "rejected" &&
    !reapplying
  ) {
    const reason = applicationStatus.status!.rejection_reason?.trim();
    return (
      <>
        <Navbar dark />
        <main className="relative flex min-h-screen flex-col items-center justify-start overflow-hidden bg-[#080914] pt-10 pb-16">
          <div className="pointer-events-none absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-[#7038F5]/15 blur-[120px]" />
          <div className="relative z-10 w-full max-w-lg px-4">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Your application wasn&apos;t approved
              </h1>
              <p className="mt-2.5 text-sm font-medium text-white/55">
                {reason
                  ? "Here's what our team said. You can fix it and apply again."
                  : "Our team couldn't approve it this time. You can update your answers and apply again."}
              </p>
            </div>

            {reason && (
              <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
                <p className="text-xs font-bold tracking-wide text-red-300 uppercase">
                  Reason
                </p>
                <p className="mt-2 text-sm whitespace-pre-line text-white/85">
                  {reason}
                </p>
              </div>
            )}

            <div className="mb-6">
              <SharedEventsCard />
            </div>

            <button
              onClick={() => {
                setReapplying(true);
                window.scrollTo({ top: 0 });
              }}
              className="w-full rounded-2xl bg-gradient-to-r from-[#7038F5] to-[#B724EA] px-8 py-4 text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95"
            >
              Apply again
            </button>
            <p className="mt-4 text-center text-xs text-white/45">
              Questions?{" "}
              <a
                href="mailto:support@myslotmate.com"
                className="font-semibold text-[#D8B4FE] hover:text-white"
              >
                Email support@myslotmate.com
              </a>
            </p>
          </div>
        </main>
        <Home.Footer dark />
      </>
    );
  }

  if (!statusLoading && hasExistingApplication && !reapplying) {
    const status = applicationStatus.status!.application_status;
    const statusConfig = {
      pending: {
        title: "Your Application is Under Review",
        description:
          "We've received your host application and our team is currently reviewing your profile. This typically takes 24-48 hours.",
        icon: "⏳",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/30",
        badgeColor: "bg-amber-500/15 text-amber-300",
      },
      under_review: {
        title: "Your Application is Under Review",
        description:
          "We're carefully reviewing your profile to ensure the best experience for our community. We'll notify you soon with a decision.",
        icon: "🔍",
        bgColor: "bg-[#9B30FF]/10",
        borderColor: "border-[#9B30FF]/30",
        badgeColor: "bg-[#9B30FF]/20 text-[#D8B4FE]",
      },
      approved: {
        title: "🎉 You're Approved!",
        description:
          "Congratulations! You've been approved as a host. You can now create and post your first experience. Start hosting amazing moments!",
        icon: "✅",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/30",
        badgeColor: "bg-emerald-500/15 text-emerald-300",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <>
        <Navbar dark />
        <main className="relative flex min-h-screen flex-col items-center justify-start overflow-hidden bg-[#080914] pt-10 pb-16">
          {/* Ambient Background */}
          <div className="pointer-events-none absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-[#7038F5]/15 blur-[120px]" />

          <div className="relative z-10 w-full max-w-lg px-4">
            <div className="animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-1000 ease-out">
              {/* Header Section */}
              <div className="mb-8 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[#131328] shadow-xl ring-1 ring-white/10 transition-transform hover:scale-105">
                  <span className="text-3xl">{config.icon}</span>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {config.title}
                </h1>
                <p className="mt-2.5 text-sm font-medium text-white/55">
                  {config.description}
                </p>
              </div>

              {/* Co-host invitations — these do not wait on host approval, so a
                  half-onboarded host can still accept one from here. */}
              <div className="mb-6">
                <SharedEventsCard />
              </div>

              {/* Refined Glassmorphic Card */}
              <div className="overflow-hidden rounded-[2rem] border border-white/[0.06] bg-[#131328] p-8 sm:p-10">
                <div className="space-y-8">
                  {/* Step 1: Submitted */}
                  <div className="relative flex gap-6">
                    <div className="absolute top-10 bottom-[-32px] left-[15px] w-[1px] bg-gradient-to-b from-green-500/40 to-white/10" />
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/100 text-white shadow-lg shadow-green-100">
                      <FiCheck className="h-4 w-4" />
                    </div>
                    <div className="pt-0.5">
                      <h4 className="text-sm font-bold text-white">
                        Application Received
                      </h4>
                      <p className="mt-1 text-xs font-medium text-white/45">
                        Successfully logged for verification.
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Review */}
                  <div className="relative flex gap-6">
                    <div className="absolute top-10 bottom-[-32px] left-[15px] w-[1px] bg-white/10" />
                    <div
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-500 ${
                        status === "approved"
                          ? "bg-emerald-500/100 text-white"
                          : "bg-[#9B30FF] text-white shadow-lg ring-4 shadow-[#9B30FF]/30 ring-[#9B30FF]/10"
                      }`}
                    >
                      {status === "approved" ? (
                        <FiCheck className="h-4 w-4" />
                      ) : (
                        <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
                      )}
                    </div>
                    <div className="pt-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">
                          Internal Review
                        </h4>
                        {status !== "approved" && (
                          <span className="rounded-full bg-[#9B30FF]/15 px-2 py-0.5 text-[9px] font-black tracking-widest text-[#D8B4FE] uppercase ring-1 ring-[#9B30FF]/20">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-medium text-white/45">
                        {status === "approved"
                          ? "Verified and approved by our team."
                          : "Validating your identity & credentials."}
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Access */}
                  <div className="relative flex gap-6">
                    <div
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-500 ${
                        status === "approved"
                          ? "bg-emerald-500/100 text-white"
                          : "border-2 border-white/10 bg-[#131328] text-white/25"
                      }`}
                    >
                      {status === "approved" ? (
                        <FiCheck className="h-4 w-4" />
                      ) : (
                        <FiShield className="h-4 w-4 opacity-30" />
                      )}
                    </div>
                    <div className="pt-0.5">
                      <h4
                        className={`text-sm font-bold ${status === "approved" ? "text-white" : "text-white/30"}`}
                      >
                        Host Access
                      </h4>
                      <p
                        className={`mt-1 text-xs font-medium ${status === "approved" ? "text-white/45" : "text-white/25"}`}
                      >
                        {status === "approved"
                          ? "Full dashboard control unlocked."
                          : "Awaiting final team confirmation."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Refined CTA / Footer Section */}
                <div className="mt-10 border-t border-white/10 pt-8">
                  {status === "approved" ? (
                    <button
                      onClick={() =>
                        router.push("/host-dashboard/experiences/new")
                      }
                      className="group w-full rounded-2xl bg-gradient-to-r from-[#7038F5] to-[#B724EA] px-8 py-4 text-xs font-black text-white transition-all hover:brightness-110 active:scale-95"
                    >
                      CREATE YOUR FIRST EXPERIENCE
                    </button>
                  ) : (
                    <div className="flex items-center justify-between rounded-2xl bg-[#121426] p-4 ring-1 ring-white/10">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B1C33]">
                          <FiUsers className="h-5 w-5 text-[#D8B4FE]" />
                        </div>
                        <div>
                          <p className="text-[10px] leading-none font-black tracking-widest text-white/45 uppercase">
                            Estimated
                          </p>
                          <p className="mt-1 text-xs font-bold text-white/80">
                            24-48 Hours
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          window.open("mailto:support@myslotmate.com")
                        }
                        className="text-xs font-black text-white/45 hover:text-white"
                      >
                        HELP?
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Minimalist Return Link */}
              <div className="mt-12 text-center">
                <button
                  onClick={() => router.push("/")}
                  className="text-xs font-black tracking-[0.2em] text-white/45 uppercase transition hover:text-white"
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        </main>
        <Home.Footer dark />
      </>
    );
  }

  return (
    <>
      <Navbar dark />
      <main className="min-h-screen bg-[#080914] font-[family-name:var(--font-inter)] text-white">
        {validUserId && (
          <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6">
            <SharedEventsCard />
          </div>
        )}
        <HostApplyFlow />
        <Home.Footer dark />
      </main>
    </>
  );
}
