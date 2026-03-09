"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useListHosts } from "~/hooks/useApi";
import { getSavedLocation, type CityLocation } from "../LocationModal";
import { LuLoader2 } from "react-icons/lu";

interface PeopleCardProps {
  id: string;
  name: string;
  imageUrl: string;
  rating: string;
  isVerified?: boolean;
}

const PeopleCard = ({ id, name, imageUrl, rating, isVerified }: PeopleCardProps) => {
  return (
    <Link
      href={`/host/${id}`}
      className="shrink-0 snap-start flex flex-col items-center hover:scale-105 transition-transform"
    >
      <div
        className="bg-gray-200 rounded-2xl w-40 h-48 overflow-hidden relative"
        style={{
          backgroundImage: `url(${imageUrl || "/assets/home/people1.png"})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {isVerified && (
          <div className="absolute bottom-2 right-2 bg-[#0094CA] rounded-full p-1">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-gray-800 mt-2 text-center">{name}</p>
      <div className="flex items-center gap-1 mt-1">
        <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <p className="text-sm text-gray-600">{rating}</p>
      </div>
    </Link>
  );
};

const People = () => {
  const [location, setLocation] = useState<CityLocation | null>(null);
  const { data: hosts, isLoading } = useListHosts();

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

  // Filter hosts by location (city match)
  const filteredHosts = useMemo(() => {
    if (!hosts) return [];
    if (!location) return hosts.slice(0, 8); // Show first 8 if no location
    
    // Filter hosts whose city matches the selected location
    const cityLower = location.city.toLowerCase();
    const locationFiltered = hosts.filter((host) => {
      const hostCity = host.city?.toLowerCase() ?? "";
      return hostCity.includes(cityLower) || cityLower.includes(hostCity);
    });
    
    // If no hosts in selected city, show all hosts
    return locationFiltered.length > 0 ? locationFiltered.slice(0, 8) : hosts.slice(0, 8);
  }, [hosts, location]);

  return (
    <div className="flex flex-col w-full px-6 md:px-12 lg:px-20 mt-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold text-gray-900">
          Interesting People Near You
        </h1>
        <Link href="/hosts" className="text-[#0094CA] text-sm flex items-center gap-2 hover:opacity-80">
          <span>see more</span>
          <span className="bg-[#0094CA] w-8 h-8 flex items-center justify-center rounded-full">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </Link>
      </div>

      <div
        className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center w-full py-12">
            <LuLoader2 className="h-8 w-8 animate-spin text-[#0094CA]" />
          </div>
        ) : filteredHosts.length === 0 ? (
          <div className="flex items-center justify-center w-full py-12">
            <p className="text-gray-500">No hosts found in your area</p>
          </div>
        ) : (
          filteredHosts.map((host) => (
            <PeopleCard
              key={host.id}
              id={host.id}
              name={host.first_name}
              imageUrl={host.avatar_url ?? "/assets/home/people1.png"}
              rating={(host.avg_rating ?? 4.5).toFixed(1)}
              isVerified={host.is_identity_verified}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default People;