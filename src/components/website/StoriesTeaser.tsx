"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useListBlogs } from "~/hooks/useApi";
import Reveal from "./about/Reveal";
import { StoryCard } from "./stories/StoryCard";

const delay = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

/** The three latest stories, after the slot grid. */
export default function StoriesTeaser() {
  const { data: blogs } = useListBlogs({ limit: 3 });
  const list = (blogs ?? []).filter((b) => b.title).slice(0, 3);
  if (list.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-[1280px] px-5 pt-10 pb-24 md:px-10">
      <Reveal className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="max-w-[560px]">
          <p className="msm-r flex items-center gap-3 text-xs font-bold tracking-[0.18em] text-[#D8B4FE] uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D8B4FE] shadow-[0_0_10px_#D8B4FE]" />
            Stories
          </p>
          <h2
            className="font-outfit msm-r mt-4 text-[clamp(32px,4vw,48px)] leading-[1.06] font-normal tracking-tight text-balance text-white"
            style={delay(0.1)}
          >
            Notes from the people who showed up.
          </h2>
        </div>
        <Link
          href="/blogs"
          className="font-outfit msm-r flex h-11 w-fit shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-5 text-[15px] font-semibold text-white transition hover:border-[#A020F0] hover:bg-[#241333]"
          style={delay(0.2)}
        >
          All stories <ArrowRight className="h-4 w-4" />
        </Link>
      </Reveal>
      <Reveal
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        threshold={0.15}
      >
        {list.map((b, i) => (
          // The reveal lives on a wrapper so its slow, delayed transition
          // never applies to the card's own hover lift.
          <div
            key={b.id}
            className={`msm-r ${i === 2 ? "md:hidden lg:block" : ""}`}
            style={delay(i * 0.12)}
          >
            <StoryCard blog={b} i={i} className="h-full" />
          </div>
        ))}
      </Reveal>
    </section>
  );
}
