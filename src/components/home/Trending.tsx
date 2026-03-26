"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useListPublicEvents } from "~/hooks/useApi";
import { getSavedLocation, calculateDistance, type CityLocation } from "../LocationModal";
import { LuLoader2 } from "react-icons/lu";
import { normalizeMood, useMood } from "~/context/MoodContext";

interface TrendingCardProps {
  id: string;
  title: string;
  imageUrl: string;
  pricing: string;
}

const TrendingCard = ({ id, title, imageUrl, pricing }: TrendingCardProps) => {
  return (
    <Link
      href={`/experience/${id}`}
      className="shrink-0 snap-start flex flex-col hover:scale-105 transition-transform"
    >
      <div
        className="bg-gray-200 rounded-2xl w-44 h-56 overflow-hidden relative"
        style={{
          backgroundImage: `url(${imageUrl || "/assets/home/hiking.jpg"})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
      </div>
      <p className="text-sm font-medium text-gray-800 mt-2 truncate max-w-[11rem]">{title}</p>
      <p className="text-xs text-gray-500">{pricing}/guest</p>
    </Link>
  );
};

const Trending = () => {
  const [location, setLocation] = useState<CityLocation | null>(null);
  const [mounted, setMounted] = useState(false);
  const { data: events, isLoading } = useListPublicEvents();
  const { selectedMoodKey } = useMood();

  // Load saved location on mount
  useEffect(() => {
    setLocation(getSavedLocation());
    setMounted(true);
    
    // Listen for location changes
    const handleStorageChange = () => {
      setLocation(getSavedLocation());
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Filter events by mood and distance (nearest first)
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    
    // Filter out past events
    const now = new Date();
    let filtered = events.filter((event) => {
      const eventDate = new Date(event.time);
      return eventDate > now;
    });

    if (selectedMoodKey !== "all") {
      filtered = filtered.filter((event) => normalizeMood(event.mood) === selectedMoodKey);
    }
    
    if (!mounted || !location) {
      return filtered.slice(0, 8);
    }
    
    // Calculate distance for each event
    const eventsWithDistance = filtered.map((event) => {
      let distance = Infinity; // Default: very far away
      
      // If event has coordinates, calculate distance
      if (event.location_lat !== null && event.location_lng !== null) {
        distance = calculateDistance(
          location.lat,
          location.lng,
          event.location_lat,
          event.location_lng
        );
      } else {
        distance = Infinity; // Will appear at the end
      }
      
      return { event, distance };
    });
    
    // Sort by distance (nearest first) and return top 8
    const sorted = eventsWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8)
      .map(({ event }) => event);
    
    return sorted;
  }, [events, location, mounted, selectedMoodKey]);

  // Format price from cents to display string
  const formatPrice = (priceCents: number | null | undefined) => {
    if (!priceCents) return "Free";
    return `₹${(priceCents / 100).toFixed(0)}`;
  };

  return (
    <div className="mx-auto mt-8 flex w-full max-w-7xl flex-col">
      <div className="flex justify-between items-center mb-4 site-x">
        <h1 className="text-xl font-semibold text-gray-900">
          Trending Now
        </h1>
        <Link href="/experiences" className="text-[#0094CA] text-sm flex items-center gap-2 hover:opacity-80">
          <span>see more</span>
          <span className="bg-[#0094CA] w-8 h-8 flex items-center justify-center rounded-full">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </Link>
      </div>

      <div
        className="flex flex-row items-center justify-start gap-6 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar site-x"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center w-full py-12">
            <LuLoader2 className="h-8 w-8 animate-spin text-[#0094CA]" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center w-full py-12">
            <p className="text-gray-500">No activities found in your area</p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <TrendingCard
              key={event.id}
              id={event.id}
              title={event.title}
              imageUrl={event.cover_image_url ?? "/assets/home/hiking.jpg"}
              pricing={formatPrice(event.price_cents)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Trending;
