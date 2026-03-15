"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { FiArrowRight, FiPhoneCall, FiSearch } from "react-icons/fi";
import {
  LuAlertCircle,
  LuBadgeHelp,
  LuFileCheck2,
  LuLifeBuoy,
  LuShieldAlert,
} from "react-icons/lu";
import { SupportPageShell } from "~/components/support";

interface AssistCard {
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  icon: ReactNode;
  accentClassName: string;
}

interface KnowledgeTopic {
  label: string;
  topic: string;
}

const assistCards: AssistCard[] = [
  {
    title: "Report a Participant",
    description:
      "Flag harassment, unsafe behavior, or violations of community guidelines for immediate review.",
    href: "/support/report",
    actionLabel: "Report issue",
    icon: <LuAlertCircle className="h-5 w-5" />,
    accentClassName: "bg-[#eef4ff] text-[#4F7CFF]",
  },
  {
    title: "Technical Support",
    description:
      "Get help with audio, video, connectivity, bookings, or dashboard issues during hosting.",
    href: "/support/technical",
    actionLabel: "Get tech help",
    icon: <LuLifeBuoy className="h-5 w-5" />,
    accentClassName: "bg-[#edfff6] text-[#16A34A]",
  },
  {
    title: "Policy Help",
    description:
      "Review booking rules, cancellation policies, payout guidance, and community standards.",
    href: "/support/policies",
    actionLabel: "View policies",
    icon: <LuFileCheck2 className="h-5 w-5" />,
    accentClassName: "bg-[#f6efff] text-[#A855F7]",
  },
];

const knowledgeTopics: KnowledgeTopic[] = [
  { label: "Cancellations", topic: "cancellation" },
  { label: "Payouts & Taxes", topic: "payout" },
  { label: "Guest Requirements", topic: "community" },
  { label: "Reviews", topic: "review" },
  { label: "Video Settings", topic: "safety" },
  { label: "Hosting Guidelines", topic: "hosting" },
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
    <div className="flex h-full flex-col rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div
        className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl ${accentClassName}`}
      >
        {icon}
      </div>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-3 grow text-sm leading-6 text-slate-500">{description}</p>
      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0094CA] transition hover:text-[#007dab]"
      >
        {actionLabel}
        <FiArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default function SupportPage() {
  const [knowledgeQuery, setKnowledgeQuery] = useState("");

  const filteredTopics = useMemo(() => {
    const query = knowledgeQuery.trim().toLowerCase();

    if (!query) {
      return knowledgeTopics;
    }

    return knowledgeTopics.filter(({ label, topic }) => {
      const haystack = `${label} ${topic}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [knowledgeQuery]);

  return (
    <SupportPageShell contentClassName="max-w-6xl">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Support &amp; Safety
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            We’re here to help you host with confidence.
          </p>
        </div>

        <Link
          href="/support/tickets"
          className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#0094CA] hover:text-[#0094CA]"
        >
          All tickets raised
        </Link>
      </section>

      <section className="mt-8 overflow-hidden rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
              <LuShieldAlert className="h-4 w-4" />
              Emergency SOS
            </div>

            <h2 className="max-w-xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Need immediate help during a live session?
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
              Our Trust &amp; Safety team prioritizes urgent incidents so you can
              get help quickly when something feels unsafe.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/support/report?urgent=1"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0094CA] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#007dab]"
              >
                <FiPhoneCall className="h-4 w-4" />
                Call Trust &amp; Safety
              </Link>
              <a
                href="tel:112"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#0094CA] hover:text-[#0094CA]"
              >
                Local Emergency Services
              </a>
            </div>
          </div>

          <div className="hidden justify-end lg:flex">
            <div className="flex h-52 w-52 items-center justify-center rounded-full bg-orange-50/80 text-orange-200">
              <LuShieldAlert className="h-28 w-28" />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          How can we assist you?
        </h2>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {assistCards.map((card) => (
            <AssistCardComponent key={card.title} {...card} />
          ))}
        </div>
      </section>

      <section className="mt-14 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-slate-900">Knowledge Base</h2>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Find quick answers to common hosting, policy, and payout questions.
          </p>
        </div>

        <div className="mx-auto mt-6 flex w-full max-w-2xl items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <FiSearch className="h-4 w-4 text-slate-400" />
          <input
            value={knowledgeQuery}
            onChange={(event) => setKnowledgeQuery(event.target.value)}
            type="text"
            placeholder="Search articles, guides, and policies..."
            className="w-full bg-transparent text-sm text-slate-700 outline-none"
          />
        </div>

        <div className="mx-auto mt-6 flex max-w-4xl flex-wrap justify-center gap-3">
          {filteredTopics.map(({ label, topic }) => (
            <Link
              key={label}
              href={`/support/policies?topic=${encodeURIComponent(topic)}`}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[#0094CA] hover:text-[#0094CA]"
            >
              <LuBadgeHelp className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>

        {filteredTopics.length === 0 && (
          <p className="mt-5 text-sm text-slate-500">
            No quick topics matched your search. Try another keyword.
          </p>
        )}
      </section>
    </SupportPageShell>
  );
}