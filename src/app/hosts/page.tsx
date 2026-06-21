"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useListHosts, useListPublicEvents } from "~/hooks/useApi";
import {
  getSavedLocation,
  type CityLocation,
} from "~/components/LocationModal";
import { LuLoader2 } from "react-icons/lu";
import * as components from "~/components";
import Breadcrumb from "~/components/Breadcrumb";
import {
  buildUpcomingHostMoodMap,
  getAvailableHostMoodFilters,
  getHostMoodTags,
  hostMatchesMood,
} from "~/lib/hostMoodFilters";
import { getMoodDisplayLabel } from "~/lib/moods";

interface HostCardProps {
  id: string;
  name: string;
  imageUrl: string;
  rating: string;
  headline?: string;
  description?: string;
  isVerified?: boolean;
  moods?: string[];
}

const HostCard = ({
  id,
  name,
  imageUrl,
  rating,
  headline,
  description,
  isVerified,
  moods = [],
}: HostCardProps) => {
  return (
    <Link
      href={`/host/${id}`}
      className="group overflow-hidden rounded-[22px] border border-[#aeddf89e] bg-white shadow-[0_14px_32px_rgba(77,140,190,0.08)] transition hover:-translate-y-1"
    >
      <div className="relative h-[214px] w-full overflow-hidden bg-[#f8fbff]">
        {imageUrl && !imageUrl.includes("people1.") ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center bg-[#E9EDF0]">
            {/* WhatsApp Style Silhouette */}
            <div className="relative flex h-full w-full items-center justify-center opacity-40">
              <svg
                viewBox="0 0 24 24"
                className="h-2/3 w-2/3 fill-[#ABB4BA]"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>

            {/* Subtle Gradient Overlay for Depth */}
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent to-black/5" />
          </div>
        )}
        <span className="absolute top-3 right-3 z-10 rounded-full bg-[#f5fbff] px-2.5 py-1 text-[10px] font-extrabold tracking-[0.08em] text-[#0e8ae0] uppercase shadow-sm">
          {rating === "0" ? "New" : rating}
        </span>
        {isVerified ? (
          <span className="absolute right-3 bottom-3 z-10">
            <div className="relative">
              <div className="absolute inset-0 scale-150 animate-ping rounded-full bg-white opacity-20" />
              {/* White background to fill the transparent tick, inset slightly to avoid outer border */}
              <div className="absolute inset-[2px] rounded-full bg-white" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/home/verified.svg"
                alt="Verified"
                loading="lazy"
                className="relative h-7 w-7 drop-shadow-md"
              />
            </div>
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
        {moods.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {moods.map((mood) => (
              <span
                key={mood}
                className="rounded-full bg-[#f5fbff] px-2.5 py-1 text-[10px] font-extrabold tracking-[0.08em] text-[#0e8ae0] uppercase"
              >
                {getMoodDisplayLabel(mood)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
};

export default function HostsPage() {
  const [location, setLocation] = useState<CityLocation | null>(null);
  const [filterByLocation, setFilterByLocation] = useState(true);
  const [moodFilter, setMoodFilter] = useState("all");
  const [userId, setUserId] = useState<string | null>(null);
  const { data: hosts, isLoading } = useListHosts();
  const { data: events } = useListPublicEvents();

  useEffect(() => {
    setLocation(getSavedLocation());
    setUserId(localStorage.getItem("msm_host_id"));
  }, []);

  const hostMoodMap = useMemo(() => buildUpcomingHostMoodMap(events), [events]);
  const moodFilters = useMemo(
    () => getAvailableHostMoodFilters(hostMoodMap),
    [hostMoodMap],
  );

  useEffect(() => {
    if (!moodFilters.includes(moodFilter)) {
      setMoodFilter("all");
    }
  }, [moodFilter, moodFilters]);

  const filteredHosts = useMemo(() => {
    if (!hosts) return [];

    // Filter out current user's profile
    let filtered = hosts.filter((host) => host.id !== userId);

    if (filterByLocation && location) {
      const cityLower = location.city.toLowerCase();
      const locationFiltered = filtered.filter((host) => {
        const hostCity = host.city?.toLowerCase() ?? "";
        return hostCity.includes(cityLower) || cityLower.includes(hostCity);
      });

      if (locationFiltered.length > 0) {
        filtered = locationFiltered;
      }
    }

    if (moodFilter !== "all") {
      filtered = filtered.filter((host) =>
        hostMatchesMood(host.id, moodFilter, hostMoodMap),
      );
    }

    return filtered;
  }, [hosts, location, filterByLocation, userId, moodFilter, hostMoodMap]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fafeff,#f2faff)] text-[#16304c]">
      <components.Navbar />

      <div className="site-x mx-auto w-full max-w-[77rem] py-8 pt-24">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Hosts" }]}
          className="mb-6"
        />
        <div className="mb-8 flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="font-[Outfit,sans-serif] text-3xl font-bold tracking-[-0.05em] sm:text-5xl">
              Find Your Kind of People
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

          {moodFilters.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {moodFilters.map((mood) => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => setMoodFilter(mood)}
                  className={`rounded-full border border-sky-200 px-4 py-2 text-[11px] font-extrabold tracking-[0.08em] uppercase shadow-[0_10px_24px_rgba(74,141,194,0.08)] transition-all ${
                    moodFilter === mood
                      ? "bg-[#dff3ff] text-[#0e8ae0]"
                      : "bg-white/90 text-[#5a88ac] hover:bg-white"
                  }`}
                >
                  {getMoodDisplayLabel(mood)}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LuLoader2 className="h-10 w-10 animate-spin text-[#0094CA]" />
          </div>
        ) : filteredHosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg text-gray-500">No hosts found</p>
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
                name={
                  `${host.first_name} ${host.last_name}`.trim() ||
                  host.first_name
                }
                imageUrl={host.avatar_url ?? "/assets/home/people1.webp"}
                rating={
                  host.avg_rating && host.avg_rating > 0
                    ? host.avg_rating.toFixed(1)
                    : "0"
                }
                headline={host.tagline ?? "Local Host"}
                description={
                  host.bio ?? "Hosting thoughtful sessions around the city."
                }
                isVerified={host.is_identity_verified}
                moods={getHostMoodTags(host.id, hostMoodMap, 2)}
              />
            ))}
          </div>
        )}
      </div>

      <components.Home.Footer />
    </main>
  );
}
