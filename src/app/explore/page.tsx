"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LuLoader2 } from "react-icons/lu";
import { Search } from "lucide-react";
import * as components from "~/components";
import { useListHosts, useListPublicEvents } from "~/hooks/useApi";
import { getSavedLocation, type CityLocation } from "~/components/LocationModal";

type ExplorePill = "All" | "Adventure" | "Creative" | "Food" | "Wellness";

const PILL_TO_MOODS: Record<Exclude<ExplorePill, "All">, string[]> = {
  Adventure: ["adventure", "adventurous"],
  Creative: ["creative"],
  Food: ["food", "culinary"],
  Wellness: ["wellness"],
};

type PriceFilter = "any" | "free" | "under_500" | "500_1500" | "1500_3000" | "3000_plus";
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

export default function ExplorePage() {
  const { data: hosts, isLoading: hostsLoading } = useListHosts();
  const { data: events, isLoading: eventsLoading } = useListPublicEvents();
  const [location, setLocation] = useState<CityLocation | null>(null);

  const [query, setQuery] = useState("");
  const [pill, setPill] = useState<ExplorePill>("All");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("any");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("any");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("any");

  const [visibleExperiences, setVisibleExperiences] = useState(8);

  useEffect(() => {
    setLocation(getSavedLocation());
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    setVisibleExperiences(8);
  }, [priceFilter, durationFilter, ratingFilter]);

  const filteredHosts = useMemo(() => {
    const list = hosts ?? [];

    const searched = normalizedQuery
      ? list.filter((host) => {
          const haystack = [
            host.first_name,
            host.last_name,
            host.city,
            host.tagline,
            host.bio,
            ...(host.expertise_tags ?? []),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(normalizedQuery);
        })
      : list;

    const pillFiltered = pill === "All"
      ? searched
      : searched.filter((host) => {
          const haystack = [
            host.tagline,
            host.bio,
            ...(host.expertise_tags ?? []),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          const moodMatchers = PILL_TO_MOODS[pill] ?? [];
          return moodMatchers.some((m) => haystack.includes(m));
        });

    return pillFiltered.slice(0, 4);
  }, [hosts, normalizedQuery, pill]);

  const filteredExperiences = useMemo(() => {
    const list = [...(events ?? [])];

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
  }, [events, priceFilter, durationFilter, ratingFilter]);

  const visibleEvents = filteredExperiences.slice(0, visibleExperiences);
  const canLoadMore = visibleExperiences < filteredExperiences.length;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fafeff,#f2faff)] text-[#16304c]">
      <components.Navbar />

      <div className="mx-auto w-full max-w-[77.5rem] site-x py-8 pt-24">
        <section className="pb-2">
          <div className="flex h-[54px] items-center gap-3 rounded-full border border-sky-200 bg-white/90 px-4 shadow-[0_10px_24px_rgba(74,141,194,0.08)]">
            <Search className="h-[18px] w-[18px] text-[#6f8daa]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search experiences, hosts, or interests"
              className="w-full bg-transparent text-sm text-[#16304c] outline-none placeholder:text-[#8aa7bf]"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(["All", "Adventure", "Creative", "Food", "Wellness"] as const).map((item) => {
              const isActive = pill === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPill(item)}
                  className={`inline-flex items-center justify-center rounded-full border border-sky-200 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] shadow-[0_10px_24px_rgba(74,141,194,0.08)] ${
                    isActive ? "bg-[#dff3ff] text-[#0e8ae0]" : "bg-white/90 text-[#5a88ac]"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <div className="relative">
              <label htmlFor="price-filter" className="sr-only">
                Price range
              </label>
              <select
                id="price-filter"
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}
                className="h-9 rounded-full border border-sky-200 bg-white/90 px-4 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#5a88ac] shadow-[0_10px_24px_rgba(74,141,194,0.08)] outline-none"
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
                className="h-9 rounded-full border border-sky-200 bg-white/90 px-4 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#5a88ac] shadow-[0_10px_24px_rgba(74,141,194,0.08)] outline-none"
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
                onChange={(e) => setRatingFilter(e.target.value as RatingFilter)}
                className="h-9 rounded-full border border-sky-200 bg-white/90 px-4 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#5a88ac] shadow-[0_10px_24px_rgba(74,141,194,0.08)] outline-none"
              >
                <option value="any">Rating: Any</option>
                <option value="new">New</option>
                <option value="3_5_plus">3.5+</option>
                <option value="4_0_plus">4.0+</option>
                <option value="4_5_plus">4.5+</option>
              </select>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="font-[Outfit,sans-serif] text-3xl font-bold tracking-[-0.05em] sm:text-5xl">
              Interesting People Near You
            </h2>
            <Link
              href="/hosts"
              className="inline-flex items-center gap-2 text-sm font-extrabold text-[#0e8ae0] hover:text-[#0b6eb1]"
            >
              View All
              <span aria-hidden="true">›</span>
            </Link>
          </div>

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
                const fullName = `${host.first_name} ${host.last_name}`.trim() || host.first_name;
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
                      className="h-[214px] w-full object-cover"
                    />
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="line-clamp-1 text-[15px] font-bold text-[#16304c]">
                          {fullName}
                        </h3>
                        <span className="rounded-full bg-[#f5fbff] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#0e8ae0]">
                          {(host.avg_rating ?? 4.8).toFixed(1)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#6f8daa]">
                        <strong className="font-extrabold text-[#16304c]">
                          {host.tagline ?? "Local Host"}
                        </strong>
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#6f8daa]">
                        {host.bio ?? "Hosting thoughtful sessions around the city."}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-[Outfit,sans-serif] text-3xl font-bold tracking-[-0.05em] sm:text-5xl">
                Discover Experiences
              </h2>
              <p className="mt-1 text-sm text-[#6f8daa]">
                Curated activities{location?.city ? ` around ${location.city}` : ""}.
              </p>
            </div>

            <span className="inline-flex items-center justify-center rounded-full border border-sky-200 bg-white/90 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#5a88ac] shadow-[0_10px_24px_rgba(74,141,194,0.08)]">
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
                  <Link
                    key={event.id}
                    href={`/experience/${event.id}`}
                    className="overflow-hidden rounded-[22px] border border-[#aeddf89e] bg-white shadow-[0_14px_32px_rgba(77,140,190,0.08)] transition hover:-translate-y-1"
                  >
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={event.cover_image_url ?? "/assets/home/hiking.jpg"}
                        alt={event.title}
                        className="h-[190px] w-full object-cover"
                      />
                      {event.mood ? (
                        <span className="absolute left-3 top-3 rounded-full bg-[#f5fbff] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#0e8ae0]">
                          {event.mood}
                        </span>
                      ) : null}
                    </div>

                    <div className="p-3">
                      <h3 className="line-clamp-1 text-[14px] font-bold text-[#16304c]">
                        {event.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-[#6f8daa]">
                        {event.hook_line ??
                          event.description ??
                          "Discover a hosted experience near you."}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-extrabold text-[#5e88ab]">
                        <span>{formatDuration(event.duration_minutes)}</span>
                        <span>{formatPrice(event.price_cents)}</span>
                      </div>
                    </div>
                  </Link>
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
