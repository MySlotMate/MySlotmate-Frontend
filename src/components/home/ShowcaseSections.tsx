﻿"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Mountain,
  Palette,
  Star,
  Users,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useListHosts, useListPublicEvents } from "~/hooks/useApi";
import {
  POPULAR_CITIES,
  calculateDistance,
  getSavedLocation,
  type CityLocation,
} from "../LocationModal";
import * as components from "../../components";

type FeaturedItem = {
  id?: string;
  title: string;
  copy: string;
  duration: string;
  price: string;
  rating: string;
  image: string;
  overlayTitle: string;
  overlaySubtitle: string;
};

type StoryItem = {
  id?: string;
  title: string;
  copy: string;
  statOne: string;
  statOneLabel: string;
  statTwo: string;
  statTwoLabel: string;
  image: string;
  quote: string;
  author: string;
};

type CommunitySet = {
  label: string;
  note: string;
  images: string[];
};

type CuratedSessionItem = {
  id?: string;
  headline: string;
  title: string;
  description: string;
  imageUrl: string;
  rating: string;
  price: string;
};

const CuratedSessionCard = ({
  id,
  headline,
  title,
  description,
  imageUrl,
  rating,
  price,
}: CuratedSessionItem) => {
  const href = id ? `/experience/${id}` : "/experiences";

  return (
    <Link
      href={href}
      className="group shrink-0 snap-start w-[260px] overflow-hidden rounded-[28px] border border-[#d6ebf7cc] bg-white shadow-[0_16px_34px_rgba(72,128,173,0.08)] transition hover:-translate-y-1"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[28px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl || "/assets/home/hiking.jpg"}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="space-y-1.5 px-5 pb-6 pt-4">
        <p className="line-clamp-1 text-[10px] font-extrabold uppercase tracking-[0.09em] text-[#3f89c3]">
          {headline}
        </p>
        <p className="line-clamp-1 text-2xl font-bold leading-tight tracking-[-0.03em] text-[#16304c]">
          {title}
        </p>
        <p className="line-clamp-2 min-h-[40px] text-xs leading-relaxed text-[#6f8daa]">
          {description}
        </p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-bold text-[#5e88ab]">{price}</span>
          <span className="text-[11px] font-bold text-[#5e88ab]">
            Rating {rating}
          </span>
        </div>
      </div>
    </Link>
  );
};

const WAY_CARDS = [
  {
    title: "Walk the city",
    desc: "Slow walks. Real conversations.",
    tag: "Walk Together",
    video: "https://res.cloudinary.com/dhry5xscm/video/upload/v1775498006/Adventure_jw6egk.mp4",
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80",
    icon: Mountain,
  },
  {
    title: "Learn something new",
    desc: "Skills shared by real people.",
    tag: "Learn Together",
    video: "https://res.cloudinary.com/dhry5xscm/video/upload/v1775497976/Social_tmueix.mp4",
    image:
      "https://images.unsplash.com/photo-1515169067868-5387ec356754?auto=format&fit=crop&w=900&q=80",
    icon: Users,
  },
  {
    title: "Create something",
    desc: "Art, craft, and creative sessions.",
    tag: "Create Together",
    video: "https://res.cloudinary.com/dhry5xscm/video/upload/v1775497970/Creativity_jyuajd.mp4",
    image:
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=80",
    icon: Palette,
  },
  {
    title: "Simple moments",
    desc: "Tea, music, and mindful time.",
    tag: "Spend Time Well",
    video: "https://res.cloudinary.com/dhry5xscm/video/upload/v1775498035/Wellness_wqkjtt.mov",
    image:
      "https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=900&q=80",
    icon: Camera,
  },
];

const FEATURED_FALLBACK_DATA: FeaturedItem[] = [
  {
    id: undefined,
    title: "Hidden City Photo Walk",
    copy: "Explore hidden streets and city light with a local photographer who knows where the stories live.",
    duration: "2 Hours",
    price: "\u20B91,500 / slot",
    rating: "4.9",
    image:
      "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=80",
    overlayTitle: "Hidden City Photo Walk",
    overlaySubtitle: "Hosted by Priya",
  },
  {
    id: undefined,
    title: "Market Spice Tour",
    copy: "Explore vibrant spice markets with a host who knows the stalls, flavors, and food stories behind them.",
    duration: "2.5 Hours",
    price: "\u20B91,200 / slot",
    rating: "4.8",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    overlayTitle: "Market Spice Tour",
    overlaySubtitle: "Hosted by Ananya",
  },
  {
    id: undefined,
    title: "Mindful Clay Workshop",
    copy: "Slow pottery, quiet focus, and a creative session designed to help you make something with intention.",
    duration: "2 Hours",
    price: "\u20B91,800 / slot",
    rating: "4.8",
    image:
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80",
    overlayTitle: "Mindful Clay Workshop",
    overlaySubtitle: "Hosted by Sneha",
  },
];

const STORY_FALLBACK_DATA: StoryItem[] = [
  {
    id: undefined,
    title: "Meet Priya: The Lens of the City",
    copy: "I grew up exploring these streets. Every corner has a memory, and every shadow tells a story.",
    statOne: "47",
    statOneLabel: "Events Hosted",
    statTwo: "4.9",
    statTwoLabel: "User Rating",
    image:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
    quote: "The best way to see a city is through the eyes of someone who loves it.",
    author: "Anuj Yadav",
  },
  {
    id: undefined,
    title: "Meet Ananya: Stories at the Table",
    copy: "Food is how I remember people, places, and family rituals. Every session is part recipe, part memory.",
    statOne: "83",
    statOneLabel: "Sessions Hosted",
    statTwo: "4.8",
    statTwoLabel: "User Rating",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    quote: "The recipes were beautiful, but the family stories made the whole experience unforgettable.",
    author: "Ria Kapoor",
  },
  {
    id: undefined,
    title: "Meet Rohan: Street Frames After Dark",
    copy: "I host photo walks for people who want to slow down and really notice the city.",
    statOne: "61",
    statOneLabel: "Walks Hosted",
    statTwo: "4.9",
    statTwoLabel: "User Rating",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    quote: "Rohan helped me notice details I would have walked past. The city felt completely new.",
    author: "Milan Shah",
  },
];

const COMMUNITY_SETS: CommunitySet[] = [
  {
    label: "Adventure",
    note: "Trekking, kayaking, riverside trails, and outdoor sessions with a sense of discovery.",
    images: [
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1515169067868-5387ec356754?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=600&q=80",
    ],
  },
  {
    label: "Creative",
    note: "Pottery, painting, photography, and hands-on workshops built around making.",
    images: [
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=600&q=80",
    ],
  },
  {
    label: "Food",
    note: "Cooking, spice markets, tea tastings, kitchens, and food stories worth following.",
    images: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
    ],
  },
];

const STATS_TARGETS = [1000, 200, 4.8, 6] as const;
const STEPS_ICONS=["/assets/home/verified_magnifying_glass.svg", "/assets/home/calender.svg", "/assets/home/heart_on_hand.svg"] as const;
const formatStat = (value: number, target: number) => {
  if (String(target).includes(".")) return value.toFixed(1);
  return Math.round(value).toString();
};

const ShowcaseSections = () => {
  const [hostId, setHostId] = useState<string | null>(null);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [communityIndex, setCommunityIndex] = useState(0);
  const [stats, setStats] = useState([0, 0, 0, 0]);
  const [location, setLocation] = useState<CityLocation | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isCuratedOverflowing, setIsCuratedOverflowing] = useState(false);
  const [isCuratedAtScrollEnd, setIsCuratedAtScrollEnd] = useState(false);
  const { data: events } = useListPublicEvents();
  const { data: hosts } = useListHosts();
  const curatedSessionsViewportRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const wayVideoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const howSectionRef = useRef<HTMLElement>(null);
  const howProgressRef = useRef<HTMLDivElement>(null);
  const formatPrice = (priceCents: number | null | undefined) => {
    if (!priceCents) return "Free";
    return `\u20B9${Math.round(priceCents / 100)} / slot`;
  };

  useEffect(() => {
    setLocation(getSavedLocation());
    setMounted(true);
    setHostId(localStorage.getItem("msm_host_id"));

    const handleStorageChange = () => {
      setLocation(getSavedLocation());
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const featuredData = useMemo<FeaturedItem[]>(() => {
    if (!events) {
      return FEATURED_FALLBACK_DATA;
    }

    const now = new Date();
    const upcoming = events
      .filter((event) => new Date(event.time) > now)
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .slice(0, 3)
      .map((event) => ({
        id: event.id,
        title: event.title,
        copy:
          event.hook_line ??
          event.description ??
          "Discover a hosted experience near you.",
        duration: `${event.duration_minutes ?? 0} mins`,
        price: formatPrice(event.price_cents),
        rating:
          event.avg_rating !== null && event.avg_rating !== undefined
            ? event.avg_rating.toFixed(1)
            : "New",
        image: event.cover_image_url ?? "/assets/home/hiking.jpg",
        overlayTitle: event.title,
        overlaySubtitle: event.location
          ? `In ${event.location}`
          : "Hosted on MySlotMate",
      }));

    return upcoming.length > 0 ? upcoming : FEATURED_FALLBACK_DATA;
  }, [events]);

  const curatedSessions = useMemo<CuratedSessionItem[]>(() => {
    const fallback: CuratedSessionItem[] = FEATURED_FALLBACK_DATA.map((item) => ({
      id: item.id,
      headline: "Curated Session",
      title: item.title,
      description: item.copy,
      imageUrl: item.image,
      rating: item.rating,
      price: item.price,
    }));

    if (!events) return fallback;

    const now = new Date();
    const upcoming = events
      .filter((event) => new Date(event.time) > now)
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .slice(0, 8)
      .map((event) => ({
        id: event.id,
        headline: event.location ? `In ${event.location}` : "Curated Session",
        title: event.title,
        description:
          event.hook_line ??
          event.description ??
          "Discover a hosted experience near you.",
        imageUrl: event.cover_image_url ?? "/assets/home/hiking.jpg",
        rating:
          event.avg_rating !== null && event.avg_rating !== undefined
            ? event.avg_rating.toFixed(1)
            : "New",
        price: formatPrice(event.price_cents),
      }));

    return upcoming.length > 0 ? upcoming : fallback;
  }, [events]);

  const storyData = useMemo<StoryItem[]>(() => {
    if (!hosts) {
      return STORY_FALLBACK_DATA;
    }

    const nearbyHosts = !mounted || !location
      ? hosts.slice(0, 3)
      : hosts
        .map((host) => {
          const hostCity = POPULAR_CITIES.find(
            (city) => city.city.toLowerCase() === host.city.toLowerCase(),
          );

          const distance = hostCity
            ? calculateDistance(location.lat, location.lng, hostCity.lat, hostCity.lng)
            : Number.POSITIVE_INFINITY;

          return { host, distance };
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3)
        .map(({ host }) => host);

    const mappedStories = nearbyHosts.map((host) => {
      const fullName = `${host.first_name} ${host.last_name}`.trim();
      return {
        id: host.id,
        title: `Meet ${fullName}`,
        copy:
          host.bio ??
          host.tagline ??
          `${host.first_name} is hosting meaningful local experiences on MySlotMate.`,
        statOne: `${host.total_reviews ?? 0}`,
        statOneLabel: "Reviews",
        statTwo: (host.avg_rating ?? 4.5).toFixed(1),
        statTwoLabel: "User Rating",
        image:
          host.avatar_url ??
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
        quote:
          host.tagline ??
          "Join me for a local experience built around real connection and meaningful time.",
        author: fullName,
      };
    });

    return mappedStories.length > 0 ? mappedStories : STORY_FALLBACK_DATA;
  }, [hosts, location, mounted]);

  const featured = featuredData[featuredIndex] ?? featuredData[0]!;
  const story = storyData[storyIndex] ?? storyData[0]!;
  const community = COMMUNITY_SETS[communityIndex]!;
  const featuredHref = featured.id ? `/experience/${featured.id}` : "/experiences";
  const storyHref = story.id ? `/host/${story.id}` : "/hosts";

  const updateCuratedSessionsScrollState = () => {
    const viewport = curatedSessionsViewportRef.current;
    if (!viewport) return;

    const overflowThresholdPx = 2;
    const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const overflowing = maxScrollLeft > overflowThresholdPx;

    const endThresholdPx = 12;
    const atEnd = overflowing && Math.ceil(viewport.scrollLeft + endThresholdPx) >= maxScrollLeft;

    setIsCuratedOverflowing(overflowing);
    setIsCuratedAtScrollEnd(atEnd);
  };

  const scrollCuratedSessions = (direction: "left" | "right") => {
    const viewport = curatedSessionsViewportRef.current;
    if (!viewport) return;

    viewport.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });

    window.requestAnimationFrame(() => updateCuratedSessionsScrollState());
    window.setTimeout(() => updateCuratedSessionsScrollState(), 350);
  };

  useEffect(() => {
    const viewport = curatedSessionsViewportRef.current;
    if (!viewport) return;

    const handleScroll = () => updateCuratedSessionsScrollState();

    const raf = window.requestAnimationFrame(() => updateCuratedSessionsScrollState());
    viewport.addEventListener("scroll", handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => updateCuratedSessionsScrollState());
    resizeObserver.observe(viewport);

    return () => {
      window.cancelAnimationFrame(raf);
      viewport.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [curatedSessions.length]);

  useEffect(() => {
    if (featuredData.length <= 1) return;

    const id = window.setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % featuredData.length);
    }, 5000);

    return () => window.clearInterval(id);
  }, [featuredData.length]);

  useEffect(() => {
    setFeaturedIndex((prev) =>
      featuredData.length === 0 ? 0 : Math.min(prev, featuredData.length - 1),
    );
  }, [featuredData.length]);

  useEffect(() => {
    if (storyData.length <= 1) return;

    const id = window.setInterval(() => {
      setStoryIndex((prev) => (prev + 1) % storyData.length);
    }, 5000);

    return () => window.clearInterval(id);
  }, [storyData.length]);

  useEffect(() => {
    setStoryIndex((prev) =>
      storyData.length === 0 ? 0 : Math.min(prev, storyData.length - 1),
    );
  }, [storyData.length]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setCommunityIndex((prev) => (prev + 1) % COMMUNITY_SETS.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const node = statsRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const start = performance.now();
          const duration = 1600;

          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            setStats(STATS_TARGETS.map((target) => target * eased));

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
          observer.unobserve(node);
        });
      },
      { threshold: 0.55 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const stepItems = useMemo(
    () => [
      { title: "Find a host", desc: "Browse experiences near you." },
      { title: "Book a time", desc: "Choose a slot that works." },
      { title: "Show up", desc: "Enjoy the experience." },
    ],
    [],
  );

  const stopVideo = (video: HTMLVideoElement | null | undefined) => {
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  };

  const playCardVideo = (index: number) => {
    wayVideoRefs.current.forEach((video, idx) => {
      if (idx !== index) {
        stopVideo(video);
      }
    });

    const video = wayVideoRefs.current[index];
    if (!video) return;
    void video.play().catch(() => undefined);
  };

  const stopCardVideo = (index: number) => {
    stopVideo(wayVideoRefs.current[index]);
  };

  useLayoutEffect(() => {
    const section = howSectionRef.current;
    const progressBar = howProgressRef.current;
    if (!section || !progressBar) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        progressBar,
        { scaleX: 0, opacity: 0, transformOrigin: "left center" },
        {
          scaleX: 1,
          opacity: 1,
          duration: 2, // Add a duration since it's no longer tied to scroll speed
          ease: "power2.out",
          scrollTrigger: {
            trigger: section,
            start: "top 75%",
            // "play none none none" means: 
            // onEnter, do nothing onLeave, do nothing onEnterBack, do nothing onLeaveBack
            toggleActions: "play none none none",
            once: true, // This ensures the animation never resets or fires again
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);
  return (
    <>
      <section className="w-full border-y border-[#aeddf847] bg-[linear-gradient(180deg,#edf8ff,#f7fcff)] site-x">
        <div className="mx-auto w-full max-w-[1120px] py-14">
          <div className="mx-auto mb-8 max-w-[760px] text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#a9daf5a6] bg-white/90 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4a8ab8]">
              Explore Experiences
            </span>
            <h2 className="mt-3 font-[Outfit,sans-serif] text-4xl font-bold tracking-[-0.04em] text-[#16304c] sm:text-5xl">
              Ways to spend better time
            </h2>
            <p className="mt-2 text-sm text-[#6f8daa] sm:text-base">
              Browse sessions built around walks, learning, creativity, and shared local moments.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WAY_CARDS.map((card, idx) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  tabIndex={0}
                  onMouseEnter={() => playCardVideo(idx)}
                  onMouseLeave={() => stopCardVideo(idx)}
                  onFocus={() => playCardVideo(idx)}
                  onBlur={() => stopCardVideo(idx)}
                  className="group relative min-h-[260px] overflow-hidden rounded-3xl border border-[#aeddf89e] bg-[#dff3ff] shadow-[0_14px_32px_rgba(77,140,190,0.08)]"
                >
                  <video
                    ref={(el) => {
                      wayVideoRefs.current[idx] = el;
                    }}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    poster={card.image}
                    className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    <source src={card.video} type={card.video.endsWith(".mov") ? "video/quicktime" : "video/mp4"} />
                  </video>
                  <div className="relative z-10 flex h-full flex-col p-4 transition duration-300 group-hover:opacity-0 group-hover:translate-y-2 group-focus-within:opacity-0 group-focus-within:translate-y-2">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/85 text-[#0e8ae0] shadow-[0_10px_18px_rgba(56,116,169,0.12)]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="mt-auto inline-flex w-max rounded-full bg-white/75 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#4a8ab8]">
                      {card.tag}
                    </span>
                    <h3 className="mt-2 text-[15px] font-bold text-[#16304c]">{card.title}</h3>
                    <p className="text-xs text-[#5c84a5]">{card.desc}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" ref={howSectionRef} className="w-full site-x">
        <div className="mx-auto w-full max-w-[1120px] py-14">
          <div className="mx-auto mb-8 max-w-[760px] text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#a9daf5a6] bg-white/90 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4a8ab8]">
              How it works
            </span>
            <h2 className="mt-3 font-[Outfit,sans-serif] text-4xl font-bold tracking-[-0.04em] text-[#16304c] sm:text-5xl">
              Simple steps to start an experience.
            </h2>
            <p className="mt-2 text-sm text-[#6f8daa] sm:text-base">
              Find a local host, choose a time, and show up for something meaningful.
            </p>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute left-20 right-20 top-8 z-0 hidden h-1 lg:block">
              <div
                ref={howProgressRef}
                className="h-full w-full origin-left scale-x-0 opacity-0 rounded-full bg-[linear-gradient(90deg,#1fa7ff,#83d9ff)]"
              />
            </div>
            <div className="relative z-10 grid gap-5 md:grid-cols-3">
              {stepItems.map((step, idx) => (
                <article key={step.title} className="relative z-10 text-center">
                  <div className="relative z-20 mx-auto mb-4 grid h-[74px] w-[74px] place-items-center rounded-full bg-[#0094CA] font-[Outfit,sans-serif] border-6 border-[#04b7f8] text-2xl font-bold text-white shadow-[0_16px_28px_rgba(31,167,255,0.2)]">
                    <img src={STEPS_ICONS[idx]} alt={step.title} className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#16304c]">{step.title}</h3>
                  <p className="mx-auto mt-1 max-w-[260px] text-sm text-[#6f8daa]">{step.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="w-full site-x">
        <div className="mx-auto w-full max-w-[1120px] pb-14">
          <div className="grid gap-5 rounded-[28px] border border-[#aeddf885] bg-white p-4 shadow-[0_18px_42px_rgba(60,121,175,0.10)] md:grid-cols-[1.03fr_0.97fr] md:items-center">
            <div className="relative mx-auto aspect-square w-full max-w-[360px] overflow-hidden rounded-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={featured.image} alt={featured.title} className="h-full w-full object-cover" />
              <div className="absolute bottom-4 left-4 rounded-2xl bg-[#12334fc2] px-3 py-2 text-white backdrop-blur-sm">
                <p className="text-sm font-semibold">{featured.overlayTitle}</p>
                <p className="text-xs text-white/80">{featured.overlaySubtitle}</p>
              </div>
            </div>

            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#a9daf5a6] bg-white/90 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4a8ab8]">
                Featured Experience
              </span>
              <h3 className="mt-3 font-[Outfit,sans-serif] text-3xl font-bold tracking-[-0.04em] text-[#16304c] sm:text-4xl">
                {featured.title}
              </h3>
              <p className="mt-2 text-sm text-[#6f8daa]">{featured.copy}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#dff3ff] px-3 py-2 text-xs font-bold text-[#3f7eb1]">
                  <Clock3 className="h-4 w-4" />
                  {featured.duration}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#dff3ff] px-3 py-2 text-xs font-bold text-[#3f7eb1]">
                  {featured.price}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#dff3ff] px-3 py-2 text-xs font-bold text-[#3f7eb1]">
                  <Star className="h-4 w-4" />
                  {featured.rating}
                </span>
              </div>

              <Link
                href={featuredHref}
                className="mt-5 w-full flex items-center justify-center rounded-lg bg-[linear-gradient(135deg,#1fa7ff,#63ceff)] px-5 py-3 text-sm font-extrabold text-white shadow-[0_16px_32px_rgba(31,167,255,0.24)]"
              >
                <span>Book This Experience</span>
              </Link>
            </div>
          </div>

          <div id="hosts" className="w-full">
            <components.Home.people currentHostId={hostId} />
          </div>
        </div>
      </section>

      <section className="w-full border-y border-[#aeddf847] site-x">
        <div className="mx-auto w-full max-w-[1120px] py-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#a9daf5a6] bg-white/90 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4a8ab8]">
                <span className="inline-block h-2 w-2 rounded-full bg-current" />
                Curated Sessions
              </span>
              <h2 className="mt-4 font-[Outfit,sans-serif] text-4xl font-bold tracking-[-0.045em] text-[#16304c] sm:text-6xl">
                Discover Experiences
              </h2>
              <p className="mt-1.5 text-sm text-[#6f8daa] sm:text-base">
                Handpicked sessions you can book in a few taps.
              </p>
            </div>

            {isCuratedOverflowing ? (
              <div className="hidden items-center gap-3 md:flex">
                <button
                  type="button"
                  onClick={() => scrollCuratedSessions("left")}
                  className="grid h-14 w-14 place-items-center border border-[#bdddf4] bg-[#f7fcff] text-[#2f7eb5] transition hover:bg-white"
                  aria-label="Scroll curated sessions left"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                {isCuratedAtScrollEnd ? (
                  <Link
                    href="/experiences"
                    className="inline-flex h-14 items-center justify-center gap-2 border border-[#bdddf4] bg-[#f7fcff] px-5 text-sm font-extrabold text-[#2f7eb5] transition hover:bg-white"
                    aria-label="See more experiences"
                  >
                    See more
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => scrollCuratedSessions("right")}
                    className="grid h-14 w-14 place-items-center border border-[#bdddf4] bg-[#f7fcff] text-[#2f7eb5] transition hover:bg-white"
                    aria-label="Scroll curated sessions right"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}
              </div>
            ) : null}
          </div>

          <div
            ref={curatedSessionsViewportRef}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 hide-scrollbar"
          >
            {curatedSessions.map((session, idx) => (
              <CuratedSessionCard
                key={session.id ?? `${session.title}-${idx}`}
                {...session}
              />
            ))}
          </div>

          <div className="mt-5 md:hidden">
            <Link
              href="/experiences"
              className="text-sm font-extrabold text-[#0e8ae0] hover:text-[#0b6eb1]"
            >
              View All
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full border-y border-[#aeddf847] bg-[linear-gradient(180deg,#edf8ff,#f7fcff)] site-x">
        <div className="mx-auto grid w-full max-w-[1120px] gap-10 py-14 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="relative mx-auto mb-12 w-full max-w-[560px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={story.image} alt={story.title} className="aspect-square w-full rounded-[32px] object-cover shadow-[0_18px_42px_rgba(60,123,177,0.1)]" />
            <div className="absolute bottom-[-34px] left-1/2 w-[min(310px,calc(100%-40px))] -translate-x-1/2 rounded-[26px] bg-white px-6 py-5 shadow-[0_26px_44px_rgba(60,123,177,0.18)]">
              <p className="font-[Outfit,sans-serif] text-[15px] italic text-[#1f7bb6]">
                &ldquo;{story.quote}&rdquo;
              </p>
              <span className="mt-3 block text-xs font-extrabold text-[#16304c]">- {story.author}</span>
            </div>
          </div>

          <div className="pt-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#a9daf5a6] bg-white/90 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4a8ab8]">
              Host Story
            </span>
            <h3 className="mt-3 font-[Outfit,sans-serif] text-3xl font-bold tracking-[-0.04em] text-[#16304c] sm:text-4xl">
              {story.title}
            </h3>
            <p className="mt-2 text-sm leading-7 text-[#6f8daa]">{story.copy}</p>

            <div className="my-5 flex gap-8 border-y border-[#aeddf88c] py-5">
              <div>
                <p className="font-[Outfit,sans-serif] text-3xl font-bold text-[#0e8ae0]">{story.statOne}</p>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-[#6f8daa]">{story.statOneLabel}</span>
              </div>
              <div>
                <p className="font-[Outfit,sans-serif] text-3xl font-bold text-[#0e8ae0]">{story.statTwo}</p>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-[#6f8daa]">{story.statTwoLabel}</span>
              </div>
            </div>

            <Link
              href={storyHref}
              className="inline-flex rounded-full bg-[linear-gradient(135deg,#1fa7ff,#63ceff)] px-8 py-3 text-sm font-extrabold text-white shadow-[0_16px_32px_rgba(31,167,255,0.24)]"
            >
              Book Time
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full site-x">
        <div ref={statsRef} className="mx-auto grid w-full max-w-[1120px] gap-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Booked Sessions", suffix: "+" },
            { label: "Active Hosts", suffix: "+" },
            { label: "Average Rating", suffix: "" },
            { label: "Cities Live", suffix: "" },
          ].map((item, idx) => (
            <article
              key={item.label}
              className="rounded-3xl border border-[#aeddf89e] bg-white/90 px-4 py-7 text-center shadow-[0_14px_30px_rgba(77,140,190,0.08)]"
            >
              <p className="font-[Outfit,sans-serif] text-5xl font-bold tracking-[-0.05em] text-[#0e8ae0]">
                {formatStat(stats[idx] ?? 0, STATS_TARGETS[idx] ?? 0)}
                <span className="text-3xl">{item.suffix}</span>
              </p>
              <span className="mt-3 block text-sm font-extrabold text-[#6f8daa]">{item.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section id="community" className="w-full site-x">
        <div className="mx-auto grid w-full max-w-[1120px] gap-5 pb-14 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[26px] bg-[linear-gradient(135deg,#109ae9,#0d85db)] p-7 text-white shadow-[0_22px_48px_rgba(18,132,214,0.22)]">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/20 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em]">
              List your time
            </span>
            <h3 className="mt-4 font-[Outfit,sans-serif] text-3xl font-bold leading-tight tracking-[-0.04em] sm:text-4xl">
              Turn Your Passion Into Experiences
            </h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80"
              alt="Hosts creating an experience together"
              className="mt-5 aspect-[16/10] w-full rounded-3xl object-cover shadow-[0_18px_32px_rgba(10,86,148,0.24)]"
            />
            <p className="mt-4 text-sm leading-7 text-white/85">
              Share a walk, workshop, food story, or creative session with people looking for meaningful ways to spend time.
            </p>
            <Link
              href="/become-host"
              className="mt-5 inline-flex rounded-[0.5rem] border border-white/30 bg-white/15 px-5 py-2.5 text-sm font-bold text-white transition scale-100 -translate-y-0 hover:-translate-y-1 hover:scale-105"
            >
              List Time
            </Link>
          </article>

          <article className="rounded-3xl border border-[#aeddf89e] bg-white p-5 shadow-[0_14px_32px_rgba(77,140,190,0.08)]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#16304c]">Community Moments</h3>
                <p className="mt-1 text-sm text-[#6f8daa]">{community.note}</p>
              </div>
              <span className="rounded-full bg-[#dff3ff] px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#0e8ae0]">
                {community.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {community.images.slice(0, 4).map((img, idx) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${img}-${idx}`}
                  src={img}
                  alt={`${community.label} moment ${idx + 1}`}
                  className="aspect-square w-full rounded-2xl object-cover"
                />
              ))}
            </div>
          </article>
        </div>
      </section>
    </>
  );
};

export default ShowcaseSections;
