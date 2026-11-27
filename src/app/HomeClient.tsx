"use client";
import * as components from "../components";
import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { MoodProvider } from "~/context/MoodContext";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import WebsiteHome from "~/components/website/WebsiteHome";
import type { EventDTO, PublicHostProfileDTO } from "~/lib/api";
import type { HomepageMarketingConfig } from "~/components/home/ShowcaseSections";
import { useHydrated } from "~/hooks/useHydrated";

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
  featuredIds,
}: {
  initialEvents: EventDTO[];
  initialHosts: PublicHostProfileDTO[];
  initialMarketingConfig: HomepageMarketingConfig | null;
  featuredIds: string[] | null;
}) {
  const mainRef = useRef<HTMLElement>(null);
  const { userId } = useStoredAuth();
  // Auth lives in localStorage, so the server can't know it. Only the first
  // render after a full page load has to match the server's (public) HTML;
  // on in-app navigation `hydrated` is already true, so a signed-in user
  // goes straight to the feed instead of flashing the public site.
  const hydrated = useHydrated();
  const showFeed = hydrated && Boolean(userId);
  // The pre-paint flag (layout.tsx) hides the public site for signed-in
  // users. Drop it only for a visitor who turns out to be signed out.
  useEffect(() => {
    if (hydrated && !userId) delete document.documentElement.dataset.authed;
  }, [hydrated, userId]);

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
      <div className="msm-visitor-only">
        <WebsiteHome
          initialEvents={initialEvents}
          initialHosts={initialHosts}
        />
      </div>
    );
  }

  return (
    <MoodProvider>
      <main
        ref={mainRef}
        className="flex min-h-screen flex-col items-center overflow-x-clip bg-[#080914] text-white max-md:pb-28"
      >
        <components.Navbar dark />

        {/* The hero carousel uses h2s, so the page's one H1 is for screen readers and search. */}
        <h1 className="sr-only">
          Book events, treks and workshops across Northeast India
        </h1>

        <div className="scroll-fade w-full">
          <components.Home.HomeFeed
            initialEvents={initialEvents}
            initialHosts={initialHosts}
            initialMarketingConfig={initialMarketingConfig}
            featuredIds={featuredIds}
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
