"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { useListBlogs } from "~/hooks/useApi";
import type { BlogDTO } from "~/lib/api";
import { FALLBACK_PHOTOS } from "./shared";

function StoryCard({
  blog,
  big,
  i,
}: {
  blog: BlogDTO;
  big?: boolean;
  i: number;
}) {
  return (
    <Link
      href={`/blogs/${blog.slug}`}
      className={`group flex gap-6 overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#121426] p-5 transition hover:border-white/20 ${big ? "flex-col md:flex-row md:items-center md:p-6 md:pl-10" : "flex-col"}`}
    >
      <div
        className={`flex min-w-0 flex-col gap-3 ${big ? "md:order-1 md:flex-1" : "order-2"}`}
      >
        {blog.category && (
          <span className="text-[11px] font-extrabold tracking-[0.1em] text-[#D8B4FE] uppercase">
            {blog.category}
          </span>
        )}
        <h3
          className={`font-outfit leading-tight font-bold text-white ${big ? "text-[clamp(24px,3vw,36px)]" : "text-2xl"}`}
        >
          {blog.title}
        </h3>
        <p className="flex items-center gap-3 text-[13px] text-[#777B98]">
          {blog.read_time_minutes ? (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {blog.read_time_minutes} min
              read
            </span>
          ) : null}
          <span className="flex items-center gap-1 font-semibold text-white">
            Read now <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </p>
      </div>
      <div
        className={`overflow-hidden rounded-[20px] ${big ? "aspect-[2/1] md:order-2 md:w-[52%]" : "order-1 aspect-[5/2]"}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            blog.cover_image_url ?? FALLBACK_PHOTOS[i % FALLBACK_PHOTOS.length]
          }
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
    </Link>
  );
}

/** Three latest stories, Offlyn-style: one wide card, two below. */
export default function StoriesTeaser() {
  const { data: blogs } = useListBlogs({ limit: 3 });
  const list = (blogs ?? []).filter((b) => b.title).slice(0, 3);
  if (list.length === 0) return null;
  const [first, ...rest] = list;

  return (
    <section className="mx-auto w-full max-w-[1280px] px-5 pt-6 pb-24 md:px-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="font-outfit text-[32px] font-bold text-white">
          Stories
        </h2>
        <Link
          href="/blogs"
          className="font-outfit flex items-center gap-1 text-base font-semibold text-[#D8B4FE]"
        >
          All stories <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex flex-col gap-6">
        <StoryCard blog={first!} big i={0} />
        {rest.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {rest.map((b, i) => (
              <StoryCard key={b.id} blog={b} i={i + 1} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
