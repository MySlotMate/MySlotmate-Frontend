"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useListPublicEvents } from "~/hooks/useApi";
import { getSavedLocation, type CityLocation } from "~/components/LocationModal";
import { LuLoader2 } from "react-icons/lu";
import * as components from "~/components";

interface ExperienceCardProps {
  id: string;
  title: string;
  imageUrl: string;
  pricing: string;
  mood?: string;
}

const ExperienceCard = ({ id, title, imageUrl, pricing, mood }: ExperienceCardProps) => {
  const moodColors: Record<string, string> = {
    adventure: "bg-green-500",
    wellness: "bg-purple-500",
    social: "bg-blue-500",
    culinary: "bg-orange-500",
    chill: "bg-cyan-500",
    creative: "bg-pink-500",
  };

  return (
    <Link
      href={`/experience/${id}`}
      className="flex flex-col hover:scale-105 transition-transform"
    >
      <div
        className="bg-gray-200 rounded-2xl w-full aspect-[4/5] overflow-hidden relative"
        style={{
          backgroundImage: `url(${imageUrl || "/assets/home/hiking.jpg"})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {mood && (
          <span className={`absolute top-3 left-3 px-2 py-1 text-xs text-white rounded-full capitalize ${moodColors[mood.toLowerCase()] ?? "bg-[#0094CA]"}`}>
            {mood}
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-gray-800 mt-2 truncate">{title}</p>
      <p className="text-xs text-gray-500">{pricing}/guest</p>
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

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    
    let filtered = events;
    
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
    <main className="min-h-screen bg-white">
      <components.Navbar />
      
      <div className="max-w-6xl mx-auto px-6 py-8 pt-24">
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-semibold text-gray-900">
              Trending Now
            </h1>
            
            {location && (
              <button
                onClick={() => setFilterByLocation(!filterByLocation)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filterByLocation
                    ? "bg-[#0094CA] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {filterByLocation ? `📍 ${location.city}` : "Show All Locations"}
              </button>
            )}
          </div>

          {/* Mood Filters */}
          <div className="flex gap-2 flex-wrap">
            {moods.map((mood) => (
              <button
                key={mood}
                onClick={() => setMoodFilter(mood)}
                className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${
                  moodFilter === mood
                    ? "bg-[#0094CA] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {mood === "all" ? "🏠 All" : mood}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LuLoader2 className="h-10 w-10 animate-spin text-[#0094CA]" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-gray-500 text-lg">No experiences found</p>
            {(filterByLocation || moodFilter !== "all") && (
              <button
                onClick={() => {
                  setFilterByLocation(false);
                  setMoodFilter("all");
                }}
                className="mt-4 text-[#0094CA] hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
            {filteredEvents.map((event) => (
              <ExperienceCard
                key={event.id}
                id={event.id}
                title={event.title}
                imageUrl={event.cover_image_url ?? "/assets/home/hiking.jpg"}
                pricing={formatPrice(event.price_cents)}
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
