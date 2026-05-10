"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import { Navbar, Breadcrumb } from "~/components";
import {
  HostApplicationSubmittedModal,
  OTPVerificationModal,
} from "~/components/become-host";
import { Home } from "~/components";
import {
  FiArrowRight,
  FiCheck,
  FiShield,
  FiUsers,
} from "react-icons/fi";
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
}

const MOODS = ["Adventure"] as const;

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
  const [user] = useAuthState(auth);

  // Read userId from localStorage
  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  useEffect(() => {
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
    moods: ["Adventure"],
    description: "",
    socialInstagram: "",
    socialLinkedin: "",
    socialWebsite: "",
    preferredDays: [],
    groupSize: 5,
  });

  /* ---- helpers ---- */

  const updateField = <K extends keyof HostFormData>(
    key: K,
    value: HostFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleMood = (mood: string) => {
    setForm((prev) => ({
      ...prev,
      moods: prev.moods.includes(mood)
        ? prev.moods.filter((m) => m !== mood)
        : [...prev.moods, mood],
    }));
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

  /* ---- guard: must be logged in + verified ---- */

  if (!user) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Become a Host</h1>
          <p className="max-w-md text-gray-500">
            You must be logged in to apply as a host.
          </p>
          <button
            onClick={() => router.push("/")}
            className="rounded-full bg-[#0094CA] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#007dab]"
          >
            Go Home
          </button>
        </div>
        <Home.Footer />
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
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        badgeColor: "bg-yellow-100 text-yellow-800",
      },
      under_review: {
        title: "Your Application is Under Review",
        description:
          "We're carefully reviewing your profile to ensure the best experience for our community. We'll notify you soon with a decision.",
        icon: "🔍",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        badgeColor: "bg-blue-100 text-blue-800",
      },
      approved: {
        title: "🎉 You're Approved!",
        description:
          "Congratulations! You've been approved as a host. You can now create and post your first experience. Start hosting amazing moments!",
        icon: "✅",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        badgeColor: "bg-green-100 text-green-800",
      },
      rejected: {
        title: "Application Status",
        description:
          "Unfortunately, your application was not approved at this time. Please contact our support team if you'd like more information.",
        icon: "❌",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        badgeColor: "bg-red-100 text-red-800",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <>
        <Navbar />
        <main className="relative flex min-h-screen flex-col items-center justify-start overflow-hidden bg-[#fafafa] pt-28 pb-16">
          {/* Ambient Background */}
          <div className="pointer-events-none absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-blue-50/40 blur-[120px]" />

          <div className="relative z-10 w-full max-w-lg px-4">
            <div className="animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-1000 ease-out">
              {/* Header Section */}
              <div className="mb-8 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-white shadow-xl ring-1 shadow-gray-200/20 ring-gray-100 transition-transform hover:scale-105">
                  <span className="text-3xl">{config.icon}</span>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
                  {config.title}
                </h1>
                <p className="mt-2.5 text-sm font-medium text-gray-500">
                  {config.description}
                </p>
              </div>

              {/* Refined Glassmorphic Card */}
              <div className="overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/40 p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] backdrop-blur-2xl sm:p-10">
                <div className="space-y-8">
                  {/* Step 1: Submitted */}
                  <div className="relative flex gap-6">
                    <div className="absolute top-10 bottom-[-32px] left-[15px] w-[1px] bg-gradient-to-b from-green-500/30 to-gray-100" />
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-green-500 text-white shadow-lg shadow-green-100">
                      <FiCheck className="h-4 w-4" />
                    </div>
                    <div className="pt-0.5">
                      <h4 className="text-sm font-bold text-gray-900">
                        Application Received
                      </h4>
                      <p className="mt-1 text-xs font-medium text-gray-400">
                        Successfully logged for verification.
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Review */}
                  <div className="relative flex gap-6">
                    <div className="absolute top-10 bottom-[-32px] left-[15px] w-[1px] bg-gray-100" />
                    <div
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-500 ${
                        status === "approved"
                          ? "bg-green-500 text-white"
                          : "bg-[#0094CA] text-white shadow-lg ring-4 shadow-[#0094CA]/30 ring-[#0094CA]/5"
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
                        <h4 className="text-sm font-bold text-gray-900">
                          Internal Review
                        </h4>
                        {status !== "approved" && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black tracking-widest text-[#0094CA] uppercase ring-1 ring-[#0094CA]/10">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-medium text-gray-400">
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
                          ? "bg-green-500 text-white"
                          : "border-2 border-gray-50 bg-white text-gray-200"
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
                        className={`text-sm font-bold ${status === "approved" ? "text-gray-900" : "text-gray-300"}`}
                      >
                        Host Access
                      </h4>
                      <p
                        className={`mt-1 text-xs font-medium ${status === "approved" ? "text-gray-400" : "text-gray-200"}`}
                      >
                        {status === "approved"
                          ? "Full dashboard control unlocked."
                          : "Awaiting final team confirmation."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Refined CTA / Footer Section */}
                <div className="mt-10 border-t border-gray-900/5 pt-8">
                  {status === "approved" ? (
                    <button
                      onClick={() =>
                        router.push("/host-dashboard/experiences/new")
                      }
                      className="group w-full rounded-2xl bg-gray-900 px-8 py-4 text-xs font-black text-white shadow-2xl transition-all hover:bg-gray-800 active:scale-95"
                    >
                      CREATE YOUR FIRST EXPERIENCE
                    </button>
                  ) : (
                    <div className="flex items-center justify-between rounded-2xl bg-gray-50/50 p-4 ring-1 ring-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                          <FiUsers className="h-5 w-5 text-[#0094CA]" />
                        </div>
                        <div>
                          <p className="text-[10px] leading-none font-black tracking-widest text-gray-400 uppercase">
                            Estimated
                          </p>
                          <p className="mt-1 text-xs font-bold text-gray-700">
                            24-48 Hours
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          window.open("mailto:support@myslotmate.com")
                        }
                        className="text-xs font-black text-gray-400 hover:text-gray-900"
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
                  className="text-xs font-black tracking-[0.2em] text-gray-400 uppercase transition hover:text-gray-900"
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        </main>
        <Home.Footer />
      </>
    );
  }

  /* ---- submit handlers ---- */

  const handleSaveDraft = async () => {
    if (!user) return;
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
        phn_number: user.phoneNumber ?? "",
        experience_desc: form.experienceDesc || undefined,
        moods: form.moods.map((m) => m.toLowerCase()),
        description: form.description || undefined,
        preferred_days: form.preferredDays.map((d) => d.toLowerCase()),
        group_size: form.groupSize || undefined,
        social_instagram: form.socialInstagram.trim() || null,
        social_linkedin: form.socialLinkedin.trim() || null,
        social_website: form.socialWebsite.trim() || null,
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
      <Navbar />

      <main className="site-x mx-auto min-h-screen w-full max-w-[1120px] py-8 pt-24">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Become a Host" }]}
          className="mb-6"
        />

        {/* Header row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Become a Host
            </h1>
            <p className="mt-1 text-sm font-medium text-[#0094CA]">
              Complete your profile to start hosting
            </p>
          </div>

          {/* Progress bar */}
          <div className="flex flex-col items-end gap-1">
            <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
              Application Progress
            </p>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-40 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-[#0094CA] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gray-900">
                {progress}%
              </span>
            </div>
          </div>
        </div>

        <hr className="my-6 border-gray-200" />

        {/* Form Sections */}
        <div className="space-y-10">
          {/* Personal Information */}
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <span className="text-[#0094CA]">👤</span> Personal Information
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-900">
                  Full Name
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition outline-none focus:ring-1 focus:ring-[#0094CA] ${
                    showErrors && !form.fullName.trim()
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300 focus:border-[#0094CA]"
                  }`}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-900">
                  City of Residence
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="e.g. San Francisco"
                  className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition outline-none focus:ring-1 focus:ring-[#0094CA] ${
                    showErrors && !form.city.trim()
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300 focus:border-[#0094CA]"
                  }`}
                />
              </div>
            </div>
          </section>

          {/* Experience Details */}
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <span className="text-[#0094CA]">✅</span> Experience Details
            </h2>

            <div className="mt-5 space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-900">
                  What Experiences will you Host?
                </label>
                <input
                  type="text"
                  value={form.experienceDesc}
                  onChange={(e) =>
                    updateField("experienceDesc", e.target.value)
                  }
                  placeholder="Write about all the activities you are planning to host"
                  className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition outline-none focus:ring-1 focus:ring-[#0094CA] ${
                    showErrors && !form.experienceDesc.trim()
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300 focus:border-[#0094CA]"
                  }`}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">
                  Select Moods
                </label>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((mood) => {
                    const selected = form.moods.includes(mood);
                    return (
                      <button
                        key={mood}
                        type="button"
                        onClick={() => toggleMood(mood)}
                        className={`rounded-full border px-5 py-2 text-sm font-medium transition ${
                          selected
                            ? "border-[#0094CA] bg-[#0094CA] text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:border-[#0094CA] hover:text-[#0094CA]"
                        }`}
                      >
                        ✦ {mood}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-900">
                    Description{" "}
                    <span className="font-bold text-red-500">*</span>
                  </label>
                  <span className="text-xs text-gray-400">
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
                  className={`w-full resize-none rounded-lg border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition outline-none focus:ring-1 focus:ring-[#0094CA] ${
                    showErrors && !form.description.trim()
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300 focus:border-[#0094CA]"
                  }`}
                />
              </div>

              <div>
                <div className="mb-3">
                  <label className="block text-sm font-semibold text-gray-900">
                    Social Links{" "}
                    <span className="font-bold text-red-500">*</span>
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    At least one link is required for verification.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Instagram
                    </label>
                    <input
                      type="url"
                      value={form.socialInstagram}
                      onChange={(e) =>
                        updateField("socialInstagram", e.target.value)
                      }
                      placeholder="https://instagram.com/yourprofile"
                      className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition outline-none focus:ring-1 focus:ring-[#0094CA] ${
                        showErrors &&
                        !form.socialInstagram.trim() &&
                        !form.socialLinkedin.trim() &&
                        !form.socialWebsite.trim()
                          ? "border-red-500 bg-red-50"
                          : "border-gray-300 focus:border-[#0094CA]"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      LinkedIn
                    </label>
                    <input
                      type="url"
                      value={form.socialLinkedin}
                      onChange={(e) =>
                        updateField("socialLinkedin", e.target.value)
                      }
                      placeholder="https://linkedin.com/in/yourprofile"
                      className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition outline-none focus:ring-1 focus:ring-[#0094CA] ${
                        showErrors &&
                        !form.socialInstagram.trim() &&
                        !form.socialLinkedin.trim() &&
                        !form.socialWebsite.trim()
                          ? "border-red-500 bg-red-50"
                          : "border-gray-300 focus:border-[#0094CA]"
                      }`}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Website
                  </label>
                  <input
                    type="url"
                    value={form.socialWebsite}
                    onChange={(e) =>
                      updateField("socialWebsite", e.target.value)
                    }
                    placeholder="https://yourwebsite.com"
                    className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition outline-none focus:ring-1 focus:ring-[#0094CA] ${
                      showErrors &&
                      !form.socialInstagram.trim() &&
                      !form.socialLinkedin.trim() &&
                      !form.socialWebsite.trim()
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300 focus:border-[#0094CA]"
                    }`}
                  />
                </div>
              </div>
            </div>
          </section>

          <hr className="border-gray-200" />

          {/* Availability */}
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <span className="text-[#0094CA]">📅</span> Availability
            </h2>

            <div className="mt-5 space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">
                  Preferred Days
                </label>
                <div
                  className={`flex flex-wrap gap-2 rounded-xl p-1 transition ${showErrors && form.preferredDays.length === 0 ? "bg-red-50 ring-1 ring-red-500" : ""}`}
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
                            ? "border-[#0094CA] bg-[#0094CA] text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:border-[#0094CA]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-900">
                  Approximate Group Size
                </label>
                <div className="flex w-fit items-center gap-3 rounded-lg border border-gray-300 px-4 py-3">
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
                    className="w-16 text-sm font-bold text-gray-900 outline-none"
                  />
                  <span className="text-sm text-gray-400">People</span>
                </div>
              </div>
            </div>
          </section>

          {/* Bottom actions */}
          <div className="flex items-center justify-between border-t border-gray-200 pt-6">
            <button
              onClick={handleSaveDraft}
              className="text-sm font-medium text-gray-500 transition hover:text-gray-700"
            >
              Save as Draft
            </button>
            <button
              onClick={handleOpenOtp}
              disabled={submitting}
              className="flex items-center gap-2 rounded-full bg-[#0094CA] px-10 py-4 text-sm font-extrabold text-white shadow-[0_16px_32px_rgba(0,148,202,0.24)] transition hover:-translate-y-0.5 hover:bg-[#007dab] disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Host Request"}
              <FiArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>

      <Home.Footer />

      {/* Modals */}
      <HostApplicationSubmittedModal
        open={showSubmittedModal}
        onClose={() => setShowSubmittedModal(false)}
      />

      <OTPVerificationModal
        open={showOtpModal}
        onClose={() => setShowOtpModal(false)}
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
          if (!validUserId) return;
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
