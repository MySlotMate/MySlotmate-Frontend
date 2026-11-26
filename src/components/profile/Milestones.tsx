"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Lock, X } from "lucide-react";
import type { BadgeState } from "~/lib/badges";
import { formatIST } from "~/lib/datetime";
import { GRADIENT_BTN } from "./ProfileKit";

/**
 * Milestone badges, the same everywhere they appear (My journey and the
 * profile): earned badges up front, the rest behind one "Yet to unlock" tile
 * that opens the list. Every badge opens the same detail card.
 */

export function BadgeArt({
  state,
  className = "",
}: {
  state: BadgeState;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={state.def.art}
      alt=""
      loading="lazy"
      className={`${className} ${
        state.earned ? "" : "opacity-40 grayscale"
      } transition duration-300`}
    />
  );
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

function Sheet({
  label,
  onClose,
  children,
  className = "",
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  useEscape(onClose);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="animate-in fade-in msm-modal fixed inset-0 z-[320] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full overflow-hidden rounded-3xl border border-white/10 bg-[#121426] text-white ${className}`}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** One badge, big: what it is, when it was earned or how to earn it. */
export function BadgeSheet({
  state,
  onClose,
  onBack,
}: {
  state: BadgeState;
  onClose: () => void;
  /** When opened from the locked list: go back to it. */
  onBack?: () => void;
}) {
  const { def, earned, earnedAt, current } = state;
  return (
    <Sheet
      label={def.name}
      onClose={onClose}
      className="max-w-sm px-6 pt-8 pb-7 text-center"
    >
      <div className="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-[#F59E0B]/15 blur-3xl" />
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="absolute top-4 left-4 z-10 rounded-full px-2 py-1 text-xs font-semibold text-white/55 hover:bg-white/10 hover:text-white"
        >
          ← All locked
        </button>
      )}
      <BadgeArt state={state} className="relative mx-auto h-44 w-44" />
      <p className="mt-3 text-[11px] font-bold tracking-wider uppercase">
        {earned ? (
          <span className="text-[#FCD34D]">Milestone unlocked</span>
        ) : (
          <span className="text-white/40">Not yet</span>
        )}
      </p>
      <h3 className="font-outfit mt-1 text-2xl font-bold">{def.name}</h3>
      <p className="mx-auto mt-2 max-w-[280px] text-sm leading-6 text-white/65">
        {earned && earnedAt ? def.earnedLine(earnedAt) : def.how}
      </p>
      {earned && earnedAt ? (
        <p className="mt-3 text-xs text-white/45">
          Earned {formatIST(earnedAt.at, "MMMM d, yyyy")}
        </p>
      ) : (
        <>
          {def.target > 1 && (
            <div className="mx-auto mt-4 max-w-[220px]">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] to-[#B724EA]"
                  style={{ width: `${(current / def.target) * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-white/45">
                {current} of {def.target} so far
              </p>
            </div>
          )}
          <Link
            href="/explore"
            className={`mt-5 inline-flex rounded-full px-6 py-2.5 text-sm font-semibold ${GRADIENT_BTN}`}
          >
            Find an experience
          </Link>
        </>
      )}
    </Sheet>
  );
}

/** Everything still locked, closest to done first. */
function LockedSheet({
  locked,
  onPick,
  onClose,
}: {
  locked: BadgeState[];
  onPick: (s: BadgeState) => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      label="Yet to unlock"
      onClose={onClose}
      className="flex max-h-[88dvh] max-w-lg flex-col"
    >
      <div className="border-b border-white/[0.06] px-6 pt-6 pb-4">
        <h3 className="font-outfit text-xl font-bold">Yet to unlock</h3>
        <p className="mt-0.5 text-sm text-white/55">
          {locked.length} milestone{locked.length === 1 ? "" : "s"} waiting. Tap
          one to see how to earn it.
        </p>
      </div>
      <ul className="flex-1 overflow-y-auto p-3">
        {locked.map((s) => (
          <li key={s.def.key}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-white/[0.05]"
            >
              <BadgeArt state={s} className="h-14 w-14 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  {s.def.name}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-white/55">
                  {s.def.how}
                </span>
                {s.def.target > 1 && (
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className="h-1 w-24 overflow-hidden rounded-full bg-white/[0.08]">
                      <span
                        className="block h-full rounded-full bg-white/45"
                        style={{
                          width: `${(s.current / s.def.target) * 100}%`,
                        }}
                      />
                    </span>
                    <span className="text-[11px] text-white/45">
                      {s.current} of {s.def.target}
                    </span>
                  </span>
                )}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

/**
 * The milestone shelf: progress, earned badges, and a "Yet to unlock" tile.
 * `heading` false drops the title row (the profile tab has its own label).
 */
export default function Milestones({
  states,
  heading = true,
}: {
  states: BadgeState[];
  heading?: boolean;
}) {
  const [open, setOpen] = useState<BadgeState | null>(null);
  const [fromLocked, setFromLocked] = useState(false);
  const [lockedOpen, setLockedOpen] = useState(false);

  const earned = states
    .filter((s) => s.earned)
    .sort(
      (a, b) =>
        (b.earnedAt?.at.getTime() ?? 0) - (a.earnedAt?.at.getTime() ?? 0),
    );
  const locked = states
    .filter((s) => !s.earned)
    .sort((a, b) => b.current / b.def.target - a.current / a.def.target);

  return (
    <section>
      {heading && (
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-outfit text-xl font-bold md:text-[22px]">
              Milestones
            </h2>
            <p className="mt-0.5 text-sm text-white/55">
              Little badges for the moments that make your story.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#A020F0]/15 px-3 py-1 text-xs font-semibold text-[#D8B4FE]">
            {earned.length} / {states.length} collected
          </span>
        </div>
      )}
      <div
        className={`h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06] ${heading ? "mt-2" : ""}`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] via-[#F97362] to-[#B724EA] transition-all"
          style={{ width: `${(earned.length / states.length) * 100}%` }}
        />
      </div>
      {!heading && (
        <p className="mt-2 text-xs text-white/50">
          {earned.length} of {states.length} collected
        </p>
      )}

      <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(120px,1fr))]">
        {earned.map((s) => (
          <button
            key={s.def.key}
            type="button"
            onClick={() => {
              setFromLocked(false);
              setOpen(s);
            }}
            className="group flex flex-col items-center rounded-2xl bg-[#131328] p-3 text-center transition hover:bg-[#1A1A35]"
          >
            <BadgeArt
              state={s}
              className="h-[72px] w-[72px] group-hover:scale-105 sm:h-[84px] sm:w-[84px]"
            />
            {/* Two-line name slot so every date lines up across the row. */}
            <p className="mt-2 line-clamp-2 flex min-h-8 items-center text-[12px] leading-4 font-semibold">
              {s.def.name}
            </p>
            <p className="mt-0.5 text-[10px] whitespace-nowrap text-[#D8B4FE]">
              {s.earnedAt ? formatIST(s.earnedAt.at, "MMM d, yyyy") : ""}
            </p>
          </button>
        ))}

        {locked.length > 0 && (
          <button
            type="button"
            onClick={() => setLockedOpen(true)}
            className="group flex flex-col items-center rounded-2xl bg-[#131328] p-3 text-center transition hover:bg-[#1A1A35]"
          >
            {/* A plain locked medallion with the count, same size as a badge. */}
            {/* Same box as a badge; the circle matches the medal's visible size. */}
            <span className="flex h-[72px] w-[72px] items-center justify-center sm:h-[84px] sm:w-[84px]">
              <span className="flex h-[58px] w-[58px] flex-col items-center justify-center rounded-full border-2 border-dashed border-white/20 bg-white/[0.03] transition group-hover:border-[#A020F0]/60 sm:h-[66px] sm:w-[66px]">
                <Lock className="h-3.5 w-3.5 text-white/45" />
                <span className="font-outfit mt-0.5 text-base leading-none font-bold text-white/80">
                  +{locked.length}
                </span>
              </span>
            </span>
            <p className="mt-2 line-clamp-2 flex min-h-8 items-center text-[12px] leading-4 font-semibold text-white/80">
              Yet to unlock
            </p>
            <p className="mt-0.5 text-[10px] whitespace-nowrap text-white/45">
              Tap to see all
            </p>
          </button>
        )}
      </div>

      {earned.length === 0 && (
        <p className="mt-3 text-sm text-white/50">
          Your first badge comes with your first experience.
        </p>
      )}

      {lockedOpen && (
        <LockedSheet
          locked={locked}
          onClose={() => setLockedOpen(false)}
          onPick={(s) => {
            setLockedOpen(false);
            setFromLocked(true);
            setOpen(s);
          }}
        />
      )}
      {open && (
        <BadgeSheet
          state={open}
          onClose={() => setOpen(null)}
          onBack={
            fromLocked
              ? () => {
                  setOpen(null);
                  setLockedOpen(true);
                }
              : undefined
          }
        />
      )}
    </section>
  );
}
