"use client";
import * as components from "../components";
import { useState, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register the plugin
gsap.registerPlugin(ScrollTrigger);

export default function HomePage() {
  const [mode, setMode] = useState<string>("All");
  const mainRef = useRef<HTMLElement>(null);

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
            ease: "power2.out",
            scrollTrigger: {
              trigger: el,
              start: "top 92%",
              end: "bottom 8%",
              toggleActions: "play reverse play reverse",
            },
          }
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
        <components.Home.people />
      </div>

      <div className="scroll-fade w-full flex flex-col items-center px-6 md:px-12 lg:px-20">
        <div className="flex gap-3 flex-wrap justify-center">
          {["All", "Adventure", "Social", "Wellness"].map((cat) => (
            <button 
              key={cat}
              onClick={() => setMode(cat)} 
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                mode === cat 
                  ? "bg-[#0094CA] text-white" 
                  : "bg-white border border-gray-200 text-gray-700 hover:border-[#0094CA]"
              }`}
            >
              <span className="flex items-center gap-2">
                {cat === "All" && "🏠"}
                {cat === "Adventure" && "⛰️"}
                {cat === "Social" && "🎉"}
                {cat === "Wellness" && "🧘"}
                {cat}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-fade w-full flex flex-col items-center">
        <components.Home.Trending />
      </div>

      <div className="scroll-fade w-full flex flex-col items-center">
        <components.Home.Banner />
      </div>

      <div className="scroll-fade w-full flex flex-col items-center">
        <components.Home.AllHosts />
      <components.Home.Idea/>

      
        <components.Home.Footer/>
      </div>
    </main>
  );
}