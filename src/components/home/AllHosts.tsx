"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LuLoader2 } from "react-icons/lu";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useListHosts } from "~/hooks/useApi";

interface HostCardProps {
  id: string;
  name: string;
  imageUrl: string;
  rating: string;
  city: string;
  isVerified?: boolean;
}
const HostCard = ({ id, name, imageUrl, rating, city, isVerified }: HostCardProps) => {
  return (
    <Link
      href={`/host/${id}`}
      // Added w-[260px] to match the other sections
      className="group shrink-0 snap-start w-[260px] overflow-hidden rounded-[28px] border border-[#b8dbf39c] bg-[#f8fcff] shadow-[0_16px_34px_rgba(72,128,173,0.1)] transition hover:-translate-y-1"
    >
      {/* Changed h-[286px] w-[272px] to aspect-square w-full */}
      <div className="relative aspect-square w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={imageUrl || "/assets/home/people1.png"} 
          alt={name} 
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
        />
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

      <div className="space-y-1.5 px-5 pb-6 pt-5">
        <p className="line-clamp-1 text-[10px] font-extrabold uppercase tracking-[0.09em] text-[#3f89c3]">
          {city}
        </p>
        {/* Adjusted from text-4xl to text-2xl for better fit */}
        <h3 className="line-clamp-1 text-2xl font-bold leading-tight tracking-[-0.03em] text-[#16304c]">
          {name}
        </h3>
        <p className="line-clamp-2 min-h-[32px] text-xs leading-relaxed text-[#6f8daa]">
          Find experiences, connect, and spend meaningful time.
        </p>
        <div className="pt-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#4b94c8]">
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
    <section className="w-full border-y border-[#aeddf847] bg-[linear-gradient(180deg,#edf8ff,#f7fcff)] site-x">
      <div className="mx-auto w-full max-w-[1120px] py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#a9daf5a6] bg-white/90 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4a8ab8]">
              <span className="inline-block h-2 w-2 rounded-full bg-current" />
              Community
            </span>
            <h2 className="mt-4 font-[Outfit,sans-serif] text-4xl font-bold tracking-[-0.045em] text-[#16304c] sm:text-6xl">
              Find People Like You
            </h2>
            <p className="mt-1.5 text-sm text-[#6f8daa] sm:text-base">Discover hosts with similar interests and styles.</p>
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
          ) : displayHosts.length === 0 ? (
            <div className="flex w-full items-center justify-center rounded-3xl border border-dashed border-sky-200 bg-white/80 py-12 text-sm text-[#6f8daa]">
              No hosts found.
            </div>
          ) : (
            displayHosts.map((host) => (
              <HostCard
                key={host.id}
                id={host.id}
                name={`${host.first_name} ${host.last_name}`.trim() || host.first_name}
                imageUrl={host.avatar_url ?? "/assets/home/people1.png"}
                rating={(host.avg_rating ?? 4.5).toFixed(1)}
                city={host.city}
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

export default AllHosts;
