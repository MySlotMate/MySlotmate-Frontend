"use client";
import * as components from "../components";
import { useState, useLayoutEffect, useRef, useEffect, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Grid2X2,
  Mountain,
  Users,
  HeartPulse,
  GraduationCap,
  Palette,
  Moon,
  UtensilsCrossed,
  Landmark,
} from "lucide-react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { MOOD_TABS, MoodProvider, useMood, type MoodTab } from "~/context/MoodContext";

// Register the plugin
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type FilterTab = {
  name: MoodTab;
  icon: ReactNode;
};

const FILTER_TAB_ICONS: Record<(typeof MOOD_TABS)[number], ReactNode> = {
  All: <Grid2X2 className="h-5 w-5" />,
  Adventurous: <Mountain className="h-5 w-5" />,
  Social: <Users className="h-5 w-5" />,
  Wellness: <HeartPulse className="h-5 w-5" />,
  Educational: <GraduationCap className="h-5 w-5" />,
  Creative: <Palette className="h-5 w-5" />,
  Relaxing: <Moon className="h-5 w-5" />,
  Culinary: <UtensilsCrossed className="h-5 w-5" />,
  Cultural: <Landmark className="h-5 w-5" />,
};

const FILTER_TABS: FilterTab[] = MOOD_TABS.map((name) => ({
  name,
  icon: FILTER_TAB_ICONS[name],
}));

const FilterBarDesktop = () => {
  const { selectedMood, setSelectedMood } = useMood();

  return (
    <div className="filterbar-fade-mask relative w-full">
      <div
        className="hide-scrollbar w-full overflow-x-auto rounded-full border border-sky-200"
        style={{
          backgroundImage:
            "linear-gradient(90.49deg, rgba(0, 148, 202, 0.2) 1.01%, rgba(0, 148, 202, 0.1) 103.34%)",
        }}
      >
        <div className="flex min-w-max items-center gap-2 p-1.5">
          {FILTER_TABS.map((tab) => {
            const isActive = selectedMood === tab.name;

            return (
              <button
                key={tab.name}
                onClick={() => setSelectedMood(tab.name)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all duration-300 ease-in-out ${
                  isActive ? "text-white shadow-md" : "text-[#9ECADA] hover:text-[#0094CA]"
                }`}
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
      </div>
    </div>
  );
};

const FilterBarMobile = () => {
  const [itemWidth, setItemWidth] = useState(0);
  const { selectedMood, setSelectedMood } = useMood();
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
    if (!el || itemWidth <= 0) return;

    const leftIndex = absoluteIndex - 1;
    el.scrollTo({ left: leftIndex * itemWidth, behavior: "smooth" });
  };

  useEffect(() => {
    const visibleIndex = FILTER_TABS.findIndex((tab) => tab.name === selectedMood);
    if (visibleIndex < 0) return;
    setCenteredIndex(FILTER_TABS.length + visibleIndex);
  }, [selectedMood]);

  return (
    <div className="filterbar-fade-mask relative w-full">
      <div
        ref={mobileScrollRef}
        onScroll={handleMobileScroll}
        className="hide-scrollbar w-full snap-x snap-mandatory overflow-x-auto rounded-full border border-sky-200 p-1.5"
        style={{
          backgroundImage:
            "linear-gradient(90.49deg, rgba(0, 148, 202, 0.2) 1.01%, rgba(0, 148, 202, 0.1) 103.34%)",
        }}
      >
        <div className="flex">
          {mobileTabs.map((tab, idx) => {
            const isActive = idx === centeredIndex;
            const normalizedIndex = idx % FILTER_TABS.length;

            return (
              <button
                key={`${tab.name}-${idx}`}
                onClick={() => {
                  const selectedTab = FILTER_TABS[normalizedIndex] ?? FILTER_TABS[0];
                  if (!selectedTab) return;
                  setSelectedMood(selectedTab.name);
                  scrollToTab(idx);
                }}
                className={`snap-center flex h-8 shrink-0 items-center justify-center gap-1 rounded-full px-1.5 text-[10px] font-medium transition-all duration-300 ease-in-out [&_svg]:h-3 [&_svg]:w-3 ${
                  isActive ? "text-white shadow-md" : "text-[#9ECADA]"
                }`}
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
    </div>
  );
};

const FilterBar = () => {
  const isMobile = useMediaQuery("(max-width: 767px)");
  return isMobile ? <FilterBarMobile /> : <FilterBarDesktop />;
};

export default function HomePage() {
  const [hostId, setHostId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = localStorage.getItem("msm_host_id");
    if (id) {
      setHostId(id);
    }
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const fadeElements = gsap.utils.toArray<HTMLElement>(".scroll-fade");

      fadeElements.forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
            ease: "power2.out",
          },
        );
      });
    }, mainRef);

    return () => ctx.revert();
  }, []);

  return (
    <MoodProvider>
      <main
        ref={mainRef}
        className="flex min-h-screen flex-col items-center gap-14 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(31,167,255,0.10),transparent_30%),linear-gradient(180deg,#fbfeff_0%,#f3faff_100%)] pb-16 text-[#16304c]"
      >
        <components.Navbar />

        <div className="scroll-fade w-full">
          <components.Home.Hero filterBarRef={filterBarRef} />
        </div>

        <div className="scroll-fade w-full">
          <components.Home.ShowcaseSections />
        </div>

        <div id="hosts" className="scroll-fade w-full">
          <components.Home.people currentHostId={hostId} />
        </div>

        <div ref={filterBarRef} className="scroll-fade w-full site-x">
          <div className="mx-auto flex w-full max-w-[1120px] justify-start">
            {mounted ? <FilterBar /> : null}
          </div>
        </div>

        <div className="scroll-fade w-full">
          <components.Home.Trending />
        </div>

        <div className="scroll-fade flex w-full flex-col gap-14">
          <components.Home.AllHosts currentHostId={hostId} />
          <components.Home.Footer />
        </div>
      </main>
    </MoodProvider>
  );
}
