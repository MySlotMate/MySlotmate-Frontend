"use client";
import * as components from "../components";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { MoodProvider } from "~/context/MoodContext";
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
  const filterBarRef = useRef<HTMLDivElement>(null);

  // hostId and mounted were unused because of commented out code

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
        className="flex min-h-screen flex-col items-center gap-14 overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(31,167,255,0.10),transparent_30%),linear-gradient(180deg,#fbfeff_0%,#f3faff_100%)] text-[#16304c]"
      >
        <components.Navbar />

        <div className="scroll-fade w-full">
          <components.Home.Hero filterBarRef={filterBarRef} />
        </div>

        <div className="scroll-fade w-full">
          <components.Home.ShowcaseSections
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
          <components.Home.Footer />
        </div>
      </main>
    </MoodProvider>
  );
}
