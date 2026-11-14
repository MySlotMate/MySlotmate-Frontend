"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { LuLoader2 } from "react-icons/lu";
import {
  Heart,
  Lock,
  MapPin,
  Search,
  SlidersVertical,
  Star,
} from "lucide-react";
import * as components from "~/components";
import { useListHosts, useListPublicEvents } from "~/hooks/useApi";
import { getSavedLocation } from "~/components/LocationModal";
import {
  CARD,
  HostCard,
  coverOf,
  ratingOf,
  useSaveToggle,
} from "~/components/home/HomeFeed";
import { eventPriceLabel } from "~/lib/price";
import { eventHasPassed } from "~/lib/eventDates";
import { getMoodDisplayLabel, normalizeMood } from "~/lib/moods";
import type { EventDTO, PublicHostProfileDTO } from "~/lib/api";

// Sizes below follow the Figma "Explore · Desktop 1440" frame.

type PriceFilter =
  | "any"
  | "free"
  | "under_500"
  | "500_1500"
  | "1500_3000"
  | "3000_plus";
type DurationFilter = "any" | "under_60" | "60_120" | "120_240" | "240_plus";
type RatingFilter = "any" | "new" | "3_5_plus" | "4_0_plus" | "4_5_plus";

// "all" = group experiences, "one_on_one" = private 1:1 sessions, else a mood.
type EventFilter = "all" | "one_on_one" | (string & {});

const PAGE_SIZE = 12;

const matchesQuery = (q: string, values: Array<string | null | undefined>) =>
  !q || values.some((v) => (v ?? "").toLowerCase().includes(q));

const byPrice = (cents: number | null, f: PriceFilter) => {
  const rupees = cents ? cents / 100 : 0;
  switch (f) {
    case "any":
      return true;
    case "free":
      return rupees <= 0;
    case "under_500":
      return rupees > 0 && rupees < 500;
    case "500_1500":
      return rupees >= 500 && rupees < 1500;
    case "1500_3000":
      return rupees >= 1500 && rupees < 3000;
    case "3000_plus":
      return rupees >= 3000;
  }
};

const byDuration = (mins: number | null, f: DurationFilter) => {
  switch (f) {
    case "any":
      return true;
    case "under_60":
      return mins !== null && mins < 60;
    case "60_120":
      return mins !== null && mins >= 60 && mins < 120;
    case "120_240":
      return mins !== null && mins >= 120 && mins < 240;
    case "240_plus":
      return mins !== null && mins >= 240;
  }
};

const byRating = (avg: number | null, reviews: number, f: RatingFilter) => {
  const rated = avg !== null && Number.isFinite(avg) && reviews > 0;
  switch (f) {
    case "any":
      return true;
    case "new":
      return !rated;
    case "3_5_plus":
      return rated && avg >= 3.5;
    case "4_0_plus":
      return rated && avg >= 4.0;
    case "4_5_plus":
      return rated && avg >= 4.5;
  }
};

const hostName = (h?: PublicHostProfileDTO) =>
  h ? `${h.first_name} ${h.last_name}`.trim() : null;

function ExploreCard({
  event,
  host,
}: {
  event: EventDTO;
  host?: PublicHostProfileDTO;
}) {
  const { saved, toggleSave } = useSaveToggle(event.id);
  const rating = ratingOf(event.avg_rating);
  const href = `/experience/${event.slug}`;
  const name = hostName(host);

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl ${CARD}`}
    >
      <div className="relative h-[112px] w-full overflow-hidden sm:h-[180px]">
        <Link href={href} className="block h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverOf(event)}
            alt={event.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        </Link>
        <button
          type="button"
          onClick={toggleSave}
          aria-label={saved ? "Remove from saved" : "Save experience"}
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-md transition hover:bg-black/60"
        >
          <Heart
            className={`h-4 w-4 ${saved ? "fill-[#E040FB] text-[#E040FB]" : "text-white"}`}
          />
        </button>
        {event.mood && (
          <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-[#9333EA] px-2.5 py-1 text-[10px] leading-none font-bold tracking-wider text-white uppercase">
            {getMoodDisplayLabel(event.mood)}
          </span>
        )}
      </div>
      <Link href={href} className="flex flex-col px-4 pt-3.5 pb-4">
        <h3 className="font-outfit flex items-center gap-1.5 text-[15px] leading-5 font-semibold text-white">
          {event.is_private && (
            <Lock className="h-3.5 w-3.5 shrink-0 text-white/60" />
          )}
          <span className="truncate">{event.title}</span>
        </h3>
        <p className="mt-1 truncate text-[13px] text-white/60">
          {name
            ? `Hosted by ${name}`
            : event.is_online
              ? "Online"
              : event.location}
        </p>
        <div className="mt-2.5 flex items-center justify-between text-[13px]">
          {rating ? (
            <span className="flex items-center gap-1 font-semibold text-amber-400">
              <Star className="h-3.5 w-3.5 fill-amber-400" /> {rating}
            </span>
          ) : (
            <span className="text-xs font-semibold text-[#B57BFF]">NEW</span>
          )}
          <span className="font-bold text-white">{eventPriceLabel(event)}</span>
        </div>
      </Link>
    </article>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-7 shrink-0 rounded-full border px-3 text-[13px] font-medium transition ${
        active
          ? "border-[#9B30FF] bg-[#9B30FF]/15 text-white"
          : "border-white/[0.08] bg-[#121426] text-white/70 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

const SELECT =
  "h-8 rounded-full border border-white/[0.08] bg-[#121426] px-3 text-xs font-medium text-white/80 outline-none focus:border-[#9B30FF]";

export default function ExplorePage() {
  const { data: hosts, isLoading: hostsLoading } = useListHosts();
  const { data: events, isLoading: eventsLoading } = useListPublicEvents();
  const [city, setCity] = useState<string | null>(null);

  const [tab, setTab] = useState<"experiences" | "hosts">("experiences");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<EventFilter>("all");
  const [showMore, setShowMore] = useState(false);
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("any");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("any");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("any");
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    setCity(getSavedLocation()?.city ?? null);
  }, []);

  const q = useDeferredValue(query).trim().toLowerCase();

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [q, filter, priceFilter, durationFilter, ratingFilter, tab]);

  const hostById = useMemo(
    () => new Map((hosts ?? []).map((h) => [h.id, h])),
    [hosts],
  );

  // Hide experiences that have nothing left to book. See eventHasPassed —
  // `time` alone is wrong for custom-dates events.
  const live = useMemo(() => {
    const now = Date.now();
    return (events ?? []).filter((e) => !eventHasPassed(e, now));
  }, [events]);

  // Pills: the three most common moods among group experiences, plus 1:1
  // sessions when any exist (those are kept out of the default list).
  const moodPills = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of live) {
      const m = normalizeMood(e.mood);
      if (m && e.session_type !== "one_on_one")
        counts.set(m, (counts.get(m) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([m]) => m);
  }, [live]);
  const hasOneOnOne = live.some((e) => e.session_type === "one_on_one");

  const experiences = useMemo(
    () =>
      live
        .filter((e) =>
          filter === "one_on_one"
            ? e.session_type === "one_on_one"
            : e.session_type !== "one_on_one" &&
              (filter === "all" || normalizeMood(e.mood) === filter),
        )
        .filter((e) =>
          matchesQuery(q, [
            e.title,
            e.hook_line,
            e.description,
            e.location,
            e.mood,
            hostName(hostById.get(e.host_id)),
          ]),
        )
        .filter((e) => byPrice(e.price_cents, priceFilter))
        .filter((e) => byDuration(e.duration_minutes, durationFilter))
        .filter((e) => byRating(e.avg_rating, e.total_reviews, ratingFilter))
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
    [live, filter, q, hostById, priceFilter, durationFilter, ratingFilter],
  );

  const filteredHosts = useMemo(
    () =>
      (hosts ?? []).filter((h) =>
        matchesQuery(q, [
          h.first_name,
          h.last_name,
          h.city,
          h.tagline,
          h.bio,
          ...(h.expertise_tags ?? []),
        ]),
      ),
    [hosts, q],
  );

  const list = tab === "experiences" ? experiences : filteredHosts;
  const loading = tab === "experiences" ? eventsLoading : hostsLoading;

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-clip bg-[#080914] text-white max-md:pb-28 md:pl-20 min-[80rem]:pl-[230px]">
      <components.Navbar dark />

      <div className="mx-auto flex w-full max-w-[1210px] flex-col gap-7 px-6 pt-6 pb-16 font-[family-name:var(--font-inter)] md:px-10 md:pt-10">
        <header className="flex min-h-14 items-start justify-between gap-4">
          <div>
            <h1 className="font-outfit text-[28px] leading-9 font-bold">
              Explore
            </h1>
            <p className="mt-0.5 text-sm text-white/60">
              Find local experiences near you
            </p>
          </div>
          {city && (
            <span className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#121426] px-3.5 text-[13px] font-semibold">
              <MapPin className="h-3.5 w-3.5 text-[#B57BFF]" /> {city}
            </span>
          )}
        </header>

        <div className="flex h-12 items-center gap-3 rounded-3xl border border-white/[0.08] bg-[#121426] px-4">
          <Search className="h-4 w-4 shrink-0 text-white/50" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search experiences, hosts or wellness guides"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
          />
          {tab === "experiences" && (
            <>
              <span className="h-5 w-px bg-white/10" />
              <button
                type="button"
                aria-label="More filters"
                aria-expanded={showMore}
                onClick={() => setShowMore((v) => !v)}
                className={`transition ${showMore ? "text-white" : "text-[#B57BFF] hover:text-white"}`}
              >
                <SlidersVertical className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        <div
          role="tablist"
          aria-label="Browse"
          className="grid h-10 w-full max-w-[342px] grid-cols-2 rounded-[20px] border border-white/[0.08] bg-[#121426] p-1"
        >
          {(["experiences", "hosts"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-full text-[13px] font-semibold capitalize transition ${
                tab === t
                  ? "bg-gradient-to-r from-[#7038F5] to-[#B724EA] text-white"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "experiences" && (
          <div className="-my-1 flex flex-col gap-3">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
              <Pill active={filter === "all"} onClick={() => setFilter("all")}>
                All Events
              </Pill>
              {moodPills.map((m) => (
                <Pill
                  key={m}
                  active={filter === m}
                  onClick={() => setFilter(filter === m ? "all" : m)}
                >
                  {getMoodDisplayLabel(m)}
                </Pill>
              ))}
              {hasOneOnOne && (
                <Pill
                  active={filter === "one_on_one"}
                  onClick={() =>
                    setFilter(filter === "one_on_one" ? "all" : "one_on_one")
                  }
                >
                  1:1 Sessions
                </Pill>
              )}
            </div>
            {showMore && (
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label="Price"
                  value={priceFilter}
                  onChange={(e) =>
                    setPriceFilter(e.target.value as PriceFilter)
                  }
                  className={SELECT}
                >
                  <option value="any">Any price</option>
                  <option value="free">Free</option>
                  <option value="under_500">Under ₹500</option>
                  <option value="500_1500">₹500–₹1,500</option>
                  <option value="1500_3000">₹1,500–₹3,000</option>
                  <option value="3000_plus">₹3,000+</option>
                </select>
                <select
                  aria-label="Duration"
                  value={durationFilter}
                  onChange={(e) =>
                    setDurationFilter(e.target.value as DurationFilter)
                  }
                  className={SELECT}
                >
                  <option value="any">Any duration</option>
                  <option value="under_60">Under 1 hour</option>
                  <option value="60_120">1–2 hours</option>
                  <option value="120_240">2–4 hours</option>
                  <option value="240_plus">4+ hours</option>
                </select>
                <select
                  aria-label="Rating"
                  value={ratingFilter}
                  onChange={(e) =>
                    setRatingFilter(e.target.value as RatingFilter)
                  }
                  className={SELECT}
                >
                  <option value="any">Any rating</option>
                  <option value="new">New</option>
                  <option value="3_5_plus">3.5+</option>
                  <option value="4_0_plus">4.0+</option>
                  <option value="4_5_plus">4.5+</option>
                </select>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <LuLoader2 className="h-8 w-8 animate-spin text-[#B57BFF]" />
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-14 text-center text-sm text-white/60">
            No {tab} found.
          </div>
        ) : (
          <>
            <div
              className={`grid gap-3 sm:gap-6 ${
                tab === "experiences"
                  ? "grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
              }`}
            >
              {tab === "experiences"
                ? experiences
                    .slice(0, visible)
                    .map((e) => (
                      <ExploreCard
                        key={e.id}
                        event={e}
                        host={hostById.get(e.host_id)}
                      />
                    ))
                : filteredHosts
                    .slice(0, visible)
                    .map((h) => (
                      <HostCard key={h.id} host={h} className="w-full" />
                    ))}
            </div>
            {visible < list.length && (
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="mx-auto h-10 rounded-full border border-[#9B30FF] px-6 text-sm font-semibold text-[#E3CCFF] transition hover:bg-[#9B30FF]/15"
              >
                Load more
              </button>
            )}
          </>
        )}
      </div>

      <components.Home.Footer dark />
    </main>
  );
}
