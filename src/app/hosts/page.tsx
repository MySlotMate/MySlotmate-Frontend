"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useListHosts } from "~/hooks/useApi";
import { getSavedLocation, type CityLocation } from "~/components/LocationModal";
import { LuLoader2 } from "react-icons/lu";
import * as components from "~/components";

interface HostCardProps {
  id: string;
  name: string;
  imageUrl: string;
  rating: string;
  isVerified?: boolean;
}

const HostCard = ({ id, name, imageUrl, rating, isVerified }: HostCardProps) => {
  return (
    <Link
      href={`/host/${id}`}
      className="flex flex-col items-center hover:scale-105 transition-transform"
    >
      <div
        className="bg-gray-200 rounded-2xl w-32 h-40 sm:w-36 sm:h-44 md:w-40 md:h-48 overflow-hidden relative"
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

export default function HostsPage() {
  const [location, setLocation] = useState<CityLocation | null>(null);
  const [filterByLocation, setFilterByLocation] = useState(true);
  const { data: hosts, isLoading } = useListHosts();

  useEffect(() => {
    setLocation(getSavedLocation());
  }, []);

  const filteredHosts = useMemo(() => {
    if (!hosts) return [];
    if (!filterByLocation || !location) return hosts;

    const cityLower = location.city.toLowerCase();
    const locationFiltered = hosts.filter((host) => {
      const hostCity = host.city?.toLowerCase() ?? "";
      return hostCity.includes(cityLower) || cityLower.includes(hostCity);
    });

    return locationFiltered.length > 0 ? locationFiltered : hosts;
  }, [hosts, location, filterByLocation]);

  return (
    <main className="min-h-screen bg-white">
      <components.Navbar />
      
      <div className="max-w-6xl mx-auto px-6 py-8 pt-24">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Interesting People Near You
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

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LuLoader2 className="h-10 w-10 animate-spin text-[#0094CA]" />
          </div>
        ) : filteredHosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-gray-500 text-lg">No hosts found</p>
            {filterByLocation && location && (
              <button
                onClick={() => setFilterByLocation(false)}
                className="mt-4 text-[#0094CA] hover:underline"
              >
                View hosts from all locations
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 md:gap-8">
            {filteredHosts.map((host) => (
              <HostCard
                key={host.id}
                id={host.id}
                name={host.first_name}
                imageUrl={host.avatar_url ?? "/assets/home/people1.png"}
                rating={(host.avg_rating ?? 4.5).toFixed(1)}
                isVerified={host.is_identity_verified}
              />
            ))}
          </div>
        )}
      </div>

      <components.Home.Footer />
    </main>
  );
}
