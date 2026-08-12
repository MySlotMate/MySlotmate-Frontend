"use client";

import React, { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { FiArrowLeft } from "react-icons/fi";
import { LuLoader2 } from "react-icons/lu";
import { toast } from "sonner";
import { Navbar, Home } from "~/components";
import { useBlog, useListBlogs } from "~/hooks/useApi";
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

export default function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();

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
    data: blog,
    isLoading,
    error,
  } = useBlog(resolvedParams.slug, idToken);
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
      <div className="font-manrope flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,rgba(31,167,255,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(127,213,255,0.16),transparent_22%),linear-gradient(180deg,#fbfeff_0%,#f2faff_100%)] text-[#16304c]">
        <Navbar />
        <div className="flex min-h-[60vh] flex-1 items-center justify-center">
          <LuLoader2 className="h-12 w-12 animate-spin text-[#0094CA]" />
        </div>
        <Home.Footer />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="font-manrope flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,rgba(31,167,255,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(127,213,255,0.16),transparent_22%),linear-gradient(180deg,#fbfeff_0%,#f2faff_100%)] text-[#16304c]">
        <Navbar />
        <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-2xl font-bold text-[#16304c]">Article Not Found</p>
          <p className="max-w-md text-[#6f8daa]">
            The story you are looking for does not exist or may have been
            removed.
          </p>
          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1fa7ff,#0e8ae0)] px-6 py-3.5 font-extrabold text-white shadow-[0_16px_32px_rgba(31,167,255,0.24)] transition hover:shadow-[0_20px_40px_rgba(31,167,255,0.35)]"
          >
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
    <div className="font-manrope flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,rgba(31,167,255,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(127,213,255,0.16),transparent_22%),linear-gradient(180deg,#fbfeff_0%,#f2faff_100%)] text-[#16304c]">
      <Navbar />

      <main className="mx-auto w-full max-w-[1120px] min-w-0 flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {/* Breadcrumb */}
        <nav
          className="mb-5 flex flex-wrap items-center gap-2 text-[0.85rem] font-bold text-[#6f8daa]"
          aria-label="Breadcrumb"
        >
          <Link href="/" className="transition hover:text-[#0e8ae0]">
            Myslotmate
          </Link>
          <span>/</span>
          <Link href="/blogs" className="transition hover:text-[#0e8ae0]">
            Blog
          </Link>
          <span>/</span>
          <span className="text-[#16304c]">{displayCategory}</span>
        </nav>

        {/* Article Hero matching post.html .article-hero */}
        <section className="mt-3 grid items-center gap-8.5 lg:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.92fr)]">
          <div className="grid min-w-0 content-start gap-4 pt-1.5">
            <div>
              <span className="inline-flex items-center justify-center gap-2 rounded-full border border-[#a9daf5a6] bg-white/90 px-3.5 py-1.5 text-[0.74rem] font-extrabold tracking-[0.08em] text-[#4a8ab8] uppercase before:h-1.5 before:w-1.5 before:rounded-full before:bg-[#4a8ab8] before:content-['']">
                {displayCategory}
              </span>
            </div>
            <h1 className="font-outfit m-0 max-w-[720px] text-[clamp(1.72rem,3.05vw,2.45rem)] leading-[1.08] font-semibold text-[#16304c]">
              {displayTitle}
            </h1>
            <p className="m-0 mt-1 max-w-[720px] text-[0.88rem] leading-[1.72] text-[#6f8daa]">
              {excerpt}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2.5 text-[0.76rem] font-semibold text-[#5a88ac]">
              <span>By {authorName}</span>
              <span className="text-[#a9daf5]">•</span>
              <span>{displayDate}</span>
              <span className="text-[#a9daf5]">•</span>
              <span>{blog.read_time_minutes ?? 5} Min Read</span>
            </div>
          </div>
          <div className="w-full self-start">
            <div className="relative min-h-[312px] w-full overflow-hidden rounded-3xl border border-[#addbf699] bg-slate-100 shadow-[0_18px_40px_rgba(58,119,172,0.12)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={blog.cover_image_url ?? FALLBACK_BLOG_IMAGE}
                alt={displayTitle}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </div>
        </section>

        {/* Article Layout grid */}
        <section className="mt-8 grid items-start gap-7 lg:grid-cols-[240px_minmax(0,1fr)]">
          {/* TOC Sidebar matching post.html .toc */}
          <aside className="sticky top-24 hidden max-h-[calc(100vh-120px)] overflow-y-auto rounded-[28px] border border-[#aeddf899] bg-white/82 p-5 shadow-[0_18px_38px_rgba(60,121,175,0.1)] lg:block">
            <h4 className="m-0 mb-3 text-[0.95rem] font-bold tracking-[0.06em] text-[#4b81a7] uppercase">
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
                        const y =
                          el.getBoundingClientRect().top +
                          window.pageYOffset +
                          yOffset;
                        window.scrollTo({ top: y, behavior: "smooth" });
                      }
                    }}
                    className={`block cursor-pointer border-b border-[#aeddf866] py-3 text-[0.84rem] transition-all duration-200 last:border-b-0 ${
                      activeTocId === item.id
                        ? "border-l-2 border-[#0e8ae0] pl-2 font-extrabold text-[#0e8ae0]"
                        : "font-medium text-[#8aa2b7] hover:text-[#0e8ae0]"
                    }`}
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            ) : (
              <p className="m-0 text-xs text-[#8aa2b7] italic">
                No table of contents
              </p>
            )}
          </aside>

          {/* Main Content & Banners */}
          <div className="min-w-0 space-y-7">
            <article className="article-body rounded-[28px] border border-[#aeddf899] bg-white/82 p-6 text-[0.9rem] leading-[1.72] text-[#6f8daa] shadow-[0_18px_38px_rgba(60,121,175,0.1)] sm:p-9">
              <BlockRenderer blocks={blocks} showHeadings={true} />
            </article>

            {/* CTA Banner matching .cta-banner */}
            <section className="grid gap-3.5 rounded-[28px] border border-[#aeddf899] bg-[radial-gradient(circle_at_top_right,rgba(127,213,255,0.3),transparent_28%),rgba(255,255,255,0.84)] p-7 shadow-[0_18px_38px_rgba(60,121,175,0.1)]">
              <div>
                <span className="inline-flex items-center justify-center gap-2 rounded-full border border-[#a9daf5a6] bg-white/90 px-3.5 py-1.5 text-[0.74rem] font-extrabold tracking-[0.08em] text-[#4a8ab8] uppercase before:h-1.5 before:w-1.5 before:rounded-full before:bg-[#4a8ab8] before:content-['']">
                  For Hosts
                </span>
              </div>
              <h3 className="font-outfit m-0 text-[clamp(1.4rem,2.4vw,1.82rem)] font-semibold text-[#16304c]">
                Want to turn your local knowledge into a thoughtful experience?
              </h3>
              <p className="m-0 text-[0.88rem] leading-[1.78] text-[#6f8daa]">
                Build a listing that feels like you, clarify the moments that
                matter, and create time people are genuinely excited to book.
              </p>
              <div className="mt-2 flex flex-wrap gap-3.5">
                <Link
                  href="/host-dashboard/experiences/new"
                  className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1fa7ff,#0e8ae0)] px-6 py-3.5 text-sm font-extrabold tracking-[0.02em] text-white shadow-[0_16px_32px_rgba(31,167,255,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(31,167,255,0.35)]"
                >
                  Become a Host
                </Link>
                <Link
                  href="/explore"
                  className="inline-flex items-center justify-center rounded-2xl border border-[#aeddf899] bg-white/90 px-6 py-3.5 text-sm font-extrabold text-[#0e8ae0] shadow-[0_10px_24px_rgba(74,141,194,0.08)] transition hover:-translate-y-0.5 hover:bg-[#ebf6ff]"
                >
                  See Live Experiences
                </Link>
              </div>
            </section>

            {/* Author Card matching .author-card */}
            <section className="grid items-start gap-5 rounded-[28px] border border-[#aeddf899] bg-white/82 p-6 shadow-[0_18px_38px_rgba(60,121,175,0.1)] sm:grid-cols-[72px_1fr]">
              <div className="font-outfit flex h-18 w-18 shrink-0 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#1fa7ff,#72d5ff)] text-2xl font-bold text-white shadow-[0_12px_24px_rgba(31,167,255,0.25)]">
                {authorName[0]?.toUpperCase() ?? "M"}
              </div>
              <div className="grid min-w-0 gap-2">
                <div className="flex flex-wrap items-center gap-2.5 text-[0.76rem] font-semibold text-[#5a88ac]">
                  <span>Written by {authorName}</span>
                  <span className="text-[#a9daf5]">•</span>
                  <span>Editorial</span>
                </div>
                <h3 className="font-outfit m-0 text-[1.28rem] font-semibold text-[#16304c]">
                  Built for curious travelers and thoughtful hosts
                </h3>
                <p className="m-0 text-[0.88rem] leading-[1.78] text-[#6f8daa]">
                  We write about local experiences, host growth, and better ways
                  to spend time with people who know their place deeply. Every
                  article is shaped to support the same warm, trust-first
                  feeling behind the Myslotmate brand.
                </p>
              </div>
            </section>

            {/* Related / More you might enjoy matching .related-shell */}
            {relatedBlogs.length > 0 && (
              <section className="pt-6">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="font-outfit m-0 text-[clamp(1.5rem,2.3vw,2rem)] font-semibold text-[#16304c]">
                      More you might enjoy
                    </h2>
                    <p className="m-0 mt-2.5 text-[0.9rem] leading-[1.68] text-[#6f8daa]">
                      A few more reads from the Myslotmate blog.
                    </p>
                  </div>
                  <Link
                    href="/blogs"
                    className="font-outfit inline-flex items-center gap-2 text-[0.92rem] font-bold text-[#0e8ae0] after:text-base after:content-['>'] hover:underline"
                  >
                    View all posts
                  </Link>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  {relatedBlogs.map((item) => (
                    <article
                      key={item.id}
                      onClick={() => router.push(`/blogs/${item.slug}`)}
                      className="group flex h-full cursor-pointer flex-col justify-between rounded-[28px] border border-[#aeddf899] bg-white/82 p-5 shadow-[0_20px_42px_rgba(60,121,175,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_56px_rgba(60,121,175,0.16)]"
                    >
                      <div className="min-w-0 space-y-4">
                        <div className="relative min-h-[200px] w-full overflow-hidden rounded-[24px] border border-[#addbf699] bg-[linear-gradient(145deg,#e5f7ff,#f9fdff)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.cover_image_url ?? FALLBACK_BLOG_IMAGE}
                            alt={getBlogValue(item.title, "Related blog")}
                            className="absolute inset-0 h-full w-full rounded-[24px] object-cover transition duration-500 group-hover:scale-105"
                          />
                        </div>

                        <div className="grid content-start gap-2.5 pt-1">
                          <div>
                            <span className="inline-flex items-center justify-center gap-2 rounded-full border border-[#a9daf5a6] bg-white/90 px-3.5 py-1.5 text-[0.74rem] font-extrabold tracking-[0.08em] text-[#4a8ab8] uppercase before:h-1.5 before:w-1.5 before:rounded-full before:bg-[#4a8ab8] before:content-['']">
                              {getBlogValue(item.category, "General")}
                            </span>
                          </div>
                          <h3 className="font-outfit m-0 text-[1.08rem] leading-[1.24] font-semibold tracking-[-0.04em] text-[#16304c] transition group-hover:text-[#0e8ae0]">
                            {getBlogValue(item.title, "Untitled blog")}
                          </h3>
                          <p className="m-0 line-clamp-3 text-[0.88rem] leading-[1.68] text-[#6f8daa]">
                            {getBlogValue(
                              item.description,
                              getBlogExcerpt(item),
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-[#f0f6fb] pt-3.5 text-[0.76rem] font-semibold text-[#5a88ac]">
                        <span>
                          {formatBlogDate(item.published_at ?? item.created_at)}
                        </span>
                        <span>•</span>
                        <span>{item.read_time_minutes ?? 5} Min Read</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Newsletter Banner matching .newsletter-banner */}
            <section className="mt-7 grid gap-3.5 rounded-[28px] border border-[#aeddf899] bg-[radial-gradient(circle_at_top_right,rgba(127,213,255,0.3),transparent_28%),rgba(255,255,255,0.84)] p-7 shadow-[0_18px_38px_rgba(60,121,175,0.1)]">
              <div>
                <span className="inline-flex items-center justify-center gap-2 rounded-full border border-[#a9daf5a6] bg-white/90 px-3.5 py-1.5 text-[0.74rem] font-extrabold tracking-[0.08em] text-[#4a8ab8] uppercase before:h-1.5 before:w-1.5 before:rounded-full before:bg-[#4a8ab8] before:content-['']">
                  Stay in the Loop
                </span>
              </div>
              <h3 className="font-outfit m-0 text-[clamp(1.6rem,3vw,2.2rem)] font-semibold tracking-[-0.04em] text-[#16304c]">
                Get new stories from Myslotmate in your inbox.
              </h3>
              <p className="m-0 text-[0.88rem] leading-[1.78] text-[#6f8daa]">
                A light, useful stream of host notes, travel insights, and local
                experience ideas.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.success("Thank you for subscribing!");
                }}
                className="mt-2 flex flex-wrap items-center gap-3"
              >
                <input
                  type="email"
                  required
                  placeholder="Your email address"
                  className="h-13 min-w-[240px] flex-1 rounded-full border border-[#78bcd759] bg-white/92 px-5 text-[#16304c] shadow-sm outline-none placeholder:text-[#6f8daa] focus:ring-2 focus:ring-[#1fa7ff]/30"
                />
                <button
                  type="submit"
                  className="inline-flex h-13 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1fa7ff,#0e8ae0)] px-7 text-sm font-extrabold tracking-[0.02em] text-white shadow-[0_16px_32px_rgba(31,167,255,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(31,167,255,0.35)]"
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
