"use client";

/** Pieces shared by the Boost cards (BoostCard and BoostPlanCard). */

import { FiInfo, FiTrendingUp } from "react-icons/fi";
import type { BoostChannel } from "~/lib/api";
import { commissionCents, pct, rupees } from "~/lib/boost";

export const GRADIENT = "bg-gradient-to-r from-[#7038F5] to-[#B724EA]";

export const CHANNELS: { value: BoostChannel; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google" },
  { value: "whatsapp", label: "WhatsApp groups" },
  { value: "influencers", label: "Creators" },
];

export function Shell({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "live";
}) {
  return (
    <section
      id="boost"
      aria-label="Marketing Boost"
      className={`scroll-mt-24 rounded-3xl border p-5 ${
        tone === "live"
          ? "border-[#B724EA]/40 bg-[#1A1030]"
          : "border-white/10 bg-[#121426]/90"
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full ${GRADIENT}`}
        >
          <FiTrendingUp className="h-4 w-4 text-white" />
        </span>
        <h2 className="font-outfit text-base font-semibold text-white">
          Marketing Boost
        </h2>
      </div>
      {children}
    </section>
  );
}

export function RateRows({
  rows,
}: {
  rows: {
    name: string;
    priceCents: number;
    bps: number;
    guideBps?: number;
    reason?: string | null;
  }[];
}) {
  return (
    <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-black/20 text-sm">
      {rows.map((r) => (
        <div
          key={`${r.name}-${r.priceCents}`}
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-3.5 py-2.5"
        >
          <span className="min-w-0 truncate text-white/80">
            {r.name} · {rupees(r.priceCents)}
          </span>
          <span className="shrink-0 text-right text-white">
            {pct(r.bps)},{" "}
            <span className="text-[#D8B4FE]">
              {rupees(commissionCents(r.priceCents, r.bps))}
            </span>{" "}
            <span className="text-white/45">per ticket</span>
          </span>
          {r.guideBps !== undefined && r.guideBps !== r.bps && (
            <span className="basis-full text-xs text-white/50">
              Guide rate {pct(r.guideBps)}
              {r.reason ? ` · ${r.reason}` : ""}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export const Note = ({ children }: { children: React.ReactNode }) => (
  <p className="flex gap-2 text-xs leading-5 text-white/50">
    <FiInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
    <span>{children}</span>
  </p>
);

export const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl bg-black/25 px-3 py-2.5">
    <p className="text-[11px] tracking-wide text-white/45 uppercase">{label}</p>
    <p className="mt-0.5 text-base font-semibold text-white">{value}</p>
  </div>
);
