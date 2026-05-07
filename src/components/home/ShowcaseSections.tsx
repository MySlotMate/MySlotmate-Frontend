"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Heart,
  Mountain,
  Pause,
  Palette,
  Play,
  Star,
  Users,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { toast } from "sonner";
import { BecomeHostModal } from "~/components/become-host";
import { useListTimeAction } from "~/hooks/useListTimeAction";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import {
  useListHosts,
  useListPublicEvents,
  useIsExperienceSaved,
  useSaveExperience,
  useUnsaveExperience,
} from "~/hooks/useApi";
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
  const [userId, setUserId] = useState<string | null>(null);
  const href = id ? `/experience/${id}` : "/experiences";

  const { data: savedStatus } = useIsExperienceSaved(id ?? null, userId);
  const saveExperience = useSaveExperience();
  const unsaveExperience = useUnsaveExperience();

  const isSaved = savedStatus?.saved ?? false;

  useEffect(() => {
    const id = localStorage.getItem("msm_user_id");
    if (id) {
      setUserId(id);
    }
  }, []);

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!id || !userId) {
      if (!userId) toast.error("Please login to save experiences");
      return;
    }

    if (isSaved) {
      unsaveExperience.mutate(
        { eventId: id, userId },
        { onSuccess: () => toast.success("Removed from saved") },
      );
    } else {
      saveExperience.mutate(
        { user_id: userId, event_id: id },
        { onSuccess: () => toast.success("Saved to your list") },
      );
    }
  };

  return (
    <Link
      href={href}
      className="group w-[280px] shrink-0 snap-start overflow-hidden rounded-[32px] border border-[#aeddf840] bg-white p-3 shadow-[0_16px_40px_rgba(72,128,173,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(72,128,173,0.12)]"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[24px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl || "/assets/home/hiking.jpg"}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />

        {/* Save button - Glassmorphism */}
        {id && (
          <button
            onClick={handleSave}
            disabled={saveExperience.isPending || unsaveExperience.isPending}
            className="absolute top-3 right-3 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-[#0094CA] backdrop-blur-md shadow-lg transition hover:bg-white hover:scale-110 active:scale-90 disabled:opacity-50"
            aria-label={isSaved ? "Remove from saved" : "Save experience"}
          >
            <Heart
              className="h-4.5 w-4.5 transition-colors"
              fill={isSaved ? "#0094CA" : "none"}
              stroke="#0094CA"
              strokeWidth={2.5}
            />
          </button>
        )}
      </div>

      <div className="px-3 pt-4 pb-5">
        <span className="inline-block rounded-full bg-[#f0f9ff] px-2.5 py-1 text-[9px] font-black tracking-widest text-[#0e8ae0] uppercase">
          {headline}
        </span>
        <h3 className="mt-2.5 line-clamp-1 text-lg font-black tracking-tight text-[#16304c]">
          {title}
        </h3>
        <p className="mt-1.5 line-clamp-2 min-h-[36px] text-[13px] leading-relaxed text-[#5c84a5]">
          {description}
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-[#16304c]">{price}</span>
            <span className="text-[10px] font-bold text-[#a0aec0]">/ session</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 ring-1 ring-amber-100">
            {rating !== "New" && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
            <span className="text-[11px] font-black text-amber-700">
              {rating}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

const WAY_CARDS = [
  {
    title: "Walk & Talk With a Stranger",
    desc: "Discover conversations on every walk",
    tag: "ADVENTURE",
    video:
      "https://res.cloudinary.com/dhry5xscm/video/upload/v1775498006/Adventure_jw6egk.mp4",
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80",
    icon: Mountain,
  },
  {
    title: "Coffee & Real Conversations",
    desc: "No small talk. Just honest connection",
    tag: "SOCIAL",
    video:
      "https://res.cloudinary.com/dhry5xscm/video/upload/v1775497976/Social_tmueix.mp4",
    image:
      "https://images.unsplash.com/photo-1515169067868-5387ec356754?auto=format&fit=crop&w=900&q=80",
    icon: Users,
  },
  {
    title: "Paint, Write, or Build Together",
    desc: "Learn by doing with real people",
    tag: "CREATIVITY",
    video:
      "https://res.cloudinary.com/dhry5xscm/video/upload/v1775497970/Creativity_jyuajd.mp4",
    image:
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=80",
    icon: Palette,
  },
  {
    title: "Slow Down With Someone",
    desc: "Tea, music, mindful time",
    tag: "WELLNESS",
    video:
      "https://res.cloudinary.com/dhry5xscm/video/upload/v1775762349/WhatsApp_Video_2026-04-10_at_12.47.41_AM_rqlq4f.mp4",
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
    quote:
      "The best way to see a city is through the eyes of someone who loves it.",
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
    quote:
      "The recipes were beautiful, but the family stories made the whole experience unforgettable.",
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
    quote:
      "Rohan helped me notice details I would have walked past. The city felt completely new.",
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
const STEPS_ICONS = [
  "/assets/home/verified_magnifying_glass.svg",
  "/assets/home/calender.svg",
  "/assets/home/heart_on_hand.svg",
] as const;
const HOW_IT_WORKS_MOBILE_PATH =
  "M110 0 C 214 18 214 128 110 174 C 6 220 6 332 110 348";
const formatStat = (value: number, target: number) => {
  if (String(target).includes(".")) return value.toFixed(1);
  return Math.round(value).toString();
};

const ShowcaseSections = () => {
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [isFeaturedPlaying, setIsFeaturedPlaying] = useState(true);
  const [storyIndex, setStoryIndex] = useState(0);
  const [isStoryPlaying, setIsStoryPlaying] = useState(true);
  const [communityIndex, setCommunityIndex] = useState(0);
  const [stats, setStats] = useState([0, 0, 0, 0]);
  const [location, setLocation] = useState<CityLocation | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isCuratedOverflowing, setIsCuratedOverflowing] = useState(false);
  const [isCuratedAtScrollEnd, setIsCuratedAtScrollEnd] = useState(false);
  const { hostId, userId } = useStoredAuth();
  const { closeBecomeHostModal, handleListTimeClick, showBecomeHostModal } =
    useListTimeAction();
  const { data: events } = useListPublicEvents();
  const { data: hosts } = useListHosts();
  const { data: featuredSavedStatus } = useIsExperienceSaved(
    featuredId,
    userId,
  );
  const saveExperience = useSaveExperience();
  const unsaveExperience = useUnsaveExperience();
  const curatedSessionsViewportRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const wayVideoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const howSectionRef = useRef<HTMLElement>(null);
  const howProgressRef = useRef<HTMLDivElement>(null);
  const howMobileProgressRef = useRef<SVGPathElement>(null);
  const howMobileFlowRef = useRef<SVGPathElement>(null);
  const howStepRefs = useRef<Array<HTMLElement | null>>([]);
  const featuredContainerRef = useRef<HTMLDivElement>(null);
  const storyContainerRef = useRef<HTMLDivElement>(null);
  const formatPrice = (priceCents: number | null | undefined) => {
    if (!priceCents) return "Free";
    return `\u20B9${Math.round(priceCents / 100)} / slot`;
  };

  useEffect(() => {
    setLocation(getSavedLocation());
    setMounted(true);

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
          event.description ??
          event.hook_line ??
          "Discover a hosted experience near you.",
        duration: `${event.duration_minutes ?? 0} mins`,
        price: formatPrice(event.price_cents),
        rating:
          event.avg_rating !== null && event.avg_rating !== undefined && event.avg_rating !== 0
            ? event.avg_rating.toFixed(1)
            : "NEW",
        image: event.cover_image_url ?? "/assets/home/hiking.jpg",
        overlayTitle: event.title,
        overlaySubtitle: event.location
          ? `In ${event.location}`
          : "Hosted on MySlotMate",
      }));

    return upcoming.length > 0 ? upcoming : FEATURED_FALLBACK_DATA;
  }, [events]);

  const curatedSessions = useMemo<CuratedSessionItem[]>(() => {
    const fallback: CuratedSessionItem[] = FEATURED_FALLBACK_DATA.map(
      (item) => ({
        id: item.id,
        headline: "Curated Session",
        title: item.title,
        description: item.copy,
        imageUrl: item.image,
        rating: item.rating,
        price: item.price,
      }),
    );

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
          event.avg_rating !== null && event.avg_rating !== undefined && event.avg_rating !== 0
            ? event.avg_rating.toFixed(1)
            : "NEW",
        price: formatPrice(event.price_cents),
      }));

    return upcoming.length > 0 ? upcoming : fallback;
  }, [events]);

  const storyData = useMemo<StoryItem[]>(() => {
    if (!hosts) {
      return STORY_FALLBACK_DATA;
    }

    const nearbyHosts =
      !mounted || !location
        ? hosts.slice(0, 3)
        : hosts
          .map((host) => {
            const hostCity = POPULAR_CITIES.find(
              (city) => city.city.toLowerCase() === host.city.toLowerCase(),
            );

            const distance = hostCity
              ? calculateDistance(
                location.lat,
                location.lng,
                hostCity.lat,
                hostCity.lng,
              )
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
        statTwo: host.avg_rating && host.avg_rating !== 0 ? host.avg_rating.toFixed(1) : "NEW",
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
  const featuredHref = featured.id
    ? `/experience/${featured.id}`
    : "/experiences";
  const storyHref = story.id ? `/host/${story.id}` : "/hosts";

  const isFeaturedSaved = featuredSavedStatus?.saved ?? false;

  const handleFeaturedSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!featured.id || !userId) {
      if (!userId) toast.error("Please login to save experiences");
      return;
    }

    if (isFeaturedSaved) {
      unsaveExperience.mutate(
        { eventId: featured.id, userId },
        { onSuccess: () => toast.success("Removed from saved") },
      );
    } else {
      saveExperience.mutate(
        { user_id: userId, event_id: featured.id },
        { onSuccess: () => toast.success("Saved to your list") },
      );
    }
  };

  useEffect(() => {
    if (featured.id) {
      setFeaturedId(featured.id);
    }
  }, [featured.id]);

  const showPrevFeatured = () => {
    if (featuredData.length <= 1) return;
    setFeaturedIndex(
      (prev) => (prev - 1 + featuredData.length) % featuredData.length,
    );
  };

  const showNextFeatured = () => {
    if (featuredData.length <= 1) return;
    setFeaturedIndex((prev) => (prev + 1) % featuredData.length);
  };

  const showPrevStory = () => {
    if (storyData.length <= 1) return;
    setStoryIndex((prev) => (prev - 1 + storyData.length) % storyData.length);
  };

  const showNextStory = () => {
    if (storyData.length <= 1) return;
    setStoryIndex((prev) => (prev + 1) % storyData.length);
  };

  const updateCuratedSessionsScrollState = () => {
    const viewport = curatedSessionsViewportRef.current;
    if (!viewport) return;

    const overflowThresholdPx = 2;
    const maxScrollLeft = Math.max(
      0,
      viewport.scrollWidth - viewport.clientWidth,
    );
    const overflowing = maxScrollLeft > overflowThresholdPx;

    const endThresholdPx = 12;
    const atEnd =
      overflowing &&
      Math.ceil(viewport.scrollLeft + endThresholdPx) >= maxScrollLeft;

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

    const raf = window.requestAnimationFrame(() =>
      updateCuratedSessionsScrollState(),
    );
    viewport.addEventListener("scroll", handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() =>
      updateCuratedSessionsScrollState(),
    );
    resizeObserver.observe(viewport);

    return () => {
      window.cancelAnimationFrame(raf);
      viewport.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [curatedSessions.length]);


  useEffect(() => {
    setFeaturedIndex((prev) =>
      featuredData.length === 0 ? 0 : Math.min(prev, featuredData.length - 1),
    );
  }, [featuredData.length]);

  useEffect(() => {
    if (featuredData.length <= 1) setIsFeaturedPlaying(false);
  }, [featuredData.length]);


  useEffect(() => {
    setStoryIndex((prev) =>
      storyData.length === 0 ? 0 : Math.min(prev, storyData.length - 1),
    );
  }, [storyData.length]);

  const animateIndexTransition = (
    ref: React.RefObject<HTMLDivElement | null>,
    setter: (val: number | ((prev: number) => number)) => void,
    total: number,
  ) => {
    if (!ref.current) {
      setter((prev) => (prev + 1) % total);
      return;
    }

    gsap.to(ref.current, {
      opacity: 0,
      y: 8,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => {
        setter((prev) => (prev + 1) % total);
        gsap.to(ref.current, {
          opacity: 1,
          y: 0,
          duration: 0.35,
          ease: "power2.out",
          delay: 0.05,
        });
      },
    });
  };

  useEffect(() => {
    if (storyData.length <= 1) setIsStoryPlaying(false);
  }, [storyData.length]);

  useEffect(() => {
    if (!isFeaturedPlaying || featuredData.length <= 1) return;
    const id = window.setInterval(() => {
      animateIndexTransition(
        featuredContainerRef,
        setFeaturedIndex,
        featuredData.length,
      );
    }, 5000);
    return () => window.clearInterval(id);
  }, [isFeaturedPlaying, featuredData.length]);

  useEffect(() => {
    if (!isStoryPlaying || storyData.length <= 1) return;
    const id = window.setInterval(() => {
      animateIndexTransition(
        storyContainerRef,
        setStoryIndex,
        storyData.length,
      );
    }, 5000);
    return () => window.clearInterval(id);
  }, [isStoryPlaying, storyData.length]);

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
      {
        title: "Discover People",
        desc: "Not profiles — real humans with stories, skills, and energy.",
      },
      {
        title: "Book a Moment",
        desc: "Coffee, walk, learning, or something unexpected.",
      },
      {
        title: "Show Up",
        desc: "Conversations. Connection. Experiences you remember.",
      },
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
    const mobileProgressPath = howMobileProgressRef.current;
    const mobileFlowPath = howMobileFlowRef.current;
    if (!section) return;

    gsap.registerPlugin(ScrollTrigger);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const ctx = gsap.context(() => {
      if (prefersReducedMotion) {
        if (progressBar) {
          gsap.set(progressBar, {
            scaleX: 1,
            opacity: 1,
            transformOrigin: "left center",
          });
        }

        if (mobileProgressPath) {
          gsap.set(mobileProgressPath, {
            strokeDashoffset: 0,
            opacity: 1,
          });
        }

        if (mobileFlowPath) {
          gsap.set(mobileFlowPath, { opacity: 0.42 });
        }

        return;
      }

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 75%",
          toggleActions: "play none none none",
          once: true,
        },
      });

      if (progressBar) {
        timeline.fromTo(
          progressBar,
          { scaleX: 0, opacity: 0, transformOrigin: "left center" },
          {
            scaleX: 1,
            opacity: 1,
            duration: 2,
            ease: "power2.out",
          },
          0,
        );
      }

      if (mobileProgressPath) {
        timeline.fromTo(
          mobileProgressPath,
          { strokeDashoffset: 1, opacity: 0 },
          {
            strokeDashoffset: 0,
            opacity: 1,
            duration: 1.65,
            ease: "power2.out",
          },
          0.05,
        );
      }

      if (mobileFlowPath) {
        timeline.fromTo(
          mobileFlowPath,
          { opacity: 0 },
          {
            opacity: 0.95,
            duration: 0.45,
            ease: "power1.out",
          },
          0.45,
        );
      }

      // Step animations
      const steps = howStepRefs.current.filter(Boolean);
      if (steps.length > 0) {
        timeline.fromTo(
          steps,
          { opacity: 0, x: -30 },
          {
            opacity: 1,
            x: 0,
            duration: 1.2,
            stagger: 0.35,
            ease: "power2.out",
          },
          0.3,
        );

        // Icon popping effect
        const icons = steps.map((s) => s?.querySelector(".step-icon-container"));
        timeline.fromTo(
          icons,
          { scale: 0, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 1,
            stagger: 0.35,
            ease: "back.out(1.7)",
          },
          0.15,
        );
      }
    }, section);

    return () => ctx.revert();
  }, []);
  return (
    <>
      <section className="site-x w-full border-y border-[#aeddf847] bg-[linear-gradient(180deg,#edf8ff,#f7fcff)]">
        <div className="mx-auto w-full max-w-[1120px] pt-14 pb-20">
          <div className="mx-auto mb-14 max-w-[760px] text-center">
            {/* <span className="inline-flex items-center gap-2 rounded-full border border-[#a9daf5a6] bg-white/90 px-3.5 py-2 text-[11px] font-extrabold tracking-[0.08em] text-[#4a8ab8] uppercase">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
              Explore Experiences
            </span> */}
            <h2 className="mt-1 font-[Outfit,sans-serif] text-4xl font-bold tracking-[-0.04em] text-[#16304c] sm:text-5xl">
              Experiences built around real people
            </h2>
            <p className="mt-7 text-sm text-[#6f8daa] sm:text-base">
              From deep conversations to creative sessions —discover experiences
              hosted by people around you.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
                    preload="auto"
                    poster={card.image}
                    className="absolute inset-0 h-full w-full object-cover transition duration-500"
                  >
                    <source
                      src={card.video}
                      type={
                        card.video.endsWith(".mov")
                          ? "video/quicktime"
                          : "video/mp4"
                      }
                    />
                  </video>
                  {/* Branded light blue gradient overlay for legibility */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(31,167,255,0.05)_40%,rgba(31,167,255,0.8)_100%)] transition-opacity duration-500 group-hover:opacity-0" />

                  <div className="relative z-10 flex h-full flex-col p-4 transition-all duration-500 group-hover:opacity-0">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/85 text-[#0e8ae0] shadow-[0_10px_18px_rgba(56,116,169,0.12)] transition-transform group-hover:scale-110">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="mt-auto">
                      <span className="inline-flex rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold tracking-[0.08em] text-[#0e8ae0] uppercase shadow-sm">
                        {card.tag}
                      </span>
                      <h3 className="mt-2 text-[15px] font-bold text-white drop-shadow-md">
                        {card.title}
                      </h3>
                      <p className="text-xs text-white/90 drop-shadow-sm">{card.desc}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        ref={howSectionRef}
        className="site-x w-full scroll-mt-[calc(var(--navbar-height)+3rem)]"
      >
        <div className="mx-auto w-full max-w-[1120px] py-14">
          <div className="mx-auto mb-14 max-w-[760px] text-center">
            {/* <span className="inline-flex items-center gap-2 rounded-full border border-[#a9daf5a6] bg-white/90 px-3.5 py-2 text-[11px] font-extrabold tracking-[0.08em] text-[#4a8ab8] uppercase">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
              How it works
            </span> */}
            <h2 className="mt-3 font-[Outfit,sans-serif] text-4xl font-bold tracking-[-0.04em] text-[#16304c] sm:text-5xl">
              Turn your mood into a real experience
            </h2>
            <p className="mt-7 text-sm text-[#6f8daa] sm:text-base">
              Discover someone. Book a moment. Experience something real.
            </p>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute top-8 right-20 left-20 z-0 hidden h-[2px] lg:block">
              <div
                ref={howProgressRef}
                className="h-full w-full origin-left scale-x-0 rounded-full bg-[linear-gradient(90deg,#1fa7ff,#83d9ff)] opacity-0"
              />
            </div>
            <div className="relative z-10 md:hidden">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-1/2 top-[37px] bottom-[109px] z-0 w-[300px] -translate-x-1/2"
              >
                <svg
                  className="h-full w-full overflow-visible"
                  viewBox="0 0 220 348"
                  preserveAspectRatio="none"
                  fill="none"
                >
                  <defs>
                    <linearGradient
                      id="how-it-works-mobile-gradient"
                      x1="110"
                      y1="0"
                      x2="110"
                      y2="348"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="#1fa7ff" />
                      <stop offset="55%" stopColor="#69d4ff" />
                      <stop offset="100%" stopColor="#83d9ff" />
                    </linearGradient>
                  </defs>
                  <path
                    d={HOW_IT_WORKS_MOBILE_PATH}
                    vectorEffect="non-scaling-stroke"
                    stroke="#d7eefb"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    ref={howMobileProgressRef}
                    d={HOW_IT_WORKS_MOBILE_PATH}
                    pathLength={1}
                    vectorEffect="non-scaling-stroke"
                    stroke="url(#how-it-works-mobile-gradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    style={{
                      strokeDasharray: 1,
                      strokeDashoffset: 1,
                      opacity: 0,
                    }}
                  />
                  <path
                    ref={howMobileFlowRef}
                    d={HOW_IT_WORKS_MOBILE_PATH}
                    pathLength={1}
                    vectorEffect="non-scaling-stroke"
                    stroke="#9ee9ff"
                    strokeWidth="4"
                    strokeLinecap="round"
                    style={{
                      strokeDasharray: "0.16 0.84",
                      strokeDashoffset: 0,
                      opacity: 0,
                    }}
                    className="how-it-works-mobile-flow"
                  />
                </svg>
              </div>

              <div className="relative z-10 flex flex-col items-center gap-7">
                {stepItems.map((step, idx) => (
                  <article
                    key={`${step.title}-mobile`}
                    className="relative z-10 flex min-h-[146px] w-full max-w-[240px] flex-col items-center text-center"
                  >
                    <div className="relative z-20 mx-auto mb-4 grid h-[74px] w-[74px] place-items-center rounded-full border-6 border-[#04b7f8] bg-[#0094CA] font-[Outfit,sans-serif] text-2xl font-bold text-white shadow-[0_16px_28px_rgba(31,167,255,0.2)]">
                      <img
                        src={STEPS_ICONS[idx]}
                        alt={step.title}
                        loading="lazy"
                        className="h-5 w-5"
                      />
                    </div>
                    <h3 className="max-w-[170px] text-base font-bold text-[#16304c]">
                      {step.title}
                    </h3>
                    <p className="mx-auto mt-1 max-w-[190px] text-sm text-[#6f8daa]">
                      {step.desc}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="relative z-10 hidden gap-5 md:grid md:grid-cols-3">
              {stepItems.map((step, idx) => (
                <article
                  key={`${step.title}-desktop`}
                  ref={(el) => {
                    howStepRefs.current[idx] = el;
                  }}
                  className="relative z-10 text-center"
                >
                  <div className="step-icon-container relative z-20 mx-auto mb-4 grid h-[74px] w-[74px] place-items-center rounded-full border-6 border-[#04b7f8] bg-[#0094CA] font-[Outfit,sans-serif] text-2xl font-bold text-white shadow-[0_16px_28px_rgba(31,167,255,0.2)]">
                    <img
                      src={STEPS_ICONS[idx]}
                      alt={step.title}
                      loading="lazy"
                      className="h-5 w-5"
                    />
                  </div>
                  <h3 className="text-base font-bold text-[#16304c]">
                    {step.title}
                  </h3>
                  <p className="mx-auto mt-1 max-w-[260px] text-sm text-[#6f8daa]">
                    {step.desc}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="site-x w-full">
        <div className="mx-auto w-full max-w-[1120px] py-14">
          <div className="flex w-full flex-col gap-14">
            <div className="w-full">
              <div
                ref={featuredContainerRef}
                className="group/card grid gap-6 rounded-[28px] border border-[#aeddf840] bg-white p-4 shadow-[0_15px_35px_rgba(60,121,175,0.06)] transition-all hover:shadow-[0_20px_45px_rgba(60,121,175,0.1)] md:grid-cols-[0.85fr_1.15fr] md:items-center"
              >
                <div className="relative mx-auto aspect-[4/3] w-full overflow-hidden rounded-[20px] shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featured.image}
                    alt={featured.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                  />

                  {/* Glassmorphic Overlay for Host info */}
                  <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />

                  {/* Save button - Compact */}
                  {featured.id && (
                    <button
                      onClick={handleFeaturedSave}
                      disabled={
                        saveExperience.isPending || unsaveExperience.isPending
                      }
                      className="absolute top-3 right-3 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-[#0094CA] backdrop-blur-md shadow-md transition hover:bg-white hover:scale-110 active:scale-95 disabled:opacity-50"
                      aria-label={
                        isFeaturedSaved
                          ? "Remove from saved"
                          : "Save experience"
                      }
                    >
                      <Heart
                        className="h-4.5 w-4.5 transition-colors"
                        fill={isFeaturedSaved ? "#0094CA" : "none"}
                        stroke="#0094CA"
                        strokeWidth={2.5}
                      />
                    </button>
                  )}

                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                    <div className="rounded-xl bg-black/40 px-3 py-1.5 text-white backdrop-blur-xl border border-white/20 shadow-lg">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-white/70">
                        Host
                      </p>
                      <p className="text-xs font-bold">
                        {featured.overlayTitle}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col h-full py-1">
                  <div className="flex items-center justify-end gap-3">

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={showPrevFeatured}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#bdddf480] bg-white text-[#2f7eb5] transition-all hover:bg-[#0e8ae0] hover:text-white disabled:opacity-30"
                        disabled={featuredData.length <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsFeaturedPlaying((v) => !v)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#bdddf480] bg-white text-[#2f7eb5] transition-all hover:bg-[#0e8ae0] hover:text-white disabled:opacity-30"
                        disabled={featuredData.length <= 1}
                      >
                        {isFeaturedPlaying ? (
                          <Pause className="h-3.5 w-3.5 fill-current" />
                        ) : (
                          <Play className="h-3.5 w-3.5 ml-0.5 fill-current" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={showNextFeatured}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#bdddf480] bg-white text-[#2f7eb5] transition-all hover:bg-[#0e8ae0] hover:text-white disabled:opacity-30"
                        disabled={featuredData.length <= 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="font-[Outfit,sans-serif] text-2xl font-black tracking-tight text-[#16304c] lg:text-3xl">
                      {featured.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#5c84a5]">
                      {featured.copy}
                    </p>
                  </div>

                  <div className="mt-auto pt-6">
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 rounded-xl bg-[#f0f9ff] px-3 py-1.5">
                        <Clock3 className="h-3.5 w-3.5 text-[#0e8ae0]" />
                        <span className="text-xs font-bold text-[#16304c]">{featured.duration}</span>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-xl bg-[#f0f9ff] px-3 py-1.5">
                        <span className="text-xs font-bold text-[#0e8ae0]">$</span>
                        <span className="text-xs font-bold text-[#16304c]">{featured.price}</span>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-xl bg-[#f0f9ff] px-3 py-1.5">
                        {featured.rating !== "New" && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                        <span className="text-xs font-bold text-[#16304c]">{featured.rating}</span>
                      </div>
                    </div>

                    <Link
                      href={featuredHref}
                      className="group/btn relative mt-6 flex w-full items-center justify-center overflow-hidden rounded-xl bg-[linear-gradient(135deg,#1fa7ff,#63ceff)] px-6 py-3 text-sm font-black text-white shadow-[0_12px_24px_rgba(31,167,255,0.2)] transition-all hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(31,167,255,0.3)]"
                    >
                      <span className="relative z-10">Book This Experience</span>
                      <div className="absolute inset-0 translate-y-full bg-white/20 transition-transform duration-300 group-hover/btn:translate-y-0" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div
              id="hosts"
              className="w-full scroll-mt-[calc(var(--navbar-height)+3rem)]"
            >
              <components.Home.people currentHostId={hostId} />
            </div>

            <div className="w-full">
              <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <div className="max-w-[640px]">
                  <h2 className="mt-1 font-[Outfit,sans-serif] text-4xl font-black tracking-tight text-[#16304c] sm:text-5xl">
                    Discover Experiences
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-[#5c84a5]">
                    Handpicked sessions designed for real-world connection. Book in a few taps and experience something new.
                  </p>
                </div>

                {isCuratedOverflowing ? (
                  <div className="hidden items-center gap-2 md:flex">
                    <button
                      type="button"
                      onClick={() => scrollCuratedSessions("left")}
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-[#bdddf480] bg-white text-[#2f7eb5] transition-all hover:bg-[#0e8ae0] hover:text-white disabled:opacity-30"
                      aria-label="Scroll curated sessions left"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    {isCuratedAtScrollEnd ? (
                      <Link
                        href="/experiences"
                        className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#bdddf480] bg-[#eef8ff] px-6 text-sm font-black text-[#0e8ae0] transition-all hover:bg-[#0e8ae0] hover:text-white"
                        aria-label="See more experiences"
                      >
                        Explore All
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => scrollCuratedSessions("right")}
                        className="flex h-12 w-12 items-center justify-center rounded-full border border-[#bdddf480] bg-white text-[#2f7eb5] transition-all hover:bg-[#0e8ae0] hover:text-white disabled:opacity-30"
                        aria-label="Scroll curated sessions right"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    )}
                  </div>
                ) : null}
              </div>

              <div
                ref={curatedSessionsViewportRef}
                className="hide-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
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
          </div>
        </div>
      </section>

      <section className="site-x w-full">
        <div className="mx-auto grid w-full max-w-[1120px] items-center gap-10 py-14 lg:grid-cols-[0.92fr_1.08fr]">
          <Link
            href={storyHref}
            className="relative mx-auto mb-12 w-full max-w-[410px] block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={story.image}
              alt={story.title}
              loading="lazy"
              className="aspect-square w-full rounded-[32px] object-cover shadow-[0_18px_42px_rgba(60,123,177,0.1)]"
            />
            <div className="absolute bottom-[-34px] left-1/2 w-[min(310px,calc(100%-40px))] -translate-x-1/2 rounded-[26px] bg-white px-6 py-5 shadow-[0_26px_44px_rgba(60,123,177,0.18)]">
              <p className="font-[Outfit,sans-serif] text-[15px] text-[#1f7bb6] italic">
                &ldquo;{story.quote}&rdquo;
              </p>
              <span className="mt-3 block text-xs font-extrabold text-[#16304c]">
                - {story.author}
              </span>
            </div>
          </Link>

          <div ref={storyContainerRef} className="">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Auto-rotation active */}
            </div>

            <h3 className="mt-3 font-[Outfit,sans-serif] text-3xl font-bold tracking-[-0.04em] text-[#16304c] sm:text-4xl">
              {story.title}
            </h3>
            <p className="mt-2 text-sm leading-7 text-[#6f8daa]">
              {story.copy}
            </p>

            <div className="my-5 flex gap-8 border-y border-[#aeddf88c] py-5">
              <div>
                <p className="font-[Outfit,sans-serif] text-3xl font-bold text-[#0e8ae0]">
                  {story.statOne}
                </p>
                <span className="text-[11px] font-extrabold tracking-[0.05em] text-[#6f8daa] uppercase">
                  {story.statOneLabel}
                </span>
              </div>
              <div>
                <p className="font-[Outfit,sans-serif] text-3xl font-bold text-[#0e8ae0]">
                  {story.statTwo}
                </p>
                <span className="text-[11px] font-extrabold tracking-[0.05em] text-[#6f8daa] uppercase">
                  {story.statTwoLabel}
                </span>
              </div>
            </div>

            {/* <Link
              href={storyHref}
              className="mt-5 inline-flex rounded-full bg-[linear-gradient(135deg,#1fa7ff,#63ceff)] px-8 py-3 text-sm font-extrabold text-white shadow-[0_16px_32px_rgba(31,167,255,0.24)]"
            >
              Explore Experiences
            </Link> */}
          </div>
        </div>
      </section>

      <section className="site-x w-full">
        <div
          ref={statsRef}
          className="mx-auto grid w-full max-w-[1120px] grid-cols-2 gap-4 border-y border-[#aeddf880] py-14 lg:grid-cols-4 lg:gap-6"
        >
          {[
            { label: "Booked Sessions", suffix: "+" },
            { label: "Active Hosts", suffix: "+" },
            { label: "Average Rating", suffix: "" },
            { label: "Cities Live", suffix: "" },
          ].map((item, idx) => (
            <article
              key={item.label}
              className="flex flex-col items-center justify-center rounded-[22px] border border-[#aeddf859] bg-white px-4 py-8 text-center shadow-[0_14px_32px_rgba(77,140,190,0.08)]"
            >
              <strong className="relative inline-block font-outfit text-[clamp(2rem,3.5vw,2.8rem)] font-extrabold leading-none tracking-[-0.05em] text-[#0e8ae0]">
                {formatStat(stats[idx] ?? 0, STATS_TARGETS[idx] ?? 0)}
                {item.suffix && (
                  <span className="absolute top-1 ml-0.5 text-[0.45em] font-medium">
                    {item.suffix}
                  </span>
                )}
              </strong>
              <span className="mt-3 block text-[0.72rem] font-bold tracking-[0.04em] text-[#8a8f99] uppercase">
                {item.label}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section
        id="community"
        className="site-x w-full scroll-mt-[calc(var(--navbar-height)+3rem)]"
      >
        <div className="mx-auto grid w-full max-w-[1120px] gap-[18px] py-14 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="flex flex-col rounded-[26px] bg-[linear-gradient(135deg,#109ae9,#0d85db)] p-6 text-white shadow-[0_22px_48px_rgba(18,132,214,0.22)]">
            <span className="inline-flex self-start items-center gap-2 rounded-full border border-white/20 bg-white/20 px-3 py-1.5 text-[10px] font-extrabold tracking-[0.08em] uppercase">
              Host Corner
            </span>
            <h3 className="mt-3 max-w-[400px] font-[Outfit,sans-serif] text-2xl leading-tight font-bold tracking-[-0.04em] sm:text-3xl">
              Turn Your Passion Into Experiences
            </h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80"
              alt="Hosts creating an experience together"
              loading="lazy"
              className="mt-4 aspect-[2/1] w-full rounded-[20px] object-cover shadow-[0_18px_32px_rgba(10,86,148,0.24)]"
            />
            <p className="mt-3 max-w-[420px] text-[13px] leading-relaxed text-white/85">
              Share a walk, workshop, food story, or creative session with
              people looking for meaningful ways to spend time.
            </p>
            <button
              type="button"
              onClick={handleListTimeClick}
              className="mt-6 inline-flex self-start rounded-[0.5rem] border border-white/30 bg-white/16 px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-1 hover:scale-105"
            >
              Become a Host
            </button>
          </article>

          <article className="flex flex-col rounded-3xl border border-[#aeddf89e] bg-white p-6 shadow-[0_14px_32px_rgba(77,140,190,0.08)]">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-[15px] font-bold text-[#16304c]">
                  Community Moments
                </h3>
                <p className="mt-1 line-clamp-2 min-h-[38px] text-[0.78rem] leading-[1.55] text-[#6f8daa]">
                  {community.note}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#dff3ff] px-3.5 py-1.5 text-[10px] font-extrabold tracking-[0.08em] text-[#0e8ae0] uppercase">
                {community.label}
              </span>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-3">
              {community.images.slice(0, 4).map((img, idx) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${img}-${idx}`}
                  src={img}
                  alt={`${community.label} moment ${idx + 1}`}
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-2xl object-cover shadow-sm transition-transform hover:scale-[1.02]"
                />
              ))}
            </div>
          </article>
        </div>
      </section>
      <BecomeHostModal
        open={showBecomeHostModal}
        onClose={closeBecomeHostModal}
      />
      <style jsx>{`
        .how-it-works-mobile-flow {
          animation: howItWorksMobileFlow 2.8s linear infinite;
          filter: drop-shadow(0 0 12px rgba(131, 217, 255, 0.95));
        }

        @keyframes howItWorksMobileFlow {
          from {
            stroke-dashoffset: 0;
          }

          to {
            stroke-dashoffset: -1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .how-it-works-mobile-flow {
            animation: none;
          }
        }
      `}</style>
    </>
  );
};

export default ShowcaseSections;
