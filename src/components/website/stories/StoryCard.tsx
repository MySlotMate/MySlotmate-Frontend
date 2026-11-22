import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { BlogDTO } from "~/lib/api";
import EventCover from "~/components/EventCover";

export const storyDate = (b: BlogDTO) => {
  const d = b.published_at ?? b.created_at;
  return d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
};

export const storyExcerpt = (b: BlogDTO, max = 160) => {
  const src = (b.description ?? "").trim() || stripMarkup(b.content ?? "");
  return src.length <= max ? src : `${src.slice(0, max - 1).trimEnd()}…`;
};

// Content is stored as markdown or HTML blocks; cards only need plain text.
function stripMarkup(s: string) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#*_>`[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const cover = (b: BlogDTO) => b.cover_image_url ?? null;

function Author({ blog }: { blog: BlogDTO }) {
  const name = blog.author_name?.trim()
    ? blog.author_name.trim()
    : "MySlotMate Team";
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="font-outfit grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#7B2FFF] to-[#BF00FF] text-[13px] font-bold text-white">
        {name.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[13px] font-semibold text-white">
          {name}
        </span>
        <span className="block text-xs text-[#777B98]">
          {storyDate(blog)}
          {blog.read_time_minutes
            ? ` · ${blog.read_time_minutes} min read`
            : ""}
        </span>
      </span>
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-[#080914]/60 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-[#D8B4FE] uppercase backdrop-blur-md">
      <span className="h-1 w-1 rounded-full bg-[#D8B4FE] shadow-[0_0_8px_#D8B4FE]" />
      {children}
    </span>
  );
}

function Draft() {
  return (
    <span className="absolute top-4 right-4 z-10 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold tracking-wide text-[#080914] uppercase">
      Draft
    </span>
  );
}

/**
 * A story in the night-sky theme. The whole card is the link; `actions` (admin
 * edit/delete) sit above it so they stay clickable.
 */
export function StoryCard({
  blog,
  actions,
  className = "",
  style,
}: {
  blog: BlogDTO;
  i?: number;
  actions?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#121426]/80 p-3 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-[#652A91] hover:shadow-[0_24px_60px_-20px_rgb(160_32_240/0.45)] ${className}`}
      style={style}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[20px]">
        <EventCover
          src={cover(blog)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080914]/50 to-transparent" />
        {blog.category && (
          <span className="absolute top-3 left-3">
            <Chip>{blog.category}</Chip>
          </span>
        )}
        {!blog.published_at && <Draft />}
      </div>
      <div className="flex flex-1 flex-col gap-3 px-3 pt-5 pb-3">
        <h3 className="font-outfit line-clamp-2 text-[22px] leading-snug font-semibold text-white transition group-hover:text-[#D8B4FE]">
          <Link
            href={`/blogs/${blog.slug}`}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {blog.title ?? "Untitled story"}
          </Link>
        </h3>
        <p className="line-clamp-2 text-[15px] leading-relaxed text-[#A5A8C3]">
          {storyExcerpt(blog, 140)}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <Author blog={blog} />
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-[#A5A8C3] transition group-hover:border-transparent group-hover:bg-[#A020F0] group-hover:text-white">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
      {actions && (
        <div className="absolute top-6 right-6 z-20 flex gap-2">{actions}</div>
      )}
    </article>
  );
}

/** The lead story: a wide image beside the headline. */
export function FeaturedStory({
  blog,
  actions,
}: {
  blog: BlogDTO;
  actions?: React.ReactNode;
}) {
  return (
    <article className="group relative grid overflow-hidden rounded-[32px] border border-white/10 bg-[#121426]/80 p-3 backdrop-blur-md transition duration-300 hover:border-[#652A91] md:grid-cols-[1.25fr_1fr]">
      <div className="relative aspect-[16/11] overflow-hidden rounded-[24px] md:aspect-auto md:min-h-[440px]">
        <EventCover
          src={cover(blog)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#241333]/60 via-transparent to-transparent" />
        {!blog.published_at && <Draft />}
      </div>
      <div className="flex flex-col gap-5 px-4 pt-7 pb-5 md:px-10 md:py-10">
        <div className="flex flex-wrap items-center gap-2">
          <Chip>Featured story</Chip>
          {blog.category && (
            <span className="text-[11px] font-bold tracking-[0.12em] text-[#777B98] uppercase">
              {blog.category}
            </span>
          )}
        </div>
        <h2 className="font-outfit text-[clamp(28px,3.4vw,44px)] leading-[1.08] font-normal tracking-tight text-balance text-white">
          <Link
            href={`/blogs/${blog.slug}`}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {blog.title ?? "Untitled story"}
          </Link>
        </h2>
        <p className="line-clamp-4 text-base leading-relaxed text-[#A5A8C3] md:text-[17px]">
          {storyExcerpt(blog, 220)}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] pt-6">
          <Author blog={blog} />
          <span className="font-outfit flex items-center gap-1.5 text-[15px] font-semibold text-[#D8B4FE] transition group-hover:text-white">
            Read the story <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
      {actions && (
        <div className="absolute top-6 left-6 z-20 flex gap-2">{actions}</div>
      )}
    </article>
  );
}

export function StoryCardSkeleton() {
  return (
    <div className="flex flex-col rounded-[28px] border border-white/[0.06] bg-[#121426]/80 p-3">
      <div className="aspect-[4/3] animate-pulse rounded-[20px] bg-white/[0.05]" />
      <div className="flex flex-col gap-3 px-3 pt-5 pb-3">
        <div className="h-6 w-5/6 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-4 w-full animate-pulse rounded bg-white/[0.04]" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.04]" />
      </div>
    </div>
  );
}
