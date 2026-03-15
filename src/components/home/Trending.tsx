"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useListPublicEvents } from "~/hooks/useApi";
import { getSavedLocation, type CityLocation } from "../LocationModal";
import { LuLoader2 } from "react-icons/lu";

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
  const { data: events, isLoading } = useListPublicEvents();

  // Load saved location on mount
  useEffect(() => {
    setLocation(getSavedLocation());
    
    // Listen for location changes
    const handleStorageChange = () => {
      setLocation(getSavedLocation());
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Filter events by location
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (!location) return events.slice(0, 8); // Show first 8 if no location
    
    // Filter events whose location matches the selected city
    const cityLower = location.city.toLowerCase();
    const locationFiltered = events.filter((event) => {
      const eventLocation = event.location?.toLowerCase() ?? "";
      return eventLocation.includes(cityLower) || cityLower.includes(eventLocation);
    });
    
    // If no events in selected city, show all events
    return locationFiltered.length > 0 ? locationFiltered.slice(0, 8) : events.slice(0, 8);
  }, [events, location]);

  // Format price from cents to display string
  const formatPrice = (priceCents: number | null | undefined) => {
    if (!priceCents) return "Free";
    return `₹${(priceCents / 100).toFixed(0)}`;
  };

  return (
    <div className="flex flex-col w-full px-6 md:px-12 lg:px-20 mt-12">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold text-gray-900">
          Trending Now
        </h1>
        <button className="text-[#0094CA] text-sm flex items-center gap-2 hover:opacity-80">
          <span>see more</span>
          <span className="bg-[#0094CA] w-8 h-8 flex items-center justify-center rounded-full">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </button>
      </div>

      <div
        className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar"
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