"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LuLoader2 } from "react-icons/lu";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useListHosts } from "~/hooks/useApi";

interface HostCardProps {
  id: string;
  /** Clean slug for the link; falls back to id (both resolve). */
  slug?: string;
  name: string;
  imageUrl: string;
  rating: string;
  city: string;
  isVerified?: boolean;
}
const HostCard = ({
  id,
  slug,
  name,
  imageUrl,
  rating,
  city,
  isVerified,
}: HostCardProps) => {
  return (
    <Link
      href={`/host/${slug ?? id}`}
      // Added w-[260px] to match the other sections
      className="group w-[260px] shrink-0 snap-start overflow-hidden rounded-[28px] border border-white/10 bg-[#080914] shadow-[0_16px_34px_rgba(72,128,173,0.1)] transition hover:-translate-y-1"
    >
      {/* Changed h-[286px] w-[272px] to aspect-square w-full */}
      <div className="relative aspect-square w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl || "/assets/home/people1.webp"}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {isVerified ? (
          <span className="absolute right-3 bottom-3 z-10 rounded-full bg-[#A020F0] p-1.5 text-white shadow-sm">
            <svg
              className="h-3.5 w-3.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        ) : null}
      </div>

      <div className="space-y-1.5 px-5 pt-5 pb-6">
        <p className="line-clamp-1 text-[10px] font-extrabold tracking-[0.09em] text-[#3f89c3] uppercase">
          {city}
        </p>
        {/* Adjusted from text-4xl to text-2xl for better fit */}
        <h3 className="line-clamp-1 text-2xl leading-tight font-bold tracking-[-0.03em] text-white">
          {name}
        </h3>
        <p className="line-clamp-2 min-h-[32px] text-xs leading-relaxed text-[#A5A8C3]">
          Find experiences, connect, and spend meaningful time.
        </p>
        <div className="pt-2">
          <span className="text-[11px] font-bold tracking-[0.08em] text-[#4b94c8] uppercase">
            Rating {rating}
          </span>
        </div>
      </div>
    </Link>
  );
};
const AllHosts = ({ currentHostId }: { currentHostId?: string | null }) => {
  const [mounted, setMounted] = useState(false);
  const cardsViewportRef = useRef<HTMLDivElement>(null);
  const { data: hosts, isLoading } = useListHosts();

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayHosts = useMemo(() => {
    if (!mounted || !hosts) return [];
    return hosts.filter((host) => host.id !== currentHostId).slice(0, 8);
  }, [mounted, hosts, currentHostId]);

  const scrollCards = (direction: "left" | "right") => {
    const viewport = cardsViewportRef.current;
    if (!viewport) return;

    viewport.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  return (
    <section className="site-x w-full border-y border-white/10 bg-[#121426]">
      <div className="mx-auto w-full max-w-[1120px] py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#121426]/90 px-3.5 py-2 text-[11px] font-extrabold tracking-[0.08em] text-[#4a8ab8] uppercase">
              <span className="inline-block h-2 w-2 rounded-full bg-current" />
              Community
            </span>
            <h2 className="mt-4 font-[Outfit,sans-serif] text-4xl font-bold tracking-[-0.045em] text-white sm:text-6xl">
              Find People Like You
            </h2>
            <p className="mt-1.5 text-sm text-[#A5A8C3] sm:text-base">
              Discover hosts with similar interests and styles.
            </p>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={() => scrollCards("left")}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[#652A91]/60 bg-[#121426] text-[#D8B4FE] transition-all hover:bg-[#A020F0] hover:text-white disabled:opacity-30"
              aria-label="Scroll hosts left"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => scrollCards("right")}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[#652A91]/60 bg-[#121426] text-[#D8B4FE] transition-all hover:bg-[#A020F0] hover:text-white disabled:opacity-30"
              aria-label="Scroll hosts right"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div
          ref={cardsViewportRef}
          className="hide-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
        >
          {isLoading ? (
            <div className="flex w-full items-center justify-center py-12">
              <LuLoader2 className="h-8 w-8 animate-spin text-[#D8B4FE]" />
            </div>
          ) : displayHosts.length === 0 ? (
            <div className="flex w-full items-center justify-center rounded-3xl border border-dashed border-[#652A91]/60 bg-[#121426]/80 py-12 text-sm text-[#A5A8C3]">
              No hosts found.
            </div>
          ) : (
            displayHosts.map((host) => (
              <HostCard
                key={host.id}
                id={host.id}
                slug={host.slug}
                name={
                  `${host.first_name} ${host.last_name}`.trim() ||
                  host.first_name
                }
                imageUrl={host.avatar_url ?? "/assets/home/people1.webp"}
                rating={(
                  host.avg_rating_override ??
                  host.avg_rating ??
                  4.5
                ).toFixed(1)}
                city={host.city}
                isVerified={host.is_identity_verified}
              />
            ))
          )}
        </div>

        <div className="mt-5 md:hidden">
          <Link
            href="/hosts"
            className="text-sm font-extrabold text-[#D8B4FE] hover:text-[#0b6eb1]"
          >
            View All
          </Link>
        </div>
      </div>
    </section>
  );
};

export default AllHosts;
