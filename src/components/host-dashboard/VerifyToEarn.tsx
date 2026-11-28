"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Clock,
  IndianRupee,
  Lock,
  ShieldCheck,
  Sparkles,
  Ticket,
  Wallet,
  X,
} from "lucide-react";
import { FREE_HOST_LIMITS, VERIFY_HREF } from "~/lib/hostTier";

const PERKS = [
  { icon: Ticket, text: "Sell tickets, tiers and monthly passes" },
  { icon: Wallet, text: "Get paid straight to your bank" },
  { icon: BadgeCheck, text: "A Verified host badge guests trust" },
  {
    icon: Sparkles,
    text: `No limits: more than ${FREE_HOST_LIMITS.maxGuests} guests and ${FREE_HOST_LIMITS.maxActiveEvents} events`,
  },
];

function statusCopy(status: string | null) {
  if (status === "pending" || status === "under_review")
    return {
      title: "Your application is being reviewed",
      body: "We'll let you know as soon as you're approved. Until then you can keep hosting free events.",
      cta: "View application",
      icon: Clock,
    };
  if (status === "rejected")
    return {
      title: "Apply again to start earning",
      body: "Your last application wasn't approved. Update your details and send it again.",
      cta: "Reapply",
      icon: ShieldCheck,
    };
  return {
    title: "Get verified to start earning",
    body: "Apply as a community or professional host. Once approved you can sell tickets for your events.",
    cta: "Apply to host",
    icon: IndianRupee,
  };
}

/** Pop-up shown when a free host taps something that needs verification. */
export function VerifyToEarnSheet({
  open,
  onClose,
  applicationStatus = null,
  reason = "Selling tickets is for verified hosts.",
}: {
  open: boolean;
  onClose: () => void;
  applicationStatus?: string | null;
  reason?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const copy = statusCopy(applicationStatus);

  return (
    <div className="msm-modal fixed inset-0 z-[1000] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="verify-title"
        className="relative w-full max-w-[440px] overflow-hidden rounded-t-[28px] border border-white/10 bg-[#121426] p-6 pb-[max(24px,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[28px]"
      >
        <div className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full bg-[#A020F0]/30 blur-3xl" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#A020F0]/20 text-[#D8B4FE]">
          <Lock className="h-6 w-6" />
        </span>
        <p className="relative mt-4 text-sm text-[#D8B4FE]">{reason}</p>
        <h2
          id="verify-title"
          className="font-outfit relative mt-1 text-2xl font-semibold text-white"
        >
          {copy.title}
        </h2>
        <p className="relative mt-2 text-[15px] text-white/60">{copy.body}</p>
        <ul className="relative mt-5 space-y-3">
          {PERKS.map((p) => (
            <li
              key={p.text}
              className="flex items-center gap-3 text-sm text-white/80"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-[#D8B4FE]">
                <p.icon className="h-4 w-4" />
              </span>
              {p.text}
            </li>
          ))}
        </ul>
        <div className="relative mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <Link
            href={VERIFY_HREF}
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-[#080914] transition hover:bg-white/90"
          >
            {copy.cta}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-full border border-white/15 text-[15px] font-semibold text-white transition hover:bg-white/[0.06]"
          >
            Keep it free
          </button>
        </div>
      </div>
    </div>
  );
}

/** Progress card on the dashboard for hosts who aren't verified yet. */
export function VerifyToEarnCard({
  applicationStatus,
  isPhoneVerified,
  isIdentityVerified,
}: {
  applicationStatus: string | null;
  isPhoneVerified?: boolean;
  isIdentityVerified?: boolean;
}) {
  const copy = statusCopy(applicationStatus);
  const submitted =
    applicationStatus === "pending" || applicationStatus === "under_review";
  const steps = [
    { label: "Phone number verified", done: Boolean(isPhoneVerified) },
    { label: "Aadhaar verified", done: Boolean(isIdentityVerified) },
    { label: "Host application sent", done: submitted },
    { label: "Approved by Myslotmate", done: false },
  ];
  const done = steps.filter((s) => s.done).length;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[#652A91]/50 bg-gradient-to-br from-[#241333] via-[#121426] to-[#121426] p-5 sm:p-6">
      <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-[#A020F0]/25 blur-3xl" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-[#D8B4FE] uppercase">
            <copy.icon className="h-4 w-4" /> Free host
          </p>
          <h2 className="font-outfit mt-2 text-xl font-semibold text-white sm:text-2xl">
            {copy.title}
          </h2>
          <p className="mt-1.5 text-sm text-white/60">
            You can host free events with up to {FREE_HOST_LIMITS.maxGuests}{" "}
            guests and {FREE_HOST_LIMITS.maxActiveEvents} active events.{" "}
            {copy.body}
          </p>
          <div className="mt-4 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7B2FFF] to-[#A020F0]"
              style={{ width: `${(done / steps.length) * 100}%` }}
            />
          </div>
          <ul className="mt-3 grid gap-1.5 text-[13px] sm:grid-cols-2">
            {steps.map((s) => (
              <li
                key={s.label}
                className={`flex items-center gap-2 ${s.done ? "text-white/80" : "text-white/45"}`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                    s.done
                      ? "bg-emerald-400 text-[#080914]"
                      : "border border-white/25"
                  }`}
                >
                  {s.done && "✓"}
                </span>
                {s.label}
              </li>
            ))}
          </ul>
        </div>
        <Link
          href={VERIFY_HREF}
          className="flex h-11 shrink-0 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-[#080914] transition hover:bg-white/90"
        >
          {copy.cta}
        </Link>
      </div>
    </section>
  );
}

/** Replaces the Earnings page for hosts who can't earn yet. */
export function StartEarning({
  applicationStatus,
}: {
  applicationStatus: string | null;
}) {
  const copy = statusCopy(applicationStatus);
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-2 py-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#A020F0]/20 text-[#D8B4FE]">
        <Wallet className="h-8 w-8" />
      </span>
      <h1 className="font-outfit mt-5 text-[28px] leading-tight font-semibold text-white">
        {copy.title}
      </h1>
      <p className="mt-2 text-[15px] text-white/60">{copy.body}</p>
      <ul className="mt-6 w-full space-y-3 text-left">
        {PERKS.map((p) => (
          <li
            key={p.text}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#121426] px-4 py-3 text-sm text-white/80"
          >
            <p.icon className="h-5 w-5 shrink-0 text-[#D8B4FE]" />
            {p.text}
          </li>
        ))}
      </ul>
      <Link
        href={VERIFY_HREF}
        className="mt-7 flex h-12 items-center rounded-full bg-white px-7 text-[15px] font-semibold text-[#080914] transition hover:bg-white/90"
      >
        {copy.cta}
      </Link>
    </div>
  );
}
