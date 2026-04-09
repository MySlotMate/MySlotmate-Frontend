"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useListPublicEvents } from "~/hooks/useApi";
import { getSavedLocation, type CityLocation } from "~/components/LocationModal";
import { LuLoader2 } from "react-icons/lu";
import * as components from "~/components";
import Breadcrumb from "~/components/Breadcrumb";

interface ExperienceCardProps {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  pricing: string;
  duration: string;
  mood?: string;
}

const ExperienceCard = ({
  id,
  title,
  description,
  imageUrl,
  pricing,
  duration,
  mood,
}: ExperienceCardProps) => {
  return (
    <Link
      href={`/experience/${id}`}
      className="overflow-hidden rounded-[22px] border border-[#aeddf89e] bg-white shadow-[0_14px_32px_rgba(77,140,190,0.08)] transition hover:-translate-y-1"
    >
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl || "/assets/home/hiking.jpg"}
          alt={title}
          className="h-[190px] w-full object-cover"
        />
        {mood ? (
          <span className="absolute left-3 top-3 rounded-full bg-[#f5fbff] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#0e8ae0]">
            {mood}
          </span>
        ) : null}
      </div>

      <div className="p-3">
        <h3 className="line-clamp-1 text-[14px] font-bold text-[#16304c]">
          {title}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs text-[#6f8daa]">{description}</p>
        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-extrabold text-[#5e88ab]">
          <span>{duration}</span>
          <span>{pricing}</span>
        </div>
      </div>
    </Link>
  );
};

export default function ExperiencesPage() {
  const [location, setLocation] = useState<CityLocation | null>(null);
  const [filterByLocation, setFilterByLocation] = useState(true);
  const [moodFilter, setMoodFilter] = useState<string>("all");
  const { data: events, isLoading } = useListPublicEvents();

  useEffect(() => {
    setLocation(getSavedLocation());
  }, []);

  const formatPrice = (priceCents: number | null | undefined) => {
    if (!priceCents) return "Free";
    return `₹${(priceCents / 100).toFixed(0)}`;
  };

  const formatDuration = (mins: number | null | undefined) => {
    if (!mins) return "—";
    if (mins < 60) return `${mins} mins`;
    const hours = mins / 60;
    const rounded = Math.round(hours * 10) / 10;
    return `${rounded} Hours`;
  };

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    
    let filtered = events;
    
    // Filter out past events
    const now = new Date();
    filtered = filtered.filter((event) => {
      const eventDate = new Date(event.time);
      return eventDate > now;
    });
    
    // Filter by location
    if (filterByLocation && location) {
      const cityLower = location.city.toLowerCase();
      const locationFiltered = filtered.filter((event) => {
        const eventLocation = event.location?.toLowerCase() ?? "";
        return eventLocation.includes(cityLower) || cityLower.includes(eventLocation);
      });
      if (locationFiltered.length > 0) {
        filtered = locationFiltered;
      }
    }

    // Filter by mood
    if (moodFilter !== "all") {
      filtered = filtered.filter((event) => 
        event.mood?.toLowerCase() === moodFilter.toLowerCase()
      );
    }

    return filtered;
  }, [events, location, filterByLocation, moodFilter]);

  const moods = ["all", "adventure", "wellness", "social", "chill", "creative"];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fafeff,#f2faff)] text-[#16304c]">
      <components.Navbar />
      
      <div className="mx-auto w-full max-w-[77rem] site-x py-8 pt-24">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Experiences" }]} className="mb-6" />
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="font-[Outfit,sans-serif] text-3xl font-bold tracking-[-0.05em] sm:text-5xl">
              Trending Now
            </h1>
            
            {location && (
              <button
                onClick={() => setFilterByLocation(!filterByLocation)}
                className={`rounded-full border border-sky-200 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] shadow-[0_10px_24px_rgba(74,141,194,0.08)] transition-all ${
                  filterByLocation
                    ? "bg-[#dff3ff] text-[#0e8ae0]"
                    : "bg-white/90 text-[#5a88ac] hover:bg-white"
                }`}
              >
                {filterByLocation ? location.city : "Show All Locations"}
              </button>
            )}
          </div>

          {/* Mood Filters */}
          <div className="flex gap-2 flex-wrap">
            {moods.map((mood) => (
              <button
                key={mood}
                onClick={() => setMoodFilter(mood)}
                className={`rounded-full border border-sky-200 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] shadow-[0_10px_24px_rgba(74,141,194,0.08)] transition-all ${
                  moodFilter === mood
                    ? "bg-[#dff3ff] text-[#0e8ae0]"
                    : "bg-white/90 text-[#5a88ac] hover:bg-white"
                }`}
              >
                {mood === "all" ? "All" : mood}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LuLoader2 className="h-10 w-10 animate-spin text-[#0094CA]" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-sky-200 bg-white/80 py-10 text-center text-sm text-[#6f8daa]">
            No experiences found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredEvents.map((event) => (
              <ExperienceCard
                key={event.id}
                id={event.id}
                title={event.title}
                description={
                  event.hook_line ??
                  event.description ??
                  "Discover a hosted experience near you."
                }
                imageUrl={event.cover_image_url ?? "/assets/home/hiking.jpg"}
                pricing={formatPrice(event.price_cents)}
                duration={formatDuration(event.duration_minutes)}
                mood={event.mood ?? undefined}
              />
            ))}
          </div>
        )}
      </div>

      <components.Home.Footer />
    </main>
  );
}
