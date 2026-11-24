"use client";

import Breadcrumbs from "~/components/Breadcrumbs";
import { useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import Navbar from "~/components/Navbar";
import { RichTextView } from "~/components/RichTextView";
import ExperienceSkeleton from "./loading";
import WebsiteNav from "~/components/website/WebsiteNav";
import {
  useEvent,
  useEventBoost,
  usePublicHostProfile,
  useReviewsByEvent,
  useEventRating,
  useIsExperienceSaved,
  useSaveExperience,
  useUnsaveExperience,
  useEventAvailability,
} from "~/hooks/useApi";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { useIdToken } from "~/hooks/useIdToken";
import BoostButton from "~/components/host-dashboard/boost/BoostButton";
import { BOOST_ENABLED } from "~/lib/boost";
import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiGrid,
  FiHeart,
  FiMapPin,
  FiNavigation,
  FiShare,
  FiStar,
  FiUsers,
  FiVideo,
  FiX,
} from "react-icons/fi";
import { LuBadgeCheck, LuLock, LuShieldAlert } from "react-icons/lu";
import { isUnverifiedHost } from "~/lib/hostTier";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatIST } from "~/lib/datetime";
import { getMoodDisplayLabel } from "~/lib/moods";
import type { EventDTO, PublicHostProfileDTO } from "~/lib/api";
import { useHydrated } from "~/hooks/useHydrated";

export const runtime = "edge";

// Sizes follow the Figma "Experience detail" frames (Desktop 1440 → Mobile 390).
const CARD = "rounded-[20px] border border-white/[0.06] bg-[#131328]";
const DIVIDER = "border-t border-white/[0.08]";
const SECTION_H = "font-outfit mb-4 text-lg font-medium text-white";

const rupees = (cents: number) => `₹${(cents / 100).toFixed(0)}`;

/* ------------------------------------------------------------------ */
/*  Hero gallery                                                       */
/* ------------------------------------------------------------------ */
function Hero({
  images,
  title,
  saved,
  onSave,
  onShare,
  onShowAll,
}: {
  images: string[];
  title: string;
  saved: boolean;
  onSave: () => void;
  onShare: () => void;
  onShowAll: () => void;
}) {
  const [index, setIndex] = useState(0);
  const src = images[index];
  // Wide flyers: on phones show them at their own shape instead of inside a
  // tall 4:5 frame with blurred bands (desktop keeps the frame).
  const [wide, setWide] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const measure = (img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth)
      setWide(img.naturalWidth > img.naturalHeight * 1.05);
  };
  // The first image often finishes loading before hydration, so onLoad never
  // fires for it; measure it once mounted too.
  useEffect(() => measure(imgRef.current), [src]);
  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60";

  return (
    <div
      className={`group relative w-full overflow-hidden rounded-[24px] bg-[#131328] shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)] ring-1 ring-white/10 ${wide ? "md:aspect-[4/5]" : "aspect-[4/5]"}`}
    >
      {src ? (
        <>
          {/* Uploaded flyers vary in ratio, so a blurred copy fills the frame
              and the foreground is uncropped. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            aria-hidden="true"
            className={`absolute inset-0 h-full w-full scale-110 object-cover blur-xl ${wide ? "max-md:hidden" : ""}`}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={title}
            fetchPriority="high"
            ref={imgRef}
            onLoad={(e) => measure(e.currentTarget)}
            className={`relative block w-full object-contain ${wide ? "h-auto md:h-full" : "h-full"}`}
          />
        </>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-white/40">
          No photos available
        </div>
      )}

      <button
        type="button"
        onClick={onSave}
        aria-label={saved ? "Remove from saved" : "Save experience"}
        className={`absolute top-4 right-4 ${iconBtn}`}
      >
        <FiHeart
          className={`h-4 w-4 ${saved ? "fill-[#E040FB] text-[#E040FB]" : ""}`}
        />
      </button>
      <button
        type="button"
        onClick={onShare}
        aria-label="Copy link"
        className={`absolute right-4 bottom-4 ${iconBtn}`}
      >
        <FiShare className="h-4 w-4" />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() =>
              setIndex((i) => (i === 0 ? images.length - 1 : i - 1))
            }
            aria-label="Previous image"
            className={`absolute top-1/2 left-4 -translate-y-1/2 opacity-0 transition group-hover:opacity-100 max-md:hidden ${iconBtn}`}
          >
            <FiArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setIndex((i) => (i === images.length - 1 ? 0 : i + 1))
            }
            aria-label="Next image"
            className={`absolute top-1/2 right-4 -translate-y-1/2 opacity-0 transition group-hover:opacity-100 max-md:hidden ${iconBtn}`}
          >
            <FiArrowLeft className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            onClick={onShowAll}
            className="absolute bottom-4 left-4 flex h-9 items-center gap-2 rounded-full bg-black/40 px-3.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-black/60"
          >
            <FiGrid className="h-3.5 w-3.5" />
            {index + 1} / {images.length}
          </button>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Floating "Book slots" pill; slots are picked on the next page      */
/* ------------------------------------------------------------------ */
function BookingPill({
  label,
  status,
  href,
}: {
  label: string;
  /** Set when booking isn't possible ("Fully booked", "Event has passed"). */
  status: string | null;
  href: string;
}) {
  const pill =
    "font-outfit flex h-14 w-full items-center justify-center rounded-full text-[17px] font-semibold shadow-[0_20px_60px_-10px_rgb(0_0_0/0.8)] md:h-[58px] md:text-lg";
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 px-5 pb-[max(20px,env(safe-area-inset-bottom))]`}
    >
      <div className="pointer-events-auto mx-auto w-full max-w-[720px]">
        {status ? (
          <p
            className={`${pill} border border-white/10 bg-[#1B1D33]/95 text-white/60 backdrop-blur-xl`}
          >
            {status}
          </p>
        ) : (
          <Link
            href={href}
            className={`${pill} bg-white text-[#080914] transition hover:bg-white/90 active:scale-[0.99]`}
          >
            {label}
          </Link>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Host row                                                           */
/* ------------------------------------------------------------------ */
function HostRow({ host }: { host: PublicHostProfileDTO }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          // Some hosts have avatar_url = "" — `??` would keep the empty string.
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          src={host.avatar_url || "/assets/home/profile1.png"}
          alt=""
          className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-white/15"
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <span className="truncate">
              {host.first_name} {host.last_name}
            </span>
            {host.is_identity_verified && (
              <LuBadgeCheck
                className="h-4 w-4 shrink-0 text-[#B57BFF]"
                aria-label="Verified host"
              />
            )}
          </p>
          <p className="truncate text-xs text-white/55">
            {host.tagline ?? (host.city ? `Host in ${host.city}` : "Host")}
          </p>
        </div>
        <Link
          href={`/host/${host.slug}`}
          className="shrink-0 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15"
        >
          View Profile
        </Link>
      </div>
      {isUnverifiedHost(host) && (
        <p className="flex items-start gap-2 rounded-2xl border border-amber-400/25 bg-amber-400/[0.08] px-3.5 py-2.5 text-xs leading-5 text-amber-100/80">
          <LuShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <span>
            <span className="font-semibold text-amber-200">
              Community event.
            </span>{" "}
            This host isn&apos;t verified by MySlotMate. Never pay outside the
            app, and report anything that feels off.
          </span>
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Location                                                           */
/* ------------------------------------------------------------------ */
function LocationSection({
  location,
  isOnline,
  meetingLink,
  googleMapsUrl,
}: {
  location: string | null;
  isOnline: boolean;
  meetingLink?: string | null;
  googleMapsUrl?: string | null;
}) {
  const directions =
    googleMapsUrl ??
    (location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
      : null);

  return (
    <section>
      <h2 className={SECTION_H}>Location</h2>
      {isOnline ? (
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
            <FiVideo className="h-5 w-5 text-[#D8B4FE]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-white">
              Online experience
            </p>
            <p className="text-sm text-white/55">
              Join from anywhere on a video call.
            </p>
          </div>
          {meetingLink && (
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Join
            </a>
          )}
        </div>
      ) : (
        // No embedded map: it filled most of a screen. The whole card opens
        // Google Maps (directions on phones) instead.
        (() => {
          const card = (
            <>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                <FiMapPin className="h-5 w-5 text-[#D8B4FE]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] leading-snug font-semibold text-white">
                  {location ?? "Exact meeting point shared after booking"}
                </span>
                {directions && (
                  <span className="mt-0.5 block text-xs text-[#D8B4FE]">
                    Open in Google Maps
                  </span>
                )}
              </span>
              {directions && (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition group-hover:bg-white/15">
                  <FiNavigation className="h-4 w-4" />
                </span>
              )}
            </>
          );
          const cls =
            "flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4";
          return directions ? (
            <a
              href={directions}
              target="_blank"
              rel="noopener noreferrer"
              className={`group ${cls} transition hover:border-white/20 hover:bg-white/[0.06]`}
            >
              {card}
            </a>
          ) : (
            <div className={cls}>{card}</div>
          );
        })()
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Reviews                                                            */
/* ------------------------------------------------------------------ */
function GuestReviews({
  reviews,
  rating,
  totalReviews,
}: {
  reviews: Array<{
    id: string;
    name: string | null;
    rating: number;
    description: string;
    created_at: string;
  }>;
  rating: number | null;
  totalReviews: number;
}) {
  if (totalReviews === 0) return null;

  return (
    <section>
      <h2 className={`${SECTION_H} flex items-center gap-2`}>
        Guest reviews
        {rating ? (
          <span className="flex items-center gap-1 text-sm font-semibold text-amber-400">
            <FiStar className="h-3.5 w-3.5 fill-amber-400" />
            {rating.toFixed(1)}
            <span className="font-normal text-white/50">({totalReviews})</span>
          </span>
        ) : null}
      </h2>
      <div className="flex flex-col gap-3">
        {reviews.slice(0, 3).map((review) => (
          <div key={review.id} className={`p-4 ${CARD}`}>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#9B30FF]/20 text-sm font-semibold text-[#D8B4FE]">
                {review.name?.[0] ?? "G"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {review.name ?? "Guest"}
                </p>
                <p className="text-xs text-white/45">
                  {format(new Date(review.created_at), "MMMM yyyy")}
                </p>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
                <FiStar className="h-3 w-3 fill-amber-400" />
                {review.rating}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/70">
              {review.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  All photos modal                                                   */
/* ------------------------------------------------------------------ */
function AllPhotosModal({
  isOpen,
  onClose,
  images,
}: {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
}) {
  if (!isOpen) return null;

  return (
    <div className="msm-modal fixed inset-0 z-[250] overflow-y-auto bg-black/90">
      <div className="mx-auto w-full max-w-[1120px] px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">All photos</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={img}
              alt={`Photo ${i + 1}`}
              className="h-64 w-full rounded-xl object-cover"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

/**
 * Marketing landing pages (app/[slug]) reuse this page with their own copy:
 * these fields replace the event's on screen, while dates, location, price,
 * reviews and booking stay live from the event.
 */
export type ExperienceContentOverride = Pick<
  EventDTO,
  "title" | "hook_line" | "description" | "cover_image_url" | "gallery_urls"
> & { cta_text?: string | null };

export default function ExperienceDetailClient({
  params,
  initialEvent,
  contentOverride,
}: {
  params: Promise<{ slug: string }>;
  initialEvent: EventDTO | null;
  contentOverride?: ExperienceContentOverride;
}) {
  const resolvedParams = use(params);
  const { userId, hostId } = useStoredAuth();
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  // Session picked from the date chips; carried to the tickets step.
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [allDates, setAllDates] = useState(false);
  // Auth lives in localStorage: render the public website chrome until
  // mounted, then the app chrome (sidebar) for signed-in users.
  const mounted = useHydrated();

  // Server-rendered event keeps the page content in the initial HTML; the
  // client query takes over once it resolves. The route param is a slug (or a
  // legacy UUID) — the /events endpoint resolves either form.
  const { data: fetchedEvent, isLoading: eventQueryLoading } = useEvent(
    resolvedParams.slug,
    initialEvent ? { success: true, data: initialEvent } : undefined,
  );
  const liveEvent = fetchedEvent ?? initialEvent ?? undefined;
  const event =
    liveEvent && contentOverride
      ? { ...liveEvent, ...contentOverride }
      : liveEvent;
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- "" means unset
  const bookWord = contentOverride?.cta_text || "Book slots";
  const eventLoading = eventQueryLoading && !event;
  // Secondary lookups (reviews, ratings, availability, save) key off the real
  // event UUID, not the slug — resolve it from the loaded event.
  const eventId = event?.id ?? "";
  const { data: host } = usePublicHostProfile(event?.host_id ?? null);
  // The host looking at their own event gets shortcuts to edit and Boost it.
  const isOwnEvent = mounted && !!hostId && !!event && event.host_id === hostId;
  const idToken = useIdToken();
  const { data: ownBoost } = useEventBoost(
    isOwnEvent && BOOST_ENABLED ? eventId : null,
    idToken,
  );
  const { data: reviews } = useReviewsByEvent(eventId);
  const { data: ratingData } = useEventRating(eventId);
  const { data: availability } = useEventAvailability(eventId);
  const { data: savedStatus } = useIsExperienceSaved(eventId, userId);

  const saveExperience = useSaveExperience();
  const unsaveExperience = useUnsaveExperience();

  const isSaved = savedStatus?.saved ?? false;

  const handleSave = () => {
    if (!userId) {
      toast.error("Please login to save experiences");
      return;
    }
    if (isSaved) {
      unsaveExperience.mutate(
        { eventId, userId },
        { onSuccess: () => toast.success("Removed from saved") },
      );
    } else {
      saveExperience.mutate(
        { user_id: userId, event_id: eventId },
        { onSuccess: () => toast.success("Saved to your list") },
      );
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // Same skeleton the route's `loading.tsx` shows, so the server boundary and
  // this client-side branch look identical.
  if (eventLoading) {
    return <ExperienceSkeleton />;
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#080914] text-white">
        <p className="mb-4 text-xl text-white/70">Experience not found</p>
        <Link href="/explore" className="text-[#B57BFF] hover:underline">
          Back to Explore
        </Link>
      </div>
    );
  }

  // The poster leads, as on the booking and ticket pages; "More photos"
  // follow. Duplicates are dropped in case the poster is also in the gallery.
  const images = [
    ...new Set(
      [event.cover_image_url, ...(event.gallery_urls ?? [])].filter(
        (u): u is string => Boolean(u),
      ),
    ),
  ];
  const place = event.is_online
    ? "Online"
    : (event.location ?? "Location shared after booking");
  const rating = ratingData?.average_rating ?? null;
  const totalReviews = ratingData?.total_reviews ?? 0;
  const baseDate = event.next_available_date ?? event.time;
  const appChrome = mounted && Boolean(userId);
  const manyDates =
    event.is_recurring ||
    event.schedule_type === "custom_dates" ||
    (!!event.custom_dates && event.custom_dates.length > 0);
  const chip =
    "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur";
  const hostedBy = host ? (
    <div>
      <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-white/45 uppercase">
        Hosted by
      </p>
      <HostRow host={host} />
    </div>
  ) : null;

  // Bar under the page: lowest price + whether anything is still bookable.
  const tiers = event.price_tiers ?? [];
  const fromCents = tiers.length
    ? Math.min(...tiers.map((t) => t.price_cents))
    : (event.price_cents ?? 0);
  const upcoming = (availability ?? []).filter(
    (a) => new Date(a.date) >= new Date(),
  );
  const hasPassed = availability
    ? upcoming.length === 0 && !!baseDate && new Date(baseDate) < new Date()
    : false;
  const soldOut = availability
    ? upcoming.length > 0 && upcoming.every((a) => a.is_fully_booked)
    : event.capacity - event.total_bookings <= 0;

  // Up to four open dates to pick from here (one chip per day); the rest of
  // the choice happens on the tickets step.
  const openDays: string[] = [];
  const seenDays = new Set<string>();
  for (const a of upcoming) {
    if (a.is_fully_booked) continue;
    const day = formatIST(a.date, "yyyy-MM-dd");
    if (seenDays.has(day)) continue;
    seenDays.add(day);
    openDays.push(a.date);
  }
  const dateChips = allDates ? openDays : openDays.slice(0, 4);
  const shownDate = pickedDate ?? openDays[0] ?? baseDate;
  const endDate =
    shownDate && event.duration_minutes
      ? new Date(
          new Date(shownDate).getTime() + event.duration_minutes * 60_000,
        )
      : null;
  // Marketing landing pages (contentOverride) let signed-out visitors book
  // as a guest — name, phone + OTP, email — instead of the full login.
  const ticketsQuery = new URLSearchParams();
  if (shownDate && dateChips.length > 0) ticketsQuery.set("date", shownDate);
  if (contentOverride) ticketsQuery.set("guest", "1");
  const ticketsQs = ticketsQuery.toString();
  const ticketsHref = `/experience/${resolvedParams.slug}/tickets${
    ticketsQs ? `?${ticketsQs}` : ""
  }`;
  const barStatus = hasPassed
    ? "Event has passed"
    : soldOut
      ? "Fully booked"
      : null;
  return (
    <>
      {appChrome && <Navbar dark />}

      <main
        className={`relative isolate min-h-screen overflow-x-clip bg-[#080914] pb-32 font-[family-name:var(--font-inter)] text-white ${appChrome ? "" : ""}`}
      >
        {/* Ambient glow taken from the poster itself */}
        {images[0] && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[0]}
              alt=""
              className="h-full w-full scale-125 object-cover opacity-40 blur-[100px] saturate-150"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#080914]/20 via-[#080914]/70 to-[#080914]" />
          </div>
        )}

        {/* Inside main so it sits on the dark page, not the bare body. */}
        {!appChrome && <WebsiteNav />}

        <div className="mx-auto w-full max-w-[1080px] px-5 pt-4 pb-10 md:px-8 md:pt-8">
          <Breadcrumbs current={event.title} />

          <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-14">
            {/* Left: poster + host, sticky on desktop */}
            <div className="flex flex-col gap-7 lg:sticky lg:top-8 lg:self-start">
              {isOwnEvent && (
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#121426]/85 p-2 pl-4 backdrop-blur">
                  <span className="min-w-0 flex-1 truncate text-sm text-white/70">
                    You’re hosting this
                  </span>
                  <Link
                    href={`/host-dashboard/experiences/${event.id}`}
                    className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    Edit
                  </Link>
                  {event.status === "live" && !event.is_free && (
                    <BoostButton eventId={event.id} status={ownBoost?.status} />
                  )}
                </div>
              )}
              <Hero
                images={images}
                title={event.title}
                saved={isSaved}
                onSave={handleSave}
                onShare={handleShare}
                onShowAll={() => setShowAllPhotos(true)}
              />
              <div className="hidden lg:block">{hostedBy}</div>
            </div>

            {/* Right: what, when, book, where, about */}
            <div className="flex min-w-0 flex-col gap-9">
              <header>
                <div className="flex flex-wrap items-center gap-2">
                  {event.mood && (
                    <span className={chip}>
                      <i className="h-1.5 w-1.5 rounded-full bg-[#D8B4FE]" />
                      {getMoodDisplayLabel(event.mood)}
                    </span>
                  )}
                  <span className={chip}>
                    {event.is_private ? (
                      <>
                        <LuLock className="h-3.5 w-3.5" /> Private event
                      </>
                    ) : (
                      <>
                        <FiUsers className="h-3.5 w-3.5" /> Public event
                      </>
                    )}
                  </span>
                  {rating && totalReviews > 0 ? (
                    <span className={chip}>
                      <FiStar className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {rating.toFixed(1)}
                      <span className="text-white/50">({totalReviews})</span>
                    </span>
                  ) : (
                    <span className={`${chip} text-[#D8B4FE]`}>New</span>
                  )}
                </div>

                <h1 className="font-outfit mt-5 text-[clamp(28px,3.4vw,42px)] leading-[1.1] font-medium tracking-[-0.02em] text-balance text-white">
                  {event.title}
                </h1>

                <ul className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] text-white/75">
                  {shownDate && (
                    <li className="flex items-center gap-2">
                      <FiCalendar className="h-4 w-4 text-white/50" />
                      {formatIST(shownDate, "EEE, d MMM")}
                      {manyDates && dateChips.length <= 1 && (
                        <span className="text-white/45">+ more dates</span>
                      )}
                    </li>
                  )}
                  {shownDate && (
                    <li className="flex items-center gap-2">
                      <FiClock className="h-4 w-4 text-white/50" />
                      {formatIST(shownDate, "h:mm a")}
                      {endDate && ` – ${formatIST(endDate, "h:mm a")}`}
                    </li>
                  )}
                  <li className="flex min-w-0 items-center gap-2">
                    {event.is_online ? (
                      <FiVideo className="h-4 w-4 shrink-0 text-white/50" />
                    ) : (
                      <FiMapPin className="h-4 w-4 shrink-0 text-white/50" />
                    )}
                    <span className="truncate">{place}</span>
                  </li>
                </ul>

                {dateChips.length > 1 && (
                  <div className="mt-6 flex flex-wrap gap-2.5">
                    {dateChips.map((d) => {
                      const on = d === shownDate;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setPickedDate(d)}
                          aria-pressed={on}
                          className={`flex min-w-[84px] shrink-0 flex-col items-center rounded-2xl px-4 py-2.5 text-[15px] leading-snug font-medium transition ${
                            on
                              ? "bg-white text-[#080914]"
                              : "bg-white/[0.07] text-white hover:bg-white/[0.12]"
                          }`}
                        >
                          <span
                            className={
                              on ? "text-[#080914]/60" : "text-white/60"
                            }
                          >
                            {formatIST(d, "EEE")}
                          </span>
                          {formatIST(d, "d MMM")}
                        </button>
                      );
                    })}
                    {openDays.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setAllDates((v) => !v)}
                        className="flex min-w-[84px] shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 px-4 py-2.5 text-[13px] leading-snug font-medium text-white/70 transition hover:border-white/40 hover:text-white"
                      >
                        {allDates ? (
                          "Show less"
                        ) : (
                          <>
                            +{openDays.length - 4}
                            <span>more</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </header>

              {hostedBy && (
                <div className={`pt-7 lg:hidden ${DIVIDER}`}>{hostedBy}</div>
              )}

              <LocationSection
                location={event.location}
                isOnline={event.is_online}
                meetingLink={event.meeting_link}
                googleMapsUrl={event.google_maps_url}
              />

              <section>
                <h2 className={SECTION_H}>About the event</h2>
                {event.hook_line && (
                  <p className="font-outfit mb-4 text-xl leading-snug font-normal text-white">
                    {event.hook_line}
                  </p>
                )}
                {event.description ? (
                  <RichTextView
                    html={event.description}
                    className="text-[15px] leading-7 !text-white/70 [&_*]:![background-color:transparent] [&_*]:![color:inherit] [&_a]:![color:#B57BFF] [&_h1]:mt-5 [&_h1]:font-semibold [&_h1]:![color:#fff] [&_h2]:mt-5 [&_h2]:font-semibold [&_h2]:![color:#fff] [&_h3]:mt-4 [&_h3]:font-semibold [&_h3]:![color:#fff] [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-2 [&_strong]:![color:#fff] [&_ul]:list-disc [&_ul]:pl-5"
                  />
                ) : (
                  <p className="text-sm text-white/55">
                    No description available.
                  </p>
                )}
              </section>

              <GuestReviews
                reviews={reviews ?? []}
                rating={rating}
                totalReviews={totalReviews}
              />
            </div>
          </div>
        </div>
      </main>

      <BookingPill
        label={
          event.is_free
            ? `${bookWord} · Free`
            : `${bookWord} from ${rupees(fromCents)}`
        }
        status={barStatus}
        href={ticketsHref}
      />

      <AllPhotosModal
        isOpen={showAllPhotos}
        onClose={() => setShowAllPhotos(false)}
        images={images}
      />
    </>
  );
}
