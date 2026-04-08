"use client";
import React, { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HeroCard from "./HeroCard";
import { useListPublicEvents } from "~/hooks/useApi";
import { type EventDTO } from "~/lib/api";

interface HeroProps {
  filterBarRef?: React.RefObject<HTMLDivElement | null>;
}

const Hero: React.FC<HeroProps> = ({ filterBarRef }) => {
  const router = useRouter();
  const [hostId, setHostId] = useState<string | null>(null);
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const { data: events } = useListPublicEvents();

  useEffect(() => {
    const id = localStorage.getItem("msm_host_id");
    setHostId(id);
  }, []);

  useEffect(() => {
    if (document.readyState === "complete") {
      setIsPageLoaded(true);
      return;
    }

    const handleWindowLoad = () => setIsPageLoaded(true);
    window.addEventListener("load", handleWindowLoad);
    return () => window.removeEventListener("load", handleWindowLoad);
  }, []);

  const upcomingEvents: EventDTO[] = useMemo(() => {
    if (!events) return [];

    const now = new Date();
    const futureEvents = events.filter((event) => new Date(event.time) > now);
    if (futureEvents.length === 0) return [];

    return [...futureEvents].sort(() => Math.random() - 0.5).slice(0, 4);
  }, [events]);

  const cardData = [
    upcomingEvents[0]
      ? {
          id: upcomingEvents[0].id,
          photo: upcomingEvents[0].cover_image_url ?? "/assets/home/heropic1.png",
          type: upcomingEvents[0].mood ?? "Adventure",
          title: upcomingEvents[0].title,
          description: upcomingEvents[0].hook_line ?? "Discover a hosted experience near you.",
          duration: `${upcomingEvents[0].duration_minutes ?? 0} mins`,
        }
      : {
          photo: "/assets/home/heropic1.png",
          type: "Adventure",
          title: "Mountain Trekking",
          description: "Sunrise hikes with local experts.",
          duration: "120 mins",
        },
    upcomingEvents[1]
      ? {
          id: upcomingEvents[1].id,
          photo: upcomingEvents[1].cover_image_url ?? "/assets/home/heropic2.png",
          type: upcomingEvents[1].mood ?? "Social",
          title: upcomingEvents[1].title,
          description: upcomingEvents[1].hook_line ?? "Meet people through shared interests.",
          duration: `${upcomingEvents[1].duration_minutes ?? 0} mins`,
        }
      : {
          photo: "/assets/home/heropic2.png",
          type: "Creative",
          title: "Scuba Diving",
          description: "Dive into curated local adventures.",
          duration: "90 mins",
        },
    upcomingEvents[2]
      ? {
          id: upcomingEvents[2].id,
          photo: upcomingEvents[2].cover_image_url ?? "/assets/home/heropic3.png",
          type: upcomingEvents[2].mood ?? "Relaxing",
          title: upcomingEvents[2].title,
          description: upcomingEvents[2].hook_line ?? "Try something new this weekend.",
          duration: `${upcomingEvents[2].duration_minutes ?? 0} mins`,
        }
      : {
          photo: "/assets/home/heropic3.png",
          type: "Wellness",
          title: "Urban Photography Walk",
          description: "Capture city stories with a host.",
          duration: "180 mins",
        },
    upcomingEvents[3]
      ? {
          id: upcomingEvents[3].id,
          photo: upcomingEvents[3].cover_image_url ?? "/assets/home/heropic4.png",
          type: upcomingEvents[3].mood ?? "Cultural",
          title: upcomingEvents[3].title,
          description: upcomingEvents[3].hook_line ?? "Explore stories with local experts.",
          duration: `${upcomingEvents[3].duration_minutes ?? 0} mins`,
        }
      : {
          photo: "/assets/home/heropic1.png",
          type: "Cultural",
          title: "Heritage Walk",
          description: "Uncover hidden stories around your city.",
          duration: "150 mins",
        },
  ];

  const handleBookTime = () => {
    if (filterBarRef?.current) {
      filterBarRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    router.push("/experiences");
  };

  const handleListTime = () => {
    if (hostId) {
      router.push("/host-dashboard/experiences");
      return;
    }
    router.push("/become-host");
  };

  return (
    <section className="relative pt-4 z-0 w-full site-x">
      <div className="mx-auto grid w-full max-w-[1120px] gap-8 py-8 md:py-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-10">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#a9daf5a6] bg-white/90 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4a8ab8]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
            Find Meaningful Time
          </span>

          <h1 className="max-w-[560px] font-[Outfit,sans-serif] text-4xl font-extrabold leading-[0.95] tracking-[-0.05em] text-[#16304c] sm:text-5xl lg:text-7xl">
            Book People&apos;s
            <span className="text-[#0e8ae0]"> Time.</span>
          </h1>

          <p className="max-w-[520px] text-sm leading-7 text-[#6f8daa] sm:text-base">
            Pick an interest, match with local hosts, and spend your time on experiences that actually feel memorable.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={handleBookTime}
              className="rounded-lg bg-[linear-gradient(135deg,#1fa7ff,#63ceff)] px-5 py-3 text-sm font-extrabold text-white shadow-[0_16px_32px_rgba(31,167,255,0.24)] transition hover:-translate-y-0.5"
            >
              Book Time
            </button>
            <button
              onClick={handleListTime}
              className="rounded-lg border border-[#78bce759] bg-white/90 px-5 py-3 text-sm font-extrabold text-[#336f9b] shadow-[0_10px_24px_rgba(74,141,194,0.08)] transition hover:-translate-y-0.5"
            >
              List Time
            </button>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <div className="flex -space-x-3">
              {["/assets/home/profile1.png", "/assets/home/profile2.png", "/assets/home/profile3.png"].map((img, idx) => (
                <div key={img} className="h-11 w-11 overflow-hidden rounded-full border-4 border-[#f7fbff] shadow-[0_10px_22px_rgba(84,140,191,0.08)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Community ${idx + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
              <div className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-[#f7fbff] bg-[#f1f3f6] text-[10px] font-bold text-[#2b2d33] shadow-[0_10px_22px_rgba(84,140,191,0.08)]">
                +10K
              </div>
            </div>
            <p className="text-sm text-[#9096a0]">Used by interesting people</p>
          </div>
        </div>

        <div className="relative min-h-[420px] overflow-visible rounded-[38px] md:min-h-[520px]">
          <div className="absolute inset-x-2 bottom-4 top-8 rounded-[38px] border border-[#aeddf899] bg-[linear-gradient(180deg,#e8f6ff,#f8fcff)] shadow-[0_24px_60px_rgba(58,119,172,0.12)]" />

          <div className={`absolute inset-x-4 bottom-8 top-12 z-10 overflow-visible md:inset-x-6 md:bottom-10 md:top-14 ${isPageLoaded ? "hero-stack-ready" : ""}`}>
            <div className="hero-stack-in absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 md:left-[18%] md:top-[2%] md:translate-x-0 md:translate-y-0">
              <div className="hero-stack-drop">
                <div className="-translate-x-3 -translate-y-14 -rotate-[7deg] md:translate-x-0 md:translate-y-0 md:-rotate-[7deg]">
                  <HeroCard {...cardData[0]!} />
                </div>
              </div>
            </div>
            <div className="hero-stack-in hero-stack-in-2 absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 md:left-[49%] md:top-[16%] md:translate-x-0 md:translate-y-0">
              <div className="hero-stack-drop">
                <div className="translate-x-4 -translate-y-2 rotate-[3deg] md:translate-x-0 md:translate-y-0 md:rotate-[3deg]">
                  <HeroCard {...cardData[1]!} />
                </div>
              </div>
            </div>
            <div className="hero-stack-in hero-stack-in-3 absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 md:left-[7%] md:top-[43%] md:translate-x-0 md:translate-y-0">
              <div className="hero-stack-drop">
                <div className="-translate-x-5 translate-y-10 -rotate-[9deg] md:translate-x-0 md:translate-y-0 md:-rotate-[9deg]">
                  <HeroCard {...cardData[2]!} />
                </div>
              </div>
            </div>
            <div className="hero-stack-in hero-stack-in-4 absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 md:left-[37%] md:top-[56%] md:translate-x-0 md:translate-y-0">
              <div className="hero-stack-drop">
                <div className="translate-x-6 translate-y-8 rotate-[6deg] md:translate-x-0 md:translate-y-0 md:rotate-[6deg]">
                  <HeroCard {...cardData[3]!} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
