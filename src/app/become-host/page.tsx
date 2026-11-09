"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import { Navbar, GoogleLogin } from "~/components";
import {
  HostApplicationSubmittedModal,
  OTPVerificationModal,
} from "~/components/become-host";
import { Home } from "~/components";
import { SharedEventsCard } from "~/components/host-dashboard";
import { FiArrowRight, FiCheck, FiShield, FiUsers } from "react-icons/fi";
import { toast } from "sonner";
import {
  useMyProfile,
  useSubmitHostApplication,
  useSaveHostDraft,
  useApplicationStatus,
  useSendPhoneOTP,
  useVerifyPhoneOTP,
} from "~/hooks/useApi";
import { setStoredHostId } from "~/lib/auth-storage";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface HostFormData {
  fullName: string;
  city: string;
  experienceDesc: string;
  moods: string[];
  description: string;
  socialInstagram: string;
  socialLinkedin: string;
  socialWebsite: string;
  preferredDays: string[];
  groupSize: number;
  isProfessional: boolean;
}

const MOODS = [
  "Adventurous",
  "Social",
  "Wellness",
  "Educational",
  "Creative",
  "Relaxing",
  "Culinary",
  "Cultural",
] as const;

const DAYS = [
  { key: "MON", label: "MON" },
  { key: "TUE", label: "TUE" },
  { key: "WED", label: "WED" },
  { key: "THU", label: "THU" },
  { key: "FRI", label: "FRI" },
  { key: "SAT", label: "SAT" },
  { key: "SUN", label: "SUN" },
] as const;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BecomeHostPage() {
  const router = useRouter();
  const [user, loadingAuth] = useAuthState(auth);
  const [mounted, setMounted] = useState(false);

  // Read userId from localStorage
  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  useEffect(() => {
    setMounted(true);
    setStoredUserId(localStorage.getItem("msm_user_id"));
  }, []);

  const validUserId =
    storedUserId && storedUserId !== "existing" ? storedUserId : null;

  // Fetch user profile
  const { data: userProfile } = useMyProfile(validUserId);

  // Fetch application status
  const { data: applicationStatus, isLoading: statusLoading } =
    useApplicationStatus(validUserId);

  // Mutation hooks
  const submitMutation = useSubmitHostApplication();
  const draftMutation = useSaveHostDraft();
  const sendOtpMutation = useSendPhoneOTP();
  const verifyOtpMutation = useVerifyPhoneOTP();

  const [showSubmittedModal, setShowSubmittedModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const [form, setForm] = useState<HostFormData>({
    fullName: user?.displayName ?? "",
    city: "",
    experienceDesc: "",
    moods: [],
    description: "",
    socialInstagram: "",
    socialLinkedin: "",
    socialWebsite: "",
    preferredDays: [],
    groupSize: 5,
    isProfessional: false,
  });

  // Pre-populate form from DB profile when it loads
  useEffect(() => {
    if (userProfile) {
      setForm((prev) => ({
        ...prev,
        fullName:
          prev.fullName !== "" ? prev.fullName : (userProfile.name ?? ""),
        city: prev.city !== "" ? prev.city : (userProfile.city ?? ""),
      }));
    }
  }, [userProfile]);

  /* ---- helpers ---- */

  const updateField = <K extends keyof HostFormData>(
    key: K,
    value: HostFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(day)
        ? prev.preferredDays.filter((d) => d !== day)
        : [...prev.preferredDays, day],
    }));
  };

  const progress = 100;

  if (!mounted || loadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080914]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B57BFF] border-t-transparent" />
      </div>
    );
  }

  const isAuthenticated = !!user || !!validUserId;

  if (!isAuthenticated) {
    return (
      <>
        <Navbar dark />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-[#080914] px-4 text-center md:pl-20 min-[90rem]:pl-[230px]">
          <h1 className="text-2xl font-bold text-white">Become a Host</h1>
          <p className="max-w-md text-white/55">
            Please log in to continue your host application.
          </p>
        </div>
        <GoogleLogin
          open
          onClose={() => {
            // Re-check auth after the modal closes: if they logged in, reveal
            // the form; otherwise send them back home.
            const id = localStorage.getItem("msm_user_id");
            if (id && id !== "existing") {
              setStoredUserId(id);
            } else {
              router.push("/");
            }
          }}
        />
        <Home.Footer dark />
      </>
    );
  }

  /* ---- guard: show status if user has already applied (not in draft) ---- */
  const hasExistingApplication =
    applicationStatus?.status?.application_status &&
    applicationStatus.status.application_status !== "draft";

  if (!statusLoading && hasExistingApplication) {
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
      rejected: {
        title: "Application Status",
        description:
          "Unfortunately, your application was not approved at this time. Please contact our support team if you'd like more information.",
        icon: "❌",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        badgeColor: "bg-red-500/100/15 text-red-300",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <>
        <Navbar dark />
        <main className="relative flex min-h-screen flex-col items-center justify-start overflow-hidden bg-[#080914] pt-10 pb-16 md:pl-20 min-[90rem]:pl-[230px]">
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

  /* ---- submit handlers ---- */

  const handleSaveDraft = async () => {
    if (!isAuthenticated) return;
    if (!validUserId) {
      toast.error("Please complete your profile (signup) first.");
      return;
    }
    try {
      const nameParts = form.fullName.trim().split(" ");
      await draftMutation.mutateAsync({
        user_id: validUserId,
        first_name: nameParts[0] ?? "",
        last_name: nameParts.slice(1).join(" ") || "",
        city: form.city,
        phn_number: user?.phoneNumber ?? userProfile?.phn_number ?? "",
        experience_desc: form.experienceDesc || undefined,
        moods: form.moods.map((m) => m.toLowerCase()),
        description: form.description || undefined,
        preferred_days: form.preferredDays.map((d) => d.toLowerCase()),
        group_size: form.groupSize || undefined,
        social_instagram: form.socialInstagram.trim() || null,
        social_linkedin: form.socialLinkedin.trim() || null,
        social_website: form.socialWebsite.trim() || null,
        is_professional: form.isProfessional,
      });
      toast.success("Application saved as draft.");
    } catch (err) {
      console.error("Save draft error:", err);
      toast.error("Failed to save draft. Please try again.");
    }
  };

  const handleOpenOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    if (!form.fullName.trim()) {
      toast.warning("Please enter your full name.");
      return;
    }
    if (!form.city.trim()) {
      toast.warning("Please enter your city.");
      return;
    }
    if (!form.experienceDesc.trim()) {
      toast.warning("Please describe the experiences you want to host.");
      return;
    }
    if (form.moods.length === 0) {
      toast.warning("Please select at least one mood.");
      return;
    }
    if (form.preferredDays.length === 0) {
      toast.warning("Please select at least one preferred day.");
      return;
    }
    if (
      !form.socialInstagram.trim() &&
      !form.socialLinkedin.trim() &&
      !form.socialWebsite.trim()
    ) {
      toast.warning("Please provide at least one social media link.");
      return;
    }
    if (!validUserId) {
      toast.error("Please complete your profile (signup) first.");
      return;
    }
    if (!form.description.trim()) {
      toast.warning(
        "Please provide a short description about yourself or your plans.",
      );
      return;
    }

    try {
      await sendOtpMutation.mutateAsync(validUserId);
      setShowOtpModal(true);
    } catch (err) {
      console.error("Failed to send OTP:", err);
      toast.error(
        "Failed to send OTP. Please check your phone number or try again later.",
      );
    }
  };

  const handleFinalSubmit = async () => {
    if (!validUserId) return;
    setSubmitting(true);
    try {
      const nameParts = form.fullName.trim().split(" ");
      const res = await submitMutation.mutateAsync({
        user_id: validUserId,
        first_name: nameParts[0] ?? "",
        last_name: nameParts.slice(1).join(" ") || "",
        city: form.city,
        phn_number: userProfile?.phn_number ?? user?.phoneNumber ?? "",
        experience_desc: form.experienceDesc || undefined,
        moods: form.moods.map((m) => m.toLowerCase()),
        description: form.description || undefined,
        preferred_days: form.preferredDays.map((d) => d.toLowerCase()),
        group_size: form.groupSize,
        government_id_url: undefined,
        social_instagram: form.socialInstagram.trim() || null,
        social_linkedin: form.socialLinkedin.trim() || null,
        social_website: form.socialWebsite.trim() || null,
        is_professional: form.isProfessional,
      });

      setStoredHostId(res.data.id);
      setShowOtpModal(false);
      setShowSubmittedModal(true);
    } catch (err) {
      console.error("Submit host application error:", err);
      toast.error("Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <>
      <Navbar dark />

      <main className="min-h-screen bg-[#080914] font-[family-name:var(--font-inter)] text-white md:pl-20 min-[90rem]:pl-[230px]">
        <div className="mx-auto w-full max-w-[860px] px-6 py-10 md:px-10">
          {/* Co-host invitations. Accepting one needs no approved application, so
            surface them here too — otherwise the invitee has to guess the
            /host-dashboard/co-hosting URL. Renders nothing when there are none. */}
          <div className="mb-6">
            <SharedEventsCard />
          </div>

          {/* Header row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">
                Become a Host
              </h1>
              <p className="mt-1 text-sm font-medium text-[#D8B4FE]">
                Complete your profile to start hosting
              </p>
            </div>

            {/* Progress bar */}
            <div className="flex flex-col items-end gap-1">
              <p className="text-xs font-semibold tracking-widest text-white/55 uppercase">
                Application Progress
              </p>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-40 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#7038F5] to-[#B724EA] transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-white">
                  {progress}%
                </span>
              </div>
            </div>
          </div>

          <hr className="my-6 border-white/10" />

          {/* Form Sections */}
          <div className="space-y-10">
            {/* Personal Information */}
            <section>
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <span className="text-[#D8B4FE]">👤</span> Personal Information
              </h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-white">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className={`w-full rounded-xl border bg-[#121426] px-4 py-3 text-sm text-white placeholder-white/35 transition outline-none focus:ring-1 focus:ring-[#9B30FF] ${
                      showErrors && !form.fullName.trim()
                        ? "bg-red-500/100/10 border-red-400"
                        : "border-white/10 focus:border-[#9B30FF]"
                    }`}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-white">
                    City of Residence
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="e.g. San Francisco"
                    className={`w-full rounded-xl border bg-[#121426] px-4 py-3 text-sm text-white placeholder-white/35 transition outline-none focus:ring-1 focus:ring-[#9B30FF] ${
                      showErrors && !form.city.trim()
                        ? "bg-red-500/100/10 border-red-400"
                        : "border-white/10 focus:border-[#9B30FF]"
                    }`}
                  />
                </div>
              </div>
            </section>

            {/* Experience Details */}
            <section>
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <span className="text-[#D8B4FE]">✅</span> Experience Details
              </h2>

              <div className="mt-5 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-white">
                      What Experiences will you Host?
                    </label>
                    <input
                      type="text"
                      value={form.experienceDesc}
                      onChange={(e) =>
                        updateField("experienceDesc", e.target.value)
                      }
                      placeholder="Write about all the activities you are planning to host"
                      className={`w-full rounded-xl border bg-[#121426] px-4 py-3 text-sm text-white placeholder-white/35 transition outline-none focus:ring-1 focus:ring-[#9B30FF] ${
                        showErrors && !form.experienceDesc.trim()
                          ? "bg-red-500/100/10 border-red-400"
                          : "border-white/10 focus:border-[#9B30FF]"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-white">
                      Select Category
                    </label>
                    <select
                      value={form.moods[0] ?? ""}
                      onChange={(e) =>
                        updateField(
                          "moods",
                          e.target.value ? [e.target.value] : [],
                        )
                      }
                      className={`w-full rounded-lg border bg-[#121426] px-4 py-3 text-sm text-white transition outline-none focus:ring-1 focus:ring-[#9B30FF] ${
                        showErrors && form.moods.length === 0
                          ? "bg-red-500/100/10 border-red-400"
                          : "border-white/10 focus:border-[#9B30FF]"
                      }`}
                    >
                      <option value="" disabled>
                        Select a Category
                      </option>
                      {MOODS.map((mood) => (
                        <option key={mood} value={mood}>
                          {mood}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Professional host toggle */}
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                    form.isProfessional
                      ? "border-[#9B30FF] bg-[#9B30FF]/10"
                      : "border-white/10 bg-[#131328] hover:border-white/25"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.isProfessional}
                    onChange={(e) =>
                      updateField("isProfessional", e.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/10 text-[#D8B4FE] accent-[#9B30FF]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">
                      I&apos;m a professional host
                    </span>
                    <span className="mt-0.5 block text-xs text-white/55">
                      Check this if you host experiences professionally
                      (certified trainer, licensed guide, studio, etc.).
                      Professional hosts are highlighted in Explore.
                    </span>
                  </span>
                </label>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-semibold text-white">
                      Description{" "}
                      <span className="font-bold text-red-500">*</span>
                    </label>
                    <span className="text-xs text-white/45">
                      {form.description.length}/300
                    </span>
                  </div>
                  <textarea
                    value={form.description}
                    onChange={(e) => {
                      if (e.target.value.length <= 300)
                        updateField("description", e.target.value);
                    }}
                    maxLength={300}
                    rows={5}
                    placeholder="Describe the magic you're thinking of creating..."
                    className={`w-full resize-none rounded-xl border bg-[#121426] px-4 py-3 text-sm text-white placeholder-white/35 transition outline-none focus:ring-1 focus:ring-[#9B30FF] ${
                      showErrors && !form.description.trim()
                        ? "bg-red-500/100/10 border-red-400"
                        : "border-white/10 focus:border-[#9B30FF]"
                    }`}
                  />
                </div>

                <div>
                  <div className="mb-3">
                    <label className="block text-sm font-semibold text-white">
                      Social Links{" "}
                      <span className="font-bold text-red-500">*</span>
                    </label>
                    <p className="mt-1 text-xs text-white/55">
                      At least one link is required for verification.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-white/80">
                        Instagram
                      </label>
                      <input
                        type="url"
                        value={form.socialInstagram}
                        onChange={(e) =>
                          updateField("socialInstagram", e.target.value)
                        }
                        placeholder="https://instagram.com/yourprofile"
                        className={`w-full rounded-xl border bg-[#121426] px-4 py-3 text-sm text-white placeholder-white/35 transition outline-none focus:ring-1 focus:ring-[#9B30FF] ${
                          showErrors &&
                          !form.socialInstagram.trim() &&
                          !form.socialLinkedin.trim() &&
                          !form.socialWebsite.trim()
                            ? "bg-red-500/100/10 border-red-400"
                            : "border-white/10 focus:border-[#9B30FF]"
                        }`}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-white/80">
                        LinkedIn
                      </label>
                      <input
                        type="url"
                        value={form.socialLinkedin}
                        onChange={(e) =>
                          updateField("socialLinkedin", e.target.value)
                        }
                        placeholder="https://linkedin.com/in/yourprofile"
                        className={`w-full rounded-xl border bg-[#121426] px-4 py-3 text-sm text-white placeholder-white/35 transition outline-none focus:ring-1 focus:ring-[#9B30FF] ${
                          showErrors &&
                          !form.socialInstagram.trim() &&
                          !form.socialLinkedin.trim() &&
                          !form.socialWebsite.trim()
                            ? "bg-red-500/100/10 border-red-400"
                            : "border-white/10 focus:border-[#9B30FF]"
                        }`}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="mb-1.5 block text-sm font-medium text-white/80">
                      Website
                    </label>
                    <input
                      type="url"
                      value={form.socialWebsite}
                      onChange={(e) =>
                        updateField("socialWebsite", e.target.value)
                      }
                      placeholder="https://yourwebsite.com"
                      className={`w-full rounded-xl border bg-[#121426] px-4 py-3 text-sm text-white placeholder-white/35 transition outline-none focus:ring-1 focus:ring-[#9B30FF] ${
                        showErrors &&
                        !form.socialInstagram.trim() &&
                        !form.socialLinkedin.trim() &&
                        !form.socialWebsite.trim()
                          ? "bg-red-500/100/10 border-red-400"
                          : "border-white/10 focus:border-[#9B30FF]"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-white/10" />

            {/* Availability */}
            <section>
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <span className="text-[#D8B4FE]">📅</span> Availability
              </h2>

              <div className="mt-5 space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-white">
                    Preferred Days
                  </label>
                  <div
                    className={`flex flex-wrap gap-2 rounded-xl p-1 transition ${showErrors && form.preferredDays.length === 0 ? "bg-red-500/100/10 ring-1 ring-red-400" : ""}`}
                  >
                    {DAYS.map(({ key, label }) => {
                      const selected = form.preferredDays.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleDay(key)}
                          className={`rounded-full border px-5 py-2.5 text-xs font-semibold tracking-wide uppercase transition ${
                            selected
                              ? "border-transparent bg-gradient-to-r from-[#7038F5] to-[#B724EA] text-white"
                              : "border-white/10 bg-[#121426] text-white/75 hover:border-[#9B30FF]"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-white">
                    Approximate Group Size
                  </label>
                  <div className="flex w-fit items-center gap-3 rounded-xl border border-white/10 bg-[#121426] px-4 py-3">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={form.groupSize}
                      onChange={(e) =>
                        updateField(
                          "groupSize",
                          Math.max(1, parseInt(e.target.value) || 1),
                        )
                      }
                      className="w-16 bg-transparent text-sm font-bold text-white outline-none"
                    />
                    <span className="text-sm text-white/45">People</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Bottom actions */}
            <div className="flex items-center justify-between border-t border-white/10 pt-6">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="text-sm font-medium text-white/55 transition hover:text-white/80"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={handleOpenOtp}
                disabled={submitting || sendOtpMutation.isPending}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7038F5] to-[#B724EA] px-10 py-4 text-sm font-extrabold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {sendOtpMutation.isPending
                  ? "Sending OTP..."
                  : submitting
                    ? "Submitting..."
                    : "Submit Host Request"}
                <FiArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <Home.Footer dark />
      </main>

      {/* Modals */}
      <HostApplicationSubmittedModal
        open={showSubmittedModal}
        onClose={() => setShowSubmittedModal(false)}
      />

      <OTPVerificationModal
        open={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        resending={sendOtpMutation.isPending}
        phoneNumber={userProfile?.phn_number ?? user?.phoneNumber ?? "xxxxxx"}
        onVerify={async (code) => {
          if (!validUserId) return false;
          try {
            await verifyOtpMutation.mutateAsync({
              userId: validUserId,
              otp: code,
            });
            await handleFinalSubmit();
            return true;
          } catch (err) {
            console.error("OTP verification failed:", err);
            toast.error("Invalid OTP. Please try again.");
            return false;
          }
        }}
        onResend={async () => {
          if (!validUserId || sendOtpMutation.isPending) return;
          try {
            await sendOtpMutation.mutateAsync(validUserId);
            toast.success("OTP Resent!");
          } catch (err) {
            console.error("Resend OTP failed:", err);
            toast.error("Failed to resend OTP.");
          }
        }}
      />
    </>
  );
}
