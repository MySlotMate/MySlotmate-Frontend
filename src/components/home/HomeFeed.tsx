"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Heart, Lock, MapPin, Star, X } from "lucide-react";
import { toast } from "sonner";
import { BecomeHostModal } from "~/components/become-host";
import { useListTimeAction } from "~/hooks/useListTimeAction";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import {
  useIsExperienceSaved,
  useListHosts,
  useListPublicEvents,
  usePlatformSetting,
  useSaveExperience,
  useUnsaveExperience,
} from "~/hooks/useApi";
import { eventPriceLabel } from "~/lib/price";
import { formatIST } from "~/lib/datetime";
import { getMoodDisplayLabel, normalizeMood } from "~/lib/moods";
import type { EventDTO, PublicHostProfileDTO } from "~/lib/api";
import type { HomepageMarketingConfig } from "./ShowcaseSections";

// Sizes below follow the Figma "Home feed · Desktop 1440" frame.
export const CARD = "border border-white/[0.06] bg-[#131328]";
export const GRADIENT_BTN =
  "bg-gradient-to-r from-[#7038F5] to-[#B724EA] text-white transition hover:brightness-110";
const FALLBACK_COVER = "/assets/home/hiking.webp";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Recurring events keep their first `time`, so prefer the next open date.
const whenOf = (e: EventDTO) => new Date(e.next_available_date ?? e.time);

export const ratingOf = (r: number | null | undefined) =>
  r ? r.toFixed(1) : null;

export const coverOf = (e: EventDTO) => e.cover_image_url ?? FALLBACK_COVER;

const placeOf = (e: EventDTO) =>
  e.is_online ? "Online" : (e.location ?? "TBA");

const greetingFor = (hour: number) =>
  hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

function SectionHeader({
  title,
  href,
  linkLabel = "See All",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-outfit text-xl leading-6 font-semibold text-white">
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="text-sm font-medium text-[#B57BFF] hover:text-[#D4ABFF]"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

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

function FeaturedCard({
  event,
  host,
}: {
  event: EventDTO;
  host?: PublicHostProfileDTO;
}) {
  const { saved, toggleSave } = useSaveToggle(event.id);
  const price = eventPriceLabel(event);
  const rating = ratingOf(event.avg_rating);
  const href = `/experience/${event.slug}`;

  return (
    <article
      className={`flex w-full shrink-0 snap-start flex-col overflow-hidden rounded-[20px] ${CARD}`}
    >
      <div className="relative aspect-[342/215] w-full overflow-hidden md:aspect-[19/8] lg:aspect-[830/265]">
        <Link href={href} className="block h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverOf(event)}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        </Link>
        <button
          type="button"
          onClick={toggleSave}
          aria-label={saved ? "Remove from saved" : "Save experience"}
          className="absolute top-3.5 right-3.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition hover:bg-white/25"
        >
          <Heart
            className={`h-[18px] w-[18px] ${saved ? "fill-[#E040FB] text-[#E040FB]" : "text-white"}`}
          />
        </button>
      </div>
      <div className="flex flex-col p-5">
        <div className="flex h-[22px] items-center justify-between">
          {event.mood ? (
            <span className="rounded-md bg-[#9333EA] px-2.5 py-1 text-[11px] leading-none font-bold tracking-wider text-white uppercase">
              {getMoodDisplayLabel(event.mood)}
            </span>
          ) : (
            <span />
          )}
          {rating ? (
            <span className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 text-amber-400" />
              <span className="font-semibold text-amber-400">{rating}</span>
              {event.total_reviews > 0 && (
                <span className="text-white/60">({event.total_reviews})</span>
              )}
            </span>
          ) : (
            <span className="text-xs font-semibold text-[#B57BFF]">NEW</span>
          )}
        </div>
        <Link href={href} className="mt-3.5">
          <h3 className="font-outfit flex items-center gap-2 text-lg leading-6 font-semibold text-white">
            {event.is_private && (
              <Lock className="h-4 w-4 shrink-0 text-white/60" />
            )}
            <span className="line-clamp-1">{event.title}</span>
          </h3>
        </Link>
        {host && (
          <div className="mt-3 flex h-6 items-center gap-2 text-sm text-white/60">
            {host.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={host.avatar_url}
                alt=""
                className="h-6 w-6 rounded-full object-cover"
              />
            )}
            <span className="truncate">
              Hosted by {host.first_name} {host.last_name}
            </span>
          </div>
        )}
        <span className="mt-3.5 flex min-w-0 items-center gap-1.5 text-sm leading-5 text-white/60">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{placeOf(event)}</span>
        </span>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[15px] font-bold text-white">
            {price}
            {price !== "Free" && " / person"}
          </span>
          <Link
            href={href}
            className={`flex h-10 shrink-0 items-center justify-center rounded-full px-7 text-sm font-semibold ${GRADIENT_BTN}`}
          >
            Book Slot
          </Link>
        </div>
      </div>
    </article>
  );
}

function UpcomingCard({ event }: { event: EventDTO }) {
  return (
    <Link
      href={`/experience/${event.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl ${CARD}`}
    >
      <div className="h-[140px] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverOf(event)}
          alt={event.title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col gap-0.5 px-3 pt-2.5 pb-3">
        {event.mood && (
          <span className="text-[11px] font-bold tracking-wide text-[#C084FC] uppercase">
            {getMoodDisplayLabel(event.mood)}
          </span>
        )}
        <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
          {event.is_private && (
            <Lock className="h-3 w-3 shrink-0 text-white/60" />
          )}
          <span className="truncate">{event.title}</span>
        </h3>
        <p className="truncate text-xs text-white/50">
          {formatIST(whenOf(event), "MMM d")} • {placeOf(event)}
        </p>
        <p className="mt-0.5 text-[13px] font-bold text-white">
          {eventPriceLabel(event)}
        </p>
      </div>
    </Link>
  );
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
      className={`flex flex-col items-center rounded-[20px] px-4 pt-4 pb-4 text-center ${className} ${CARD}`}
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
      {subtitle && (
        <p className="w-full truncate text-[13px] text-white/60">{subtitle}</p>
      )}
      {rating && (
        <p className="mt-1.5 flex items-center gap-1 text-[13px] font-semibold text-amber-400">
          <Star className="h-3 w-3 fill-amber-400" /> {rating}
        </p>
      )}
      <Link
        href={`/host/${host.slug}`}
        className="mt-3 flex h-7 w-full items-center justify-center rounded-full border border-[#9B30FF] text-xs font-semibold tracking-wide text-[#E3CCFF] uppercase transition hover:bg-[#9B30FF]/15"
      >
        View Profile
      </Link>
    </div>
  );
}

export default function HomeFeed({
  initialEvents,
  initialHosts,
  initialMarketingConfig,
}: {
  initialEvents?: EventDTO[];
  initialHosts?: PublicHostProfileDTO[];
  initialMarketingConfig?: HomepageMarketingConfig | null;
}) {
  const [greeting, setGreeting] = useState("Hello");
  const [mood, setMood] = useState<string | null>(null);
  const {
    closeBecomeHostModal,
    handleListTimeClick,
    hostStatus,
    showBecomeHostModal,
  } = useListTimeAction();
  const isHost = hostStatus === "approved";
  const hostInReview =
    hostStatus === "pending" || hostStatus === "under_review";

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

  // Client-only: the page is ISR-cached, a server-side greeting would go stale.
  useEffect(() => {
    setGreeting(greetingFor(Number(formatIST(new Date(), "H"))));
  }, []);

  const hostById = useMemo(
    () => new Map((hosts ?? []).map((h) => [h.id, h])),
    [hosts],
  );

  const upcoming = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return (events ?? [])
      .filter((e) => whenOf(e) >= startOfToday)
      .sort((a, b) => whenOf(a).getTime() - whenOf(b).getTime());
  }, [events]);

  const filtered = useMemo(() => {
    return upcoming.filter((e) => !mood || normalizeMood(e.mood) === mood);
  }, [upcoming, mood]);

  // Admin-pinned featured events (homepage_marketing_config) win; else soonest.
  const featured = useMemo(() => {
    const limit = marketingConfig?.featured_limit ?? 3;
    const ids = marketingConfig?.featured_event_ids ?? [];
    const pinned = filtered
      .filter((e) => ids.includes(e.id))
      .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    return (pinned.length > 0 && !mood ? pinned : filtered).slice(0, limit);
  }, [filtered, marketingConfig, mood]);

  // Auto-advance the featured carousel every 4s; pauses on hover. To loop
  // forward instead of rewinding, a copy of the first card sits after the last
  // one: we scroll onto the copy, then jump (instantly, same picture) back to
  // the real first card.
  const featuredRef = useRef<HTMLDivElement>(null);
  const [featuredPaused, setFeaturedPaused] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const cardOffsets = (row: HTMLElement) => {
    const cards = Array.from(row.querySelectorAll("article"));
    return cards.map((c) => c.offsetLeft - (cards[0]?.offsetLeft ?? 0));
  };
  // Nearest card to the scroll position; can be the copy (index = length).
  const nearestCard = (row: HTMLElement) => {
    const offsets = cardOffsets(row);
    let best = 0;
    offsets.forEach((o, i) => {
      if (
        Math.abs(o - row.scrollLeft) < Math.abs(offsets[best]! - row.scrollLeft)
      )
        best = i;
    });
    return best;
  };
  const currentFeatured = (row: HTMLElement) =>
    nearestCard(row) % featured.length;
  const goToFeatured = (i: number) => {
    const row = featuredRef.current;
    if (row)
      row.scrollTo({ left: cardOffsets(row)[i] ?? 0, behavior: "smooth" });
  };
  // Sitting on the copy → swap to the real first card without animation.
  const unwrapLoop = () => {
    const row = featuredRef.current;
    if (row && featured.length > 1 && nearestCard(row) === featured.length)
      row.scrollTo({ left: 0, behavior: "instant" });
  };
  useEffect(() => {
    setFeaturedIndex(0);
    featuredRef.current?.scrollTo({ left: 0 });
  }, [featured]);
  useEffect(() => {
    // Swiping past the last card lands on the copy too.
    const row = featuredRef.current;
    row?.addEventListener("scrollend", unwrapLoop);
    return () => row?.removeEventListener("scrollend", unwrapLoop);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- helpers only read the ref
  }, [featured]);
  useEffect(() => {
    const row = featuredRef.current;
    if (!row || featured.length < 2 || featuredPaused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let unwrapTimer: number | undefined;
    const id = window.setInterval(() => {
      // A smooth scroll started in a background tab freezes halfway.
      if (document.hidden) return;
      goToFeatured(nearestCard(row) + 1);
      // Fallback for browsers without `scrollend` (older Safari).
      unwrapTimer = window.setTimeout(unwrapLoop, 900);
    }, 4000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(unwrapTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- helpers only read the ref
  }, [featured, featuredPaused]);

  const thisWeek = useMemo(() => {
    const shown = new Set(featured.map((e) => e.id));
    const rest = filtered.filter((e) => !shown.has(e.id));
    const cutoff = Date.now() + WEEK_MS;
    const week = rest.filter((e) => whenOf(e).getTime() <= cutoff);
    return (week.length > 0 ? week : rest).slice(0, 3);
  }, [filtered, featured]);

  const more = useMemo(() => {
    const shown = new Set([...featured, ...thisWeek].map((e) => e.id));
    return filtered.filter((e) => !shown.has(e.id)).slice(0, 3);
  }, [filtered, featured, thisWeek]);

  const categories = useMemo(() => {
    const byMood = new Map<string, { count: number; image: string }>();
    for (const e of upcoming) {
      if (!e.mood) continue;
      const key = normalizeMood(e.mood);
      const cur = byMood.get(key);
      if (cur) cur.count++;
      else byMood.set(key, { count: 1, image: coverOf(e) });
    }
    return [...byMood.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 6);
  }, [upcoming]);

  const pickMood = (key: string) => {
    setMood((cur) => (cur === key ? null : key));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filtering = Boolean(mood);
  const topHosts = (hosts ?? []).slice(0, 3);

  return (
    <div className="w-full font-[family-name:var(--font-inter)]">
      <div className="mx-auto w-full max-w-[1210px] px-6 pt-6 pb-16 md:px-10 md:pt-10 min-[90rem]:pr-6 min-[90rem]:pl-[41px]">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="font-outfit text-[28px] leading-9 font-bold text-white">
              {greeting} <span aria-hidden>👋</span>
            </h1>
            <p className="mt-0.5 text-sm text-white/60">
              Discover experiences happening around you.
            </p>
          </div>
          <Link
            href="/activities"
            aria-label="Your bookings and messages"
            className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full md:mt-3 ${CARD} hover:bg-[#1b1b36]`}
          >
            <Bell className="h-[18px] w-[18px] text-white" />
          </Link>
        </header>

        <div className="mt-7 flex flex-col gap-9 lg:grid lg:grid-cols-[minmax(0,1fr)_281px] lg:gap-[33px]">
          <div className="flex min-w-0 flex-col gap-9 max-lg:contents">
            {mood && (
              <button
                type="button"
                onClick={() => setMood(null)}
                className="flex w-fit items-center gap-1.5 rounded-full bg-[#9B30FF]/20 px-3 py-1 text-sm font-medium text-[#D4ABFF]"
              >
                {getMoodDisplayLabel(mood)}
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {filtering && filtered.length === 0 && (
              <div
                className={`rounded-[20px] p-8 text-center text-white/60 ${CARD}`}
              >
                No experiences match.{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMood(null);
                  }}
                  className="font-semibold text-[#B57BFF]"
                >
                  Clear filters
                </button>
              </div>
            )}

            {featured.length > 0 && (
              <section>
                <SectionHeader
                  title={filtering ? "Top Matches" : "Featured Tonight"}
                  href="/experiences"
                />
                <div
                  ref={featuredRef}
                  onPointerEnter={() => setFeaturedPaused(true)}
                  onPointerLeave={() => setFeaturedPaused(false)}
                  onScroll={(ev) =>
                    setFeaturedIndex(currentFeatured(ev.currentTarget))
                  }
                  className="flex snap-x snap-mandatory gap-4 overflow-x-auto [scrollbar-width:none]"
                >
                  {featured.map((e) => (
                    <FeaturedCard
                      key={e.id}
                      event={e}
                      host={hostById.get(e.host_id)}
                    />
                  ))}
                  {featured.length > 1 && (
                    // Loop copy of the first card — hidden from screen readers
                    // and keyboard focus.
                    <div className="contents" aria-hidden="true" inert>
                      <FeaturedCard
                        event={featured[0]!}
                        host={hostById.get(featured[0]!.host_id)}
                      />
                    </div>
                  )}
                </div>
                {featured.length > 1 && (
                  <div className="mt-3 flex justify-center gap-1.5">
                    {featured.map((e, i) => (
                      <button
                        key={e.id}
                        type="button"
                        aria-label={`Show featured event ${i + 1}`}
                        aria-current={i === featuredIndex}
                        onClick={() => goToFeatured(i)}
                        className={`h-1.5 rounded-full transition-all ${
                          i === featuredIndex
                            ? "w-5 bg-[#B57BFF]"
                            : "w-1.5 bg-white/25 hover:bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {thisWeek.length > 0 && (
              <section>
                <SectionHeader title="Upcoming This Week" href="/experiences" />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
                  {thisWeek.map((e) => (
                    <UpcomingCard key={e.id} event={e} />
                  ))}
                </div>
              </section>
            )}

            {more.length > 0 && (
              <section className="max-lg:order-1">
                <SectionHeader title="Continue Exploring" />
                <div className="grid grid-cols-3 gap-3 md:gap-4">
                  {more.map((e) => (
                    <Link
                      key={e.id}
                      href={`/experience/${e.slug}`}
                      className="group min-w-0"
                    >
                      <div className="h-[100px] overflow-hidden rounded-xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={coverOf(e)}
                          alt={e.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      </div>
                      <p className="mt-2 truncate text-[13px] font-medium text-white">
                        {e.title}
                      </p>
                      <p className="text-xs text-white/50">
                        {eventPriceLabel(e)}
                        {!e.is_free && " / person"}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {categories.length > 0 && (
              <section
                id="explore-categories"
                className="scroll-mt-24 max-lg:order-1"
              >
                <SectionHeader title="Explore Categories" />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {categories.map(([key, { count, image }]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => pickMood(key)}
                      className={`relative h-[120px] overflow-hidden rounded-2xl text-left ring-2 transition ${mood === key ? "ring-[#B57BFF]" : "ring-transparent hover:ring-white/20"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                      <div className="absolute bottom-2.5 left-3">
                        <p className="font-outfit text-sm font-semibold text-white">
                          {getMoodDisplayLabel(key)}
                        </p>
                        <p className="text-[11px] text-white/70">
                          {count} active
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="flex min-w-0 flex-col gap-6 max-lg:contents">
            {!filtering && topHosts.length > 0 && (
              <section>
                <SectionHeader
                  title="Meet Our Hosts"
                  href="/hosts"
                  linkLabel="View All"
                />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-3.5 lg:flex lg:flex-col">
                  {topHosts.map((h) => (
                    <HostCard key={h.id} host={h} />
                  ))}
                </div>
              </section>
            )}

            <section className={`overflow-hidden rounded-[20px] ${CARD}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/home/heropic2.webp"
                alt="People at a hosted workshop"
                className="h-40 w-full object-cover lg:h-[158px]"
              />
              <div className="flex flex-col p-4">
                <h2 className="font-outfit text-lg font-semibold text-white">
                  {isHost ? "Host Something New" : "Share Your Passion"}
                </h2>
                <p className="mt-1.5 text-[13px] leading-5 text-white/60">
                  {isHost
                    ? "Turn your next idea into an experience people can book."
                    : hostInReview
                      ? "Your host application is being reviewed. We'll let you know soon."
                      : "Host events, grow your community, and earn on your terms."}
                </p>
                {hostInReview ? (
                  <Link
                    href="/become-host"
                    className="mt-3.5 flex h-10 items-center justify-center rounded-full border border-white/10 bg-[#1B1C33] text-sm font-semibold text-[#D8B4FE] transition hover:bg-[#232445]"
                  >
                    View Application
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleListTimeClick}
                    className={`mt-3.5 h-10 rounded-full text-sm font-semibold ${GRADIENT_BTN}`}
                  >
                    {isHost ? "Create an Experience" : "Become a Host"}
                  </button>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <BecomeHostModal
        open={showBecomeHostModal}
        onClose={closeBecomeHostModal}
      />
    </div>
  );
}
