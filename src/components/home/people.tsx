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
const PeopleCard = ({
  id,
  name,
  imageUrl,
  rating,
  headline,
  description,
  isVerified,
}: PeopleCardProps) => {
  return (
    <Link
      href={`/host/${id}`}
      // Added w-[260px] to keep the card width consistent
      className="group shrink-0 snap-start w-[260px] overflow-hidden rounded-[28px] border border-[#d6ebf7cc] bg-white shadow-[0_16px_34px_rgba(72,128,173,0.08)] transition hover:-translate-y-1"
    >
      {/* Changed h-[272px] w-[272px] to aspect-square w-full */}
      <div className="relative aspect-square w-full overflow-hidden rounded-[28px] bg-[#f8fbff]">
        {imageUrl && !imageUrl.includes("people1.png") ? (
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
            <div className="relative h-full w-full flex items-center justify-center opacity-40">
              <svg
                viewBox="0 0 24 24"
                className="h-2/3 w-2/3 fill-[#ABB4BA]"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>

            {/* Subtle Gradient Overlay for Depth */}
            <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/5 pointer-events-none" />
          </div>
        )}
        {isVerified ? (
          <span className="absolute bottom-3 right-3 z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20 scale-150" />
              {/* White background to fill the transparent tick, inset slightly to avoid outer border */}
              <div className="absolute inset-[2px] bg-white rounded-full" />
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

      <div className="space-y-1.5 px-5 pb-6 pt-4">
        <p className="line-clamp-1 text-[10px] font-extrabold uppercase tracking-[0.09em] text-[#3f89c3]">
          {headline}
        </p>
        <p className="line-clamp-1 text-2xl font-bold leading-tight tracking-[-0.03em] text-[#16304c]">
          {name}
        </p>
        <p className="line-clamp-2 min-h-[40px] text-xs leading-relaxed text-[#6f8daa]">
          {description}
        </p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-bold text-[#5e88ab]">
            {rating === "0" ? "New Host" : `Rating ${rating}`}
          </span>
        </div>
      </div>
    </Link>
  );
};

const People = ({ currentHostId }: { currentHostId?: string | null }) => {
  const [location, setLocation] = useState<CityLocation | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isAtScrollEnd, setIsAtScrollEnd] = useState(false);
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
          ? calculateDistance(
            location.lat,
            location.lng,
            hostCity.lat,
            hostCity.lng,
          )
          : Number.POSITIVE_INFINITY;

        return { host, distance };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8)
      .map(({ host }) => host);
  }, [hosts, location, mounted, currentHostId]);

  const updateScrollEndState = () => {
    const viewport = cardsViewportRef.current;
    if (!viewport) return;

    const overflowThresholdPx = 2;
    const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const overflowing = maxScrollLeft > overflowThresholdPx;

    const endThresholdPx = 12;
    const atEnd = overflowing && Math.ceil(viewport.scrollLeft + endThresholdPx) >= maxScrollLeft;

    setIsOverflowing(overflowing);
    setIsAtScrollEnd(atEnd);
  };

  useEffect(() => {
    const viewport = cardsViewportRef.current;
    if (!viewport) return;

    const handleScroll = () => updateScrollEndState();

    const raf = window.requestAnimationFrame(() => updateScrollEndState());
    viewport.addEventListener("scroll", handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => updateScrollEndState());
    resizeObserver.observe(viewport);

    return () => {
      window.cancelAnimationFrame(raf);
      viewport.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [filteredHosts.length, isLoading]);

  const scrollCards = (direction: "left" | "right") => {
    const viewport = cardsViewportRef.current;
    if (!viewport) return;

    viewport.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });

    window.requestAnimationFrame(() => updateScrollEndState());
    window.setTimeout(() => updateScrollEndState(), 350);
  };

  return (
    <section className="w-full border-y border-[#aeddf847]">
      <div className="mx-auto w-full max-w-[1120px] py-14">
        <div className="mb-14 flex items-end justify-between gap-4">
          <div>
            {/* <span className="inline-flex items-center gap-2 rounded-full border border-[#a9daf5a6] bg-white/90 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4a8ab8]">
              <span className="inline-block h-2 w-2 rounded-full bg-current" />
              Local Hosts
            </span> */}
            <h2 className="mt-4 font-[Outfit,sans-serif] text-4xl font-bold tracking-[-0.045em] text-[#16304c] sm:text-6xl">
              Find Your Kind of People
            </h2>
            <p className="mt-5 text-sm text-[#6f8daa] sm:text-base">
              From creators to thinkers — find people for real-world experiences
            </p>
          </div>

          {isOverflowing ? (
            <div className="hidden items-center gap-3 md:flex">
              <button
                type="button"
                onClick={() => scrollCards("left")}
                className="grid h-14 w-14 place-items-center border border-[#bdddf4] bg-[#f7fcff] text-[#2f7eb5] transition hover:bg-white"
                aria-label="Scroll hosts left"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {isAtScrollEnd ? (
                <Link
                  href="/hosts"
                  className="inline-flex h-14 items-center justify-center gap-2 border border-[#bdddf4] bg-[#f7fcff] px-5 text-sm font-extrabold text-[#2f7eb5] transition hover:bg-white"
                  aria-label="See more hosts"
                >
                  See more
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => scrollCards("right")}
                  className="grid h-14 w-14 place-items-center border border-[#bdddf4] bg-[#f7fcff] text-[#2f7eb5] transition hover:bg-white"
                  aria-label="Scroll hosts right"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
          ) : null}
        </div>

        <div
          ref={cardsViewportRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 hide-scrollbar"
        >
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
                rating={host.avg_rating && host.avg_rating > 0 ? host.avg_rating.toFixed(1) : "0"}
                headline={(host.tagline ?? "Local Host").toUpperCase()}
                description={
                  host.bio ??
                  "Sharing meaningful experiences and thoughtful local sessions."
                }
                isVerified={host.is_identity_verified}
              />
            ))
          )}
        </div>

        <div className="mt-5 md:hidden">
          <Link
            href="/hosts"
            className="text-sm font-extrabold text-[#0e8ae0] hover:text-[#0b6eb1]"
          >
            View All
          </Link>
        </div>
      </div>
    </section>
  );
};

export default People;
