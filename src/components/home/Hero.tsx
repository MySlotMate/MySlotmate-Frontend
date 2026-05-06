"use client";
import React, { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HeroCard from "./HeroCard";
import { BecomeHostModal } from "~/components/become-host";
import Breadcrumb from "~/components/Breadcrumb";
import { useListTimeAction } from "~/hooks/useListTimeAction";
import { useListPublicEvents } from "~/hooks/useApi";
import { type EventDTO } from "~/lib/api";

interface HeroProps {
  filterBarRef?: React.RefObject<HTMLDivElement | null>;
}

const Hero: React.FC<HeroProps> = ({ filterBarRef }) => {
  const router = useRouter();
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const { data: events } = useListPublicEvents();
  const { closeBecomeHostModal, handleListTimeClick, showBecomeHostModal } =
    useListTimeAction();

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
        photo:
          upcomingEvents[0].cover_image_url ?? "/assets/home/heropic1.png",
        type: upcomingEvents[0].mood ?? "Adventure",
        title: upcomingEvents[0].title,
        description:
          upcomingEvents[0].hook_line ??
          "Discover a hosted experience near you.",
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
        photo:
          upcomingEvents[1].cover_image_url ?? "/assets/home/heropic2.png",
        type: upcomingEvents[1].mood ?? "Social",
        title: upcomingEvents[1].title,
        description:
          upcomingEvents[1].hook_line ??
          "Meet people through shared interests.",
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
        photo:
          upcomingEvents[2].cover_image_url ?? "/assets/home/heropic3.png",
        type: upcomingEvents[2].mood ?? "Relaxing",
        title: upcomingEvents[2].title,
        description:
          upcomingEvents[2].hook_line ?? "Try something new this weekend.",
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
        photo:
          upcomingEvents[3].cover_image_url ?? "/assets/home/heropic4.png",
        type: upcomingEvents[3].mood ?? "Cultural",
        title: upcomingEvents[3].title,
        description:
          upcomingEvents[3].hook_line ??
          "Explore stories with local experts.",
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
      filterBarRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    router.push("/experiences");
  };

  const handleListTime = () => {
    handleListTimeClick();
  };

  return (
    <section className="site-x relative z-0 w-full pt-[calc(var(--navbar-height)+1rem)] pb-20">

      <div className="mx-auto grid w-full max-w-[1120px] gap-8 pt-4 pb-8 md:pt-3 md:pb-4 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-10">
        <div className="space-y-6 sm:space-y-7">

          <h1 className="mt-[18px] mb-[14px] max-w-full font-outfit text-[clamp(3rem,5.8vw,5.1rem)] font-extrabold leading-[0.95] tracking-[-0.06em] text-[#16304c]">
            Book People&apos;s
            <span className="text-[#0e8ae0]"> Time.</span>
          </h1>

          <p className="max-w-[490px] font-manrope text-[1rem] leading-[1.65] text-[#6f8daa]">
            Spend time doing things that matter.<br />Walk, learn, create, and explore with thoughtful hosts.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={handleBookTime}
              suppressHydrationWarning
              className="w-full rounded-lg bg-[linear-gradient(135deg,#1fa7ff,#63ceff)] px-5 py-3 text-sm font-extrabold text-white shadow-[0_16px_32px_rgba(31,167,255,0.24)] transition hover:-translate-y-0.5 sm:w-auto sm:min-w-[180px]"
            >
              Explore Experiences
            </button>
            <button
              onClick={handleListTime}
              suppressHydrationWarning
              className="w-full rounded-lg border border-[#78bce759] bg-white/90 px-5 py-3 text-sm font-extrabold text-[#336f9b] shadow-[0_10px_24px_rgba(74,141,194,0.08)] transition hover:-translate-y-0.5 sm:w-auto sm:min-w-[180px]"
            >
              Become a Host
            </button>
          </div>

          <div className="mt-1 flex items-center gap-4">
            <div className="flex -space-x-3">
              {[
                "/assets/home/profile1.png",
                "/assets/home/profile2.png",
                "/assets/home/profile3.png",
              ].map((img, idx) => (
                <div
                  key={img}
                  className="h-14 w-14 overflow-hidden rounded-full border-4 border-[#f7fbff] shadow-[0_10px_22px_rgba(84,140,191,0.08)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={`Community ${idx + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#f7fbff] bg-[#f1f3f6] text-[0.82rem] font-bold text-[#2b2d33] shadow-[0_10px_22px_rgba(84,140,191,0.08)]">
                +10k
              </div>
            </div>
            <p className="text-[0.98rem] font-medium text-[#9096a0]">Used by interesting people</p>
          </div>
        </div>

        <div className="relative min-h-[420px] overflow-visible rounded-[38px] md:min-h-[520px]">
          <div className="absolute top-[30px] right-[8px] bottom-[16px] left-[56px] rounded-[38px] border border-[#aeddf899] bg-[linear-gradient(180deg,#e8f6ff,#f8fcff)] shadow-[0_24px_60px_rgba(58,119,172,0.12)]" />

          <div
            className={`absolute inset-x-1 top-12 bottom-8 z-10 overflow-visible md:inset-x-6 md:top-14 md:bottom-10 ${isPageLoaded ? "hero-stack-ready" : ""}`}
          >
            <div className="hero-stack-in absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 md:top-[2%] md:left-[10%] md:translate-x-0 md:translate-y-0">
              <div className="hero-stack-drop">
                <div className="-translate-x-3 -translate-y-14 -rotate-[7deg] md:translate-x-0 md:translate-y-0 md:-rotate-[7deg]">
                  <HeroCard {...cardData[0]!} />
                </div>
              </div>
            </div>
            <div className="hero-stack-in hero-stack-in-2 absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 md:top-[16%] md:left-[41%] md:translate-x-0 md:translate-y-0">
              <div className="hero-stack-drop">
                <div className="translate-x-4 -translate-y-2 rotate-[3deg] md:translate-x-0 md:translate-y-0 md:rotate-[3deg]">
                  <HeroCard {...cardData[1]!} />
                </div>
              </div>
            </div>
            <div className="hero-stack-in hero-stack-in-3 absolute top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2 md:top-[43%] md:left-[7%] md:translate-x-0 md:translate-y-0">
              <div className="hero-stack-drop">
                <div className="-translate-x-5 translate-y-10 -rotate-[9deg] md:translate-x-0 md:translate-y-0 md:-rotate-[9deg]">
                  <HeroCard {...cardData[2]!} />
                </div>
              </div>
            </div>
            <div className="hero-stack-in hero-stack-in-4 absolute top-1/2 left-1/2 z-40 -translate-x-1/2 -translate-y-1/2 md:top-[56%] md:left-[30%] md:translate-x-0 md:translate-y-0">
              <div className="hero-stack-drop">
                <div className="translate-x-6 translate-y-8 rotate-[6deg] md:translate-x-0 md:translate-y-0 md:rotate-[6deg]">
                  <HeroCard {...cardData[3]!} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <BecomeHostModal
        open={showBecomeHostModal}
        onClose={closeBecomeHostModal}
      />
    </section>
  );
};

export default Hero;
