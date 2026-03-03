"use client";
import * as components from "../components";
import {useState} from "react";
export default function HomePage() {
  const [mode,setMode]=useState("All");
  return (
    <main className="overflow-hidden flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-[#e4f8ff] to-[rgba(0, 148, 202, 0)] text-white">
      <components.Home.Hero/>
      <components.Home.people/>
      <div className="flex flex-col items-center justify-center w-full mt-8">
        <div className="flex flex-row text-[#000000] bg-[#d2f0fb9b] items-center justify-around gap-2 w-[100%] md:w-[50%] p-2 rounded-full">
          <button className={`p-4 px-8 rounded-2xl shadow-olive-800`} style={{background:`${mode==="All"?"linear-gradient(90deg,#0094CA,#D5F4FF)":"#ccddff"}`}}>All</button>
          <button className="p-4 px-8 rounded-2xl shadow-olive-800" style={{background:`${mode==="Adventure"?"linear-gradient(90deg,#0094CA,#D5F4FF)":"#ccddff"}`}}>Adventure</button>
          <button className="p-4 px-8 rounded-2xl shadow-olive-800" style={{background:`${mode==="Social"?"linear-gradient(90deg,#0094CA,#D5F4FF)":"#ccddff"}`}}>Social</button>
          <button className="p-4 px-8 rounded-2xl shadow-olive-800" style={{background:`${mode==="Wellness"?"linear-gradient(90deg,#0094CA,#D5F4FF)":"#ccddff"}`}}>Wellness</button>
        </div>
      </div>
    </main>
  );
}
