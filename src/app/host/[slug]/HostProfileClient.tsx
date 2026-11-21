"use client";

import Breadcrumbs from "~/components/Breadcrumbs";
import { use, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Globe, ShieldCheck, Star, Ticket } from "lucide-react";
import { FaInstagram, FaLinkedin } from "react-icons/fa";
import { splitEventsByTime } from "~/components/host/ExperiencesList";
import { Navbar, Home } from "~/components";
import { ReviewsModal } from "~/components/ReviewsModal";
import SlotCard from "~/components/website/SlotCard";
import PhotoAlbums from "~/components/profile/PhotoAlbums";
import {
  CARD,
  ConnectButton,
  ConnectNote,
  EmptyCard,
  InfoBlock,
  ProfileIdentity,
  TagList,
  ProfileTabs,
  SecondaryButton,
  ShareButton,
  SkeletonGrid,
  type RoleTone,
} from "~/components/profile/ProfileKit";
import { formatIST } from "~/lib/datetime";
import { getMoodDisplayLabel } from "~/lib/moods";
import { isUnverifiedHost } from "~/lib/hostTier";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { useMoments } from "~/hooks/useMoments";
import {
  useBookingsByUser,
  useEventsByHost,
  useListPublicEvents,
  useMyHost,
  usePublicHostEvents,
  usePublicHostProfile,
  useReviewsByEvent,
} from "~/hooks/useApi";
import type { EventDTO, PublicHostProfileDTO } from "~/lib/api";
import EventCover from "~/components/EventCover";

type Tab = "upcoming" | "past" | "photos" | "reviews" | "about";

const openLogin = () => window.dispatchEvent(new Event("msm:open-profile"));

function hostRole(host: PublicHostProfileDTO): {
  label: string;
  tone: RoleTone;
} {
  if (isUnverifiedHost(host))
    return { label: "Explorer · Free events", tone: "explorer" };
  if (host.is_professional) return { label: "Professional host", tone: "pro" };
  if (host.is_super_host) return { label: "Super host", tone: "host" };
  return { label: "Community host", tone: "community" };
}

export default function HostProfileClient({
  params,
  initialHost,
}: {
  params: Promise<{ slug: string }>;
  initialHost: PublicHostProfileDTO | null;
}) {
  const { slug } = use(params);
  const { userId: stored } = useStoredAuth();
  const userId = stored && stored !== "existing" ? stored : null;
  const [tab, setTab] = useState<Tab>("upcoming");
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Server-rendered profile keeps the content in the first HTML; the client
  // query takes over once it resolves. The slug (or a legacy UUID) works.
  const { data: fetchedHost, isLoading } = usePublicHostProfile(slug);
  const host = fetchedHost ?? initialHost ?? undefined;
  const hostId = host?.id ?? "";

  const { data: hostEventsAuthed } = useEventsByHost(hostId || null);
  // /events/host needs a login; visitors fall back to the public list.
  const { data: publicEvents } = useListPublicEvents();
  // Past events come from the public host-events endpoint; the other sources
  // fill in while it loads (or if it fails): the upcoming public list, the
  // host's own list when they view themselves, and experiences the viewer
  // went to.
  const { events: hostPublicEvents, supported: pastSupported } =
    usePublicHostEvents(hostId || null);
  const { moments: myMoments } = useMoments(userId);
  const allEvents = useMemo(() => {
    const byId = new Map<string, EventDTO>();
    for (const e of [
      ...(publicEvents ?? []),
      ...(hostPublicEvents ?? []),
      ...(hostEventsAuthed ?? []),
      ...myMoments.map((m) => m.event),
    ])
      if (e.host_id === hostId) byId.set(e.id, e);
    return [...byId.values()];
  }, [publicEvents, hostPublicEvents, hostEventsAuthed, myMoments, hostId]);
  const { data: me } = useMyHost(userId);
  const isMe = Boolean(me?.id && me.id === hostId);
  const { data: myBookings } = useBookingsByUser(userId);

  // Drafts and cancelled events never show; paused ones stay as history.
  const events = useMemo(
    () =>
      (allEvents ?? []).filter(
        (e) => e.status !== "draft" && e.status !== "cancelled",
      ),
    [allEvents],
  );
  const { upcoming, past } = useMemo(() => {
    const split = splitEventsByTime(events);
    return {
      upcoming: split.upcoming.filter((e) => e.status === "live"),
      past: split.past,
    };
  }, [events]);

  const firstEventId = events[0]?.id ?? null;
  const { data: reviewsData } = useReviewsByEvent(firstEventId);
  const reviews = reviewsData ?? [];

  // "You've been to 2 of their experiences" — shared history builds trust.
  const beenTo = useMemo(() => {
    const ids = new Set(events.map((e) => e.id));
    return new Set(
      (myBookings ?? [])
        .filter((b) => b.status === "confirmed" && ids.has(b.event_id))
        .map((b) => b.event_id),
    ).size;
  }, [events, myBookings]);

  if (!host) {
    return (
      <main className="flex min-h-screen flex-col items-center bg-[#080914] text-white">
        <Navbar dark />
        <div className="flex items-center justify-center py-32">
          {isLoading ? (
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#B57BFF] border-t-transparent" />
          ) : (
            <p className="text-white/60">This profile isn&apos;t available.</p>
          )}
        </div>
      </main>
    );
  }

  const fullName = `${host.first_name} ${host.last_name}`.trim();
  const totalEvents = host.events_hosted_override ?? events.length;
  const peopleMet =
    host.people_met_override ??
    events.reduce((sum, e) => sum + (e.total_bookings ?? 0), 0);
  const rating = host.avg_rating_override ?? host.avg_rating ?? 0;
  const tags = Array.from(
    new Set([
      ...(host.expertise_tags ?? []),
      ...events.map((e) => (e.mood ? getMoodDisplayLabel(e.mood) : "")),
    ]),
  ).filter(Boolean);

  const socials = [
    host.social_instagram && {
      href: host.social_instagram.startsWith("http")
        ? host.social_instagram
        : `https://instagram.com/${host.social_instagram.replace(/^@/, "")}`,
      label: "Instagram",
      icon: <FaInstagram className="h-4 w-4" />,
    },
    host.social_linkedin && {
      href: host.social_linkedin,
      label: "LinkedIn",
      icon: <FaLinkedin className="h-4 w-4" />,
    },
    host.social_website && {
      href: host.social_website,
      label: "Website",
      icon: <Globe className="h-4 w-4" />,
    },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode }[];

  const tabs: {
    key: Tab;
    label: string;
    count?: number;
    mobileOnly?: boolean;
  }[] = [
    { key: "upcoming", label: "Upcoming", count: upcoming.length },
    { key: "past", label: "Past", count: past.length },
    { key: "photos", label: "Photos" },
    { key: "reviews", label: "Reviews", count: host.total_reviews },
    { key: "about", label: "About", mobileOnly: true },
  ];

  // Interests, links and trust: in the card on desktop, in the
  // About tab on phones.
  const about = (
    <>
      {tags.length > 0 && (
        <InfoBlock title="Hosts">
          <TagList tags={tags} />
        </InfoBlock>
      )}
      <InfoBlock title="Trust & safety">
        <ul className="flex flex-col gap-2.5 text-[13px] text-white/70">
          <li className="flex items-start gap-2.5">
            <ShieldCheck
              className={`mt-0.5 h-4 w-4 shrink-0 ${host.is_identity_verified ? "text-emerald-300" : "text-white/35"}`}
            />
            {host.is_identity_verified
              ? "Identity verified by MySlotMate"
              : "Identity not verified yet"}
          </li>
          {beenTo > 0 && (
            <li className="flex items-start gap-2.5">
              <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-[#D8B4FE]" />
              You&apos;ve been to {beenTo} of their experience
              {beenTo === 1 ? "" : "s"}
            </li>
          )}
          <li className="flex items-start gap-2.5">
            <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />
            Book and pay only on MySlotMate
          </li>
        </ul>
      </InfoBlock>
      {socials.length > 0 && (
        <InfoBlock title="Elsewhere">
          <div className="flex flex-wrap gap-2">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/75 transition hover:border-white/25 hover:text-white"
              >
                <span className="text-[#D8B4FE]">{s.icon}</span>
                {s.label}
              </a>
            ))}
          </div>
        </InfoBlock>
      )}
    </>
  );

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-clip bg-[#080914] font-[family-name:var(--font-inter)] text-white max-md:pb-28">
      <Navbar dark />

      <div className="mx-auto grid w-full max-w-[1210px] gap-6 px-4 pt-5 pb-16 sm:px-6 md:px-10 md:pt-8 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-10">
        <Breadcrumbs
          current={`${host.first_name} ${host.last_name}`.trim()}
          className="!mb-0 lg:col-span-2"
        />
        <ProfileIdentity
          // Some hosts have avatar_url = "" — treat it as missing.
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          avatar={host.avatar_url || null}
          name={fullName}
          verified={host.is_identity_verified}
          role={hostRole(host)}
          tagline={host.tagline}
          meta={[
            ...(host.city ? [host.city] : []),
            ...(host.connections_count
              ? [
                  `${host.connections_count} connection${host.connections_count === 1 ? "" : "s"}`,
                ]
              : []),
          ]}
          bio={host.bio}
          stats={[
            // A dash until events load, rather than a misleading 0.
            {
              value:
                hostPublicEvents ||
                publicEvents ||
                host.events_hosted_override != null
                  ? totalEvents
                  : "–",
              label: "Hosted",
            },
            {
              value:
                hostPublicEvents ||
                publicEvents ||
                host.people_met_override != null
                  ? peopleMet
                  : "–",
              label: "Guests",
            },
            {
              value: rating ? (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {rating.toFixed(1)}
                </span>
              ) : (
                "New"
              ),
              label: host.total_reviews
                ? `${host.total_reviews} review${host.total_reviews === 1 ? "" : "s"}`
                : "Rating",
            },
          ]}
          actions={
            isMe ? (
              <>
                <SecondaryButton href="/host-dashboard/profile">
                  Edit profile
                </SecondaryButton>
                <ShareButton title={fullName} />
              </>
            ) : (
              <>
                <ConnectButton
                  hostId={host.id}
                  firstName={host.first_name}
                  signedIn={Boolean(userId)}
                  onNeedLogin={openLogin}
                />
                <ShareButton title={fullName} />
              </>
            )
          }
          note={
            isMe ? (
              "This is how others see your profile."
            ) : (
              <ConnectNote hostId={host.id} firstName={host.first_name} />
            )
          }
          extra={about}
        />

        <div className="min-w-0">
          <ProfileTabs tabs={tabs} active={tab} onChange={setTab} />

          <div className="mt-5">
            {tab === "upcoming" ? (
              !publicEvents ? (
                <SkeletonGrid />
              ) : upcoming.length ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
                  {upcoming.map((e, i) => (
                    <SlotCard key={e.id} event={e} host={host} index={i} />
                  ))}
                </div>
              ) : (
                <EmptyCard
                  icon={<CalendarDays className="h-6 w-6" />}
                  title="Nothing coming up right now"
                  text={`Connect with ${host.first_name} and their next experience will show up on your home first.`}
                />
              )
            ) : tab === "past" ? (
              !publicEvents ? (
                <SkeletonGrid />
              ) : past.length ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
                  {past.map((e) => (
                    <Link
                      key={e.id}
                      href={`/experience/${e.slug}`}
                      className={`group overflow-hidden ${CARD}`}
                    >
                      <div className="aspect-[4/5] overflow-hidden">
                        <EventCover
                          src={e.cover_image_url}
                          alt={e.title}
                          loading="lazy"
                          className="h-full w-full object-cover opacity-85 transition duration-300 group-hover:scale-105 group-hover:opacity-100"
                        />
                      </div>
                      <div className="p-3">
                        <p className="truncate text-[13px] font-semibold">
                          {e.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/50">
                          {formatIST(e.time, "MMM d, yyyy")}
                          {e.total_bookings
                            ? ` · ${e.total_bookings} went`
                            : ""}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyCard
                  icon={<CalendarDays className="h-6 w-6" />}
                  title={
                    pastSupported || isMe
                      ? "No past experiences yet"
                      : "Past experiences coming soon"
                  }
                  text={
                    pastSupported || isMe
                      ? "Experiences they've hosted will collect here."
                      : `We're adding ${host.first_name}'s full hosting history. Experiences you've been to with them already show here.`
                  }
                />
              )
            ) : tab === "photos" ? (
              <PhotoAlbums
                owner={{ hostId: host.id }}
                firstName={host.first_name}
                isMe={isMe}
              />
            ) : tab === "reviews" ? (
              reviews.length ? (
                <div className="flex flex-col gap-3">
                  {reviews.slice(0, 6).map((r) => (
                    <div key={r.id} className={`p-4 ${CARD}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">
                          {r.name ?? "Guest"}
                        </p>
                        {r.rating > 0 && (
                          <span className="flex items-center gap-1 text-xs text-amber-400">
                            <Star className="h-3 w-3 fill-amber-400" />
                            {r.rating}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm leading-6 text-white/70">
                        {r.description}
                      </p>
                    </div>
                  ))}
                  {reviews.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setShowAllReviews(true)}
                      className="self-start text-sm font-semibold text-[#D8B4FE] hover:text-white"
                    >
                      Read all {reviews.length} reviews
                    </button>
                  )}
                </div>
              ) : (
                <EmptyCard
                  icon={<Star className="h-6 w-6" />}
                  title="No reviews yet"
                  text="Reviews from guests show up here after their experiences."
                />
              )
            ) : (
              <div className="flex flex-col gap-6">{about}</div>
            )}
          </div>
        </div>
      </div>

      <Home.Footer dark />

      <ReviewsModal
        isOpen={showAllReviews}
        onClose={() => setShowAllReviews(false)}
        reviews={reviews}
        avg_rating={host.avg_rating ?? 0}
        hostId={me?.id}
        eventHostId={hostId}
      />
    </main>
  );
}
