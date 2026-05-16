"use client";

import React, { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { LuLoader2 } from "react-icons/lu";
import { toast } from "sonner";
import { Navbar, Home } from "~/components";
import { useBlog, useListBlogs } from "~/hooks/useApi";
import {
  BlockRenderer,
  contentToBlocks,
  formatBlogDate,
  getBlogValue,
  getBlogExcerpt,
  FALLBACK_BLOG_IMAGE,
  type TOCItem,
} from "../page";

export default function BlogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { data: blog, isLoading, error } = useBlog(resolvedParams.id);
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
        container.querySelectorAll("h1, .rt-h1")
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
          prev.every((p, i) => p.id === items[i]?.id && p.text === items[i]?.text)
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
      .filter((b) => b.id !== resolvedParams.id)
      .slice(0, 3);
  }, [allBlogs, resolvedParams.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_top_left,rgba(31,167,255,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(127,213,255,0.16),transparent_22%),linear-gradient(180deg,#fbfeff_0%,#f2faff_100%)] font-manrope text-[#16304c]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <LuLoader2 className="h-12 w-12 animate-spin text-[#0094CA]" />
        </div>
        <Home.Footer />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_top_left,rgba(31,167,255,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(127,213,255,0.16),transparent_22%),linear-gradient(180deg,#fbfeff_0%,#f2faff_100%)] font-manrope text-[#16304c]">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
          <p className="text-2xl font-bold text-[#16304c]">Article Not Found</p>
          <p className="text-[#6f8daa] max-w-md">The story you are looking for does not exist or may have been removed.</p>
          <Link href="/blogs" className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 bg-[linear-gradient(135deg,#1fa7ff,#0e8ae0)] text-white font-extrabold shadow-[0_16px_32px_rgba(31,167,255,0.24)] hover:shadow-[0_20px_40px_rgba(31,167,255,0.35)] transition">
            <FiArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>
        </div>
        <Home.Footer />
      </div>
    );
  }

  const authorName = getBlogValue(blog.author_name, "Team Myslotmate");
  const displayTitle = getBlogValue(blog.title, "Untitled blog");
  const displayCategory = getBlogValue(blog.category, "Host Stories");
  const displayDate = formatBlogDate(blog.published_at ?? blog.created_at);
  const excerpt = getBlogValue(blog.description, getBlogExcerpt(blog));

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_top_left,rgba(31,167,255,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(127,213,255,0.16),transparent_22%),linear-gradient(180deg,#fbfeff_0%,#f2faff_100%)] font-manrope text-[#16304c]">
      <Navbar />

      <main className="py-8 sm:py-12 px-4 sm:px-6 w-full max-w-[1120px] mx-auto min-w-0 flex-1">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-2 text-[#6f8daa] text-[0.85rem] font-bold mb-5" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#0e8ae0] transition">Myslotmate</Link>
          <span>/</span>
          <Link href="/blogs" className="hover:text-[#0e8ae0] transition">Blog</Link>
          <span>/</span>
          <span className="text-[#16304c]">{displayCategory}</span>
        </nav>

        {/* Article Hero matching post.html .article-hero */}
        <section className="grid lg:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.92fr)] gap-8.5 items-center mt-3">
          <div className="grid content-start gap-4 pt-1.5 min-w-0">
            <div>
              <span className="inline-flex items-center justify-center gap-2 rounded-full px-3.5 py-1.5 bg-white/90 border border-[#a9daf5a6] text-[0.74rem] font-extrabold tracking-[0.08em] text-[#4a8ab8] uppercase before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#4a8ab8]">
                {displayCategory}
              </span>
            </div>
            <h1 className="font-outfit text-[clamp(1.72rem,3.05vw,2.45rem)] font-semibold leading-[1.08] max-w-[720px] text-[#16304c] m-0">
              {displayTitle}
            </h1>
            <p className="max-w-[720px] mt-1 text-[0.88rem] leading-[1.72] text-[#6f8daa] m-0">
              {excerpt}
            </p>
            <div className="flex flex-wrap gap-2.5 items-center text-[#5a88ac] text-[0.76rem] font-semibold mt-2">
              <span>By {authorName}</span>
              <span className="text-[#a9daf5]">•</span>
              <span>{displayDate}</span>
              <span className="text-[#a9daf5]">•</span>
              <span>{blog.read_time_minutes ?? 5} Min Read</span>
            </div>
          </div>
          <div className="self-start w-full">
            <div className="relative overflow-hidden rounded-3xl border border-[#addbf699] min-h-[312px] w-full shadow-[0_18px_40px_rgba(58,119,172,0.12)] bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={blog.cover_image_url ?? FALLBACK_BLOG_IMAGE}
                alt={displayTitle}
                className="w-full h-full object-cover absolute inset-0"
              />
            </div>
          </div>
        </section>

        {/* Article Layout grid */}
        <section className="grid lg:grid-cols-[240px_minmax(0,1fr)] gap-7 mt-8 items-start">
          {/* TOC Sidebar matching post.html .toc */}
          <aside className="sticky top-24 p-5 rounded-[28px] bg-white/82 border border-[#aeddf899] shadow-[0_18px_38px_rgba(60,121,175,0.1)] hidden lg:block max-h-[calc(100vh-120px)] overflow-y-auto">
            <h4 className="m-0 mb-3 text-[0.95rem] tracking-[0.06em] uppercase text-[#4b81a7] font-bold">
              Table of Contents
            </h4>
            {tocItems.length > 0 ? (
              <nav className="flex flex-col">
                {tocItems.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const el = document.getElementById(item.id);
                      if (el) {
                        const yOffset = -100;
                        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                        window.scrollTo({ top: y, behavior: "smooth" });
                      }
                    }}
                    className={`block py-3 text-[0.84rem] border-b border-[#aeddf866] last:border-b-0 transition-all duration-200 cursor-pointer ${
                      activeTocId === item.id
                        ? "text-[#0e8ae0] font-extrabold pl-2 border-l-2 border-[#0e8ae0]"
                        : "text-[#8aa2b7] font-medium hover:text-[#0e8ae0]"
                    }`}
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            ) : (
              <p className="text-xs text-[#8aa2b7] italic m-0">No table of contents</p>
            )}
          </aside>

          {/* Main Content & Banners */}
          <div className="min-w-0 space-y-7">
            <article className="article-body p-6 sm:p-9 rounded-[28px] bg-white/82 border border-[#aeddf899] shadow-[0_18px_38px_rgba(60,121,175,0.1)] text-[0.9rem] leading-[1.72] text-[#6f8daa]">
              <BlockRenderer blocks={blocks} showHeadings={true} />
            </article>

            {/* CTA Banner matching .cta-banner */}
            <section className="grid gap-3.5 p-7 rounded-[28px] bg-[radial-gradient(circle_at_top_right,rgba(127,213,255,0.3),transparent_28%),rgba(255,255,255,0.84)] border border-[#aeddf899] shadow-[0_18px_38px_rgba(60,121,175,0.1)]">
              <div>
                <span className="inline-flex items-center justify-center gap-2 rounded-full px-3.5 py-1.5 bg-white/90 border border-[#a9daf5a6] text-[0.74rem] font-extrabold tracking-[0.08em] text-[#4a8ab8] uppercase before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#4a8ab8]">
                  For Hosts
                </span>
              </div>
              <h3 className="font-outfit text-[clamp(1.4rem,2.4vw,1.82rem)] font-semibold text-[#16304c] m-0">
                Want to turn your local knowledge into a thoughtful experience?
              </h3>
              <p className="text-[0.88rem] leading-[1.78] text-[#6f8daa] m-0">
                Build a listing that feels like you, clarify the moments that matter, and create time people are genuinely excited to book.
              </p>
              <div className="flex flex-wrap gap-3.5 mt-2">
                <Link
                  href="/host-dashboard/experiences/new"
                  className="inline-flex items-center justify-center rounded-2xl px-6 py-3.5 bg-[linear-gradient(135deg,#1fa7ff,#0e8ae0)] text-white text-sm font-extrabold tracking-[0.02em] shadow-[0_16px_32px_rgba(31,167,255,0.24)] hover:shadow-[0_20px_40px_rgba(31,167,255,0.35)] hover:-translate-y-0.5 transition"
                >
                  Become a Host
                </Link>
                <Link
                  href="/explore"
                  className="inline-flex items-center justify-center rounded-2xl px-6 py-3.5 bg-white/90 border border-[#aeddf899] text-[#0e8ae0] text-sm font-extrabold shadow-[0_10px_24px_rgba(74,141,194,0.08)] hover:bg-[#ebf6ff] hover:-translate-y-0.5 transition"
                >
                  See Live Experiences
                </Link>
              </div>
            </section>

            {/* Author Card matching .author-card */}
            <section className="grid sm:grid-cols-[72px_1fr] gap-5 p-6 rounded-[28px] bg-white/82 border border-[#aeddf899] shadow-[0_18px_38px_rgba(60,121,175,0.1)] items-start">
              <div className="w-18 h-18 rounded-3xl bg-[linear-gradient(135deg,#1fa7ff,#72d5ff)] flex items-center justify-center text-white font-outfit text-2xl font-bold shadow-[0_12px_24px_rgba(31,167,255,0.25)] shrink-0">
                {authorName[0]?.toUpperCase() ?? "M"}
              </div>
              <div className="grid gap-2 min-w-0">
                <div className="flex flex-wrap gap-2.5 items-center text-[#5a88ac] text-[0.76rem] font-semibold">
                  <span>Written by {authorName}</span>
                  <span className="text-[#a9daf5]">•</span>
                  <span>Editorial</span>
                </div>
                <h3 className="font-outfit text-[1.28rem] font-semibold text-[#16304c] m-0">
                  Built for curious travelers and thoughtful hosts
                </h3>
                <p className="text-[0.88rem] leading-[1.78] text-[#6f8daa] m-0">
                  We write about local experiences, host growth, and better ways to spend time with people who know their place deeply. Every article is shaped to support the same warm, trust-first feeling behind the Myslotmate brand.
                </p>
              </div>
            </section>

            {/* Related / More you might enjoy matching .related-shell */}
            {relatedBlogs.length > 0 && (
              <section className="pt-6">
                <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                  <div>
                    <h2 className="font-outfit text-[clamp(1.5rem,2.3vw,2rem)] font-semibold text-[#16304c] m-0">
                      More you might enjoy
                    </h2>
                    <p className="mt-2.5 text-[0.9rem] leading-[1.68] text-[#6f8daa] m-0">
                      A few more reads from the Myslotmate blog.
                    </p>
                  </div>
                  <Link
                    href="/blogs"
                    className="inline-flex items-center gap-2 font-outfit text-[0.92rem] font-bold text-[#0e8ae0] hover:underline after:content-['>'] after:text-base"
                  >
                    View all posts
                  </Link>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {relatedBlogs.map((item) => (
                    <article
                      key={item.id}
                      onClick={() => router.push(`/blogs/${item.id}`)}
                      className="flex flex-col justify-between h-full p-5 rounded-[28px] bg-white/82 border border-[#aeddf899] shadow-[0_20px_42px_rgba(60,121,175,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_56px_rgba(60,121,175,0.16)] cursor-pointer group"
                    >
                      <div className="space-y-4 min-w-0">
                        <div className="relative min-h-[200px] w-full overflow-hidden rounded-[24px] border border-[#addbf699] bg-[linear-gradient(145deg,#e5f7ff,#f9fdff)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.cover_image_url ?? FALLBACK_BLOG_IMAGE}
                            alt={getBlogValue(item.title, "Related blog")}
                            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105 rounded-[24px]"
                          />
                        </div>

                        <div className="grid content-start gap-2.5 pt-1">
                          <div>
                            <span className="inline-flex items-center justify-center gap-2 rounded-full px-3.5 py-1.5 bg-white/90 border border-[#a9daf5a6] text-[0.74rem] font-extrabold tracking-[0.08em] text-[#4a8ab8] uppercase before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#4a8ab8]">
                              {getBlogValue(item.category, "General")}
                            </span>
                          </div>
                          <h3 className="font-outfit text-[1.08rem] font-semibold leading-[1.24] tracking-[-0.04em] text-[#16304c] m-0 group-hover:text-[#0e8ae0] transition">
                            {getBlogValue(item.title, "Untitled blog")}
                          </h3>
                          <p className="line-clamp-3 text-[0.88rem] leading-[1.68] text-[#6f8daa] m-0">
                            {getBlogValue(item.description, getBlogExcerpt(item))}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-[#f0f6fb] pt-3.5 text-[#5a88ac] text-[0.76rem] font-semibold">
                        <span>{formatBlogDate(item.published_at ?? item.created_at)}</span>
                        <span>•</span>
                        <span>{item.read_time_minutes ?? 5} Min Read</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Newsletter Banner matching .newsletter-banner */}
            <section className="grid gap-3.5 p-7 mt-7 rounded-[28px] bg-[radial-gradient(circle_at_top_right,rgba(127,213,255,0.3),transparent_28%),rgba(255,255,255,0.84)] border border-[#aeddf899] shadow-[0_18px_38px_rgba(60,121,175,0.1)]">
              <div>
                <span className="inline-flex items-center justify-center gap-2 rounded-full px-3.5 py-1.5 bg-white/90 border border-[#a9daf5a6] text-[0.74rem] font-extrabold tracking-[0.08em] text-[#4a8ab8] uppercase before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#4a8ab8]">
                  Stay in the Loop
                </span>
              </div>
              <h3 className="font-outfit text-[clamp(1.6rem,3vw,2.2rem)] font-semibold tracking-[-0.04em] text-[#16304c] m-0">
                Get new stories from Myslotmate in your inbox.
              </h3>
              <p className="text-[0.88rem] leading-[1.78] text-[#6f8daa] m-0">
                A light, useful stream of host notes, travel insights, and local experience ideas.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.success("Thank you for subscribing!");
                }}
                className="flex flex-wrap items-center gap-3 mt-2"
              >
                <input
                  type="email"
                  required
                  placeholder="Your email address"
                  className="flex-1 min-w-[240px] h-13 rounded-full border border-[#78bcd759] bg-white/92 px-5 text-[#16304c] placeholder:text-[#6f8daa] outline-none focus:ring-2 focus:ring-[#1fa7ff]/30 shadow-sm"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full h-13 px-7 bg-[linear-gradient(135deg,#1fa7ff,#0e8ae0)] text-white text-sm font-extrabold tracking-[0.02em] shadow-[0_16px_32px_rgba(31,167,255,0.24)] hover:shadow-[0_20px_40px_rgba(31,167,255,0.35)] hover:-translate-y-0.5 transition"
                >
                  Subscribe
                </button>
              </form>
            </section>
          </div>
        </section>
      </main>

      <Home.Footer />
    </div>
  );
}
