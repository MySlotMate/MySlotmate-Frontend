"use client";

/**
 * Premium Hosts (PRD: Premium Host program). Free for now, by approval: it
 * makes Myslotmate the host's marketing partner and unlocks Boost. Shows what
 * Premium includes, how Boost is charged, and the host's status, with the
 * application form when they haven't joined.
 */

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FiCheck, FiClock, FiMail, FiTrendingUp, FiZap } from "react-icons/fi";
import { useIdToken } from "~/hooks/useIdToken";
import {
  useApplyPremium,
  useBoostRules,
  usePremium,
} from "~/hooks/useBoostPlan";
import { BOOST_PLAN_ENABLED, BOOST_PLAN_MOCK, feeBand } from "~/lib/boostPlan";
import { pct } from "~/lib/boost";
import { GRADIENT } from "~/components/host-dashboard/boost/parts";

const card = "rounded-2xl border border-white/10 bg-[#121426]";

const PERKS = [
  [
    "Ads run for you",
    "Our team plans and runs your ads on Instagram, Facebook, Google and WhatsApp.",
  ],
  [
    "A named manager",
    "One person who knows your events, with same-day review of your plans.",
  ],
  [
    "Creatives made for you",
    "Up to 2 posters or reels a month, or use your own.",
  ],
  ["Seen first", "A Premium host badge and a featured slot on the home page."],
  [
    "Clear reports",
    "Spend, reach, clicks and tickets day by day, plus the ad platform reports.",
  ],
];

const BANDS: [string, number][] = [
  ["Under ₹500", 40_000],
  ["₹500–999", 80_000],
  ["₹1,000–1,999", 150_000],
  ["₹2,000–4,999", 300_000],
  ["₹5,000 and over", 600_000],
];

export default function PremiumPage() {
  const idToken = useIdToken();
  const { data: premium, isLoading, isError } = usePremium(idToken);
  const apply = useApplyPremium(idToken);
  const rules = useBoostRules(idToken);
  const [note, setNote] = useState("");

  if (!BOOST_PLAN_ENABLED)
    return (
      <main className="mx-auto w-full max-w-[1000px] px-4 py-10 sm:px-6">
        <div className={`${card} p-8 text-center`}>
          <FiZap className="mx-auto h-6 w-6 text-[#D8B4FE]" />
          <p className="mt-3 text-sm font-semibold text-white">
            Premium Hosts is coming soon
          </p>
        </div>
      </main>
    );

  const status = premium?.status ?? "none";

  const submit = () =>
    apply.mutate(note.trim(), {
      onSuccess: (p) =>
        toast.success(
          p.status === "active"
            ? BOOST_PLAN_MOCK
              ? "Test mode: approved straight away."
              : "You’re Premium."
            : "Application sent. We’ll email you within a day.",
        ),
      onError: (e) =>
        toast.error(e.message || "Couldn’t send the application."),
    });

  return (
    <div className="min-h-screen bg-[#080914]">
      <main className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:px-6 md:py-10">
        <h1 className="font-outfit text-[26px] leading-tight font-semibold tracking-[-0.01em] text-white sm:text-[32px]">
          Premium Hosts
        </h1>
        <p className="mt-1 text-sm text-[#A5A8C3]">
          Myslotmate as your marketing partner. Free to join; Boost is unlocked
          for Premium hosts.
        </p>

        {/* Status */}
        <section className={`${card} mt-5 p-5`} aria-live="polite">
          {isLoading ? (
            <div className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />
          ) : isError ? (
            <p className="text-sm text-white/70">
              We couldn’t load your Premium status. Refresh the page to try
              again.
            </p>
          ) : status === "active" ? (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-base font-semibold text-white">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full ${GRADIENT}`}
                >
                  <FiCheck className="h-4 w-4 text-white" />
                </span>
                You’re a Premium host
              </p>
              {premium?.manager_name && (
                <p className="flex flex-wrap items-center gap-2 text-sm text-white/75">
                  Your campaign manager: {premium.manager_name}
                  {premium.manager_contact && (
                    <a
                      href={`mailto:${premium.manager_contact}`}
                      className="inline-flex items-center gap-1 text-[#D8B4FE] hover:underline"
                    >
                      <FiMail className="h-3.5 w-3.5" />{" "}
                      {premium.manager_contact}
                    </a>
                  )}
                </p>
              )}
              <Link
                href="/host-dashboard/promote"
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white ${GRADIENT}`}
              >
                <FiTrendingUp className="h-4 w-4" /> Boost an event
              </Link>
            </div>
          ) : status === "applied" ? (
            <p className="flex items-center gap-2 text-sm text-white/80">
              <FiClock className="h-4 w-4 text-amber-300" />
              Your application is with our team. We’ll email you within a day.
            </p>
          ) : (
            <div className="space-y-3">
              {status === "declined" && premium?.decline_reason && (
                <p className="rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-white/75">
                  Your last application wasn’t approved:{" "}
                  {premium.decline_reason}
                </p>
              )}
              {status === "removed" && premium?.remove_reason && (
                <p className="rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-white/75">
                  Premium was switched off on your account:{" "}
                  {premium.remove_reason}
                </p>
              )}
              <label className="block space-y-1">
                <span className="text-xs text-white/55">
                  Tell us about your events (optional)
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="We run monthly pottery weekends in Guwahati and want to fill them faster."
                  className="w-full resize-none rounded-xl border border-white/10 bg-[#0D0E1C] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#B57BFF]"
                />
              </label>
              <button
                type="button"
                disabled={apply.isPending}
                onClick={submit}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${GRADIENT}`}
              >
                <FiZap className="h-4 w-4" />
                {apply.isPending ? "Sending…" : "Apply for Premium, free"}
              </button>
            </div>
          )}
        </section>

        {/* What you get */}
        <h2 className="mt-8 text-sm font-semibold text-white">
          What Premium includes
        </h2>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PERKS.map(([t, d]) => (
            <li key={t} className={`${card} p-4`}>
              <p className="flex items-center gap-2 text-sm font-semibold text-white">
                <FiCheck className="h-4 w-4 text-[#D8B4FE]" /> {t}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#A5A8C3]">{d}</p>
            </li>
          ))}
        </ul>

        {/* How Boost is charged */}
        <h2 className="mt-8 text-sm font-semibold text-white">
          How a Boost is charged
        </h2>
        <ol className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            [
              "Plan it",
              `Pick a daily ad budget (from ₹${rules.min_daily_budget_cents / 100}) and the dates. Your manager sends a proposal.`,
            ],
            [
              "Pay the ad budget",
              `Paid upfront with ${rules.budget_gst_bps / 100}% GST. All of it goes into your ads, so it isn’t refundable.`,
            ],
            [
              "A fee on tickets sold",
              "A share of each ticket sold while the Boost is live, taken from your payout. Guests pay the same.",
            ],
          ].map(([t, d], i) => (
            <li key={t} className={`${card} p-4`}>
              <p className="text-xs font-semibold text-[#D8B4FE]">
                Step {i + 1}
              </p>
              <p className="mt-1 text-sm font-semibold text-white">{t}</p>
              <p className="mt-1 text-xs leading-5 text-[#A5A8C3]">{d}</p>
            </li>
          ))}
        </ol>

        <div className={`${card} mt-3 overflow-hidden`}>
          <table className="w-full text-left text-sm">
            <caption className="px-4 pt-3 text-left text-xs text-[#A5A8C3]">
              Our fee per ticket: the higher the price, the lower the fee
            </caption>
            <thead className="text-xs text-white/45">
              <tr>
                <th className="px-4 py-2 font-medium">Ticket price</th>
                <th className="px-4 py-2 text-right font-medium">Fee</th>
              </tr>
            </thead>
            <tbody>
              {BANDS.map(([label, sample]) => (
                <tr
                  key={label}
                  className="border-t border-white/[0.06] text-white/85"
                >
                  <td className="px-4 py-2">{label}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {pct(feeBand(sample).bps)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-[#777B98]">
          Your manager may propose a different fee within a small range, with
          the reason, before you accept. If a guest gets a full refund, the fee
          on that ticket is returned.
        </p>
      </main>
    </div>
  );
}
