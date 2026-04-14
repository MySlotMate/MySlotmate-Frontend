"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LuLoader2 } from "react-icons/lu";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { toast } from "sonner";
import { useListPublicEvents, useIsExperienceSaved, useSaveExperience, useUnsaveExperience } from "~/hooks/useApi";
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
  const [userId, setUserId] = useState<string | null>(null);
  
  const { data: savedStatus } = useIsExperienceSaved(id, userId);
  const saveExperience = useSaveExperience();
  const unsaveExperience = useUnsaveExperience();
  
  const isSaved = savedStatus?.saved ?? false;
  
  useEffect(() => {
    const id = localStorage.getItem("msm_user_id");
    if (id) {
      setUserId(id);
    }
  }, []);
  
  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!userId) {
      toast.error("Please login to save experiences");
      return;
    }
    
    if (isSaved) {
      unsaveExperience.mutate(
        { eventId: id, userId },
        { onSuccess: () => toast.success("Removed from saved") }
      );
    } else {
      saveExperience.mutate(
        { user_id: userId, event_id: id },
        { onSuccess: () => toast.success("Saved to your list") }
      );
    }
  };
  return (
    <Link
      href={`/experience/${id}`}
      // Added w-[260px] to match the PeopleCard width for consistency
      className="group shrink-0 snap-start w-[260px] overflow-hidden rounded-[28px] border border-[#b8dbf39c] bg-[#f8fcff] shadow-[0_16px_34px_rgba(72,128,173,0.1)] transition hover:-translate-y-1"
    >
      {/* Changed fixed h/w to aspect-square w-full */}
      <div className="relative aspect-square w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={imageUrl || "/assets/home/hiking.jpg"} 
          alt={title} 
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
        />
        <span className="absolute left-3 top-3 z-10 rounded-full bg-[#f5fbff]/90 backdrop-blur-sm px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#0e8ae0] shadow-sm">
          {mood}
        </span>
        
        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saveExperience.isPending || unsaveExperience.isPending}
          className="absolute right-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-blue-50 hover:shadow-lg disabled:opacity-50"
          aria-label={isSaved ? "Remove from saved" : "Save experience"}
        >
          <Heart
            className="h-6 w-6 transition"
            fill={isSaved ? "#0094CA" : "none"}
            stroke="#0094CA"
            strokeWidth={2}
          />
        </button>
      </div>

      {/* Adjusted padding and spacing for better balance in a square layout */}
      <div className="flex flex-col justify-between space-y-2 px-5 pb-6 pt-5">
        <div>
          <h3 className="line-clamp-2 min-h-[48px] text-[20px] font-bold leading-[1.2] tracking-[-0.03em] text-[#16304c]">
            {title}
          </h3>
          <p className="mt-1 text-xs font-medium text-[#6f8daa]">Curated local session</p>
        </div>
        
        <div className="mt-2 flex items-center justify-between border-t border-[#aeddf847] pt-3 text-[11px] font-bold text-[#5e88ab]">
          <span>{duration}</span>
          <span className="text-[#0e8ae0]">{pricing} / slot</span>
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
