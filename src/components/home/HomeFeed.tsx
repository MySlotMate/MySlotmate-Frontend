"use client";

import LocationButton from "~/components/LocationButton";
import { nearFirst, placeName, useSavedLocation } from "~/lib/nearby";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  ScanLine,
  Share2,
  Star,
  Ticket,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { BecomeHostButton, BecomeHostModal } from "~/components/become-host";
import SlotCard from "~/components/website/SlotCard";
import { useConnections } from "~/lib/connections";
import { useListTimeAction } from "~/hooks/useListTimeAction";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { useNotifications } from "~/hooks/useNotifications";
import {
  categoriesFor,
  categoryOf,
  kindOf,
  type Category,
  type EventKind,
} from "~/lib/categories";
import { moodTheme } from "~/lib/categoryTheme";
import { eventPriceLabel } from "~/lib/price";
import {
  useBookingsByUser,
  useIsExperienceSaved,
  useListHosts,
  useListPublicEvents,
  usePlatformSetting,
  useSaveExperience,
  useUnsaveExperience,
} from "~/hooks/useApi";
import { formatIST } from "~/lib/datetime";
import type { EventDTO, PublicHostProfileDTO } from "~/lib/api";
import type { HomepageMarketingConfig } from "./ShowcaseSections";
import EventCover from "~/components/EventCover";

// Shared with the Explore page.
export const CARD = "border border-white/[0.06] bg-[#131328]";
export const GRADIENT_BTN =
  "bg-gradient-to-r from-[#7038F5] to-[#B724EA] text-white transition hover:brightness-110";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
// Defaults when the admin hasn't set homepage_marketing_config limits.
const FEATURED_DEFAULT = 6;
const TRENDING_DEFAULT = 10;

// Recurring events keep their first `time`, so prefer the next open date.
const whenOf = (e: EventDTO) => new Date(e.next_available_date ?? e.time);

export const ratingOf = (r: number | null | undefined) =>
  r ? r.toFixed(1) : null;

/** The event's cover, or null: render it with <EventCover>, never a stock photo. */
export const coverOf = (e: EventDTO) => e.cover_image_url ?? null;

const dayKey = (d: Date | number) => formatIST(new Date(d), "yyyy-MM-dd");

const placeOf = (e: EventDTO) =>
  e.is_online ? "Online" : (e.location ?? "Location shared after booking");

/** Heart-button state for an event card: saved flag + login-aware toggle. */
export function useSaveToggle(eventId: string) {
  const { userId } = useStoredAuth();
  const { data: savedStatus } = useIsExperienceSaved(eventId, userId);
  const save = useSaveExperience();
  const unsave = useUnsaveExperience();
  const saved = savedStatus?.saved ?? false;

  const toggleSave = () => {
    if (!userId) {
      toast.error("Please login to save experiences");
      return;
    }
    if (saved) {
      unsave.mutate(
        { eventId, userId },
        { onSuccess: () => toast.success("Removed from saved") },
      );
    } else {
      save.mutate(
        { user_id: userId, event_id: eventId },
        { onSuccess: () => toast.success("Saved to your list") },
      );
    }
  };

  return { saved, toggleSave };
}

export function HostCard({
  host,
  className = "",
}: {
  host: PublicHostProfileDTO;
  className?: string;
}) {
  const rating = ratingOf(host.avg_rating_override ?? host.avg_rating);
  const subtitle = host.tagline ?? (host.city ? `Host in ${host.city}` : null);
  return (
    <div
      className={`flex h-full flex-col items-center rounded-[20px] px-4 pt-4 pb-4 text-center ${className} ${CARD}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        // Some hosts have avatar_url = "" — `??` would keep the empty string.
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        src={host.avatar_url || "/assets/home/profile1.png"}
        alt={`${host.first_name} ${host.last_name}`}
        className="h-[72px] w-[72px] rounded-full object-cover"
      />
      <p className="font-outfit mt-2.5 w-full truncate text-[15px] font-semibold text-white">
        {host.first_name} {host.last_name}
      </p>
      {/* Every line is always there (empty or "New host") so cards in a row
          line up even when a host has no tagline or rating yet. */}
      <p className="h-5 w-full truncate text-[13px] leading-5 text-white/60">
        {subtitle ?? "\u00a0"}
      </p>
      <p
        className={`mt-1.5 mb-3 flex h-5 items-center gap-1 text-[13px] font-semibold ${rating ? "text-amber-400" : "text-white/40"}`}
      >
        {rating ? (
          <>
            <Star className="h-3 w-3 fill-amber-400" /> {rating}
          </>
        ) : (
          "New host"
        )}
      </p>
      <Link
        href={`/host/${host.slug}`}
        className="mt-auto flex h-7 w-full items-center justify-center rounded-full border border-[#9B30FF] text-xs font-semibold tracking-wide text-[#E3CCFF] uppercase transition hover:bg-[#9B30FF]/15"
      >
        View Profile
      </Link>
    </div>
  );
}

/** "Your next plan": the soonest upcoming booking, styled as a ticket. */
function NextPlan({ event, at }: { event: EventDTO; at: Date }) {
  const days = Math.round(
    (new Date(dayKey(at)).getTime() - new Date(dayKey(Date.now())).getTime()) /
      DAY_MS,
  );
  const countdown =
    days <= 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
  return (
    <Link
      href="/activities"
      className="group relative flex items-stretch overflow-hidden rounded-3xl bg-gradient-to-r from-[#2A1550] to-[#1B1D33] ring-1 ring-[#A020F0]/30"
    >
      <span className="relative w-24 shrink-0 overflow-hidden sm:w-32">
        <EventCover
          src={coverOf(event)}
          alt=""
          className="h-full w-full object-cover"
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-4 sm:px-6">
        <span className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-[#D8B4FE] uppercase">
          <Ticket className="h-3.5 w-3.5" /> Your next plan
        </span>
        <span className="font-outfit line-clamp-1 text-lg font-semibold text-white sm:text-xl">
          {event.title}
        </span>
        <span className="text-sm text-white/60">
          {formatIST(at, "EEE, d MMM · h:mm a")}
        </span>
      </span>
      {/* Perforation */}
      <span
        aria-hidden="true"
        className="relative my-3 hidden w-px border-l border-dashed border-white/20 sm:block"
      >
        <span className="absolute -top-6 -left-3 h-6 w-6 rounded-full bg-[#080914]" />
        <span className="absolute -bottom-6 -left-3 h-6 w-6 rounded-full bg-[#080914]" />
      </span>
      <span className="flex shrink-0 flex-col items-center justify-center gap-2 px-4 sm:px-7">
        <span className="font-outfit text-sm font-semibold whitespace-nowrap text-white sm:text-base">
          {countdown}
        </span>
        <span className="hidden h-9 items-center rounded-full bg-white px-4 text-[13px] font-semibold text-[#080914] transition group-hover:bg-white/90 sm:flex">
          View ticket
        </span>
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero: one event at a time, details left, poster right              */
/* ------------------------------------------------------------------ */

/** scrollLeft that centres card i (the row is the cards' offsetParent),
 *  clamped to what the row can actually scroll. */
const leftOf = (row: HTMLDivElement, i: number) => {
  const card = row.children[i] as HTMLElement | undefined;
  if (!card) return 0;
  const want = card.offsetLeft - (row.clientWidth - card.offsetWidth) / 2;
  return Math.max(0, Math.min(want, row.scrollWidth - row.clientWidth));
};
/** The card whose centred position is closest to where the row is now. */
const nearest = (row: HTMLDivElement) => {
  let best = 0;
  for (let i = 1; i < row.children.length; i++)
    if (
      Math.abs(leftOf(row, i) - row.scrollLeft) <
      Math.abs(leftOf(row, best) - row.scrollLeft)
    )
      best = i;
  return best;
};

/**
 * Phones, matching the Android app: a "Featured" row of poster cards
 * with the neighbours peeking in, and the title, place and price under each
 * poster rather than over it.
 */
export function MobileHero({
  events,
  hostById,
}: {
  events: EventDTO[];
  hostById: Map<string, PublicHostProfileDTO>;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = events.length;
  // Slides are [copy of last, ...real cards, copy of first, copy of second]
  // and the row starts on slide 1, the real first card. Autoplay scrolls off
  // the last real card onto the copy of the first, then jumps (unanimated) to
  // the real one. The neighbours peeking in on both sides are copies too, so
  // the view is identical across the jump and the loop can't be seen. Copies
  // on one side only changed the peeking neighbour on the jump.
  const looping = count > 1;
  const slides = looping
    ? [events[count - 1]!, ...events, events[0]!, events[1 % count]!]
    : events;

  // Start on the real first card (before paint, so there's no flash).
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (row && looping)
      row.scrollTo({ left: leftOf(row, 1), behavior: "instant" });
    setIndex(0);
  }, [looping, count]);

  /** If the row sits on a copy, move it to the real card it copies. */
  const settle = (row: HTMLDivElement, i: number) => {
    if (i >= count + 1) i -= count;
    else if (i <= 0) i = count;
    else return i;
    row.scrollTo({ left: leftOf(row, i), behavior: "instant" });
    return i;
  };

  useEffect(() => {
    if (!looping || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      const row = rowRef.current;
      if (!row || document.hidden) return;
      // Normally already settled by onScroll; this covers a missed swap.
      const i = settle(row, nearest(row));
      row.scrollTo({ left: leftOf(row, i + 1), behavior: "smooth" });
    }, 5000);
    return () => window.clearInterval(id);
    // settle only reads count, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [looping, count, paused]);

  if (!count) return null;

  const onScroll = () => {
    const row = rowRef.current;
    if (!row) return;
    let i = nearest(row);
    // Only swap once the scroll has come to rest on the copy.
    if (looping && Math.abs(row.scrollLeft - leftOf(row, i)) < 2)
      i = settle(row, i);
    setIndex(looping ? (i - 1 + count) % count : 0);
  };

  return (
    <section aria-label="Featured events" className="pt-2 pb-2 md:hidden">
      <div className="mb-3 flex items-end justify-between px-5">
        <h2 className="font-outfit text-[22px] leading-tight font-semibold text-white">
          Featured
        </h2>
        <Link
          href="/explore?type=experiences"
          className="text-sm font-semibold text-[#D8B4FE]"
        >
          See all
        </Link>
      </div>

      <div
        ref={rowRef}
        onScroll={onScroll}
        // A finger on the row stops autoplay; it resumes 5s after letting go.
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        className="relative flex snap-x snap-mandatory gap-3 overflow-x-auto px-[8%] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((e, slide) => {
          const price = eventPriceLabel(e);
          const host = hostById.get(e.host_id);
          const isCopy = looping && (slide === 0 || slide > count);
          const hostName = host
            ? `${host.first_name} ${host.last_name}`.trim()
            : null;
          return (
            <Link
              key={`${e.id}-${slide}`}
              href={`/experience/${e.slug}`}
              aria-hidden={isCopy || undefined}
              tabIndex={isCopy ? -1 : undefined}
              className="w-[84%] max-w-[340px] shrink-0 snap-center"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-[#121426] ring-1 ring-white/10">
                {/* Like the Android app: the poster fills the card. */}
                <EventCover
                  src={coverOf(e)}
                  alt={e.title}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              <div className="mt-3 px-1">
                <p className="font-outfit truncate text-[17px] font-semibold text-white">
                  {e.title}
                </p>
                <div className="mt-0.5 flex items-center gap-3">
                  <p className="min-w-0 flex-1 truncate text-[13px] text-white/55">
                    {[placeOf(e), hostName].filter(Boolean).join(" · ")}
                  </p>
                  <p className="shrink-0 text-[14px] font-semibold text-white">
                    {price}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {events.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
          {events.map((ev, i) => (
            <span
              key={ev.id}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-white" : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Hero({ events }: { events: EventDTO[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = events.length;
  const go = (i: number) => setIndex(((i % count) + count) % count);

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % count);
    }, 6000);
    return () => window.clearInterval(id);
  }, [count, paused]);

  if (count === 0) return null;
  const e = events[Math.min(index, count - 1)]!;
  const href = `/experience/${e.slug}`;
  const price = eventPriceLabel(e);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured events"
      className="relative isolate hidden overflow-hidden border-b border-white/[0.06] md:block"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onTouchStart={(ev) => (touchX.current = ev.touches[0]?.clientX ?? null)}
      onTouchEnd={(ev) => {
        const start = touchX.current;
        const end = ev.changedTouches[0]?.clientX;
        touchX.current = null;
        if (start == null || end == null || Math.abs(end - start) < 40) return;
        go(index + (end < start ? 1 : -1));
      }}
    >
      {/* Backdrop: the poster, blurred into the page */}
      {e.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`bg-${e.id}`}
          src={e.cover_image_url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full scale-125 animate-[hero-stack-fade_0.7s_ease-out] object-cover opacity-50 blur-[80px]"
        />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#080914] via-[#080914]/85 to-[#080914]/40" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-[#080914] to-transparent" />

      <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-8 px-5 py-10 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16 md:px-6 md:py-16 lg:px-10 lg:py-20">
        {/* Details */}
        <div
          key={`text-${e.id}`}
          className="order-2 min-w-0 animate-[hero-stack-fade_0.5s_ease-out] md:order-1"
        >
          <p className="text-sm font-medium text-[#D8B4FE]">
            {formatIST(whenOf(e), "EEE, d MMM · h:mm a")}
          </p>
          <h2 className="font-outfit mt-3 line-clamp-2 text-[30px] leading-[1.1] font-semibold tracking-[-0.02em] text-white md:text-[48px]">
            {e.title}
          </h2>
          <p className="mt-3 flex items-center gap-1.5 text-[15px] text-white/65 md:text-lg">
            {e.is_online ? (
              <Video className="h-4 w-4 shrink-0" />
            ) : (
              <MapPin className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">{placeOf(e)}</span>
          </p>
          <p className="mt-4 text-[15px] font-semibold text-white">
            {price === "Free" ? "Free" : `${price} onwards`}
          </p>
          <Link
            href={href}
            className="font-outfit mt-6 inline-flex h-12 items-center rounded-full bg-white px-7 text-[15px] font-semibold text-[#080914] transition hover:bg-white/90"
          >
            Book tickets
          </Link>
        </div>

        {/* Poster: a fixed 4:5 frame. Older covers in other shapes are shown
            whole over a blurred fill instead of being cropped. */}
        <Link
          key={`poster-${e.id}`}
          href={href}
          tabIndex={-1}
          aria-hidden="true"
          className="relative order-1 mx-auto block aspect-[4/5] w-[62%] max-w-[260px] animate-[hero-stack-fade_0.5s_ease-out] overflow-hidden rounded-2xl bg-[#121426] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/10 md:order-2 md:mr-0 md:w-[300px] md:max-w-none"
        >
          {e.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={e.cover_image_url}
              alt=""
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-xl"
            />
          )}
          <EventCover
            src={coverOf(e)}
            alt=""
            className="relative h-full w-full object-contain"
          />
        </Link>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous event"
            onClick={() => go(index - 1)}
            className="absolute top-1/2 left-3 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 lg:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next event"
            onClick={() => go(index + 1)}
            className="absolute top-1/2 right-3 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 lg:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-0 bottom-5 flex justify-center gap-1.5">
            {events.map((ev, i) => (
              <button
                key={ev.id}
                type="button"
                aria-label={`Show event ${i + 1}`}
                aria-current={i === index}
                onClick={() => go(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-6 bg-white"
                    : "w-1.5 bg-white/30 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pieces                                                             */
/* ------------------------------------------------------------------ */

function SectionHeader({
  title,
  href,
  linkLabel = "See all",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 md:mb-8">
      <h2 className="font-outfit text-[20px] leading-tight font-semibold tracking-[-0.01em] text-white md:text-[28px]">
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="group flex shrink-0 items-center gap-1 text-sm font-semibold text-white/60 transition hover:text-white"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

/** Small, uniform category tile: name on top, illustration below. */
function VibeTile({ category }: { category: Category }) {
  const theme = moodTheme(category.art ?? category.moods[0]!);
  return (
    <Link
      href={`/explore?type=experiences&cat=${category.key}`}
      style={{ backgroundColor: theme.bg }}
      className="group relative flex aspect-[5/6] w-[118px] shrink-0 flex-col overflow-hidden rounded-[20px] ring-1 ring-white/[0.08] transition duration-300 hover:-translate-y-1 md:w-auto"
    >
      <span className="relative z-10 px-3 pt-3 text-[14px] leading-tight font-semibold text-white">
        {category.label}
      </span>
      {theme.art && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={theme.art}
          alt=""
          loading="lazy"
          className="absolute inset-x-0 bottom-[-6%] h-[82%] w-full object-cover object-top transition duration-500 group-hover:scale-105"
        />
      )}
    </Link>
  );
}

/** Compact card for a 1:1 session: who, what, how long, how much. */
function SessionCard({
  event: e,
  host,
}: {
  event: EventDTO;
  host?: PublicHostProfileDTO;
}) {
  const price = eventPriceLabel(e);
  const mins = e.duration_minutes ?? 60;
  const length =
    mins < 60
      ? `${mins} min`
      : `${Number.isInteger(mins / 60) ? mins / 60 : (mins / 60).toFixed(1)} hr`;
  return (
    <Link
      href={`/experience/${e.slug}`}
      className="group flex gap-4 rounded-3xl border border-white/[0.08] bg-[#121426] p-3 transition hover:border-white/20"
    >
      <span className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-2xl sm:w-28">
        <EventCover
          src={coverOf(e)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col py-1 pr-1">
        {host && (
          <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-white/55">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                // Some hosts have avatar_url = "".
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                host.avatar_url || "/assets/home/avatar-placeholder.svg"
              }
              alt=""
              className="h-5 w-5 shrink-0 rounded-full object-cover"
            />
            <span className="truncate">
              {host.first_name} {host.last_name}
            </span>
            {host.is_identity_verified && (
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#A020F0]" />
            )}
          </span>
        )}
        <span className="font-outfit mt-1.5 line-clamp-2 text-[15px] leading-snug font-semibold text-white">
          {e.title}
        </span>
        <span className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-white/50">
          <span className="truncate">
            {length} · {e.is_online ? "Online" : "In person"}
          </span>
          <span className="font-outfit shrink-0 text-sm font-bold text-[#D8B4FE]">
            {price}
          </span>
        </span>
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HomeFeed({
  initialEvents,
  initialHosts,
  initialMarketingConfig,
  featuredIds,
}: {
  initialEvents?: EventDTO[];
  initialHosts?: PublicHostProfileDTO[];
  initialMarketingConfig?: HomepageMarketingConfig | null;
  /** Featured rail from the Node /home feed (what mobile shows), in order. */
  featuredIds?: string[] | null;
}) {
  const {
    closeBecomeHostModal,
    handleListTimeClick,
    hostStatus,
    showBecomeHostModal,
  } = useListTimeAction();
  const isHost = hostStatus === "approved";
  const hostInReview =
    hostStatus === "pending" || hostStatus === "under_review";
  const { userId } = useStoredAuth();
  const { unreadCount } = useNotifications();

  const { data: events } = useListPublicEvents(
    initialEvents ? { success: true, data: initialEvents } : undefined,
  );
  const { data: hosts } = useListHosts(
    initialHosts ? { success: true, data: initialHosts } : undefined,
  );
  const { data: marketingConfig } = usePlatformSetting<HomepageMarketingConfig>(
    "homepage_marketing_config",
    initialMarketingConfig
      ? { success: true, data: initialMarketingConfig }
      : undefined,
  );
  const { data: bookings } = useBookingsByUser(
    userId && userId !== "existing" ? userId : null,
  );

  const hostById = useMemo(
    () => new Map((hosts ?? []).map((h) => [h.id, h])),
    [hosts],
  );
  const eventById = useMemo(
    () => new Map((events ?? []).map((e) => [e.id, e])),
    [events],
  );

  // The city from the top-bar picker: things there (or online) lead every row.
  const place = useSavedLocation();
  const city = placeName(place);

  // Public, upcoming, soonest first — in or near the chosen city first.
  const open = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return nearFirst(
      (events ?? [])
        .filter((e) => !e.is_private && whenOf(e) >= startOfToday)
        .sort((a, b) => whenOf(a).getTime() - whenOf(b).getTime()),
      place,
    );
  }, [events, place]);

  // Admin-pinned featured events lead the hero; the soonest fill the rest.
  // Admin (homepage_marketing_config) picks the events and how many to show:
  // pinned events in the admin's order, topped up with the soonest ones.
  const pick = (ids: string[], limit: number, fallback: EventDTO[]) => {
    const pinned = open
      .filter((e) => ids.includes(e.id))
      .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    const rest = fallback.filter((e) => !ids.includes(e.id));
    // Admin picks stay in, but ones in the chosen city move to the front.
    return [...nearFirst(pinned, place), ...nearFirst(rest, place)].slice(
      0,
      Math.max(0, limit),
    );
  };

  // The Node /home feed decides Featured so web and mobile show the same rail
  // in the same order. Local picking is only the fallback when it's unreachable.
  const featured = useMemo(() => {
    const synced = (featuredIds ?? [])
      .map((id) => eventById.get(id))
      .filter((e): e is EventDTO => e !== undefined);
    if (synced.length > 0) return synced;
    // Same rule as Node: only the admin's picks, no top-up; soonest only
    // when none of them is still open.
    // Admin order as-is (no city reordering, unlike pick()).
    const limit = marketingConfig?.featured_limit ?? FEATURED_DEFAULT;
    const picked = (marketingConfig?.featured_event_ids ?? [])
      .map((id) => open.find((e) => e.id === id))
      .filter((e): e is EventDTO => e !== undefined)
      .slice(0, Math.max(0, limit));
    return picked.length > 0 ? picked : pick([], limit, open);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pick only reads `open` and `place`
  }, [featuredIds, eventById, open, marketingConfig, place]);

  const nextPlan = useMemo(() => {
    const now = Date.now();
    const next = (bookings ?? [])
      .filter(
        (b) =>
          b.status === "confirmed" &&
          new Date(b.occurrence_date).getTime() > now &&
          eventById.has(b.event_id),
      )
      .sort(
        (a, b) => Date.parse(a.occurrence_date) - Date.parse(b.occurrence_date),
      )[0];
    return next
      ? {
          event: eventById.get(next.event_id)!,
          at: new Date(next.occurrence_date),
        }
      : null;
  }, [bookings, eventById]);

  // Most booked first: the one curated row on the page.
  // Admin-curated list (curated_event_ids / curated_limit). Without picks,
  // the most booked group experiences of the next four weeks.
  const trending = useMemo(() => {
    const cutoff = Date.now() + 4 * WEEK_MS;
    const mostBooked = [...open]
      .filter(
        (e) => kindOf(e) === "experience" && whenOf(e).getTime() <= cutoff,
      )
      .sort(
        (a, b) =>
          (b.total_bookings ?? 0) - (a.total_bookings ?? 0) ||
          (b.avg_rating ?? 0) - (a.avg_rating ?? 0),
      );
    return pick(
      marketingConfig?.curated_event_ids ?? [],
      marketingConfig?.curated_limit ?? TRENDING_DEFAULT,
      mostBooked,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pick only reads `open` and `place`
  }, [open, marketingConfig, place]);
  // Upcoming experiences from hosts the user has connected with.
  const { hostIds: connectedIds } = useConnections();
  const fromConnections = useMemo(
    () => open.filter((e) => connectedIds.includes(e.host_id)).slice(0, 8),
    [open, connectedIds],
  );
  const connectedHosts = useMemo(
    () =>
      connectedIds
        .map((id) => hostById.get(id))
        .filter((h): h is NonNullable<typeof h> => Boolean(h)),
    [connectedIds, hostById],
  );
  const trendingRef = useRef<HTMLDivElement>(null);
  const [trendEdge, setTrendEdge] = useState({ start: true, end: false });
  const scrollTrending = (dir: 1 | -1) => {
    const row = trendingRef.current;
    if (row)
      row.scrollBy({ left: dir * row.clientWidth * 0.9, behavior: "smooth" });
  };

  // Categories that have something on, most events first.
  const byCategory = (kind: EventKind) => {
    const count = new Map<string, number>();
    for (const e of open) {
      if (kindOf(e) !== kind) continue;
      const c = categoryOf(e);
      if (c.key !== "other") count.set(c.key, (count.get(c.key) ?? 0) + 1);
    }
    return categoriesFor(kind)
      .filter((c) => count.has(c.key))
      .sort((a, b) => (count.get(b.key) ?? 0) - (count.get(a.key) ?? 0));
  };
  // Only categories that have something on right now.
  const experienceCats = byCategory("experience");
  const sessionCats = byCategory("session");
  const sessionList = open.filter((e) => kindOf(e) === "session");
  const sessionCount = sessionList.length;
  const sessions = sessionList.slice(0, 4);

  // Hosts based in the chosen city first.
  const topHosts = useMemo(() => {
    const list = hosts ?? [];
    if (!city) return list.slice(0, 12);
    const here = (h: (typeof list)[number]) =>
      (h.city ?? "").toLowerCase().includes(city.toLowerCase());
    return [...list.filter(here), ...list.filter((h) => !here(h))].slice(0, 12);
  }, [hosts, city]);
  return (
    <div className="w-full overflow-x-clip font-[family-name:var(--font-inter)]">
      {/* Phone header (tablet and up use the top bar) */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 md:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/brand/logo-horizontal-white.png"
          alt="Myslotmate"
          width={1048}
          height={209}
          className="h-6 w-auto"
        />
        <LocationButton className="ml-auto h-9 max-w-[150px] text-[13px]" />
        <Link
          href="/notifications"
          aria-label={
            unreadCount
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-white/80"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F43F5E] px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
      </div>

      <MobileHero events={featured} hostById={hostById} />
      <Hero events={featured} />

      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-5 pt-8 pb-16 md:gap-24 md:px-6 md:pt-16 md:pb-20 lg:px-10">
        {nextPlan && <NextPlan event={nextPlan.event} at={nextPlan.at} />}

        {fromConnections.length > 0 && (
          <section>
            <div className="mb-6 flex items-end justify-between gap-4 md:mb-8">
              <div>
                <h2 className="font-outfit text-[22px] leading-tight font-semibold tracking-[-0.01em] text-white md:text-[28px]">
                  From your connections
                </h2>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {connectedHosts.slice(0, 5).map((h) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={h.id}
                        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                        src={h.avatar_url || "/assets/home/profile1.png"}
                        alt=""
                        className="h-6 w-6 rounded-full object-cover ring-2 ring-[#080914]"
                      />
                    ))}
                  </div>
                  <p className="text-sm text-white/55">
                    What the people you&apos;re connected with are hosting
                  </p>
                </div>
              </div>
              <Link
                href="/profile"
                className="group hidden shrink-0 items-center gap-1 text-sm font-semibold text-white/60 transition hover:text-white sm:flex"
              >
                Manage
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
              {fromConnections.slice(0, 4).map((e, i) => (
                <div
                  key={e.id}
                  className="flex w-[46%] shrink-0 snap-start sm:w-[34%] md:w-auto"
                >
                  <SlotCard
                    event={e}
                    host={hostById.get(e.host_id)}
                    index={i}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {experienceCats.length > 0 && (
          <section>
            <SectionHeader
              title="Explore by vibe"
              href="/explore?type=experiences"
            />
            <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-6 [&::-webkit-scrollbar]:hidden">
              {experienceCats.map((c) => (
                <VibeTile key={c.key} category={c} />
              ))}
            </div>
          </section>
        )}

        {trending.length > 0 && (
          <section>
            <SectionHeader
              title="Trending this month"
              href="/explore?type=experiences"
              linkLabel="See more"
            />
            {/* One swipeable row: four in view on desktop, arrows on the sides */}
            <div className="relative">
              <div
                ref={trendingRef}
                onScroll={(ev) => {
                  const r = ev.currentTarget;
                  setTrendEdge({
                    start: r.scrollLeft <= 4,
                    end: r.scrollLeft + r.clientWidth >= r.scrollWidth - 4,
                  });
                }}
                className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:scroll-px-0 md:gap-6 md:px-0 [&::-webkit-scrollbar]:hidden"
              >
                {trending.map((e, i) => (
                  <div
                    key={e.id}
                    className="flex w-[46%] shrink-0 snap-start sm:w-[34%] md:w-[calc((100%-24px)/2)] lg:w-[calc((100%-72px)/4)]"
                  >
                    <SlotCard
                      event={e}
                      host={hostById.get(e.host_id)}
                      index={i}
                    />
                  </div>
                ))}
              </div>
              {trending.length > 4 && (
                <>
                  <button
                    type="button"
                    aria-label="Scroll back"
                    onClick={() => scrollTrending(-1)}
                    className={`absolute top-[38%] left-0 z-10 hidden h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#121426]/90 text-white shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur transition hover:bg-[#1B1D33] md:flex ${
                      trendEdge.start ? "pointer-events-none opacity-0" : ""
                    }`}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Scroll forward"
                    onClick={() => scrollTrending(1)}
                    className={`absolute top-[38%] right-0 z-10 hidden h-11 w-11 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#121426]/90 text-white shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur transition hover:bg-[#1B1D33] md:flex ${
                      trendEdge.end ? "pointer-events-none opacity-0" : ""
                    }`}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </section>
        )}

        {topHosts.length > 0 && (
          <section>
            <SectionHeader title="Hosts on Myslotmate" href="/hosts" />
            <div className="-mx-5 flex gap-6 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:gap-8 md:px-0 [&::-webkit-scrollbar]:hidden">
              {topHosts.map((h) => {
                const rating = ratingOf(h.avg_rating_override ?? h.avg_rating);
                return (
                  <Link
                    key={h.id}
                    href={`/host/${h.slug}`}
                    className="group flex w-[88px] shrink-0 flex-col items-center text-center md:w-[112px]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        // Some hosts have avatar_url = "".
                        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                        h.avatar_url || "/assets/home/avatar-placeholder.svg"
                      }
                      alt=""
                      loading="lazy"
                      className="h-[88px] w-[88px] rounded-full object-cover ring-1 ring-white/10 transition group-hover:ring-white/40 md:h-[112px] md:w-[112px]"
                    />
                    <span className="mt-3 flex w-full items-center justify-center gap-1 text-sm font-medium text-white">
                      <span className="truncate">{h.first_name}</span>
                      {h.is_identity_verified && (
                        <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#A020F0]" />
                      )}
                    </span>
                    {rating && (
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-white/45">
                        <Star className="h-3 w-3 fill-current" />
                        {rating}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* 1:1 sessions: a short intro and the next few sessions to book */}
        {sessions.length > 0 && (
          <section className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-12">
            <div className="flex flex-col items-start">
              <p className="text-xs font-semibold tracking-[0.14em] text-[#D8B4FE] uppercase">
                1:1 sessions
              </p>
              <div className="mt-2 flex w-full items-end justify-between gap-4 lg:block">
                <h2 className="font-outfit text-[22px] leading-tight font-semibold tracking-[-0.01em] text-white md:text-[32px] lg:mt-1">
                  Learn from someone who&apos;s done it.
                </h2>
                <Link
                  href="/explore?type=sessions"
                  className="shrink-0 text-sm font-semibold text-white/60 lg:hidden"
                >
                  See all
                </Link>
              </div>
              <p className="mt-3 hidden text-[15px] leading-6 text-white/55 lg:block">
                Private time with mentors, coaches and teachers. Pick a slot
                that suits you and it&apos;s just the two of you.
              </p>
              {sessionCats.length > 0 && (
                <div className="mt-4 -mr-5 flex w-[calc(100%+20px)] gap-2 overflow-x-auto pr-5 [scrollbar-width:none] lg:mt-5 lg:mr-0 lg:w-auto lg:flex-wrap lg:overflow-visible lg:pr-0 [&::-webkit-scrollbar]:hidden">
                  {sessionCats.map((c) => (
                    <Link
                      key={c.key}
                      href={`/explore?type=sessions&cat=${c.key}`}
                      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/12 px-3.5 text-[13px] font-medium whitespace-nowrap text-white/75 transition hover:border-white/30 hover:text-white"
                    >
                      <c.icon className="h-3.5 w-3.5 text-[#D8B4FE]" />
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
              <Link
                href="/explore?type=sessions"
                className="mt-6 hidden h-11 items-center gap-2 rounded-full border border-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/[0.06] lg:flex"
              >
                See all {sessionCount} sessions
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
              {sessions.map((e) => (
                <SessionCard
                  key={e.id}
                  event={e}
                  host={hostById.get(e.host_id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Host call-to-action */}
        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#3B1772] via-[#1D1140] to-[#100E1C] ring-1 ring-white/10">
          <div className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-[#A020F0]/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 -bottom-40 h-80 w-80 rounded-full bg-[#F472B6]/15 blur-3xl" />

          <div className="relative grid md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)]">
            {/* Illustration in its own window (it has a dark backdrop) */}
            <div className="order-1 p-3 md:order-2 md:p-4 md:pl-0">
              <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-[24px] bg-[#100E1C] ring-1 ring-white/[0.06] sm:h-64 md:h-full md:min-h-[340px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/illustrations/approved/host-setting-the-stage.webp"
                  alt="A host stringing lights over a pottery table as a guest arrives with a plant"
                  loading="lazy"
                  className="h-full w-full object-cover object-[50%_45%] md:object-contain"
                />
              </div>
            </div>

            <div className="order-2 flex flex-col px-5 pt-2 pb-6 md:order-1 md:justify-center md:p-12">
              <span className="flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-[#E9D8FD] uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F472B6]" />
                {isHost ? "For hosts" : "Host on Myslotmate"}
              </span>
              <h2 className="font-outfit mt-3 text-[22px] leading-[1.15] font-semibold tracking-[-0.02em] text-white md:mt-4 md:text-[40px]">
                {isHost ? (
                  <>
                    Got your next idea?{" "}
                    <span className="text-[#D8B4FE]">
                      Put it on the calendar.
                    </span>
                  </>
                ) : (
                  <>
                    Turn what you love into{" "}
                    <span className="text-[#D8B4FE]">
                      something people book.
                    </span>
                  </>
                )}
              </h2>
              <p className="mt-2 max-w-md text-[14px] leading-6 text-white/60 md:mt-3 md:text-[15px]">
                {hostInReview
                  ? "Your host application is being reviewed. Meanwhile, you can host free events."
                  : isHost
                    ? "Publish in minutes, share one link, and welcome guests at the door."
                    : "Start with a free event today. Get verified when you're ready to sell tickets."}
              </p>

              {!hostInReview && (
                <ol className="mt-6 hidden flex-wrap items-center gap-2 sm:flex">
                  {(isHost
                    ? [
                        [Plus, "Create"],
                        [Share2, "Share"],
                        [ScanLine, "Check in"],
                      ]
                    : [
                        [Plus, "Create for free"],
                        [Share2, "Share your link"],
                        [BadgeCheck, "Get verified"],
                      ]
                  ).map(([Icon, label], i, all) => {
                    const StepIcon = Icon as typeof Plus;
                    return (
                      <li
                        key={label as string}
                        className="flex items-center gap-2"
                      >
                        <span className="flex h-10 items-center gap-2 rounded-full bg-white/[0.08] pr-4 pl-1.5 text-sm font-medium text-white ring-1 ring-white/10">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#A020F0]/40 text-[#F3E8FF]">
                            <StepIcon className="h-3.5 w-3.5" />
                          </span>
                          {label as string}
                        </span>
                        {i < all.length - 1 && (
                          <ChevronRight className="hidden h-4 w-4 text-white/30 sm:block" />
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}

              <div className="mt-5 flex items-center gap-4 sm:mt-8 sm:gap-5">
                <button
                  type="button"
                  onClick={handleListTimeClick}
                  className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold whitespace-nowrap text-[#080914] shadow-[0_12px_40px_-12px_rgba(255,255,255,0.5)] transition hover:bg-white/90 sm:h-12 sm:px-7 sm:text-[15px]"
                >
                  <Ticket className="h-4 w-4" />
                  {isHost ? "Create an event" : "Host an event"}
                </button>
                {isHost ? (
                  <Link
                    href="/host-with-us"
                    className="group flex items-center justify-center gap-1 text-[13px] font-semibold whitespace-nowrap text-white/70 transition hover:text-white sm:text-sm"
                  >
                    How hosting works
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </Link>
                ) : (
                  <BecomeHostButton
                    icon={
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    }
                    className="group flex items-center justify-center gap-1 text-[13px] font-semibold whitespace-nowrap text-white/70 transition hover:text-white sm:text-sm"
                  />
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <BecomeHostModal
        open={showBecomeHostModal}
        onClose={closeBecomeHostModal}
      />
    </div>
  );
}
