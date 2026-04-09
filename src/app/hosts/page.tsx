"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useListHosts } from "~/hooks/useApi";
import { getSavedLocation, type CityLocation } from "~/components/LocationModal";
import { LuLoader2 } from "react-icons/lu";
import * as components from "~/components";
import Breadcrumb from "~/components/Breadcrumb";


interface HostCardProps {
  id: string;
  name: string;
  imageUrl: string;
  rating: string;
  headline?: string;
  description?: string;
  isVerified?: boolean;
}

const HostCard = ({
  id,
  name,
  imageUrl,
  rating,
  headline,
  description,
  isVerified,
}: HostCardProps) => {
  return (
    <Link
      href={`/host/${id}`}
      className="group overflow-hidden rounded-[22px] border border-[#aeddf89e] bg-white shadow-[0_14px_32px_rgba(77,140,190,0.08)] transition hover:-translate-y-1"
    >
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl || "/assets/home/people1.png"}
          alt={name}
          className="h-[214px] w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute right-3 top-3 rounded-full bg-[#f5fbff] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#0e8ae0]">
          {rating}
        </span>
        {isVerified ? (
          <span className="absolute bottom-3 right-3 z-10 rounded-full bg-[#0094CA] p-1.5 text-white shadow-sm">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        ) : null}
      </div>

      <div className="p-4">
        <h3 className="line-clamp-1 text-[15px] font-bold text-[#16304c]">
          {name}
        </h3>
        <p className="mt-1 text-xs text-[#6f8daa]">
          <strong className="font-extrabold text-[#16304c]">
            {headline ?? "Local Host"}
          </strong>
        </p>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#6f8daa]">
          {description ?? "Hosting thoughtful sessions around the city."}
        </p>
      </div>
    </Link>
  );
};

export default function HostsPage() {
  const [location, setLocation] = useState<CityLocation | null>(null);
  const [filterByLocation, setFilterByLocation] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { data: hosts, isLoading } = useListHosts();

  useEffect(() => {
    setLocation(getSavedLocation());
    setUserId(localStorage.getItem("msm_host_id"));
  }, []);

  const filteredHosts = useMemo(() => {
    if (!hosts) return [];
    
    // Filter out current user's profile
    const filtered = hosts.filter(host => host.id !== userId);
    
    if (!filterByLocation || !location) return filtered;

    const cityLower = location.city.toLowerCase();
    const locationFiltered = filtered.filter((host) => {
      const hostCity = host.city?.toLowerCase() ?? "";
      return hostCity.includes(cityLower) || cityLower.includes(hostCity);
    });

    return locationFiltered.length > 0 ? locationFiltered : filtered;
  }, [hosts, location, filterByLocation, userId]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fafeff,#f2faff)] text-[#16304c]">
      <components.Navbar />

      <div className="mx-auto w-full max-w-[77rem] site-x py-8 pt-24">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Hosts" }]} className="mb-6" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="font-[Outfit,sans-serif] text-3xl font-bold tracking-[-0.05em] sm:text-5xl">
            Interesting People Near You
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredHosts.map((host) => (
              <HostCard
                key={host.id}
                id={host.id}
                name={`${host.first_name} ${host.last_name}`.trim() || host.first_name}
                imageUrl={host.avatar_url ?? "/assets/home/people1.png"}
                rating={(host.avg_rating ?? 4.5).toFixed(1)}
                headline={host.tagline ?? "Local Host"}
                description={host.bio ?? "Hosting thoughtful sessions around the city."}
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
