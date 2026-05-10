"use client";
import * as components from "../components";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { MoodProvider } from "~/context/MoodContext";
export default function HomePage() {
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
          <components.Home.ShowcaseSections />
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
