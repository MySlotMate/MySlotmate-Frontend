"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LuLoader2 } from "react-icons/lu";
import {
  ArrowRight,
  Compass,
  MapPin,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import * as components from "~/components";
import { useListHosts, useListPublicEvents } from "~/hooks/useApi";
import {
  getSavedLocation,
  type CityLocation,
} from "~/components/LocationModal";
import Breadcrumb from "~/components/Breadcrumb";
import {
  buildUpcomingHostMoodMap,
  getAvailableHostMoodFilters,
  getHostMoodTags,
  hostMatchesMood,
} from "~/lib/hostMoodFilters";
import { getMoodDisplayLabel } from "~/lib/moods";

import { ExperienceCard } from "~/components/ExperienceCard";

const EXPLORE_PILLS = [
  "All",
  "Adventure",
  "Creative",
  "Food",
  "Wellness",
] as const;
type ExplorePill = (typeof EXPLORE_PILLS)[number];

const PILL_TO_MOODS: Record<Exclude<ExplorePill, "All">, string[]> = {
  Adventure: ["adventure", "adventurous"],
  Creative: ["creative"],
  Food: ["food", "culinary"],
  Wellness: ["wellness"],
};

type PriceFilter =
  | "any"
  | "free"
  | "under_500"
  | "500_1500"
  | "1500_3000"
  | "3000_plus";
type DurationFilter = "any" | "under_60" | "60_120" | "120_240" | "240_plus";
type RatingFilter = "any" | "new" | "3_5_plus" | "4_0_plus" | "4_5_plus";

const formatPrice = (priceCents: number | null | undefined) => {
  if (!priceCents) return "Free";
  return `₹${Math.round(priceCents / 100)} / slot`;
};

const formatDuration = (mins: number | null | undefined) => {
  if (!mins) return "—";
  if (mins < 60) return `${mins} mins`;
  const hours = mins / 60;
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded} Hours`;
};

const matchesNormalizedQuery = (
  normalizedQuery: string,
  values: Array<string | null | undefined>,
) => {
  if (!normalizedQuery) return true;
  return values.some((value) =>
    (value ?? "").toLowerCase().includes(normalizedQuery),
  );
};

const matchesExplorePill = (
  selectedPill: ExplorePill,
  values: Array<string | null | undefined>,
) => {
  if (selectedPill === "All") return true;

  const moodMatchers = PILL_TO_MOODS[selectedPill] ?? [];
  const haystack = values.filter(Boolean).join(" ").toLowerCase();

  return moodMatchers.some((mood) => haystack.includes(mood));
};

export default function ExplorePage() {
  const router = useRouter();
  const searchRootRef = useRef<HTMLDivElement>(null);
  const { data: hosts, isLoading: hostsLoading } = useListHosts();
  const { data: events, isLoading: eventsLoading } = useListPublicEvents();
  const [location, setLocation] = useState<CityLocation | null>(null);

  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [pill, setPill] = useState<ExplorePill>("All");
  const [hostMoodFilter, setHostMoodFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("any");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("any");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("any");

  const [visibleExperiences, setVisibleExperiences] = useState(8);

  useEffect(() => {
    setLocation(getSavedLocation());
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!searchRootRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const hostMoodMap = useMemo(() => buildUpcomingHostMoodMap(events), [events]);
  const hostMoodFilters = useMemo(
    () => getAvailableHostMoodFilters(hostMoodMap),
    [hostMoodMap],
  );
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  useEffect(() => {
    setVisibleExperiences(8);
  }, [priceFilter, durationFilter, ratingFilter, normalizedQuery, pill]);

  useEffect(() => {
    if (!hostMoodFilters.includes(hostMoodFilter)) {
      setHostMoodFilter("all");
    }
  }, [hostMoodFilter, hostMoodFilters]);

  const hostSearchSuggestions = useMemo(() => {
    if (!normalizedQuery) return [];
    return (hosts ?? [])
      .filter((host) =>
        matchesNormalizedQuery(normalizedQuery, [
          host.first_name,
          host.last_name,
          host.city,
          host.tagline,
          host.bio,
          ...(host.expertise_tags ?? []),
        ]),
      )
      .slice(0, 4);
  }, [hosts, normalizedQuery]);

  const experienceSearchSuggestions = useMemo(() => {
    if (!normalizedQuery) return [];
    return (events ?? [])
      .filter((event) =>
        matchesNormalizedQuery(normalizedQuery, [
          event.title,
          event.hook_line,
          event.description,
          event.location,
          event.mood,
        ]),
      )
      .slice(0, 5);
  }, [events, normalizedQuery]);

  const quickFilterSuggestions = useMemo(() => {
    return EXPLORE_PILLS.filter(
      (item) =>
        item !== "All" &&
        (!normalizedQuery || item.toLowerCase().includes(normalizedQuery)),
    ).slice(0, 4);
  }, [normalizedQuery]);

  const filteredHosts = useMemo(() => {
    const list = hosts ?? [];

    const searched = normalizedQuery
      ? list.filter((host) =>
          matchesNormalizedQuery(normalizedQuery, [
            host.first_name,
            host.last_name,
            host.city,
            host.tagline,
            host.bio,
            ...(host.expertise_tags ?? []),
          ]),
        )
      : list;

    const pillFiltered =
      pill === "All"
        ? searched
        : searched.filter((host) =>
            matchesExplorePill(pill, [
              host.tagline,
              host.bio,
              ...(host.expertise_tags ?? []),
            ]),
          );

    const moodFiltered = pillFiltered.filter((host) =>
      hostMatchesMood(host.id, hostMoodFilter, hostMoodMap),
    );

    return moodFiltered.slice(0, 4);
  }, [hosts, normalizedQuery, pill, hostMoodFilter, hostMoodMap]);

  const filteredExperiences = useMemo(() => {
    let list = [...(events ?? [])];

    if (normalizedQuery) {
      list = list.filter((event) =>
        matchesNormalizedQuery(normalizedQuery, [
          event.title,
          event.hook_line,
          event.description,
          event.location,
          event.mood,
        ]),
      );
    }

    list = list.filter((event) =>
      matchesExplorePill(pill, [
        event.mood,
        event.title,
        event.hook_line,
        event.description,
      ]),
    );

    const byPrice = (evtPriceCents: number | null, filter: PriceFilter) => {
      const rupees = evtPriceCents ? evtPriceCents / 100 : 0;
      switch (filter) {
        case "any":
          return true;
        case "free":
          return !evtPriceCents || rupees <= 0;
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

    const byDuration = (mins: number | null, filter: DurationFilter) => {
      const m = mins ?? null;
      switch (filter) {
        case "any":
          return true;
        case "under_60":
          return m !== null && m < 60;
        case "60_120":
          return m !== null && m >= 60 && m < 120;
        case "120_240":
          return m !== null && m >= 120 && m < 240;
        case "240_plus":
          return m !== null && m >= 240;
      }
    };

    const byRating = (
      avgRating: number | null,
      totalReviews: number,
      filter: RatingFilter,
    ) => {
      const rating = avgRating ?? null;
      const hasRating = rating !== null && Number.isFinite(rating);
      const hasReviews = (totalReviews ?? 0) > 0;
      switch (filter) {
        case "any":
          return true;
        case "new":
          return !hasRating || !hasReviews;
        case "3_5_plus":
          return hasRating && rating >= 3.5;
        case "4_0_plus":
          return hasRating && rating >= 4.0;
        case "4_5_plus":
          return hasRating && rating >= 4.5;
      }
    };

    return list
      .filter((event) => byPrice(event.price_cents, priceFilter))
      .filter((event) => byDuration(event.duration_minutes, durationFilter))
      .filter((event) =>
        byRating(event.avg_rating, event.total_reviews, ratingFilter),
      )
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [
    events,
    priceFilter,
    durationFilter,
    ratingFilter,
    normalizedQuery,
    pill,
  ]);

  const visibleEvents = filteredExperiences.slice(0, visibleExperiences);
  const canLoadMore = visibleExperiences < filteredExperiences.length;
  const hasSearchSuggestions =
    experienceSearchSuggestions.length > 0 ||
    hostSearchSuggestions.length > 0 ||
    quickFilterSuggestions.length > 0;

  const handleExperienceSelect = (eventId: string) => {
    setIsSearchOpen(false);
    router.push(`/experience/${eventId}`);
  };

  const handleHostSelect = (hostId: string) => {
    setIsSearchOpen(false);
    router.push(`/host/${hostId}`);
  };

  const handleQuickFilterSelect = (nextPill: Exclude<ExplorePill, "All">) => {
    setPill(nextPill);
    setQuery("");
    setIsSearchOpen(false);
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fafeff,#f2faff)] text-[#16304c]">
      <components.Navbar />

      <div className="site-x mx-auto w-full max-w-[77.5rem] py-8 pt-24">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Explore" }]}
          className="mb-6"
        />

        <section className="pb-2">
          {/* Search */}
          <div ref={searchRootRef} className="relative">
            <div className="flex h-[54px] items-center gap-3 rounded-full border border-sky-200 bg-white/90 px-4 shadow-[0_10px_24px_rgba(74,141,194,0.08)]">
              <Search className="h-[18px] w-[18px] shrink-0 text-[#6f8daa]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsSearchOpen(false);
                    e.currentTarget.blur();
                  }
                }}
                placeholder="Search experiences, hosts, or interests"
                className="w-full bg-transparent text-sm text-[#16304c] outline-none placeholder:text-[#8aa7bf]"
              />
            </div>

            {isSearchOpen && (
              <div className="absolute top-[calc(100%+12px)] z-30 w-full overflow-hidden rounded-[28px] border border-sky-100 bg-white/95 p-2 shadow-[0_24px_48px_rgba(74,141,194,0.16)] backdrop-blur-sm">
                {hasSearchSuggestions ? (
                  <div className="max-h-[22rem] overflow-y-auto">
                    {experienceSearchSuggestions.length > 0 && (
                      <div className="px-2 pb-2">
                        <p className="px-2 pb-2 text-[10px] font-extrabold tracking-[0.12em] text-[#7da2c1] uppercase">
                          Experiences
                        </p>
                        <div className="space-y-1">
                          {experienceSearchSuggestions.map((event) => (
                            <button
                              key={event.id}
                              type="button"
                              onClick={() => handleExperienceSelect(event.id)}
                              className="flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-[#16304c] outline-none hover:bg-[#eef8ff]"
                            >
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#eef8ff] text-[#0e8ae0]">
                                <Compass className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1 text-left">
                                <span className="block truncate font-bold">
                                  {event.title}
                                </span>
                                <span className="block truncate text-xs text-[#6f8daa]">
                                  {event.location ??
                                    event.mood ??
                                    "Explore this experience"}
                                </span>
                              </span>
                              <ArrowRight className="h-4 w-4 shrink-0 text-[#9db8cf]" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {hostSearchSuggestions.length > 0 && (
                      <div className="px-2 pb-2">
                        <p className="px-2 pb-2 text-[10px] font-extrabold tracking-[0.12em] text-[#7da2c1] uppercase">
                          Hosts
                        </p>
                        <div className="space-y-1">
                          {hostSearchSuggestions.map((host) => {
                            const fullName =
                              `${host.first_name} ${host.last_name}`.trim() ||
                              host.first_name;
                            return (
                              <button
                                key={host.id}
                                type="button"
                                onClick={() => handleHostSelect(host.id)}
                                className="flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-[#16304c] outline-none hover:bg-[#eef8ff]"
                              >
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#eef8ff] text-[#0e8ae0]">
                                  <UserRound className="h-4 w-4" />
                                </span>
                                <span className="min-w-0 flex-1 text-left">
                                  <span className="block truncate font-bold">
                                    {fullName}
                                  </span>
                                  <span className="flex items-center gap-1 truncate text-xs text-[#6f8daa]">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    {host.city}
                                  </span>
                                </span>
                                <ArrowRight className="h-4 w-4 shrink-0 text-[#9db8cf]" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {quickFilterSuggestions.length > 0 && (
                      <div className="px-2">
                        <p className="px-2 pb-2 text-[10px] font-extrabold tracking-[0.12em] text-[#7da2c1] uppercase">
                          Quick Filters
                        </p>
                        <div className="space-y-1">
                          {quickFilterSuggestions.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() =>
                                handleQuickFilterSelect(
                                  item as Exclude<ExplorePill, "All">,
                                )
                              }
                              className="flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-[#16304c] outline-none hover:bg-[#eef8ff]"
                            >
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#eef8ff] text-[#0e8ae0]">
                                <Sparkles className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1 text-left">
                                <span className="block truncate font-bold">
                                  Filter by {item}
                                </span>
                                <span className="block truncate text-xs text-[#6f8daa]">
                                  Narrow the explore feed instantly
                                </span>
                              </span>
                              <ArrowRight className="h-4 w-4 shrink-0 text-[#9db8cf]" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-[#6f8daa]">
                    No matches for &quot;{query.trim()}&quot;.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Category pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            {EXPLORE_PILLS.map((item) => {
              const isActive = pill === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPill(item)}
                  className={`inline-flex items-center justify-center rounded-full border border-sky-200 px-4 py-2 text-[11px] font-extrabold tracking-[0.08em] uppercase shadow-[0_10px_24px_rgba(74,141,194,0.08)] ${
                    isActive
                      ? "bg-[#dff3ff] text-[#0e8ae0]"
                      : "bg-white/90 text-[#5a88ac]"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {/* Event-only filter selects */}
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="relative">
              <label htmlFor="price-filter" className="sr-only">
                Price range
              </label>
              <select
                id="price-filter"
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}
                className="h-9 rounded-full border border-sky-200 bg-white/90 px-4 text-[11px] font-extrabold tracking-[0.08em] text-[#5a88ac] uppercase shadow-[0_10px_24px_rgba(74,141,194,0.08)] outline-none"
              >
                <option value="any">Price: Any</option>
                <option value="free">Free</option>
                <option value="under_500">Under ₹500</option>
                <option value="500_1500">₹500–₹1,500</option>
                <option value="1500_3000">₹1,500–₹3,000</option>
                <option value="3000_plus">₹3,000+</option>
              </select>
            </div>

            <div className="relative">
              <label htmlFor="duration-filter" className="sr-only">
                Duration
              </label>
              <select
                id="duration-filter"
                value={durationFilter}
                onChange={(e) =>
                  setDurationFilter(e.target.value as DurationFilter)
                }
                className="h-9 rounded-full border border-sky-200 bg-white/90 px-4 text-[11px] font-extrabold tracking-[0.08em] text-[#5a88ac] uppercase shadow-[0_10px_24px_rgba(74,141,194,0.08)] outline-none"
              >
                <option value="any">Duration: Any</option>
                <option value="under_60">Under 1 hour</option>
                <option value="60_120">1–2 hours</option>
                <option value="120_240">2–4 hours</option>
                <option value="240_plus">4+ hours</option>
              </select>
            </div>

            <div className="relative">
              <label htmlFor="rating-filter" className="sr-only">
                Rating
              </label>
              <select
                id="rating-filter"
                value={ratingFilter}
                onChange={(e) =>
                  setRatingFilter(e.target.value as RatingFilter)
                }
                className="h-9 rounded-full border border-sky-200 bg-white/90 px-4 text-[11px] font-extrabold tracking-[0.08em] text-[#5a88ac] uppercase shadow-[0_10px_24px_rgba(74,141,194,0.08)] outline-none"
              >
                <option value="any">Rating: Any</option>
                <option value="new">New</option>
                <option value="3_5_plus">3.5+</option>
                <option value="4_0_plus">4.0+</option>
                <option value="4_5_plus">4.5+</option>
              </select>
            </div>
          </div>

          <p className="mt-2 text-xs font-medium text-[#7da2c1]">
            Price, duration, and rating filters apply to experiences only.
          </p>
        </section>

        {/* Hosts section */}
        <section className="mt-7">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="font-[Outfit,sans-serif] text-3xl font-bold tracking-[-0.05em] sm:text-5xl">
              Find Your Kind of People
            </h2>
            <Link
              href="/hosts"
              className="inline-flex items-center gap-2 text-sm font-extrabold text-[#0e8ae0] hover:text-[#0b6eb1]"
            >
              View All
              <span aria-hidden="true">›</span>
            </Link>
          </div>

          {hostMoodFilters.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {hostMoodFilters.map((mood) => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => setHostMoodFilter(mood)}
                  className={`inline-flex items-center justify-center rounded-full border border-sky-200 px-4 py-2 text-[11px] font-extrabold tracking-[0.08em] uppercase shadow-[0_10px_24px_rgba(74,141,194,0.08)] ${
                    hostMoodFilter === mood
                      ? "bg-[#dff3ff] text-[#0e8ae0]"
                      : "bg-white/90 text-[#5a88ac]"
                  }`}
                >
                  {getMoodDisplayLabel(mood)}
                </button>
              ))}
            </div>
          )}

          {hostsLoading ? (
            <div className="flex items-center justify-center py-14">
              <LuLoader2 className="h-8 w-8 animate-spin text-[#0094CA]" />
            </div>
          ) : filteredHosts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-sky-200 bg-white/80 py-10 text-center text-sm text-[#6f8daa]">
              No hosts found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filteredHosts.map((host) => {
                const fullName =
                  `${host.first_name} ${host.last_name}`.trim() ||
                  host.first_name;
                const hostMoods = getHostMoodTags(host.id, hostMoodMap, 2);
                return (
                  <Link
                    key={host.id}
                    href={`/host/${host.id}`}
                    className="overflow-hidden rounded-[22px] border border-[#aeddf89e] bg-white shadow-[0_14px_32px_rgba(77,140,190,0.08)] transition hover:-translate-y-1"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={host.avatar_url ?? "/assets/home/people1.png"}
                      alt={fullName}
                      loading="lazy"
                      className="h-[214px] w-full object-cover"
                    />
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="line-clamp-1 text-[15px] font-bold text-[#16304c]">
                          {fullName}
                        </h3>
                        <span className="rounded-full bg-[#f5fbff] px-2.5 py-1 text-[10px] font-extrabold tracking-[0.08em] text-[#0e8ae0] uppercase">
                          {host.avg_rating && host.avg_rating > 0
                            ? host.avg_rating.toFixed(1)
                            : "NEW"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#6f8daa]">
                        <strong className="font-extrabold text-[#16304c]">
                          {host.tagline ?? "Local Host"}
                        </strong>
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#6f8daa]">
                        {host.bio ??
                          "Hosting thoughtful sessions around the city."}
                      </p>
                      {hostMoods.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {hostMoods.map((mood) => (
                            <span
                              key={mood}
                              className="rounded-full bg-[#f5fbff] px-2.5 py-1 text-[10px] font-extrabold tracking-[0.08em] text-[#0e8ae0] uppercase"
                            >
                              {getMoodDisplayLabel(mood)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Experiences section */}
        <section className="mt-7">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-[Outfit,sans-serif] text-3xl font-bold tracking-[-0.05em] sm:text-5xl">
                Discover Experiences
              </h2>
              <p className="mt-1 text-sm text-[#6f8daa]">
                Curated activities
                {location?.city ? ` around ${location.city}` : ""}.
              </p>
            </div>
            <span className="inline-flex items-center justify-center rounded-full border border-sky-200 bg-white/90 px-4 py-2 text-[11px] font-extrabold tracking-[0.08em] text-[#5a88ac] uppercase shadow-[0_10px_24px_rgba(74,141,194,0.08)]">
              Sort by&nbsp;&nbsp;Recommended
            </span>
          </div>

          {eventsLoading ? (
            <div className="flex items-center justify-center py-14">
              <LuLoader2 className="h-8 w-8 animate-spin text-[#0094CA]" />
            </div>
          ) : visibleEvents.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-sky-200 bg-white/80 py-10 text-center text-sm text-[#6f8daa]">
              No experiences found.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {visibleEvents.map((event) => (
                  <ExperienceCard
                    key={event.id}
                    id={event.id}
                    headline={event.mood ?? event.location ?? "Experience"}
                    title={event.title}
                    description={
                      event.hook_line ??
                      event.description ??
                      "Discover a hosted experience near you."
                    }
                    imageUrl={event.cover_image_url ?? "/assets/home/hiking.jpg"}
                    rating={
                      event.avg_rating !== null &&
                      event.avg_rating !== undefined &&
                      event.avg_rating !== 0
                        ? event.avg_rating.toFixed(1)
                        : "New"
                    }
                    price={formatPrice(event.price_cents)}
                    time={event.time}
                    isRecurring={event.is_recurring}
                    capacity={event.capacity}
                    totalBookings={event.total_bookings}
                    recurrenceRule={event.recurrence_rule}
                    nextAvailableDate={event.next_available_date}
                  />
                ))}
              </div>

              <div className="mt-7 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleExperiences((prev) => prev + 8)}
                  disabled={!canLoadMore}
                  className="rounded-full border border-sky-200 bg-white/90 px-5 py-3 text-sm font-extrabold text-[#3d7eaf] shadow-[0_10px_24px_rgba(74,141,194,0.08)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Load More Experiences
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <components.Home.Footer />
    </main>
  );
}
