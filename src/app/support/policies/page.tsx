"use client";

import { useEffect, useMemo, useState } from "react";
import type { IconType } from "react-icons";
import {
  FiArrowRight,
  FiCheckCircle,
  FiMaximize2,
  FiSearch,
} from "react-icons/fi";
import {
  MdAttachMoney,
  MdAutoAwesome,
  MdBusinessCenter,
  MdElectricBolt,
  MdEventBusy,
  MdGroups,
  MdMovieCreation,
  MdOutlineCopyright,
  MdOutlineWifi,
  MdPets,
  MdPhotoCameraFront,
  MdSecurityUpdateGood,
} from "react-icons/md";
import { SupportBreadcrumb, SupportPageShell } from "~/components/support";

interface PolicyCardData {
  title: string;
  description: string;
  icon: IconType;
  keywords: string[];
  updated?: boolean;
  featured?: boolean;
}

interface QuickLinkData {
  title: string;
  icon: IconType;
  keywords: string[];
}

const policyCards: PolicyCardData[] = [
  {
    title: "Hosting Guidelines",
    description:
      "Standards for creating a welcoming space, smooth check-ins, and maintaining quality hosting.",
    icon: MdBusinessCenter,
    keywords: ["hosting", "guidelines", "standards", "quality"],
  },
  {
    title: "Cancellation Policy",
    description:
      "How refunds, rescheduling, and host cancellations are handled to keep experiences fair.",
    icon: MdEventBusy,
    keywords: ["cancellation", "refund", "reschedule", "fees"],
    updated: true,
    featured: true,
  },
  {
    title: "Payment & Fees",
    description:
      "Understand payout schedules, service fees, taxes, and currency conversion details.",
    icon: MdAttachMoney,
    keywords: ["payment", "fees", "payout", "taxes"],
  },
  {
    title: "Community Standards",
    description:
      "Our expectations around respectful conduct, inclusion, and non-discrimination.",
    icon: MdGroups,
    keywords: ["community", "standards", "behavior", "respect"],
  },
  {
    title: "Safety & Conduct",
    description:
      "Emergency procedures, prohibited items, and practical steps to protect guests and hosts.",
    icon: MdSecurityUpdateGood,
    keywords: ["safety", "conduct", "emergency", "trust"],
  },
  {
    title: "Content & IP",
    description:
      "Rights and responsibilities around photos, descriptions, and user-generated content.",
    icon: MdOutlineCopyright,
    keywords: ["content", "ip", "copyright", "photos"],
  },
];

const quickLinks: QuickLinkData[] = [
  {
    title: "Pet Policy Guidelines",
    icon: MdPets,
    keywords: ["pets", "policy"],
  },
  {
    title: "Photography Rules",
    icon: MdPhotoCameraFront,
    keywords: ["photography", "media"],
  },
  {
    title: "Internet Usage Policy",
    icon: MdOutlineWifi,
    keywords: ["internet", "wifi", "usage"],
  },
  {
    title: "Security Camera Disclosure",
    icon: MdMovieCreation,
    keywords: ["camera", "security", "disclosure"],
  },
  {
    title: "Cleaning Standards",
    icon: MdAutoAwesome,
    keywords: ["cleaning", "standards"],
  },
  {
    title: "Instant Book Rules",
    icon: MdElectricBolt,
    keywords: ["instant book", "rules"],
  },
];

function matchesQuery(query: string, values: string[]) {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.toLowerCase();
  return values.some((value) => value.toLowerCase().includes(normalizedQuery));
}

function PolicyCard({ card, active }: { card: PolicyCardData; active?: boolean }) {
  const Icon = card.icon;

  return (
    <div
      className={`flex h-full flex-col rounded-3xl border bg-white p-6 shadow-sm transition ${
        active
          ? "border-[#0094CA] ring-1 ring-[#d6f2ff]"
          : "border-gray-200 hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e6f8ff] text-[#0094CA]">
          <Icon className="h-6 w-6" />
        </div>
        {card.updated && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Updated
          </span>
        )}
      </div>

      <h3 className="text-xl font-semibold text-slate-900">{card.title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-500">{card.description}</p>

      {card.featured && (
        <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Plain English Summary
          </p>
          <ul className="mt-3 space-y-3">
            <li className="flex items-start gap-2 text-sm text-slate-600">
              <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#0094CA]" />
              Guests get a full refund if they cancel at least 48 hours in advance.
            </li>
            <li className="flex items-start gap-2 text-sm text-slate-600">
              <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#0094CA]" />
              Last-minute host cancellations can lead to a fee or reduced ranking.
            </li>
          </ul>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 transition hover:text-slate-600"
            >
              <FiMaximize2 className="h-3.5 w-3.5" />
              Expand legal details
            </button>
            <button
              type="button"
              className="text-sm font-semibold text-[#0094CA] transition hover:text-[#007dab]"
            >
              View full policy
            </button>
          </div>
        </div>
      )}

      {!card.featured && (
        <button
          type="button"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0094CA] transition hover:text-[#007dab]"
        >
          Read summary
          <FiArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function QuickLinkChip({
  item,
  onClick,
}: {
  item: QuickLinkData;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-[#0094CA] hover:bg-white hover:text-[#0094CA]"
    >
      <Icon className="h-5 w-5 text-slate-400" />
      {item.title}
    </button>
  );
}

export default function PoliciesPage() {
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topic = params.get("topic");

    if (topic) {
      setSearchQuery(topic.replace(/[-_]/g, " "));
    }
  }, []);

  const filteredCards = useMemo(() => {
    return policyCards.filter((card) =>
      matchesQuery(searchQuery, [card.title, card.description, ...card.keywords]),
    );
  }, [searchQuery]);

  const filteredQuickLinks = useMemo(() => {
    return quickLinks.filter((item) =>
      matchesQuery(searchQuery, [item.title, ...item.keywords]),
    );
  }, [searchQuery]);

  return (
    <SupportPageShell contentClassName="max-w-6xl">
      <SupportBreadcrumb
        items={[
          { label: "Support & Safety", href: "/support" },
          { label: "Policy help" },
        ]}
      />

      <div className="flex flex-col items-center text-center">
        <div className="inline-flex items-center rounded-full bg-[#e6f8ff] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#0094CA]">
          Community Trust Center
        </div>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Platform Policies &amp; <span className="text-[#0094CA]">Guidelines</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
          Everything you need to know about hosting responsibly, protecting the
          community, and understanding how we work together.
        </p>
      </div>

      <div className="mx-auto mt-8 flex w-full max-w-2xl items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <FiSearch className="h-4 w-4 text-slate-400" />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          type="text"
          placeholder="Search for policies, payouts, safety..."
          className="w-full bg-transparent text-sm text-slate-700 outline-none"
        />
      </div>

      <section className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredCards.map((card) => (
          <PolicyCard
            key={card.title}
            card={card}
            active={card.featured && matchesQuery(searchQuery, [card.title, ...card.keywords])}
          />
        ))}
      </section>

      {filteredCards.length === 0 && (
        <div className="mt-8 rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
          No policy sections matched your search. Try a different keyword.
        </div>
      )}

      <section className="mt-12 rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-slate-900">Frequently Requested</h2>
          <p className="text-sm text-slate-500">
            Quick shortcuts for common policy questions.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredQuickLinks.map((item) => (
            <QuickLinkChip
              key={item.title}
              item={item}
              onClick={() => setSearchQuery(item.title)}
            />
          ))}
        </div>
      </section>
    </SupportPageShell>
  );
}
