"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LuLoader2 } from "react-icons/lu";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useListPublicEvents } from "~/hooks/useApi";
import { normalizeMood, useMood } from "~/context/MoodContext";
import { calculateDistance, getSavedLocation, type CityLocation } from "../LocationModal";

interface TrendingCardProps {
  id: string;
  title: string;
  imageUrl: string;
  pricing: string;
  duration: string;
  mood: string;
}

const TrendingCard = ({ id, title, imageUrl, pricing, duration, mood }: TrendingCardProps) => {
  return (
    <Link
      href={`/experience/${id}`}
      className="shrink-0 snap-start overflow-hidden rounded-[28px] border border-[#b8dbf39c] bg-[#f8fcff] shadow-[0_16px_34px_rgba(72,128,173,0.1)] transition hover:-translate-y-1"
    >
      <div className="relative h-[226px] w-[272px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl || "/assets/home/hiking.jpg"} alt={title} className="h-full w-full object-cover" />
        <span className="absolute left-3 top-3 rounded-full bg-[#f5fbff] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#0e8ae0]">
          {mood}
        </span>
      </div>
      <div className="space-y-1.5 px-4 pb-5 pt-4">
        <h3 className="line-clamp-2 text-[22px] font-bold leading-[1.1] tracking-[-0.03em] text-[#16304c]">{title}</h3>
        <p className="text-sm text-[#6f8daa]">Curated local session</p>
        <div className="mt-2 flex items-center justify-between text-xs font-bold text-[#5e88ab]">
          <span>{duration}</span>
          <span>{pricing} / slot</span>
        </div>
      </div>
    </Link>
  );
};

const Trending = () => {
  const [location, setLocation] = useState<CityLocation | null>(null);
  const [mounted, setMounted] = useState(false);
  const cardsViewportRef = useRef<HTMLDivElement>(null);
  const { data: events, isLoading } = useListPublicEvents();
  const { selectedMoodKey } = useMood();

  useEffect(() => {
    setLocation(getSavedLocation());
    setMounted(true);

    const handleStorageChange = () => setLocation(getSavedLocation());
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const filteredEvents = useMemo(() => {
    if (!events) return [];

    const now = new Date();
    let filtered = events.filter((event) => new Date(event.time) > now);

    if (selectedMoodKey !== "all") {
      filtered = filtered.filter((event) => normalizeMood(event.mood) === selectedMoodKey);
    }

    if (!mounted || !location) {
      return filtered.slice(0, 8);
    }

    return filtered
      .map((event) => {
        const distance =
          event.location_lat !== null && event.location_lng !== null
            ? calculateDistance(location.lat, location.lng, event.location_lat, event.location_lng)
            : Number.POSITIVE_INFINITY;

        return { event, distance };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8)
      .map(({ event }) => event);
  }, [events, location, mounted, selectedMoodKey]);

  const formatPrice = (priceCents: number | null | undefined) => {
    if (!priceCents) return "Free";
    return `\u20B9${Math.round(priceCents / 100)}`;
  };

  const scrollCards = (direction: "left" | "right") => {
    const viewport = cardsViewportRef.current;
    if (!viewport) return;

    viewport.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  return (
    <section className="w-full border-y border-[#aeddf847] bg-[linear-gradient(180deg,#edf8ff,#f7fcff)] site-x">
      <div className="mx-auto w-full max-w-[1120px] py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#a9daf5a6] bg-white/90 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4a8ab8]">
              <span className="inline-block h-2 w-2 rounded-full bg-current" />
              Trending
            </span>
            <h2 className="mt-4 font-[Outfit,sans-serif] text-4xl font-bold tracking-[-0.045em] text-[#16304c] sm:text-6xl">
              Trending Now
            </h2>
            <p className="mt-1.5 text-sm text-[#6f8daa] sm:text-base">Curated activities near your location.</p>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <button
              type="button"
              onClick={() => scrollCards("left")}
              className="grid h-14 w-14 place-items-center border border-[#bdddf4] bg-[#f7fcff] text-[#2f7eb5] transition hover:bg-white"
              aria-label="Scroll trending left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollCards("right")}
              className="grid h-14 w-14 place-items-center border border-[#bdddf4] bg-[#f7fcff] text-[#2f7eb5] transition hover:bg-white"
              aria-label="Scroll trending right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div ref={cardsViewportRef} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 hide-scrollbar">
          {isLoading ? (
            <div className="flex w-full items-center justify-center py-12">
              <LuLoader2 className="h-8 w-8 animate-spin text-[#0094CA]" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex w-full items-center justify-center rounded-3xl border border-dashed border-sky-200 bg-white/80 py-12 text-sm text-[#6f8daa]">
              No activities found in your area.
            </div>
          ) : (
            filteredEvents.map((event) => (
              <TrendingCard
                key={event.id}
                id={event.id}
                title={event.title}
                imageUrl={event.cover_image_url ?? "/assets/home/hiking.jpg"}
                pricing={formatPrice(event.price_cents)}
                duration={`${event.duration_minutes ?? 0} mins`}
                mood={event.mood ?? "Experience"}
              />
            ))
          )}
        </div>

        <div className="mt-5 md:hidden">
          <Link href="/experiences" className="text-sm font-extrabold text-[#0e8ae0] hover:text-[#0b6eb1]">
            View All
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Trending;
