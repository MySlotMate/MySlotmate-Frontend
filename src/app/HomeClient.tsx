"use client";
import * as components from "../components";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { MoodProvider } from "~/context/MoodContext";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import WebsiteHome from "~/components/website/WebsiteHome";
import type { EventDTO, PublicHostProfileDTO } from "~/lib/api";
import type { HomepageMarketingConfig } from "~/components/home/ShowcaseSections";

/**
 * Client half of the home page. The server half (`page.tsx`) fetches the
 * events/hosts/marketing config so the first paint is real content — without
 * that, `ShowcaseSections` renders its hardcoded marketing fallbacks and they
 * end up in the shipped HTML.
 */
export default function HomeClient({
  initialEvents,
  initialHosts,
  initialMarketingConfig,
}: {
  initialEvents: EventDTO[];
  initialHosts: PublicHostProfileDTO[];
  initialMarketingConfig: HomepageMarketingConfig | null;
}) {
  const mainRef = useRef<HTMLElement>(null);
  const { userId } = useStoredAuth();
  // Auth lives in localStorage, so the server (and the first client render)
  // can't know it: render the public website until mounted, then swap to the
  // app feed for logged-in users.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const showFeed = mounted && Boolean(userId);

  useLayoutEffect(() => {
    if (!showFeed) return;
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
  }, [showFeed]);

  if (!showFeed) {
    return (
      <WebsiteHome initialEvents={initialEvents} initialHosts={initialHosts} />
    );
  }

  return (
    <MoodProvider>
      <main
        ref={mainRef}
        className="flex min-h-screen flex-col items-center overflow-x-clip bg-[#080914] text-white max-md:pb-28 md:pl-20 min-[80rem]:pl-[230px]"
      >
        <components.Navbar dark />

        <div className="scroll-fade w-full">
          <components.Home.HomeFeed
            initialEvents={initialEvents}
            initialHosts={initialHosts}
            initialMarketingConfig={initialMarketingConfig}
          />
          {/* <div ref={filterBarRef} className="w-full site-x">
            <div className="mx-auto flex w-full max-w-[1120px] justify-start">
              {mounted ? <FilterBar /> : null}
            </div>
          </div>
          <div className="w-full">
            <components.Home.Trending />
          </div>
          <div className="w-full">
            <components.Home.AllHosts currentHostId={hostId} />
          </div> */}
        </div>

        <div className="scroll-fade flex w-full flex-col gap-14">
          <components.Home.Footer dark />
        </div>
      </main>
    </MoodProvider>
  );
}
