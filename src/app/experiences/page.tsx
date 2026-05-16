"use client";
import { useEffect, useState, useMemo } from "react";
import { useListPublicEvents } from "~/hooks/useApi";
import {
  getSavedLocation,
  type CityLocation,
} from "~/components/LocationModal";
import { LuLoader2 } from "react-icons/lu";
import * as components from "~/components";
import Breadcrumb from "~/components/Breadcrumb";

import { ExperienceCard } from "~/components/ExperienceCard";


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
        return (
          eventLocation.includes(cityLower) || cityLower.includes(eventLocation)
        );
      });
      if (locationFiltered.length > 0) {
        filtered = locationFiltered;
      }
    }

    // Filter by mood
    if (moodFilter !== "all") {
      filtered = filtered.filter(
        (event) => event.mood?.toLowerCase() === moodFilter.toLowerCase(),
      );
    }

    return filtered;
  }, [events, location, filterByLocation, moodFilter]);

  const moods = ["all", "adventure", "wellness", "social", "chill", "creative"];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fafeff,#f2faff)] text-[#16304c]">
      <components.Navbar />

      <div className="site-x mx-auto w-full max-w-[77rem] py-8">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Experiences" }]}
          className="mb-6"
        />
        <div className="mb-8 flex flex-col gap-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="font-[Outfit,sans-serif] text-3xl font-bold tracking-[-0.05em] sm:text-5xl">
              Trending Now
            </h1>

            {location && (
              <button
                onClick={() => setFilterByLocation(!filterByLocation)}
                className={`rounded-full border border-sky-200 px-4 py-2 text-[11px] font-extrabold tracking-[0.08em] uppercase shadow-[0_10px_24px_rgba(74,141,194,0.08)] transition-all ${
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
          <div className="flex flex-wrap gap-6">
            {moods.map((mood) => (
              <button
                key={mood}
                onClick={() => setMoodFilter(mood)}
                className={`rounded-full border border-sky-200 px-4 py-2 text-[11px] font-extrabold tracking-[0.08em] uppercase shadow-[0_10px_24px_rgba(74,141,194,0.08)] transition-all ${
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filteredEvents.map((event) => (
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
                location={event.location}
                isRecurring={event.is_recurring}
                capacity={event.capacity}
                totalBookings={event.total_bookings}
                recurrenceRule={event.recurrence_rule}
                nextAvailableDate={event.next_available_date}
              />
            ))}
          </div>
        )}
      </div>

      <components.Home.Footer />
    </main>
  );
}
