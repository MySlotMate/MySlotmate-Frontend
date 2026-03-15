"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import type { IconType } from "react-icons";
import {
  FiAlertTriangle,
  FiMessageSquare,
  FiShield,
  FiSlash,
  FiUsers,
} from "react-icons/fi";
import { toast } from "sonner";
import {
  SupportBreadcrumb,
  SupportFileDropzone,
  SupportPageShell,
  SupportSuccessModal,
} from "~/components/support";
import {
  useApplicationStatus,
  useCreateSupportTicket,
  useEventsByHost,
  useUploadFiles,
} from "~/hooks/useApi";
import { auth } from "~/utils/firebase";

interface ReportReasonOption {
  label: string;
  value: string;
  icon: IconType;
}

const reportReasonOptions: ReportReasonOption[] = [
  {
    label: "Verbal harassment",
    value: "verbal_harassment",
    icon: FiMessageSquare,
  },
  {
    label: "Safety concern",
    value: "safety_concern",
    icon: FiShield,
  },
  {
    label: "Inappropriate behavior",
    value: "inappropriate_behavior",
    icon: FiUsers,
  },
  {
    label: "Spam or scam",
    value: "spam_or_scam",
    icon: FiSlash,
  },
];

export default function ReportIssuePage() {
  const [user] = useAuthState(auth);
  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  const [storedHostId, setStoredHostId] = useState<string | null>(null);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const uploadFilesMutation = useUploadFiles();
  const createTicketMutation = useCreateSupportTicket();

  const [formData, setFormData] = useState({
    selectedExperience: "",
    participantName: "",
    description: "",
    date: "",
    evidence: null as File | null,
    reportReason: "",
    isUrgent: false,
  });

  useEffect(() => {
    setStoredUserId(localStorage.getItem("msm_user_id"));
    setStoredHostId(localStorage.getItem("msm_host_id"));

    const params = new URLSearchParams(window.location.search);
    const urgent = params.get("urgent");
    if (urgent === "1" || urgent === "true") {
      setFormData((current) => ({
        ...current,
        isUrgent: true,
      }));
    }
  }, []);

  const validUserId =
    storedUserId && storedUserId !== "existing" ? storedUserId : null;
  const { data: hostApplication } = useApplicationStatus(validUserId);

  useEffect(() => {
    if (!storedHostId && hostApplication?.id) {
      setStoredHostId(hostApplication.id);
      localStorage.setItem("msm_host_id", hostApplication.id);
    }
  }, [hostApplication?.id, storedHostId]);

  const resolvedHostId = storedHostId ?? hostApplication?.id ?? null;
  const { data: hostEvents } = useEventsByHost(resolvedHostId);

  const experienceOptions = useMemo(() => {
    return [...(hostEvents ?? [])].sort((left, right) => {
      return new Date(right.time).getTime() - new Date(left.time).getTime();
    });
  }, [hostEvents]);

  const handleEvidenceSelected = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setFormData((current) => ({
      ...current,
      evidence: file,
    }));
    toast.success(`File "${file.name}" selected`);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      toast.error("Please sign in to submit a report");
      return;
    }

    if (!validUserId) {
      toast.error("We could not find your account profile. Please sign in again.");
      return;
    }

    if (experienceOptions.length > 0 && !formData.selectedExperience) {
      toast.error("Please select the experience related to this report");
      return;
    }

    if (!formData.date) {
      toast.error("Please select the session date");
      return;
    }

    if (!formData.participantName.trim()) {
      toast.error("Please provide participant name");
      return;
    }

    if (!formData.reportReason) {
      toast.error("Please select a report reason");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Please provide a description");
      return;
    }

    setIsSubmitting(true);

    try {
      let evidenceUrls: string[] = [];

      if (formData.evidence) {
        const uploadRes = await uploadFilesMutation.mutateAsync({
          files: [formData.evidence],
          folder: "support/evidence",
        });

        if (uploadRes.success && uploadRes.data) {
          evidenceUrls = uploadRes.data.map((item) => item.url);
        }
      }

      const selectedEvent = experienceOptions.find(
        (item) => item.id === formData.selectedExperience,
      );

      const ticket = await createTicketMutation.mutateAsync({
        user_id: validUserId,
        category: "report_participant",
        subject: ["Report", formData.participantName.trim(), selectedEvent?.title]
          .filter(Boolean)
          .join(" • "),
        message: formData.description.trim(),
        event_id: selectedEvent?.id ?? undefined,
        session_date: `${formData.date}T00:00:00.000Z`,
        report_reason: formData.reportReason,
        evidence_urls: evidenceUrls,
        is_urgent: formData.isUrgent,
      });

      setSubmittedTicketId(ticket.data.id);
      toast.success("Report submitted successfully. Our team will review it shortly.");
      setFormData({
        selectedExperience: "",
        participantName: "",
        description: "",
        date: "",
        evidence: null,
        reportReason: "",
        isUrgent: false,
      });
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SupportPageShell contentClassName="max-w-5xl">
      <SupportBreadcrumb
        items={[
          { label: "Support & Safety", href: "/support" },
          { label: "Report a participant" },
        ]}
      />

      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Report a Participant
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
          Your safety is our priority. This report is confidential and reviewed
          by our Trust &amp; Safety team.
        </p>
      </header>

      <section className="mx-auto mt-10 max-w-3xl rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-900">
              Select Experience
            </label>
            <select
              value={formData.selectedExperience}
              onChange={(event) => {
                setFormData((current) => ({
                  ...current,
                  selectedExperience: event.target.value,
                }));
              }}
              className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8fbfd] px-4 text-sm text-slate-700 outline-none transition focus:border-[#0094CA]"
            >
              <option value="">Choose experience...</option>
              {experienceOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            {experienceOptions.length === 0 && (
              <p className="mt-2 text-xs text-slate-400">
                No hosted experiences found yet. If needed, continue with a general report.
              </p>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900">
                Session Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(event) => {
                  setFormData((current) => ({
                    ...current,
                    date: event.target.value,
                  }));
                }}
                className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8fbfd] px-4 text-sm text-slate-700 outline-none transition focus:border-[#0094CA]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900">
                Participant Name
              </label>
              <input
                type="text"
                value={formData.participantName}
                onChange={(event) => {
                  setFormData((current) => ({
                    ...current,
                    participantName: event.target.value,
                  }));
                }}
                placeholder="Who is this about?"
                className="h-12 w-full rounded-xl border border-gray-200 bg-[#f8fbfd] px-4 text-sm text-slate-700 outline-none transition focus:border-[#0094CA]"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-semibold text-slate-900">
              Why are you reporting this person?
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              {reportReasonOptions.map((option) => {
                const Icon = option.icon;
                const active = formData.reportReason === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setFormData((current) => ({
                        ...current,
                        reportReason: option.value,
                      }));
                    }}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                      active
                        ? "border-[#0094CA] bg-[#e6f8ff] text-[#007dab]"
                        : "border-gray-200 bg-[#f8fbfd] text-slate-700 hover:border-[#0094CA]"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-sm font-semibold text-slate-900">
                Detailed Description
              </label>
              <span className="text-xs text-slate-400">
                {formData.description.length}/3000 characters
              </span>
            </div>
            <textarea
              value={formData.description}
              onChange={(event) => {
                setFormData((current) => ({
                  ...current,
                  description: event.target.value.slice(0, 3000),
                }));
              }}
              placeholder="Describe what happened and any actions already taken"
              rows={6}
              className="w-full rounded-2xl border border-gray-200 bg-[#f8fbfd] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0094CA]"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-900">
              Evidence Upload <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <SupportFileDropzone
              fileName={formData.evidence?.name}
              onFileSelected={handleEvidenceSelected}
            />
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-rose-500 shadow-sm">
                <FiAlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  This is an urgent safety concern
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Toggle this if there is an immediate risk to you or others.
                  Urgent reports are prioritized for faster review.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFormData((current) => ({
                  ...current,
                  isUrgent: !current.isUrgent,
                }));
              }}
              className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors ${
                formData.isUrgent ? "bg-[#0094CA]" : "bg-slate-300"
              }`}
              aria-pressed={formData.isUrgent}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  formData.isUrgent ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex flex-col gap-4 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm leading-6 text-slate-500">
              <p className="font-semibold text-slate-700">Review Process</p>
              <p>
                We aim to review all reports within 24 hours. If you are in immediate
                danger, contact local authorities first.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Link
                href="/support"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-gray-300"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !user}
                className="inline-flex items-center justify-center rounded-xl bg-[#0094CA] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#007dab] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <SupportSuccessModal
        open={!!submittedTicketId}
        ticketId={submittedTicketId}
        onClose={() => setSubmittedTicketId(null)}
      />
    </SupportPageShell>
  );
}
