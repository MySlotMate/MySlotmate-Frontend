"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import { Navbar } from "~/components";
import { HostApplicationSubmittedModal } from "~/components/become-host";
import { Home } from "~/components";
import { FiArrowRight, FiUploadCloud } from "react-icons/fi";
import { toast } from "sonner";
import {
  useMyProfile,
  useSubmitHostApplication,
  useSaveHostDraft,
  useUploadFiles,
  useApplicationStatus,
} from "~/hooks/useApi";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface HostFormData {
  // Step 1
  fullName: string;
  city: string;
  experienceDesc: string;
  moods: string[];
  description: string;
  // Step 2
  preferredDays: string[];
  groupSize: number;
  governmentIdFile: File | null;
  governmentIdName: string;
}

const MOODS = ["Adventure", "Social", "Wellness"] as const;

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read userId from localStorage
  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  useEffect(() => {
    setStoredUserId(localStorage.getItem("msm_user_id"));
  }, []);

  const validUserId =
    storedUserId && storedUserId !== "existing" ? storedUserId : null;

  // Fetch user profile (no longer checking for verification - admin will verify after application acceptance)
  const { data: userProfile } = useMyProfile(validUserId);

  // Fetch application status
  const { data: applicationStatus, isLoading: statusLoading } = useApplicationStatus(validUserId);

  // Mutation hooks
  const submitMutation = useSubmitHostApplication();
  const draftMutation = useSaveHostDraft();
  const uploadMutation = useUploadFiles();

  const [step, setStep] = useState(1);
  const [showSubmittedModal, setShowSubmittedModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<HostFormData>({
    fullName: user?.displayName ?? "",
    city: "",
    experienceDesc: "",
    moods: [],
    description: "",
    preferredDays: [],
    groupSize: 5,
    governmentIdFile: null,
    governmentIdName: "",
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

  const handleFile = useCallback((file: File | undefined) => {
    if (!file) return;
    const allowed = [
      "image/png",
      "image/jpeg",
      "image/svg+xml",
      "application/pdf",
    ];
    if (!allowed.includes(file.type)) {
      toast.error("Only PNG, JPG, SVG, or PDF files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10 MB.");
      return;
    }
    setForm((prev) => ({
      ...prev,
      governmentIdFile: file,
      governmentIdName: file.name,
    }));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile],
  );

  const progress = step === 1 ? 50 : 100;

  /* ---- guard: must be logged in + verified ---- */

  if (!user) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Become a Host
          </h1>
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
  const hasExistingApplication = applicationStatus?.status?.application_status && applicationStatus.status.application_status !== "draft";
  
  if (!statusLoading && hasExistingApplication) {
    const status = applicationStatus.status!.application_status;
    const statusConfig = {
      pending: {
        title: "Your Application is Under Review",
        description: "We've received your host application and our team is currently reviewing your profile. This typically takes 24-48 hours.",
        icon: "⏳",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        badgeColor: "bg-yellow-100 text-yellow-800",
      },
      under_review: {
        title: "Your Application is Under Review",
        description: "We're carefully reviewing your profile to ensure the best experience for our community. We'll notify you soon with a decision.",
        icon: "🔍",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        badgeColor: "bg-blue-100 text-blue-800",
      },
      approved: {
        title: "🎉 You're Approved!",
        description: "Congratulations! You've been approved as a host. You can now create and post your first experience. Start hosting amazing moments!",
        icon: "✅",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        badgeColor: "bg-green-100 text-green-800",
      },
      rejected: {
        title: "Application Status",
        description: "Unfortunately, your application was not approved at this time. Please contact our support team if you'd like more information.",
        icon: "❌",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        badgeColor: "bg-red-100 text-red-800",
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gray-50">
          <div className="mx-auto max-w-2xl site-x py-20">
            <div className={`rounded-2xl border-2 ${config.borderColor} ${config.bgColor} p-8 text-center`}>
              <div className="mb-6 text-6xl">{config.icon}</div>
              <h1 className="text-3xl font-bold text-gray-900">{config.title}</h1>
              <p className="mt-4 text-lg text-gray-600">{config.description}</p>
              
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  onClick={() => router.push("/")}
                  className="rounded-full bg-[#0094CA] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#007dab]"
                >
                  Browse Experiences
                </button>
                {status === "approved" && (
                  <button
                    onClick={() => router.push("/host-dashboard/experiences/new")}
                    className="rounded-full border-2 border-[#0094CA] px-8 py-3 text-sm font-semibold text-[#0094CA] transition hover:bg-[#e6f8ff]"
                  >
                    Create Your First Experience
                  </button>
                )}
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
      });
      toast.success("Application saved as draft.");
    } catch (err) {
      console.error("Save draft error:", err);
      toast.error("Failed to save draft. Please try again.");
    }
  };

  const handleNextStep = () => {
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
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (form.preferredDays.length === 0) {
      toast.warning("Please select at least one preferred day.");
      return;
    }
    if (!form.governmentIdFile) {
      toast.warning("Please upload your Government ID for verification.");
      return;
    }
    if (!validUserId) {
      toast.error("Please complete your profile (signup) first.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload government ID to S3
      let govIdUrl: string | undefined;
      try {
        const uploadRes = await uploadMutation.mutateAsync({
          files: [form.governmentIdFile],
          folder: "hosts/government-ids",
        });
        govIdUrl = uploadRes.data[0]?.url;
      } catch (uploadErr) {
        console.warn("File upload failed (server may not have S3 configured), continuing without:", uploadErr);
      }

      // 2. Submit host application
      const nameParts = form.fullName.trim().split(" ");
      const res = await submitMutation.mutateAsync({
        user_id: validUserId,
        first_name: nameParts[0] ?? "",
        last_name: nameParts.slice(1).join(" ") || "",
        city: form.city,
        phn_number: user?.phoneNumber ?? "",
        experience_desc: form.experienceDesc || undefined,
        moods: form.moods.map((m) => m.toLowerCase()),
        description: form.description || undefined,
        preferred_days: form.preferredDays.map((d) => d.toLowerCase()),
        group_size: form.groupSize,
        government_id_url: govIdUrl,
      });

      // Store host id + status for navbar/other pages
      localStorage.setItem("msm_host_id", res.data.id);
      localStorage.setItem(
        "hostApplicationStatus",
        JSON.stringify({ status: res.data.application_status, submittedAt: new Date().toISOString() }),
      );

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

      <main className="mx-auto min-h-screen max-w-5xl site-x py-8">
        {/* Header row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Become a Host
            </h1>
            <p className="mt-1 text-sm font-medium text-[#0094CA]">
              {step === 1
                ? "Step 1 of 2: Basic Information"
                : "Step 2 of 2: Logistics & Verification"}
            </p>
          </div>

          {/* Progress bar */}
          <div className="flex flex-col items-end gap-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Application Progress
            </p>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-40 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-[#0094CA] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gray-900">{progress}%</span>
            </div>
          </div>
        </div>

        <hr className="my-6 border-gray-200" />

        {/* ─── STEP 1 ─── */}
        {step === 1 && (
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
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-[#0094CA] focus:ring-1 focus:ring-[#0094CA]"
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
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-[#0094CA] focus:ring-1 focus:ring-[#0094CA]"
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
                {/* What Experiences */}
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
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-[#0094CA] focus:ring-1 focus:ring-[#0094CA]"
                  />
                </div>

                {/* Moods */}
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

                {/* Description */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-900">
                      Description
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
                    className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-[#0094CA] focus:ring-1 focus:ring-[#0094CA]"
                  />
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
                onClick={handleNextStep}
                className="flex items-center gap-2 rounded-full bg-[#0094CA] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#007dab]"
              >
                Next Steps <FiArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2 ─── */}
        {step === 2 && (
          <div className="space-y-10">
            {/* Availability */}
            <section>
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <span className="text-[#0094CA]">📅</span> Availability
              </h2>

              <div className="mt-5 space-y-6">
                {/* Preferred Days */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-900">
                    Preferred Days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map(({ key, label }) => {
                      const selected = form.preferredDays.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleDay(key)}
                          className={`rounded-full border px-5 py-2.5 text-xs font-semibold uppercase tracking-wide transition ${
                            selected
                              ? "border-[#0094CA] bg-[#0094CA] text-white"
                              : "border-gray-300 bg-white text-gray-600 hover:border-[#0094CA]"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Group Size */}
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
                  <p className="mt-1.5 text-xs text-gray-500">
                    How many guests can you comfortably host at once?
                  </p>
                </div>
              </div>
            </section>

            <hr className="border-gray-200" />

            {/* Verification */}
            <section>
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <span className="text-[#0094CA]">🔒</span> Verification
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Required for safety and trust. We never share your ID.
              </p>

              {/* Upload area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`mt-5 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition ${
                  dragActive
                    ? "border-[#0094CA] bg-[#e6f8ff]"
                    : form.governmentIdFile
                      ? "border-green-400 bg-green-50"
                      : "border-gray-300 bg-gray-50"
                }`}
              >
                {form.governmentIdFile ? (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                      <svg
                        className="h-6 w-6 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-gray-900">
                      {form.governmentIdName}
                    </p>
                    <button
                      onClick={() => {
                        updateField("governmentIdFile", null);
                        updateField("governmentIdName", "");
                      }}
                      className="mt-1 text-xs text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#e6f8ff]">
                      <FiUploadCloud className="h-6 w-6 text-[#0094CA]" />
                    </div>
                    <p className="mt-3 text-sm font-bold text-gray-900">
                      Upload Government ID
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Drag and drop or{" "}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="font-medium text-[#0094CA] hover:underline"
                      >
                        browse files
                      </button>
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg,.pdf"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>
            </section>

            {/* Bottom actions */}
            <div className="flex items-center justify-between border-t border-gray-200 pt-6">
              <button
                onClick={() => {
                  // Save for later = draft
                  void handleSaveDraft();
                }}
                className="text-sm font-medium text-gray-500 transition hover:text-gray-700"
              >
                Save for later
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 rounded-full bg-[#0094CA] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#007dab] disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Host Request"} <FiArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      <Home.Footer />

      {/* Submitted modal */}
      <HostApplicationSubmittedModal
        open={showSubmittedModal}
        onClose={() => setShowSubmittedModal(false)}
      />
    </>
  );
}
