"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LuLoader2 } from "react-icons/lu";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useListHosts } from "~/hooks/useApi";
import {
  POPULAR_CITIES,
  calculateDistance,
  getSavedLocation,
  type CityLocation,
} from "../LocationModal";

interface PeopleCardProps {
  id: string;
  name: string;
  imageUrl: string;
  rating: string;
  headline: string;
  description: string;
  isVerified?: boolean;
}

const PeopleCard = ({ id, name, imageUrl, rating, headline, description, isVerified }: PeopleCardProps) => {
  return (
    <Link
      href={`/host/${id}`}
      className="shrink-0 snap-start overflow-hidden rounded-[28px] border border-[#b8dbf39c] bg-[#f8fcff] shadow-[0_16px_34px_rgba(72,128,173,0.1)] transition hover:-translate-y-1"
    >
      <div className="relative h-[286px] w-[272px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl || "/assets/home/people1.png"} alt={name} className="h-full w-full object-cover" />
        {isVerified ? (
          <span className="absolute bottom-3 right-3 rounded-full bg-[#0094CA] p-1.5 text-white">
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

      <div className="space-y-1.5 px-4 pb-5 pt-4">
        <p className="line-clamp-1 text-[11px] font-extrabold uppercase tracking-[0.09em] text-[#3f89c3]">{headline}</p>
        <p className="line-clamp-1 text-4xl font-bold leading-[1] tracking-[-0.03em] text-[#16304c]">{name}</p>
        <p className="line-clamp-2 text-sm leading-7 text-[#6f8daa]">{description}</p>
        <div className="pt-0.5 text-xs font-bold text-[#5e88ab]">Rating {rating}</div>
      </div>
    </Link>
  );
};

const People = ({ currentHostId }: { currentHostId?: string | null }) => {
  const [location, setLocation] = useState<CityLocation | null>(null);
  const [mounted, setMounted] = useState(false);
  const cardsViewportRef = useRef<HTMLDivElement>(null);
  const { data: hosts, isLoading } = useListHosts();

  useEffect(() => {
    setLocation(getSavedLocation());
    setMounted(true);

    const handleStorageChange = () => {
      setLocation(getSavedLocation());
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const filteredHosts = useMemo(() => {
    if (!hosts) return [];

    const hostsWithoutCurrentHost = currentHostId
      ? hosts.filter((host) => host.id !== currentHostId)
      : hosts;

    if (!mounted || !location) {
      return hostsWithoutCurrentHost.slice(0, 8);
    }

    return hostsWithoutCurrentHost
      .map((host) => {
        const hostCity = POPULAR_CITIES.find(
          (city) => city.city.toLowerCase() === host.city.toLowerCase(),
        );

        const distance = hostCity
          ? calculateDistance(location.lat, location.lng, hostCity.lat, hostCity.lng)
          : Number.POSITIVE_INFINITY;

        return { host, distance };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8)
      .map(({ host }) => host);
  }, [hosts, location, mounted, currentHostId]);

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
              Local Hosts
            </span>
            <h2 className="mt-4 font-[Outfit,sans-serif] text-4xl font-bold tracking-[-0.045em] text-[#16304c] sm:text-6xl">
              Interesting People Near You
            </h2>
            <p className="mt-1.5 text-sm text-[#6f8daa] sm:text-base">
              Local hosts creating thoughtful sessions around the city.
            </p>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <button
              type="button"
              onClick={() => scrollCards("left")}
              className="grid h-14 w-14 place-items-center border border-[#bdddf4] bg-[#f7fcff] text-[#2f7eb5] transition hover:bg-white"
              aria-label="Scroll hosts left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollCards("right")}
              className="grid h-14 w-14 place-items-center border border-[#bdddf4] bg-[#f7fcff] text-[#2f7eb5] transition hover:bg-white"
              aria-label="Scroll hosts right"
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
          ) : filteredHosts.length === 0 ? (
            <div className="flex w-full items-center justify-center rounded-3xl border border-dashed border-sky-200 bg-white/80 py-12 text-sm text-[#6f8daa]">
              No hosts found in your area.
            </div>
          ) : (
            filteredHosts.map((host) => (
              <PeopleCard
                key={host.id}
                id={host.id}
                name={`${host.first_name} ${host.last_name}`.trim() || host.first_name}
                imageUrl={host.avatar_url ?? "/assets/home/people1.png"}
                rating={(host.avg_rating ?? 4.5).toFixed(1)}
                headline={(host.tagline ?? "Local Host").toUpperCase()}
                description={host.bio ?? "Sharing meaningful experiences and thoughtful local sessions."}
                isVerified={host.is_identity_verified}
              />
            ))
          )}
        </div>

        <div className="mt-5 md:hidden">
          <Link href="/hosts" className="text-sm font-extrabold text-[#0e8ae0] hover:text-[#0b6eb1]">
            View All
          </Link>
        </div>
      </div>
    </section>
  );
};

export default People;
