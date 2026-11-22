"use client";

import Link from "next/link";
import { useState, useEffect, type ReactNode } from "react";
import { FiArrowRight, FiPhoneCall, FiX } from "react-icons/fi";
import {
  LuAlertCircle,
  LuBadgeHelp,
  LuFileCheck2,
  LuFileText,
  LuLifeBuoy,
  LuShieldAlert,
  LuClock,
  LuCheckCircle2,
} from "react-icons/lu";
import { SupportPageShell } from "~/components/support";
import Breadcrumb from "~/components/Breadcrumb";
import { useUserTickets } from "~/hooks/useApi";
import type { SupportTicketDTO } from "~/lib/api";

interface AssistCard {
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  icon: ReactNode;
  accentClassName: string;
}

const assistCards: AssistCard[] = [
  {
    title: "Report a Participant",
    description:
      "Flag harassment, unsafe behavior, or violations of community guidelines for immediate review.",
    href: "/support/report",
    actionLabel: "Report issue",
    icon: <LuAlertCircle className="h-5 w-5" />,
    accentClassName: "bg-white/[0.04] text-[#4F7CFF]",
  },
  {
    title: "Technical Support",
    description:
      "Get help with audio, video, connectivity, bookings, or dashboard issues during hosting.",
    href: "/support/technical",
    actionLabel: "Get tech help",
    icon: <LuLifeBuoy className="h-5 w-5" />,
    accentClassName: "bg-white/[0.04] text-[#16A34A]",
  },
  {
    title: "Policy Help",
    description:
      "Review booking rules, cancellation policies, payout guidance, and community standards.",
    href: "/support/policies",
    actionLabel: "View policies",
    icon: <LuFileCheck2 className="h-5 w-5" />,
    accentClassName: "bg-white/[0.04] text-[#A855F7]",
  },
  {
    title: "Terms & Conditions",
    description:
      "Read host agreements, content licensing, guest conduct guidelines, cancellation policies, and safety information.",
    href: "/support/terms-conditions",
    actionLabel: "View terms",
    icon: <LuFileText className="h-5 w-5" />,
    accentClassName: "bg-white/[0.04] text-[#6B7280]",
  },
];

function AssistCardComponent({
  title,
  description,
  href,
  actionLabel,
  icon,
  accentClassName,
}: AssistCard) {
  return (
    <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-[#121426] p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div
        className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl ${accentClassName}`}
      >
        {icon}
      </div>
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-3 grow text-sm leading-6 text-[#A5A8C3]">
        {description}
      </p>
      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#D8B4FE] transition hover:text-[#D8B4FE]"
      >
        {actionLabel}
        <FiArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default function SupportPage() {
  const [isTicketsOpen, setIsTicketsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { data: userTickets, isLoading: ticketsLoading } =
    useUserTickets(userId);

  useEffect(() => {
    const id = localStorage.getItem("msm_user_id");
    if (id) {
      setUserId(id);
    }
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return {
          bgColor: "bg-[#241333]",
          textColor: "text-[#D8B4FE]",
          icon: <LuClock className="h-4 w-4" />,
          label: "Open",
        };
      case "resolved":
        return {
          bgColor: "bg-green-500/10",
          textColor: "text-green-300",
          icon: <LuCheckCircle2 className="h-4 w-4" />,
          label: "Resolved",
        };
      default:
        return {
          bgColor: "bg-white/[0.04]",
          textColor: "text-white/80",
          icon: <LuClock className="h-4 w-4" />,
          label: status,
        };
    }
  };

  const getCategoryColor = (category: string) => {
    const categoryMap: Record<string, string> = {
      report_participant: "bg-red-500/15 text-red-300",
      technical_support: "bg-green-500/15 text-green-300",
      policy_help: "bg-purple-500/15 text-purple-300",
      payment_issue: "bg-orange-500/15 text-orange-300",
      other: "bg-white/[0.06] text-white/80",
    };
    return categoryMap[category] ?? "bg-white/[0.06] text-white/80";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <SupportPageShell>
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: "Support & Safety" }]}
        className="mb-6"
      />
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Support &amp; Safety
          </h1>
          <p className="mt-2 text-sm text-[#A5A8C3] sm:text-base">
            We’re here to help you host with confidence.
          </p>
        </div>

        <button
          onClick={() => setIsTicketsOpen(true)}
          className="inline-flex items-center rounded-full border border-white/10 bg-[#121426] px-4 py-2 text-sm font-medium text-white/80 shadow-sm transition hover:border-[#A020F0] hover:text-[#D8B4FE]"
        >
          All tickets raised
        </button>
      </section>

      <section className="mt-8 overflow-hidden rounded-[28px] border border-orange-500/30 bg-[#121426] p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-orange-400 uppercase">
              <LuShieldAlert className="h-4 w-4" />
              Emergency SOS
            </div>

            <h2 className="max-w-xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Need immediate help during a live session?
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#A5A8C3] sm:text-base">
              Our Trust &amp; Safety team prioritizes urgent incidents so you
              can get help quickly when something feels unsafe.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/support/report?urgent=1"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#A020F0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8A1AD0]"
              >
                <FiPhoneCall className="h-4 w-4" />
                Call Trust &amp; Safety
              </Link>
              <a
                href="tel:112"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-[#A020F0] hover:text-[#D8B4FE]"
              >
                Local Emergency Services
              </a>
            </div>
          </div>

          <div className="hidden justify-end lg:flex">
            <div className="flex h-52 w-52 items-center justify-center rounded-full bg-orange-500/10 text-orange-200">
              <LuShieldAlert className="h-28 w-28" />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-white sm:text-2xl">
          How can we assist you?
        </h2>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {assistCards.map((card) => (
            <AssistCardComponent key={card.title} {...card} />
          ))}
        </div>
      </section>

      {/* Tickets Modal */}
      {isTicketsOpen && (
        <div className="msm-modal fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-[28px] bg-[#121426] shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#241333] to-[#241333] p-6">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Support Tickets
                </h2>
                <p className="mt-1 text-sm text-[#A5A8C3]">
                  {userTickets?.length ?? 0} ticket
                  {(userTickets?.length ?? 0) !== 1 ? "s" : ""} raised
                </p>
              </div>
              <button
                onClick={() => setIsTicketsOpen(false)}
                className="rounded-full p-2 text-[#A5A8C3] transition hover:bg-[#121426] hover:text-white"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
              {ticketsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#652A91]/60 border-t-[#A020F0]" />
                </div>
              ) : userTickets && userTickets.length > 0 ? (
                <div className="space-y-4">
                  {userTickets.map((ticket: SupportTicketDTO) => {
                    const statusBadge = getStatusBadge(ticket.status);
                    return (
                      <div
                        key={ticket.id}
                        className="overflow-hidden rounded-xl border border-white/10 bg-[#121426] transition hover:border-[#A020F0] hover:shadow-md"
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-semibold text-white">
                                  {ticket.subject}
                                </h3>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusBadge.bgColor} ${statusBadge.textColor}`}
                                >
                                  {statusBadge.icon}
                                  {statusBadge.label}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-[#A5A8C3]">
                                {ticket.report_reason ?? "Support inquiry"}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getCategoryColor(
                                    ticket.category || "other",
                                  )}`}
                                >
                                  {ticket.category?.replace(/_/g, " ") ||
                                    "Other"}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-[#A5A8C3]">
                                  {ticket.messages?.length || 0} message
                                  {(ticket.messages?.length || 0) !== 1
                                    ? "s"
                                    : ""}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-[#A5A8C3]">
                                {formatDate(ticket.created_at)}
                              </p>
                              <Link
                                href={`/support/tickets/${ticket.id}`}
                                className="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#A020F0] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#8A1AD0]"
                              >
                                View
                                <FiArrowRight className="h-3 w-3" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#241333]">
                    <LuBadgeHelp className="h-6 w-6 text-[#D8B4FE]" />
                  </div>
                  <p className="text-sm font-medium text-white">
                    No tickets yet
                  </p>
                  <p className="mt-1 text-sm text-[#A5A8C3]">
                    You haven&apos;t raised any support tickets. Feel free to
                    reach out if you need help!
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-white/10 bg-white/[0.04] p-4">
              <button
                onClick={() => setIsTicketsOpen(false)}
                className="w-full rounded-lg border border-white/15 py-2 text-sm font-medium text-white/80 transition hover:bg-[#121426]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </SupportPageShell>
  );
}
