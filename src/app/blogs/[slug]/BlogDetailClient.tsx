"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useBlog, useListBlogs } from "~/hooks/useApi";
import type { BlogDTO } from "~/lib/api";
import { auth } from "~/utils/firebase";
import {
  BlockRenderer,
  contentToBlocks,
  formatBlogDate,
  getBlogValue,
  getBlogExcerpt,
  FALLBACK_BLOG_IMAGE,
  type TOCItem,
} from "../BlogsClient";
import HostInvite from "~/components/website/HostInvite";
import WebsiteFooter from "~/components/website/WebsiteFooter";
import WebsiteNav from "~/components/website/WebsiteNav";
import Reveal from "~/components/website/about/Reveal";
import StarField from "~/components/website/about/StarField";
import { GRADIENT } from "~/components/website/shared";
import { StoryCard } from "~/components/website/stories/StoryCard";

const delay = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

/** Night-sky page frame shared by the loading, missing and story states. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen w-full flex-col bg-[#080914] font-[family-name:var(--font-inter)] text-white">
      <StarField />
      <div className="relative z-10 flex flex-1 flex-col">
        <WebsiteNav />
        <main className="flex-1">{children}</main>
        <WebsiteFooter />
      </div>
    </div>
  );
}

/** A thin gradient line along the top that fills as you read. */
function ReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.querySelector(".article-body");
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      setP(Math.min(1, Math.max(0, -r.top / Math.max(total, 1))));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-gradient-to-r from-[#7B2FFF] via-[#A020F0] to-[#BF00FF] shadow-[0_0_12px_#A020F0]"
      style={{ transform: `scaleX(${p})` }}
    />
  );
}

/**
 * The story page. `initialBlog` comes from the server for every published
 * story, so the headline and body are in the first HTML for search engines
 * and readers alike. The browser fetch then takes over: it refreshes the
 * story and, with an admin's token, can open unpublished drafts.
 */
export default function BlogDetailClient({
  slug,
  initialBlog,
}: {
  slug: string;
  initialBlog: BlogDTO | null;
}) {
  const resolvedParams = { slug };

  // Resolve the Firebase ID token so admins can open their own unpublished
  // drafts (the backend returns 404 for drafts to anonymous visitors).
  const [user] = useAuthState(auth);
  const [idToken, setIdToken] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!user) {
      const storedToken = localStorage.getItem("msm_auth_token");
      if (active) setIdToken(storedToken);
      return;
    }
    void user
      .getIdToken()
      .then((token) => {
        if (active) setIdToken(token);
      })
      .catch(() => {
        if (active) setIdToken(null);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const {
    data: fetchedBlog,
    isLoading: fetching,
    error: fetchError,
  } = useBlog(resolvedParams.slug, idToken);
  const blog = fetchedBlog ?? initialBlog ?? undefined;
  // Only wait or fail when there is nothing to show at all.
  const isLoading = !blog && fetching;
  const error = blog ? null : fetchError;
  const { data: allBlogs = [] } = useListBlogs();

  const [activeTocId, setActiveTocId] = useState<string>("");
  const [tocItems, setTocItems] = useState<TOCItem[]>([]);

  const blocks = useMemo(() => {
    return blog ? contentToBlocks(blog.content) : [];
  }, [blog]);

  // Extract TOC directly from DOM headings so any H1 (whether markdown or HTML) is included and navigable
  useEffect(() => {
    if (isLoading || !blog) return;

    const extractHeadings = () => {
      const container = document.querySelector(".article-body");
      if (!container) return;

      const headingElements = Array.from(
        container.querySelectorAll("h1, .rt-h1"),
      );

      const items: TOCItem[] = [];
      headingElements.forEach((el, index) => {
        const id = el.id || `heading-${index}`;
        el.id = id;
        el.classList.add("scroll-mt-28");

        const text = el.textContent?.trim() || "";
        if (text) {
          items.push({ id, level: 1, text });
        }
      });

      setTocItems((prev) => {
        if (
          prev.length === items.length &&
          prev.every(
            (p, i) => p.id === items[i]?.id && p.text === items[i]?.text,
          )
        ) {
          return prev;
        }
        return items;
      });
    };

    // Initial extraction with a short delay for component mounting
    const timer = setTimeout(extractHeadings, 100);

    // Also observe the article body for async rich text DOM injection
    const container = document.querySelector(".article-body");
    let observer: MutationObserver | null = null;
    if (container) {
      observer = new MutationObserver(() => {
        extractHeadings();
      });
      observer.observe(container, { childList: true, subtree: true });
    }

    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, [isLoading, blog]);

  // Active heading tracking based on deterministic scroll position
  useEffect(() => {
    if (tocItems.length === 0) return;

    const handleScroll = () => {
      const headingElements = tocItems
        .map((item) => document.getElementById(item.id))
        .filter((el): el is HTMLElement => el !== null);

      if (headingElements.length === 0) return;

      // Default to the first heading
      let currentActiveId = headingElements[0]?.id ?? "";

      // Any heading whose top border is at or above the navbar offset (~160px) is considered passed.
      // The active heading is the last passed heading.
      for (const el of headingElements) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 160) {
          currentActiveId = el.id;
        } else {
          break;
        }
      }

      setActiveTocId(currentActiveId);
    };

    // Check immediately on mount/update
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [tocItems]);

  const relatedBlogs = useMemo(() => {
    return allBlogs
      .filter((b) => b.slug !== resolvedParams.slug && b.id !== blog?.id)
      .slice(0, 3);
  }, [allBlogs, resolvedParams.slug, blog?.id]);

  if (isLoading) {
    return (
      <Shell>
        <div className="mx-auto flex w-full max-w-[820px] flex-col items-center gap-5 px-5 pt-20 pb-24">
          <div className="h-6 w-32 animate-pulse rounded-full bg-white/[0.06]" />
          <div className="h-14 w-full animate-pulse rounded-2xl bg-white/[0.06]" />
          <div className="h-14 w-3/4 animate-pulse rounded-2xl bg-white/[0.06]" />
          <div className="mt-8 aspect-[16/9] w-full animate-pulse rounded-[32px] bg-white/[0.05]" />
        </div>
      </Shell>
    );
  }

  if (error || !blog) {
    return (
      <Shell>
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-5 text-center">
          <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_14px_4px_rgb(216_180_254/0.7)]" />
          <h1 className="font-outfit text-[clamp(32px,4vw,48px)] font-normal">
            This story drifted out of sight.
          </h1>
          <p className="max-w-md text-[#A5A8C3]">
            It may have been moved or taken down. There are plenty more waiting.
          </p>
          <Link
            href="/blogs"
            className={`font-outfit mt-2 flex h-12 items-center gap-2 rounded-full px-6 font-semibold text-white ${GRADIENT}`}
          >
            <ArrowLeft className="h-4 w-4" /> All stories
          </Link>
        </div>
      </Shell>
    );
  }

  const authorName = getBlogValue(blog.author_name) || "MySlotMate Team";
  const displayTitle = getBlogValue(blog.title) || "Untitled story";
  const displayCategory = getBlogValue(blog.category);
  const displayDate = formatBlogDate(blog.published_at ?? blog.created_at);
  const excerpt = getBlogValue(blog.description) || getBlogExcerpt(blog);
  const hasToc = tocItems.length > 1;

  return (
    <Shell>
      <ReadingProgress />

      {/* Header */}
      <Reveal className="mx-auto flex w-full max-w-[860px] flex-col items-center px-5 pt-12 text-center md:pt-20">
        <Link
          href="/blogs"
          className="msm-r flex items-center gap-1.5 text-sm font-semibold text-[#A5A8C3] transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> All stories
        </Link>
        {displayCategory && (
          <p
            className="msm-r mt-8 flex items-center gap-3 text-xs font-bold tracking-[0.18em] text-[#D8B4FE] uppercase"
            style={delay(0.05)}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#D8B4FE] shadow-[0_0_10px_#D8B4FE]" />
            {displayCategory}
          </p>
        )}
        <h1
          className="font-outfit msm-r mt-5 text-[clamp(34px,5vw,64px)] leading-[1.05] font-light tracking-[-0.02em] text-balance"
          style={delay(0.1)}
        >
          {displayTitle}
        </h1>
        {excerpt && (
          <p
            className="msm-r mt-6 line-clamp-3 max-w-[640px] text-lg leading-relaxed text-[#A5A8C3]"
            style={delay(0.2)}
          >
            {excerpt}
          </p>
        )}
        <div
          className="msm-r mt-8 flex items-center gap-3 text-left"
          style={delay(0.3)}
        >
          <span className="font-outfit grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#7B2FFF] to-[#BF00FF] font-bold">
            {authorName.charAt(0).toUpperCase()}
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold">{authorName}</span>
            <span className="block text-[13px] text-[#777B98]">
              {displayDate} · {blog.read_time_minutes ?? 5} min read
            </span>
          </span>
        </div>
      </Reveal>

      {/* Cover */}
      <Reveal className="mx-auto mt-12 w-full max-w-[1180px] px-5 md:mt-16 md:px-10">
        <div
          className="msm-r relative overflow-hidden rounded-[32px] border border-white/10 shadow-[0_40px_120px_-40px_rgb(160_32_240/0.55)]"
          style={delay(0.35)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={blog.cover_image_url ?? FALLBACK_BLOG_IMAGE}
            alt=""
            className="aspect-[16/10] w-full object-cover md:aspect-[16/8]"
          />
        </div>
      </Reveal>

      {/* Body, with the outline alongside on wide screens */}
      <div
        className={`mx-auto grid w-full gap-12 px-5 pt-14 pb-20 md:px-10 md:pt-20 ${hasToc ? "max-w-[1180px] lg:grid-cols-[220px_minmax(0,1fr)_220px]" : "max-w-[760px]"}`}
      >
        {hasToc && (
          <aside className="sticky top-10 hidden self-start lg:block">
            <p className="text-[11px] font-bold tracking-[0.18em] text-[#777B98] uppercase">
              In this story
            </p>
            <nav className="relative mt-5 flex flex-col gap-1 border-l border-white/10">
              {tocItems.map((item) => {
                const active = activeTocId === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const el = document.getElementById(item.id);
                      if (el) {
                        window.scrollTo({
                          top:
                            el.getBoundingClientRect().top +
                            window.scrollY -
                            100,
                          behavior: "smooth",
                        });
                      }
                    }}
                    className={`relative -ml-px border-l py-2 pl-4 text-sm leading-snug transition ${active ? "border-[#D8B4FE] font-semibold text-white" : "border-transparent text-[#777B98] hover:text-[#D8B4FE]"}`}
                  >
                    {active && (
                      <span className="absolute top-1/2 -left-[3.5px] h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_2px_rgb(216_180_254/0.8)]" />
                    )}
                    {item.text}
                  </a>
                );
              })}
            </nav>
          </aside>
        )}

        <article className="article-body msm-article mx-auto w-full max-w-[700px] min-w-0">
          <BlockRenderer blocks={blocks} showHeadings={true} />

          {/* Author */}
          <div className="mt-16 flex items-center gap-4 border-t border-white/10 pt-8">
            <span className="font-outfit grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#7B2FFF] to-[#BF00FF] text-xl font-bold">
              {authorName.charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-[#777B98] uppercase">
                Written by
              </p>
              <p className="font-outfit mt-1 text-lg font-semibold">
                {authorName}
              </p>
            </div>
          </div>
        </article>
      </div>

      {/* Host invitation */}
      <section className="mx-auto w-full max-w-[1180px] px-5 md:px-10">
        <HostInvite title="Have something you love doing? Share it with people near you." />
      </section>

      {/* Keep reading */}
      {relatedBlogs.length > 0 && (
        <section className="mx-auto w-full max-w-[1180px] px-5 pt-24 pb-24 md:px-10">
          {/* With fewer than three stories, the heading takes the first
              column so the row stays full. */}
          {relatedBlogs.length >= 3 && (
            <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-outfit msm-r text-[clamp(28px,3.4vw,40px)] font-normal">
                Keep reading
              </h2>
              <Link
                href="/blogs"
                className="font-outfit msm-r flex items-center gap-1.5 text-[15px] font-semibold text-[#D8B4FE] hover:text-white"
                style={delay(0.1)}
              >
                All stories <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Reveal>
          )}
          <Reveal
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            threshold={0.15}
          >
            {relatedBlogs.length < 3 && (
              <div className="msm-r flex flex-col justify-end gap-5 md:col-span-2 lg:col-span-1 lg:pb-6">
                <p className="flex items-center gap-3 text-xs font-bold tracking-[0.18em] text-[#D8B4FE] uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D8B4FE] shadow-[0_0_10px_#D8B4FE]" />
                  Keep reading
                </p>
                <h2 className="font-outfit text-[clamp(28px,3.2vw,40px)] leading-[1.08] font-normal text-balance">
                  More notes from people who showed up.
                </h2>
                <Link
                  href="/blogs"
                  className="font-outfit flex h-11 w-fit items-center gap-1.5 rounded-full border border-white/10 px-5 text-[15px] font-semibold transition hover:border-[#A020F0] hover:bg-[#241333]"
                >
                  All stories <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            )}
            {relatedBlogs.map((item, i) => (
              <div key={item.id} className="msm-r" style={delay(i * 0.12)}>
                <StoryCard blog={item} i={i + 1} className="h-full" />
              </div>
            ))}
          </Reveal>
        </section>
      )}
      {relatedBlogs.length === 0 && <div className="h-24" />}
    </Shell>
  );
}
