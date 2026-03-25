"use client";
import * as components from "../components";
import { useState, useLayoutEffect, useRef, useEffect, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Star, Compass, PartyPopper, Leaf } from 'lucide-react';
import { useMediaQuery } from "../hooks/useMediaQuery";

// Register the plugin
gsap.registerPlugin(ScrollTrigger);
type FilterTab = {
  name: string;
  icon: ReactNode;
};

const FILTER_TABS: FilterTab[] = [
  { name: 'All', icon: <Star className="w-5 h-5" /> },
  { name: 'Adventure', icon: <Compass className="w-5 h-5" /> },
  { name: 'Social', icon: <PartyPopper className="w-5 h-5" /> },
  { name: 'Wellness', icon: <Leaf className="w-5 h-5" /> },
];

const FilterBarDesktop = () => {
  const [activeTab, setActiveTab] = useState('All');

  return (
    <div className="flex items-center gap-2 p-1.5 border border-sky-200 rounded-full w-max" style={{backgroundImage:"linear-gradient(90.49deg, rgba(0, 148, 202, 0.2) 1.01%, rgba(0, 148, 202, 0.1) 103.34%)"}}>
      {FILTER_TABS.map((tab) => {
        const isActive = activeTab === tab.name;

        return (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            className={`
              flex items-center gap-2 px-5 py-2 rounded-full font-medium text-sm transition-all duration-300 ease-in-out
              ${isActive
                ? 'text-white shadow-md'
                : 'text-[#9ECADA] hover:text-[#0094CA]'}
              }
            `}
            style={{
              background: isActive
                ? "linear-gradient(83.25deg, #0094CA -2.39%, #D5F4FF 148.84%)"
                : "#FFFFFF66",
            }}
          >
            {tab.icon}
            <span>{tab.name}</span>
          </button>
        );
      })}
    </div>
  );
};

const FilterBarMobile = () => {
  const [itemWidth, setItemWidth] = useState(0);
  const [centeredIndex, setCenteredIndex] = useState(FILTER_TABS.length);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const centeredIndexRef = useRef(centeredIndex);
  const mobileTabs = [...FILTER_TABS, ...FILTER_TABS, ...FILTER_TABS];

  useEffect(() => {
    centeredIndexRef.current = centeredIndex;
  }, [centeredIndex]);

  useEffect(() => {
    const el = mobileScrollRef.current;
    if (!el) return;

    const updateWidth = () => {
      const nextItemWidth = el.clientWidth / 3;
      if (nextItemWidth <= 0) return;

      setItemWidth(nextItemWidth);
      const leftIndex = centeredIndexRef.current - 1;
      el.scrollLeft = leftIndex * nextItemWidth;
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  const handleMobileScroll = () => {
    const el = mobileScrollRef.current;
    if (!el) return;

    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      if (itemWidth <= 0) return;

      const center = el.scrollLeft + el.clientWidth / 2;
      const nextCenteredIndex = Math.round((center - itemWidth / 2) / itemWidth);
      const tabCount = FILTER_TABS.length;
      const minMiddle = tabCount;
      const maxMiddle = tabCount * 2 - 1;

      if (nextCenteredIndex < minMiddle || nextCenteredIndex > maxMiddle) {
        const normalizedIndex = ((nextCenteredIndex % tabCount) + tabCount) % tabCount;
        const recenteredIndex = tabCount + normalizedIndex;
        el.scrollLeft = (recenteredIndex - 1) * itemWidth;
        setCenteredIndex(recenteredIndex);
        return;
      }

      setCenteredIndex(nextCenteredIndex);
    });
  };

  const scrollToTab = (absoluteIndex: number) => {
    const el = mobileScrollRef.current;
    if (!el) return;
    if (itemWidth <= 0) return;

    const leftIndex = absoluteIndex - 1;
    el.scrollTo({ left: leftIndex * itemWidth, behavior: "smooth" });
  };

  return (
    <div
      ref={mobileScrollRef}
      onScroll={handleMobileScroll}
      className="w-full snap-x snap-mandatory overflow-x-auto hide-scrollbar rounded-full border border-sky-200 p-1.5"
      style={{ backgroundImage: "linear-gradient(90.49deg, rgba(0, 148, 202, 0.2) 1.01%, rgba(0, 148, 202, 0.1) 103.34%)" }}
    >
      <div className="flex">
        {mobileTabs.map((tab, idx) => {
          const isActive = idx === centeredIndex;

          return (
            <button
              key={`${tab.name}-${idx}`}
              onClick={() => scrollToTab(idx)}
              className={`snap-center flex h-8 shrink-0 items-center justify-center gap-1 rounded-full px-1.5 text-[10px] font-medium transition-all duration-300 ease-in-out [&_svg]:h-3 [&_svg]:w-3 ${isActive ? "text-white shadow-md" : "text-[#9ECADA]"}`}
              aria-pressed={isActive}
              style={{
                width: itemWidth > 0 ? `${itemWidth}px` : "33.3333%",
                background: isActive
                  ? "linear-gradient(83.25deg, #0094CA -2.39%, #D5F4FF 148.84%)"
                  : "#FFFFFF66",
              }}
            >
              {tab.icon}
              <span className="min-w-0 truncate">{tab.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const FilterBar = () => {
  const isMobile = useMediaQuery("(max-width: 767px)");
  return isMobile ? <FilterBarMobile /> : <FilterBarDesktop />;
};

export default function HomePage() {
  const [mode, setMode] = useState<string>("All");
  const [hostId, setHostId] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const id = localStorage.getItem("msm_host_id");
    if (id) {
      setHostId(id);
    }
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const fadeElements = gsap.utils.toArray<HTMLElement>(".scroll-fade");

      fadeElements.forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out"
          },
        );
      });
    }, mainRef);

    return () => ctx.revert();
  }, []);

  return (
    <main
      ref={mainRef}
      // justify-start keeps the vertical flow, items-center centers horizontally
      className="overflow-hidden flex min-h-screen flex-col gap-12 items-center justify-start bg-linear-to-b from-[#e4f8ff] to-white text-[#000000] pb-16"
    >
      <components.Navbar />

      {/* Each 'scroll-fade' div is now a flex container 
          with 'items-center' to ensure the component inside is centered 
      */}

      <div className="scroll-fade w-full flex flex-col items-center">
        <components.Home.Hero />
      </div>

      <div className="scroll-fade w-full flex flex-col items-center">
        <components.Home.people currentHostId={hostId} />
      </div>

      <div className="scroll-fade w-full flex flex-col items-center site-x">
        <div className="flex gap-3 flex-wrap justify-center w-full">
          <FilterBar />
        </div>
      </div>

      <div className="scroll-fade w-full flex flex-col items-center">
        <components.Home.Trending />
      </div>

      <div className="scroll-fade w-[100%] flex flex-col items-center lg:px-[8rem]">
        <components.Home.Banner />
      </div>

      <div className="scroll-fade w-full flex flex-col items-center gap-[5rem]">
        <components.Home.AllHosts currentHostId={hostId} />
        <components.Home.Idea />
        <components.Home.Footer />
      </div>
    </main>
  );
}
