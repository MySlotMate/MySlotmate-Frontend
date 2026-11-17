"use client";

import { use, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiMapPin, FiShare, FiStar } from "react-icons/fi";
import { LuBadgeCheck } from "react-icons/lu";
import { splitEventsByTime } from "~/components/host/ExperiencesList";
import { Navbar, Home } from "~/components";
import { ReviewsModal } from "~/components/ReviewsModal";
import { ReviewModal } from "~/components/activities";
import { eventPriceLabel } from "~/lib/price";
import { formatIST } from "~/lib/datetime";
import { getMoodDisplayLabel } from "~/lib/moods";
import { toast } from "sonner";
import {
  usePublicHostProfile,
  useEventsByHost,
  useListPublicEvents,
  useReviewsByEvent,
  useMyHost,
} from "~/hooks/useApi";
import type { PublicHostProfileDTO } from "~/lib/api";

export default function HostProfileClient({
  params,
  initialHost,
}: {
  params: Promise<{ slug: string }>;
  initialHost: PublicHostProfileDTO | null;
}) {
  const { slug: _hostSlug } = use(params);
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);

  // Server-rendered profile keeps the page content in the initial HTML; the
  // client query takes over once it resolves. The route param is a slug (or a
  // legacy UUID) — the /hosts endpoint resolves either form.
  const { data: fetchedHost, isLoading: hostQueryLoading } =
    usePublicHostProfile(_hostSlug);
  const host = fetchedHost ?? initialHost ?? undefined;
  const hostLoading = hostQueryLoading && !host;
  // Listing a host's events keys off the real host UUID, not the slug.
  const hostId = host?.id ?? "";
  const { data: hostEventsAuthed } = useEventsByHost(hostId);
  // /events/host needs a login; visitors fall back to the public list.
  const { data: publicEvents } = useListPublicEvents();
  const allEvents = hostEventsAuthed?.length
    ? hostEventsAuthed
    : publicEvents?.filter((e) => e.host_id === hostId);
  const { data: currentUserHost } = useMyHost(user?.uid ?? null);

  // Events shown anywhere on the public profile: exclude drafts (never
  // published) and cancelled events (pulled/refunded). This keeps live and
  // paused events — a paused event that has already happened still belongs in
  // the host's history. The bookable "upcoming" list narrows further to live
  // only (below), so a paused event can't be booked but still appears as past.
  const events = useMemo(
    () =>
      allEvents?.filter(
        (e) => e.status !== "draft" && e.status !== "cancelled",
      ),
    [allEvents],
  );

  // Pick the first event's reviews as representative reviews for the host
  const firstEventId = events?.[0]?.id ?? null;
  const { data: reviewsEnvelope } = useReviewsByEvent(firstEventId);
  const reviews = reviewsEnvelope ?? [];

  // DEBUG: Console logs

  // Derive gallery from the host's own photos + event cover images (excluding sub-gallery photos)
  const galleryUrls = useMemo(() => {
    const urls: string[] = [...(host?.gallery_urls ?? [])];
    for (const evt of events ?? []) {
      if (evt.cover_image_url) urls.push(evt.cover_image_url);
    }
    return Array.from(new Set(urls.filter(Boolean)));
  }, [host, events]);

  // Derive aggregate stats from events, unless an admin has pinned a value for
  // this host (set in the admin dashboard's host profile editor).
  const totalEvents = host?.events_hosted_override ?? events?.length ?? 0;
  const totalPeopleMet = useMemo(
    () =>
      host?.people_met_override ??
      events?.reduce((sum, e) => sum + (e.total_bookings ?? 0), 0) ??
      0,
    [host, events],
  );
  const displayRating = host?.avg_rating_override ?? host?.avg_rating ?? 0;

  // Split into still-bookable vs already-held so past events don't sit under
  // the "Live & Upcoming" heading. The upcoming (bookable) list is live-only —
  // a paused event must not be bookable — while the past list keeps paused
  // events so they remain visible as history.
  const { upcoming: upcomingEvents, past: pastEvents } = useMemo(() => {
    const { upcoming, past } = splitEventsByTime(events ?? []);
    return {
      upcoming: upcoming.filter((e) => e.status === "live"),
      past,
    };
  }, [events]);

  // Derive moods from events
  const moods = useMemo(() => {
    if (!events) return [];
    const set = new Set<string>();
    for (const evt of events) {
      if (evt.mood) set.add(evt.mood);
    }
    return Array.from(set);
  }, [events]);

  // Handler functions
  const handleReadAllReviews = () => {
    setShowAllReviewsModal(true);
  };

  if (hostLoading || !host) {
    return (
      <main className="flex min-h-screen flex-col items-center bg-[#080914] text-white">
        <Navbar dark />
        <div className="flex items-center justify-center py-32">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#B57BFF] border-t-transparent" />
        </div>
      </main>
    );
  }

  const fullName = `${host.first_name} ${host.last_name}`.trim();
  const role = host.is_professional
    ? "Professional Host"
    : host.is_super_host
      ? "Super Host"
      : "Community Host";
  const CARD = "rounded-2xl border border-white/[0.06] bg-[#131328]";
  const FALLBACK = "/assets/home/hiking.webp";
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-clip bg-[#080914] font-[family-name:var(--font-inter)] text-white max-md:pb-28">
      <Navbar dark />

      <div className="mx-auto w-full max-w-[1210px] px-6 pt-6 pb-16 md:px-10 md:pt-10">
        <div className="grid gap-10 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-12">
          {/* Identity */}
          <section className="flex flex-col">
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label="Go back"
                onClick={() =>
                  window.history.length > 1 ? router.back() : router.push("/")
                }
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#131328] transition hover:bg-[#1B1C33]"
              >
                <FiArrowLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-white/60">Host profile</span>
              <button
                type="button"
                aria-label="Copy link"
                onClick={() => void share()}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#131328] transition hover:bg-[#1B1C33]"
              >
                <FiShare className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-col items-center text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                // Some hosts have avatar_url = "" — `??` would keep the empty string.
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                src={host.avatar_url || "/assets/home/profile1.png"}
                alt={fullName}
                className="h-24 w-24 rounded-full border-2 border-[#9B30FF] object-cover"
              />
              <h1 className="font-outfit mt-3 flex items-center gap-2 text-[26px] leading-8 font-bold">
                {fullName}
                {host.is_identity_verified && (
                  <LuBadgeCheck
                    className="h-5 w-5 text-[#B57BFF]"
                    aria-label="Verified"
                  />
                )}
              </h1>
              {host.tagline && (
                <p className="mt-1 max-w-xs text-sm text-white/55">
                  {host.tagline}
                </p>
              )}
              <span className="mt-2.5 rounded-full border border-[#9B30FF]/40 bg-[#9B30FF]/15 px-3 py-1 text-xs font-medium text-[#E3CCFF]">
                {role}
              </span>
              {host.city && (
                <p className="mt-2 flex items-center gap-1 text-[13px] text-white/55">
                  <FiMapPin className="h-3.5 w-3.5" />
                  {host.city}
                </p>
              )}
            </div>

            <div className="mt-6 grid grid-cols-3 divide-x divide-white/10 text-center">
              {[
                [totalEvents, "Experiences Hosted"],
                [totalPeopleMet, "Participants Reached"],
                [displayRating ? displayRating.toFixed(1) : "New", "Rating"],
              ].map(([value, label]) => (
                <div key={label} className="px-2">
                  <p className="font-outfit text-2xl font-bold">{value}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-white/55">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {(Boolean(host.bio) || (host.expertise_tags ?? []).length > 0) && (
              <div className={`mt-7 p-5 ${CARD}`}>
                <h2 className="font-outfit text-lg font-semibold">About Me</h2>
                {host.bio && (
                  <p className="mt-2 text-sm leading-6 whitespace-pre-line text-white/70">
                    {host.bio}
                  </p>
                )}
                {[
                  ...(host.expertise_tags ?? []),
                  ...moods.map(getMoodDisplayLabel),
                ].length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Array.from(
                      new Set([
                        ...(host.expertise_tags ?? []),
                        ...moods.map(getMoodDisplayLabel),
                      ]),
                    ).map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-white/10 bg-[#1B1C33] px-3 py-1 text-xs text-white/75"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Highlights + experiences */}
          <section className="flex min-w-0 flex-col gap-8">
            {galleryUrls.length > 0 && (
              <div>
                <h2 className="font-outfit mb-3 text-lg font-semibold">
                  Event Highlights
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {galleryUrls.slice(0, 3).map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/5] w-full rounded-2xl border border-white/[0.06] object-cover"
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="font-outfit mb-3 text-lg font-semibold">
                Active Experiences
              </h2>
              {upcomingEvents.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {upcomingEvents.map((e) => (
                    <Link
                      key={e.id}
                      href={`/experience/${e.slug}`}
                      className={`flex items-center gap-4 p-3 transition hover:border-white/15 ${CARD}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={e.cover_image_url ?? FALLBACK}
                        alt=""
                        className="aspect-[4/5] w-16 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        {e.mood && (
                          <span className="text-[11px] font-bold tracking-wide text-[#C084FC] uppercase">
                            {getMoodDisplayLabel(e.mood)}
                          </span>
                        )}
                        <p className="font-outfit truncate text-[15px] font-semibold">
                          {e.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-white/55">
                          {formatIST(
                            e.next_available_date ?? e.time,
                            "MMM d · h:mm a",
                          )}
                          {e.is_online
                            ? " · Online"
                            : e.location
                              ? ` · ${e.location}`
                              : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold">
                          {eventPriceLabel(e)}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-[#D8B4FE]">
                          View
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className={`p-5 text-sm text-white/55 ${CARD}`}>
                  No upcoming experiences right now.
                </div>
              )}
            </div>

            {reviews.length > 0 && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-outfit flex items-center gap-2 text-lg font-semibold">
                    Reviews
                    {displayRating > 0 && (
                      <span className="flex items-center gap-1 text-sm text-amber-400">
                        <FiStar className="h-3.5 w-3.5 fill-amber-400" />
                        {displayRating.toFixed(1)}
                        <span className="font-normal text-white/50">
                          ({host.total_reviews})
                        </span>
                      </span>
                    )}
                  </h2>
                  <button
                    type="button"
                    onClick={handleReadAllReviews}
                    className="text-sm font-medium text-[#D8B4FE] hover:text-white"
                  >
                    Read all
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {reviews.slice(0, 3).map((r) => (
                    <div key={r.id} className={`p-4 ${CARD}`}>
                      <p className="text-sm font-semibold">
                        {r.name ?? "Guest"}
                      </p>
                      <p className="mt-1.5 text-sm leading-6 text-white/70">
                        {r.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pastEvents.length > 0 && (
              <div>
                <h2 className="font-outfit mb-3 text-lg font-semibold text-white/80">
                  Past Experiences
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {pastEvents.slice(0, 6).map((e) => (
                    <Link
                      key={e.id}
                      href={`/experience/${e.slug}`}
                      className={`overflow-hidden opacity-80 transition hover:opacity-100 ${CARD}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={e.cover_image_url ?? FALLBACK}
                        alt=""
                        loading="lazy"
                        className="aspect-[4/5] w-full object-cover"
                      />
                      <p className="truncate p-2.5 text-xs font-semibold">
                        {e.title}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <Home.Footer dark />

      {/* Review Modal */}
      {events && events.length > 0 && user?.uid && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          eventId={events[0]!.id}
          hostId={events[0]!.host_id}
          eventTitle={events[0]!.title}
          userId={user.uid}
        />
      )}

      {/* Reviews Modal */}
      <ReviewsModal
        isOpen={showAllReviewsModal}
        onClose={() => setShowAllReviewsModal(false)}
        reviews={reviews}
        avg_rating={host.avg_rating ?? 0}
        hostId={currentUserHost?.id}
        eventHostId={hostId}
      />
    </main>
  );
}
