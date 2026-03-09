"use client";
import * as components from "../components";
import { useState } from "react";
import Link from "next/link";
export default function HomePage() {
  const [mode, setMode] = useState("All");
  return (
    <main className="overflow-hidden flex min-h-screen flex-col gap-8 items-center justify-start bg-linear-to-b from-[#e4f8ff] to-white text-[#000000] pb-8">
      <components.Navbar />
      <components.Home.Hero />
      <components.Home.people />
      {/* Category Filter Pills */}
      <div className="flex justify-center w-full px-6 md:px-12 lg:px-20 mt-8">
        <div className="flex gap-3 flex-wrap justify-center">
          <button 
            onClick={() => setMode("All")} 
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              mode === "All" 
                ? "bg-[#0094CA] text-white" 
                : "bg-white border border-gray-200 text-gray-700 hover:border-[#0094CA]"
            }`}
          >
            <span className="flex items-center gap-2">🏠 All</span>
          </button>
          <button 
            onClick={() => setMode("Adventure")} 
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              mode === "Adventure" 
                ? "bg-[#0094CA] text-white" 
                : "bg-white border border-gray-200 text-gray-700 hover:border-[#0094CA]"
            }`}
          >
            <span className="flex items-center gap-2">⛰️ Adventure</span>
          </button>
          <button 
            onClick={() => setMode("Social")} 
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              mode === "Social" 
                ? "bg-[#0094CA] text-white" 
                : "bg-white border border-gray-200 text-gray-700 hover:border-[#0094CA]"
            }`}
          >
            <span className="flex items-center gap-2">🎉 Social</span>
          </button>
          <button 
            onClick={() => setMode("Wellness")} 
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              mode === "Wellness" 
                ? "bg-[#0094CA] text-white" 
                : "bg-white border border-gray-200 text-gray-700 hover:border-[#0094CA]"
            }`}
          >
            <span className="flex items-center gap-2">🧘 Wellness</span>
          </button>
        </div>
      </div>
      <components.Home.Trending />
      <components.Home.Banner />
      {/* Find People Like You - Dynamic Section */}
      <div className="flex flex-col w-full px-6 md:px-12 lg:px-20">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Find People like You</h2>
          <Link href="/experiences" className="text-[#0094CA] text-sm flex items-center gap-2 hover:opacity-80">
            <span>see more</span>
            <span className="bg-[#0094CA] w-8 h-8 flex items-center justify-center rounded-full">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar">
          <components.Home.TrendingCard title="Mountain Adventure Escape" imageUrl="/assets/home/hiking.jpg" pricing="₹500" />
          <components.Home.TrendingCard title="Sunset Beach Retreat" imageUrl="/assets/home/dining.png" pricing="₹750" />
          <components.Home.TrendingCard title="Cultural City Tour" imageUrl="/assets/home/jazz.png" pricing="₹800" />
          <components.Home.TrendingCard title="Wildlife Safari Experience" imageUrl="/assets/home/pottery.png" pricing="₹600" />
          <components.Home.TrendingCard title="Culinary Cooking Class" imageUrl="/assets/home/hiking.jpg" pricing="₹350" />
          <components.Home.TrendingCard title="Luxury Spa Day" imageUrl="/assets/home/dining.png" pricing="₹900" />
        </div>
      </div>
      <components.Home.Idea/>
      <components.Home.Footer/>
    </main>
  );
}
