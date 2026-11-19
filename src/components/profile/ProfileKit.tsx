"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Check, Share2, UserPlus } from "lucide-react";
import { LuBadgeCheck } from "react-icons/lu";
import { useConnections } from "~/lib/connections";

/**
 * Building blocks for the one profile layout every MySlotMate member gets —
 * explorers and hosts alike. A host's profile is an explorer's profile with
 * hosting sections switched on, so people look the same wherever you meet them.
 */

export const CARD = "rounded-2xl border border-white/[0.06] bg-[#121426]";
export const GRADIENT_BTN =
  "bg-gradient-to-r from-[#7038F5] to-[#B724EA] text-white transition hover:brightness-110";

export type RoleTone = "explorer" | "community" | "host" | "pro";

const ROLE_STYLE: Record<RoleTone, string> = {
  explorer: "border-sky-300/30 bg-sky-400/10 text-sky-200",
  community: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200",
  host: "border-[#9B30FF]/40 bg-[#9B30FF]/15 text-[#E3CCFF]",
  pro: "border-amber-300/40 bg-amber-400/10 text-amber-200",
};

export interface Stat {
  value: ReactNode;
  label: string;
}

/**
 * Who someone is, in as little height as possible.
 *
 * No cover image: most people would never upload one, so it would be a
 * decorative band pushing the useful part (their experiences, the Connect
 * button) below the fold on phones. Experience posters are the visual side
 * of a MySlotMate profile, shown as content instead.
 *
 * Phones: avatar with the stats beside it, then name, one-line tagline, a
 * two-line bio and the actions; the tabs start right after.
 * Desktop: the same block becomes a sticky card on the left, with `extra`
 * (interests, links, trust) underneath, and content fills the right.
 */
export function ProfileIdentity({
  avatar,
  name,
  verified,
  role,
  tagline,
  meta,
  bio,
  stats,
  actions,
  note,
  extra,
}: {
  avatar?: string | null;
  name: string | null;
  verified?: boolean;
  /** null while still loading, so the chip doesn't flash the wrong role. */
  role: { label: string; tone: RoleTone } | null;
  tagline?: string | null;
  /** Short facts on one line: city, joined date. */
  meta: string[];
  bio?: string | null;
  stats: Stat[];
  actions: ReactNode;
  note?: ReactNode;
  /** Desktop only: shown under the card (phones get it in the About tab). */
  extra?: ReactNode;
}) {
  const [more, setMore] = useState(false);
  const longBio = (bio?.length ?? 0) > 160;

  const statBlock = (cls: string) => (
    <dl className={cls}>
      {stats.map((s) => (
        <div key={s.label} className="flex min-w-0 flex-col items-center">
          <dd className="font-outfit flex h-7 items-center justify-center gap-1 text-lg leading-none font-bold lg:text-xl">
            {s.value}
          </dd>
          <dt className="mt-0.5 max-w-full truncate text-center text-[11px] leading-4 text-white/50">
            {s.label}
          </dt>
        </div>
      ))}
    </dl>
  );

  return (
    <aside className="lg:sticky lg:top-[92px] lg:self-start">
      <div className="lg:rounded-3xl lg:border lg:border-white/[0.06] lg:bg-[#121426] lg:p-6">
        <div className="flex items-center gap-5 lg:block">
          <div className="h-[76px] w-[76px] shrink-0 overflow-hidden rounded-full bg-[#1B1C33] ring-2 ring-[#A020F0]/50 ring-offset-2 ring-offset-[#080914] lg:h-24 lg:w-24 lg:ring-offset-[#121426]">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt=""
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-outfit flex h-full w-full items-center justify-center text-3xl font-bold text-[#D8B4FE]">
                {name?.[0]?.toUpperCase() ?? ""}
              </span>
            )}
          </div>
          {statBlock("grid flex-1 grid-cols-3 gap-2 text-center lg:hidden")}
        </div>

        <div className="mt-3.5 lg:mt-4">
          <h1 className="font-outfit flex items-center gap-1.5 text-xl leading-7 font-bold lg:text-2xl">
            <span className="truncate">
              {name ?? (
                <span className="inline-block h-6 w-40 animate-pulse rounded bg-white/10 align-middle" />
              )}
            </span>
            {verified && (
              <LuBadgeCheck
                className="h-5 w-5 shrink-0 text-[#B57BFF]"
                aria-label="Verified"
              />
            )}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-white/55">
            {role ? (
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${ROLE_STYLE[role.tone]}`}
              >
                {role.label}
              </span>
            ) : (
              <span className="h-5 w-24 animate-pulse rounded-full bg-white/10" />
            )}
            {/* One run of text so a wrap never starts a line with a dot. */}
            {meta.length > 0 && (
              <span>
                <span className="mr-2 text-white/25">·</span>
                {meta.join(" · ")}
              </span>
            )}
          </div>
        </div>

        {tagline && (
          <p className="mt-2.5 line-clamp-2 text-sm leading-5 font-medium text-white/85">
            {tagline}
          </p>
        )}
        {/* Phones: the bio stays under the tagline, two lines with "more". */}
        {bio && (
          <div className="mt-1.5 lg:hidden">
            <p
              className={`text-[13px] leading-5 whitespace-pre-line text-white/60 ${
                bio.length > 140 && !more ? "line-clamp-2" : ""
              }`}
            >
              {bio}
            </p>
            {bio.length > 140 && (
              <button
                type="button"
                onClick={() => setMore((v) => !v)}
                className="mt-0.5 text-[13px] font-semibold text-[#D8B4FE] hover:text-white"
              >
                {more ? "less" : "more"}
              </button>
            )}
          </div>
        )}

        {statBlock(
          "mt-5 hidden grid-cols-3 gap-3 divide-x divide-white/[0.06] border-y border-white/[0.06] py-4 lg:grid",
        )}

        <div className="mt-4 flex gap-2 lg:mt-5">{actions}</div>
        {note && <p className="mt-2.5 text-xs text-white/45">{note}</p>}

        {/* Desktop: the short intro sits up top (tagline); the full About
            comes after the actions, like LinkedIn, so the card stays light. */}
        {bio && (
          <section className="mt-5 hidden border-t border-white/[0.06] pt-4 lg:block">
            <h2 className="text-[11px] font-semibold tracking-wider text-white/40 uppercase">
              About
            </h2>
            <p
              className={`mt-2 text-[13px] leading-5 whitespace-pre-line text-white/65 ${
                longBio && !more ? "line-clamp-3" : ""
              }`}
            >
              {bio}
            </p>
            {longBio && (
              <button
                type="button"
                onClick={() => setMore((v) => !v)}
                className="mt-1 text-[13px] font-semibold text-[#D8B4FE] hover:text-white"
              >
                {more ? "Show less" : "Read more"}
              </button>
            )}
          </section>
        )}

        {extra && (
          <div className="mt-5 hidden flex-col gap-5 border-t border-white/[0.06] pt-5 lg:flex">
            {extra}
          </div>
        )}
      </div>
    </aside>
  );
}

/** A labelled block inside the identity card or the About tab. */
export function InfoBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[11px] font-semibold tracking-wider text-white/40 uppercase">
        {title}
      </h2>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

/**
 * Tags with the overflow folded into a "+N more" chip; tapping it shows the
 * rest (and "Show less" folds them back).
 */
export function TagList({
  tags,
  limit = 6,
}: {
  tags: string[];
  limit?: number;
}) {
  const [open, setOpen] = useState(false);
  const extra = tags.length - limit;
  const shown = open || extra <= 0 ? tags : tags.slice(0, limit);
  const chip =
    "rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/70";
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((t) => (
        <span key={t} className={chip}>
          {t}
        </span>
      ))}
      {extra > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="rounded-full border border-[#A020F0]/40 bg-[#A020F0]/10 px-2.5 py-1 text-xs font-semibold text-[#D8B4FE] transition hover:bg-[#A020F0]/20"
        >
          {open ? "Show less" : `+${extra} more`}
        </button>
      )}
    </div>
  );
}

/** Connect / Connected toggle for a host. */
export function ConnectButton({
  hostId,
  firstName,
  signedIn,
  onNeedLogin,
  className = "",
}: {
  hostId: string;
  firstName: string;
  signedIn: boolean;
  onNeedLogin: () => void;
  className?: string;
}) {
  const { ready, isConnected, toggle } = useConnections();
  const on = isConnected(hostId);

  return (
    <button
      type="button"
      disabled={!ready}
      aria-pressed={on}
      onClick={() => {
        if (!signedIn) return onNeedLogin();
        const now = toggle(hostId);
        toast.success(
          now
            ? `Connected with ${firstName}. Their new experiences will show up first on your home.`
            : `You're no longer connected with ${firstName}.`,
        );
      }}
      className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold disabled:opacity-60 ${
        on
          ? "border border-white/15 bg-white/[0.06] text-white hover:bg-white/10"
          : GRADIENT_BTN
      } ${className}`}
    >
      {on ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      {on ? "Connected" : "Connect"}
    </button>
  );
}

export function ShareButton({ title }: { title: string }) {
  return (
    <button
      type="button"
      aria-label="Share profile"
      onClick={() => {
        const url = window.location.href;
        if (navigator.share) {
          void navigator.share({ title, url }).catch(() => undefined);
          return;
        }
        void navigator.clipboard
          .writeText(url)
          .then(() => toast.success("Profile link copied"))
          .catch(() => toast.error("Couldn't copy the link"));
      }}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white/80 transition hover:bg-white/10 hover:text-white"
    >
      <Share2 className="h-4 w-4" />
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  href,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const cls =
    "flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 text-sm whitespace-nowrap font-semibold text-white transition hover:bg-white/10";
  return href ? (
    <a href={href} className={cls}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function ProfileTabs<K extends string>({
  tabs,
  active,
  onChange,
}: {
  /** mobileOnly: the About tab, whose content desktop shows in the card. */
  tabs: { key: K; label: string; count?: number; mobileOnly?: boolean }[];
  active: K;
  onChange: (k: K) => void;
}) {
  return (
    <div
      role="tablist"
      className="sticky top-0 z-20 -mx-4 flex gap-1 overflow-x-auto border-b border-white/[0.08] bg-[#080914]/90 px-4 backdrop-blur [scrollbar-width:none] sm:-mx-6 sm:px-6 md:top-[68px] md:mx-0 md:px-0"
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-3.5 text-sm font-semibold transition sm:gap-2 sm:px-3 md:px-4 ${t.mobileOnly ? "lg:hidden" : ""} ${
            active === t.key
              ? "border-[#B724EA] text-white"
              : "border-transparent text-white/55 hover:text-white"
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                active === t.key
                  ? "bg-[#A020F0]/25 text-[#E9D5FF]"
                  : "bg-white/[0.06] text-white/50"
              }`}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function EmptyCard({
  icon,
  title,
  text,
  children,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col items-center px-6 py-12 text-center ${CARD}`}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#9B30FF]/15 text-[#D8B4FE]">
        {icon}
      </span>
      <p className="font-outfit mt-4 text-base font-semibold">{title}</p>
      <p className="mt-1.5 max-w-sm text-[13px] text-white/55">{text}</p>
      {children}
    </div>
  );
}

export function SideCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={`p-5 ${CARD}`}>
      <h2 className="font-outfit text-base font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/** The hint under a host's Connect button; changes once you're connected. */
export function ConnectNote({
  hostId,
  firstName,
}: {
  hostId: string;
  firstName: string;
}) {
  const { isConnected } = useConnections();
  return isConnected(hostId)
    ? `You're connected. ${firstName}'s new experiences show up first on your home.`
    : `Connect to see ${firstName}'s new experiences first on your home.`;
}

/** Placeholder cards while a tab's data is still loading. */
export function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`aspect-[4/5] animate-pulse rounded-2xl bg-white/[0.04] ${i === 2 ? "hidden xl:block" : ""}`}
        />
      ))}
    </div>
  );
}
