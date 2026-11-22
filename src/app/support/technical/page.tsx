"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import type { IconType } from "react-icons";
import { FiAlertCircle, FiCalendar, FiSearch, FiVideo } from "react-icons/fi";
import { LuLayoutDashboard } from "react-icons/lu";
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

interface CommonTopic {
  id: number;
  title: string;
  description: string;
  icon: IconType;
}

const RupeeIcon: IconType = ({ className }) => (
  <span className={className}>₹</span>
);

const commonTopics: CommonTopic[] = [
  {
    id: 1,
    title: "Session & Meeting",
    description: "Audio/video quality, connection drops, and recording issues.",
    icon: FiVideo,
  },
  {
    id: 2,
    title: "Booking Problems",
    description: "Calendar sync errors, double bookings, and cancellations.",
    icon: FiCalendar,
  },
  {
    id: 3,
    title: "Payment & Payout",
    description: "Withdrawal delays, tax documents, and invoice disputes.",
    icon: RupeeIcon,
  },
  {
    id: 4,
    title: "Dashboard Errors",
    description:
      "Login issues, broken analytics, or confusing dashboard states.",
    icon: LuLayoutDashboard,
  },
];

const issueLabels = {
  session: "Session & Meeting",
  booking: "Booking Problems",
  payment: "Payment & Payout",
  dashboard: "Dashboard Errors",
} as const;

const priorityOptions = [
  { label: "Low", value: "low", dotClassName: "bg-emerald-400" },
  { label: "Medium", value: "medium", dotClassName: "bg-amber-400" },
  { label: "Critical", value: "critical", dotClassName: "bg-rose-500" },
] as const;

function CommonTopicCard({ topic }: { topic: CommonTopic }) {
  const Icon = topic.icon;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#121426] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#241333] text-[#D8B4FE]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{topic.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#A5A8C3]">
        {topic.description}
      </p>
    </div>
  );
}

export default function TechnicalSupportPage() {
  const [user] = useAuthState(auth);
  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  const [storedHostId, setStoredHostId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const uploadFilesMutation = useUploadFiles();
  const createTicketMutation = useCreateSupportTicket();

  const [contactDetails, setContactDetails] = useState({
    issueCategory: "session",
    selectedExperience: "",
    priorityLevel: "medium",
    description: "",
    attachment: null as File | null,
  });

  useEffect(() => {
    setStoredUserId(localStorage.getItem("msm_user_id"));
    setStoredHostId(localStorage.getItem("msm_host_id"));
  }, []);

  const validUserId =
    storedUserId && storedUserId !== "existing" ? storedUserId : null;
  const { data: hostApplication } = useApplicationStatus(validUserId);

  useEffect(() => {
    if (!storedHostId && hostApplication?.status?.id) {
      setStoredHostId(hostApplication.status.id);
      localStorage.setItem("msm_host_id", hostApplication.status.id);
    }
  }, [hostApplication?.status?.id, storedHostId]);

  const resolvedHostId = storedHostId ?? hostApplication?.status?.id ?? null;
  const { data: hostEvents } = useEventsByHost(resolvedHostId);

  const experienceOptions = useMemo(() => {
    return [...(hostEvents ?? [])].sort((left, right) => {
      return new Date(right.time).getTime() - new Date(left.time).getTime();
    });
  }, [hostEvents]);

  const filteredTopics = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return commonTopics;
    }

    return commonTopics.filter(({ title, description }) => {
      return `${title} ${description}`.toLowerCase().includes(query);
    });
  }, [searchQuery]);

  const handleAttachmentSelected = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setContactDetails((current) => ({
      ...current,
      attachment: file,
    }));
    toast.success(`File "${file.name}" selected`);
  };

  const handleContactSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      toast.error("Please sign in to submit a support ticket");
      return;
    }

    if (!validUserId) {
      toast.error(
        "We could not find your account profile. Please sign in again.",
      );
      return;
    }

    if (!contactDetails.description.trim()) {
      toast.error("Please provide a description");
      return;
    }

    setIsSubmitting(true);

    try {
      let evidenceUrls: string[] = [];

      if (contactDetails.attachment) {
        const uploadRes = await uploadFilesMutation.mutateAsync({
          files: [contactDetails.attachment],
          folder: "support/evidence",
        });

        if (uploadRes.success && uploadRes.data) {
          evidenceUrls = uploadRes.data.map((item) => item.url);
        }
      }

      const selectedEvent = experienceOptions.find(
        (item) => item.id === contactDetails.selectedExperience,
      );

      const ticket = await createTicketMutation.mutateAsync({
        user_id: validUserId,
        category: "technical_support",
        subject: [
          issueLabels[contactDetails.issueCategory as keyof typeof issueLabels],
          selectedEvent?.title,
          `Priority: ${contactDetails.priorityLevel}`,
        ]
          .filter(Boolean)
          .join(" • "),
        message: contactDetails.description.trim(),
        event_id: selectedEvent?.id ?? undefined,
        evidence_urls: evidenceUrls,
        is_urgent: contactDetails.priorityLevel === "critical",
      });

      setSubmittedTicketId(ticket.data.id);
      toast.success("Your support ticket has been submitted successfully!");
      setContactDetails({
        issueCategory: "session",
        selectedExperience: "",
        priorityLevel: "medium",
        description: "",
        attachment: null,
      });
    } catch (error) {
      console.error("Error submitting support ticket:", error);
      toast.error("Failed to submit support ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SupportPageShell>
      <SupportBreadcrumb
        items={[
          { label: "Support & Safety", href: "/support" },
          { label: "Technical Support" },
        ]}
      />

      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          How can we help you today?
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#A5A8C3] sm:text-base">
          Find answers, troubleshoot issues, or connect with our specialized
          support team for hosts.
        </p>
      </header>

      <div className="mx-auto mt-8 flex w-full max-w-2xl items-center gap-3 rounded-full border border-white/10 bg-[#121426] px-4 py-3 shadow-sm">
        <FiSearch className="h-4 w-4 text-[#D8B4FE]" />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          type="text"
          placeholder="Search for articles, errors, or anything you need..."
          className="w-full bg-transparent text-sm text-white/80 outline-none"
        />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white sm:text-xl">
          Common Topics
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {filteredTopics.map((topic) => (
            <CommonTopicCard key={topic.id} topic={topic} />
          ))}
        </div>
      </section>

      <div className="my-10 flex items-center gap-4">
        <hr className="flex-1 border-t border-white/10" />
        <span className="text-xs font-semibold tracking-[0.2em] text-[#777B98] uppercase">
          Still need help?
        </span>
        <hr className="flex-1 border-t border-white/10" />
      </div>

      <section className="rounded-[28px] border border-white/10 bg-[#121426] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              Submit a Request
            </h2>
            <p className="mt-2 text-sm text-[#A5A8C3]">
              Our technical team typically responds within 2 business hours.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            System Operational
          </div>
        </div>

        <form onSubmit={handleContactSubmit} className="mt-8 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                Issue Category
              </label>
              <select
                name="issueCategory"
                value={contactDetails.issueCategory}
                onChange={(event) => {
                  setContactDetails((current) => ({
                    ...current,
                    issueCategory: event.target.value,
                  }));
                }}
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white/80 transition outline-none focus:border-[#A020F0]"
              >
                {Object.entries(issueLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">
                Which Experience?
              </label>
              <select
                name="selectedExperience"
                value={contactDetails.selectedExperience}
                onChange={(event) => {
                  setContactDetails((current) => ({
                    ...current,
                    selectedExperience: event.target.value,
                  }));
                }}
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white/80 transition outline-none focus:border-[#A020F0]"
              >
                <option value="">General platform issue</option>
                {experienceOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
              {experienceOptions.length === 0 && (
                <p className="mt-2 text-xs text-[#777B98]">
                  No hosted experiences found yet. You can still submit a
                  general issue.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-semibold text-white">
              Priority Level
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              {priorityOptions.map((option) => {
                const active = contactDetails.priorityLevel === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setContactDetails((current) => ({
                        ...current,
                        priorityLevel: option.value,
                      }));
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? "border-[#A020F0] bg-[#241333] text-[#D8B4FE]"
                        : "border-white/10 bg-white/[0.04] text-white/80 hover:border-[#A020F0]"
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${option.dotClassName}`}
                    />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white">
              Description
            </label>
            <textarea
              value={contactDetails.description}
              onChange={(event) => {
                setContactDetails((current) => ({
                  ...current,
                  description: event.target.value,
                }));
              }}
              placeholder="Describe your technical issue in detail"
              rows={5}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/80 transition outline-none focus:border-[#A020F0]"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white">
              Attachments{" "}
              <span className="font-normal text-[#777B98]">(Optional)</span>
            </label>
            <SupportFileDropzone
              fileName={contactDetails.attachment?.name}
              onFileSelected={handleAttachmentSelected}
            />
          </div>

          <div className="flex flex-col gap-4 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 text-sm text-[#A5A8C3]">
              <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D8B4FE]" />
              <p>
                Need urgent help instead? Use the{" "}
                <Link
                  href="/support/report"
                  className="font-semibold text-[#D8B4FE] hover:underline"
                >
                  participant report flow
                </Link>{" "}
                for safety incidents.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Link
                href="/support"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-white/15"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !user}
                className="inline-flex items-center justify-center rounded-xl bg-[#A020F0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8A1AD0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
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
