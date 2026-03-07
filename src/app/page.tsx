"use client";
import * as components from "../components";
import { useState } from "react";
export default function HomePage() {
  const [mode, setMode] = useState("All");
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <main className="overflow-hidden flex min-h-screen flex-col gap-[4rem] items-center justify-center bg-linear-to-b from-[#e4f8ff] to-[rgba(0, 148, 202, 0)] text-[#000000]">
      <components.Home.Hero />
      <components.Home.people />
      <div className="flex flex-col items-center justify-center w-full mt-8">
        {/* Desktop selector: hidden on small screens */}
        <div className="hidden md:flex flex-row text-[#000000] border-[1px] border-[#0094CA] bg-[#d2f0fb9b] items-center justify-around gap-2 w-[50%] md:w-[80%] p-2 rounded-full">
          <button onClick={() => setMode("All")} className={`p-4 px-8 rounded-2xl shadow-olive-800`} style={{ background: `${mode === "All" ? "linear-gradient(45deg,#0094CA,#D5F4FF)" : "#FFFFFF66"}`,color:`${mode==="All" ? "#ffffff" : "#0094CA"}` }}>All</button>
          <button onClick={() => setMode("Adventure")} className="p-4 px-8 rounded-2xl shadow-olive-800" style={{ background: `${mode === "Adventure" ? "linear-gradient(45deg,#0094CA,#D5F4FF)" : "#FFFFFF66"}`,color:`${mode==="Adventure" ? "#ffffff" : "#0094CA"}` }}>Adventure</button>
          <button onClick={() => setMode("Social")} className="p-4 px-8 rounded-2xl shadow-olive-800" style={{ background: `${mode === "Social" ? "linear-gradient(45deg,#0094CA,#D5F4FF)" : "#FFFFFF66"}`,color:`${mode==="Social" ? "#ffffff" : "#0094CA"}` }}>Social</button>
          <button onClick={() => setMode("Wellness")} className="p-4 px-8 rounded-2xl shadow-olive-800" style={{ background: `${mode === "Wellness" ? "linear-gradient(45deg,#0094CA,#D5F4FF)" : "#FFFFFF66"}`,color:`${mode==="Wellness" ? "#ffffff" : "#0094CA"}` }}>Wellness</button>
        </div>

        {/* Mobile / Tablet: hamburger menu */}
        <div className="flex md:hidden items-center justify-center w-full">
          <div className="relative">
            <button aria-label="Open modes" onClick={() => setMenuOpen(!menuOpen)} className="p-2 bg-[#d2f0fb9b] rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-md p-2 z-50">
                <button onClick={() => { setMode("All"); setMenuOpen(false); }} className={`w-full text-left px-3 py-2 rounded ${mode === "All" ? "bg-[#e6f8ff]" : "hover:bg-gray-100"}`}>All</button>
                <button onClick={() => { setMode("Adventure"); setMenuOpen(false); }} className={`w-full text-left px-3 py-2 rounded ${mode === "Adventure" ? "bg-[#e6f8ff]" : "hover:bg-gray-100"}`}>Adventure</button>
                <button onClick={() => { setMode("Social"); setMenuOpen(false); }} className={`w-full text-left px-3 py-2 rounded ${mode === "Social" ? "bg-[#e6f8ff]" : "hover:bg-gray-100"}`}>Social</button>
                <button onClick={() => { setMode("Wellness"); setMenuOpen(false); }} className={`w-full text-left px-3 py-2 rounded ${mode === "Wellness" ? "bg-[#e6f8ff]" : "hover:bg-gray-100"}`}>Wellness</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <components.Home.Trending />
      <components.Home.Banner />
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Find People Like you</h2>
            <button className="text-sm px-3 py-1 rounded">See More</button>
          </div>

          <div className="overflow-x-auto overflow-y-hidden -mx-4 px-4">
            <div className="inline-flex gap-4 items-stretch w-max snap-x snap-mandatory">
              <components.Home.TrendingCard title="Hiking" imageUrl="/assets/home/hiking.jpg" pricing="$50" />
              <components.Home.TrendingCard title="Dining" imageUrl="/assets/home/dining.png" pricing="$30" />
              <components.Home.TrendingCard title="An Evening of Jazz" imageUrl="/assets/home/jazz.png" pricing="$40" />
              <components.Home.TrendingCard title="Pottery" imageUrl="/assets/home/pottery.png" pricing="$35" />
              <components.Home.TrendingCard title="Hiking" imageUrl="/assets/home/hiking.jpg" pricing="$50" />
              <components.Home.TrendingCard title="Dining" imageUrl="/assets/home/dining.png" pricing="$30" />
              <components.Home.TrendingCard title="An Evening of Jazz" imageUrl="/assets/home/jazz.png" pricing="$40" />
              <components.Home.TrendingCard title="Pottery" imageUrl="/assets/home/pottery.png" pricing="$35" />
            </div>
          </div>
        </div>
      </div>
      <components.Home.Idea/>
      <components.Home.Footer/>
    </main>
  );
}
