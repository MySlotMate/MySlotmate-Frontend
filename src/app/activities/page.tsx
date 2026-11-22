"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import {
  queryKeys,
  useBookingsByUser,
  useListHosts,
  useListPublicEvents,
  useCancelBooking,
  useSavedExperiences,
  useUserProfile,
} from "~/hooks/useApi";
import * as api from "~/lib/api";
import {
  type BookingDTO,
  type EventDTO,
  type PublicHostProfileDTO,
} from "~/lib/api";
import { downloadTicketPdf } from "~/lib/ticket";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { formatIST } from "~/lib/datetime";
import { categoryOf } from "~/lib/categories";
import { computeBadges, type BadgeState, type Moment } from "~/lib/badges";
import * as components from "~/components";
import EventPhotos from "~/components/profile/EventPhotos";
import Milestones, { BadgeSheet } from "~/components/profile/Milestones";
import { refundDueOnCancel } from "~/lib/cancellationPolicy";
import {
  InboxSidebar,
  MyPassesSection,
  ReviewModal,
} from "~/components/activities";
import {
  FiAlertCircle,
  FiCalendar,
  FiHeart,
  FiMapPin,
  FiMessageCircle,
  FiStar,
  FiX,
  FiXCircle,
  FiVideo,
} from "react-icons/fi";
import { LuQrCode, LuSparkles } from "react-icons/lu";
import { toast } from "sonner";
import EventCover from "~/components/EventCover";

const CARD = "rounded-2xl border border-white/[0.06] bg-[#131328]";
const GRADIENT_BTN =
  "bg-gradient-to-r from-[#7038F5] to-[#B724EA] text-white transition hover:brightness-110";

type Tab = "upcoming" | "memories" | "saved";

interface BookingWithEvent {
  booking: BookingDTO;
  event: EventDTO;
}

const placeOf = (e: EventDTO) =>
  e.is_online ? "Online" : (e.location ?? "TBA");

function StatusPill({ status }: { status: BookingDTO["status"] }) {
  const style =
    status === "confirmed"
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "pending"
        ? "bg-amber-500/15 text-amber-300"
        : "bg-red-500/15 text-red-300";
  return (
    <span
      className={`w-fit rounded-md px-2 py-1 text-[10px] leading-none font-bold tracking-wider uppercase ${style}`}
    >
      {status}
    </span>
  );
}

function UpcomingCard({
  booking,
  event,
  host,
  downloading,
  onTicket,
  onInbox,
  onCancel,
}: {
  booking: BookingDTO;
  event: EventDTO;
  host?: PublicHostProfileDTO;
  downloading: boolean;
  onTicket: () => void;
  onInbox: () => void;
  onCancel: () => void;
}) {
  return (
    <article className={`flex flex-col overflow-hidden ${CARD}`}>
      <Link
        href={`/experience/${event.slug}`}
        className="aspect-[4/5] overflow-hidden"
      >
        <EventCover
          src={event.cover_image_url}
          alt={event.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 hover:scale-105"
        />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <StatusPill status={booking.status} />
        <h3 className="font-outfit mt-2.5 text-[15px] leading-5 font-semibold text-white">
          {event.title}
        </h3>
        <p className="mt-2 flex items-center gap-2 text-[13px] text-white/60">
          <FiCalendar className="h-3.5 w-3.5 shrink-0" />
          {formatIST(booking.occurrence_date, "EEE, MMM d · h:mm a")}
          {booking.quantity > 1 && ` · ${booking.quantity} guests`}
        </p>
        <p className="mt-1.5 flex items-center gap-2 text-[13px] text-white/60">
          {event.is_online ? (
            <FiVideo className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <FiMapPin className="h-3.5 w-3.5 shrink-0" />
          )}
          {event.is_online && event.meeting_link ? (
            <a
              href={event.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D8B4FE] hover:underline"
            >
              Join meeting
            </a>
          ) : (
            <span className="truncate">{placeOf(event)}</span>
          )}
        </p>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
          {host ? (
            <span className="flex min-w-0 items-center gap-2 text-[13px] text-white/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                // Some hosts have avatar_url = "" — `??` would keep the empty string.
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                src={host.avatar_url || "/assets/home/profile1.png"}
                alt=""
                className="h-6 w-6 shrink-0 rounded-full object-cover"
              />
              <span className="truncate">
                Hosted by{" "}
                <span className="font-semibold text-white">
                  {host.first_name} {host.last_name}
                </span>
              </span>
            </span>
          ) : (
            <span />
          )}
          <span className="flex shrink-0 items-center gap-3 text-xs">
            <button
              type="button"
              onClick={onInbox}
              className="flex items-center gap-1 text-white/60 transition hover:text-white"
            >
              <FiMessageCircle className="h-3.5 w-3.5" /> Inbox
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="text-red-300/80 transition hover:text-red-300"
            >
              Cancel
            </button>
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onTicket}
            disabled={booking.status !== "confirmed" || downloading}
            title={
              booking.status === "confirmed"
                ? "Download ticket"
                : "Ticket is ready once the booking is confirmed"
            }
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1B1C33] text-sm font-medium text-white transition hover:bg-[#232445] disabled:opacity-50"
          >
            <LuQrCode className="h-4 w-4" />
            {downloading ? "Preparing…" : "QR Ticket"}
          </button>
          <Link
            href={`/experience/${event.slug}`}
            className={`flex h-10 items-center justify-center rounded-xl text-sm font-semibold ${GRADIENT_BTN}`}
          >
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
}

function Empty({
  title,
  text,
  cta = true,
  children,
}: {
  title: string;
  text: string;
  cta?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col items-center px-6 py-14 text-center ${CARD}`}
    >
      <FiCalendar className="h-10 w-10 text-white/25" />
      <p className="font-outfit mt-4 text-lg font-semibold text-white">
        {title}
      </p>
      <p className="mt-1.5 max-w-sm text-sm text-white/55">{text}</p>
      {children}
      {cta && (
        <Link
          href="/explore"
          className={`mt-5 rounded-full px-6 py-2.5 text-sm font-semibold ${GRADIENT_BTN}`}
        >
          Explore experiences
        </Link>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Story hero                                                          */
/* ------------------------------------------------------------------ */

function JourneyHero({
  firstName,
  memberSince,
  firstMoment,
  next,
  stats,
}: {
  firstName?: string;
  memberSince?: string;
  firstMoment?: Moment;
  next?: BookingWithEvent;
  stats: [number, string][];
}) {
  const days = memberSince
    ? Math.max(
        1,
        Math.round((Date.now() - new Date(memberSince).getTime()) / 864e5),
      )
    : null;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#3B1772] via-[#1D1140] to-[#100E1C]">
      <div className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-[#A020F0]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-10 h-64 w-64 rounded-full bg-[#F59E0B]/10 blur-3xl" />

      <div className="relative grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_260px] md:p-9">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-[#E9D5FF] uppercase">
            <LuSparkles className="h-3.5 w-3.5" /> My journey
          </span>
          <h1 className="font-outfit mt-3 text-[28px] leading-tight font-bold md:text-[36px]">
            {firstName ? `${firstName}'s story` : "Your story"} on{" "}
            <span className="text-[#D8B4FE]">MySlotMate</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70 md:text-[15px]">
            {memberSince ? (
              <>
                It began in {formatIST(memberSince, "MMMM yyyy")}
                {days ? ` — ${days} day${days === 1 ? "" : "s"} ago` : ""}.{" "}
              </>
            ) : null}
            {firstMoment ? (
              <>
                Your first chapter was{" "}
                <Link
                  href={`/experience/${firstMoment.event.slug}`}
                  className="font-semibold text-white underline decoration-white/30 underline-offset-4 hover:decoration-white"
                >
                  {firstMoment.event.title}
                </Link>{" "}
                on {formatIST(firstMoment.at, "MMM d, yyyy")}.
              </>
            ) : (
              "Your first chapter is waiting. Book something that sounds like you."
            )}
          </p>

          <div className="mt-5 grid max-w-xl grid-cols-4 gap-2">
            {stats.map(([value, label]) => (
              <div
                key={label}
                className="rounded-2xl bg-white/[0.06] px-2 py-3 text-center backdrop-blur"
              >
                <p className="font-outfit text-xl font-bold md:text-2xl">
                  {value}
                </p>
                <p className="mt-0.5 text-[10px] leading-tight text-white/55 md:text-[11px]">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Next chapter */}
        <div className="flex flex-col justify-center">
          {next ? (
            <Link
              href={`/experience/${next.event.slug}`}
              className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3 transition hover:border-white/25 md:flex-col md:items-stretch"
            >
              <div className="aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-xl md:w-full">
                <EventCover
                  src={next.event.cover_image_url}
                  alt=""
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-wider text-[#D8B4FE] uppercase">
                  Next chapter
                </p>
                <p className="font-outfit mt-1 line-clamp-2 text-[15px] leading-5 font-semibold">
                  {next.event.title}
                </p>
                <p className="mt-1 text-xs text-white/60">
                  {formatIST(
                    next.booking.occurrence_date,
                    "EEE, MMM d · h:mm a",
                  )}
                </p>
              </div>
            </Link>
          ) : (
            <Link
              href="/explore"
              className="flex items-center gap-4 rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 transition hover:border-white/30 md:flex-col md:text-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/badges/first-step.webp"
                alt=""
                className="h-20 w-20 md:h-32 md:w-32"
              />
              <div>
                <p className="font-outfit text-[15px] font-semibold">
                  Write the next chapter
                </p>
                <p className="mt-1 text-xs text-white/55">
                  Find something to do this week →
                </p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Memories timeline                                                   */
/* ------------------------------------------------------------------ */

function MemoryTimeline({
  moments,
  badgesByBooking,
  onReview,
  onBadge,
}: {
  moments: Moment[];
  badgesByBooking: Map<string, BadgeState[]>;
  onReview: (eventId: string) => void;
  onBadge: (s: BadgeState) => void;
}) {
  // Newest first, grouped by month.
  const groups = useMemo(() => {
    const out: { month: string; items: Moment[] }[] = [];
    for (const m of [...moments].sort(
      (a, b) => b.at.getTime() - a.at.getTime(),
    )) {
      const month = formatIST(m.at, "MMMM yyyy");
      const last = out[out.length - 1];
      if (last?.month === month) last.items.push(m);
      else out.push({ month, items: [m] });
    }
    return out;
  }, [moments]);
  const firstId = moments.length
    ? [...moments].sort((a, b) => a.at.getTime() - b.at.getTime())[0]!.booking
        .id
    : null;

  return (
    <div className="relative">
      {groups.map((g) => (
        <div key={g.month} className="relative pb-6">
          <div className="sticky top-16 z-10 mb-3 -ml-1 flex items-center gap-3 bg-[#080914]/90 py-1 backdrop-blur">
            <span className="h-3 w-3 rounded-full border-2 border-[#D8B4FE] bg-[#080914]" />
            <h3 className="font-outfit text-[15px] font-semibold text-white/80">
              {g.month}
            </h3>
          </div>
          <div className="ml-[5px] flex flex-col gap-4 border-l border-dashed border-white/15 pl-5 md:pl-7">
            {g.items.map((m) => {
              const unlocked = badgesByBooking.get(m.booking.id) ?? [];
              const isFirst = m.booking.id === firstId;
              return (
                <article
                  key={m.booking.id}
                  className={`overflow-hidden p-3 ${CARD}`}
                >
                  <div className="flex gap-4">
                    <Link
                      href={`/experience/${m.event.slug}`}
                      className="aspect-[4/5] w-24 shrink-0 self-start overflow-hidden rounded-xl md:w-28"
                    >
                      <EventCover
                        src={m.event.cover_image_url}
                        alt={m.event.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col py-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isFirst && (
                          <span className="rounded-md bg-[#F59E0B]/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#FCD34D] uppercase">
                            Where it all began
                          </span>
                        )}
                        <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/60">
                          {categoryOf(m.event).label}
                        </span>
                      </div>
                      <Link
                        href={`/experience/${m.event.slug}`}
                        className="font-outfit mt-1.5 line-clamp-2 text-[15px] leading-5 font-semibold hover:text-[#D8B4FE]"
                      >
                        {m.event.title}
                      </Link>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-white/55">
                        <FiCalendar className="h-3 w-3 shrink-0" />
                        {formatIST(m.at, "EEE, MMM d · h:mm a")}
                      </p>
                      <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-white/55">
                        {m.event.is_online ? (
                          <FiVideo className="h-3 w-3 shrink-0" />
                        ) : (
                          <FiMapPin className="h-3 w-3 shrink-0" />
                        )}
                        <span className="truncate">{placeOf(m.event)}</span>
                      </p>

                      {unlocked.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {unlocked.map((s) => (
                            <button
                              key={s.def.key}
                              type="button"
                              onClick={() => onBadge(s)}
                              className="flex items-center gap-1.5 rounded-full bg-[#F59E0B]/10 py-0.5 pr-2.5 pl-0.5 text-[11px] font-semibold text-[#FCD34D] transition hover:bg-[#F59E0B]/20"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={s.def.art} alt="" className="h-6 w-6" />
                              {s.def.name}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="mt-auto flex items-center gap-4 pt-2 text-xs">
                        {m.event.avg_rating ? (
                          <span className="flex items-center gap-1 text-white/55">
                            <FiStar className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="font-semibold text-amber-400">
                              {m.event.avg_rating.toFixed(1)}
                            </span>
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onReview(m.event.id)}
                          className="font-semibold text-[#D8B4FE] hover:text-white"
                        >
                          Share how it went
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Host photos get their own row, so the poster keeps
                      its 4:5 shape instead of stretching beside them. */}
                  {(m.event.gallery_urls?.length ?? 0) > 0 && (
                    <div className="mt-3 border-t border-white/[0.06] pt-3">
                      <EventPhotos event={m.event} variant="strip" />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      ))}
      <div className="ml-[5px] flex items-center gap-3 pl-0">
        <span className="-ml-[5px] h-3 w-3 rounded-full bg-[#D8B4FE]" />
        <p className="text-xs text-white/45">You joined MySlotMate</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ActivitiesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  // The navbar counts a Firebase session as logged in even before the app user
  // id is stored, so "logged out" has to mean neither exists.
  const [firebaseUser, firebaseLoading] = useAuthState(auth);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [openBadge, setOpenBadge] = useState<BadgeState | null>(null);
  const [activeInboxEventId, setActiveInboxEventId] = useState<string | null>(
    null,
  );
  const [activeReviewEventId, setActiveReviewEventId] = useState<string | null>(
    null,
  );
  const [activeCancelBookingId, setActiveCancelBookingId] = useState<
    string | null
  >(null);
  const [isCancelling, setIsCancelling] = useState(false);
  // refund-destination picker — see backend bookingService.RefundDestination.
  // "wallet" keeps the money in the user's wallet; "source" additionally
  // refunds the funding top-up back to the original card/UPI via Razorpay.
  const [refundDestination, setRefundDestination] = useState<
    "wallet" | "source"
  >("wallet");

  const [downloadingTicketId, setDownloadingTicketId] = useState<string | null>(
    null,
  );

  const { data: bookingUser } = useUserProfile(userId);

  const handleDownloadTicket = async (booking: BookingDTO, event: EventDTO) => {
    if (!bookingUser) {
      toast.error("User profile not loaded yet. Please try again.");
      return;
    }
    setDownloadingTicketId(booking.id);
    await downloadTicketPdf(booking, event, bookingUser);
    setDownloadingTicketId(null);
  };

  const { userId: storedUserId } = useStoredAuth();
  useEffect(() => {
    setUserId(
      storedUserId && storedUserId !== "existing" ? storedUserId : null,
    );
    setIsHydrated(true);
  }, [storedUserId]);

  const { data: bookings, isLoading: bookingsLoading } =
    useBookingsByUser(userId);
  const { data: allEvents } = useListPublicEvents();
  const { data: hosts } = useListHosts();
  const { data: saved } = useSavedExperiences(userId);

  const cancelBooking = useCancelBooking();

  // Past events drop out of the public list, so fetch the ones we're missing
  // one by one — otherwise old memories would vanish from the journey.
  const missingIds = useMemo(() => {
    if (!allEvents) return [];
    const known = new Set(allEvents.map((e) => e.id));
    const ids = new Set<string>();
    for (const b of bookings ?? [])
      if (!known.has(b.event_id)) ids.add(b.event_id);
    for (const s of saved ?? [])
      if (!known.has(s.event_id)) ids.add(s.event_id);
    return [...ids];
  }, [allEvents, bookings, saved]);

  const extra = useQueries({
    queries: missingIds.map((id) => ({
      queryKey: queryKeys.event(id),
      queryFn: () => api.getEvent(id),
      staleTime: 10 * 60 * 1000,
      retry: false,
      select: (res: api.Envelope<EventDTO>) => res.data,
    })),
  });
  const extraKey = extra.map((q) => q.data?.id ?? "").join(",");

  const eventById = useMemo(() => {
    const m = new Map<string, EventDTO>();
    for (const e of allEvents ?? []) m.set(e.id, e);
    for (const q of extra) if (q.data) m.set(q.data.id, q.data);
    return m;
    // `extra` is a new array every render; key on what it resolved to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEvents, extraKey]);

  const bookingsWithEvents: BookingWithEvent[] = useMemo(
    () =>
      (bookings ?? []).flatMap((booking) => {
        const event = eventById.get(booking.event_id);
        return event ? [{ booking, event }] : [];
      }),
    [bookings, eventById],
  );

  const hostById = useMemo(
    () => new Map((hosts ?? []).map((h) => [h.id, h])),
    [hosts],
  );

  const now = Date.now();
  const isFuture = (b: BookingDTO) =>
    new Date(b.occurrence_date).getTime() > now;
  const upcoming = bookingsWithEvents
    .filter(
      ({ booking }) =>
        (booking.status === "confirmed" || booking.status === "pending") &&
        !booking.cancelled_at &&
        isFuture(booking),
    )
    .sort(
      (a, b) =>
        new Date(a.booking.occurrence_date).getTime() -
        new Date(b.booking.occurrence_date).getTime(),
    );
  // A no-refund guest cancel stays `confirmed` with cancelled_at set (the host
  // is still paid), so cancelled_at is what marks it cancelled for the guest.
  const cancelled = bookingsWithEvents.filter(
    ({ booking }) =>
      booking.status === "cancelled" ||
      booking.status === "refunded" ||
      Boolean(booking.cancelled_at),
  );

  const moments: Moment[] = useMemo(
    () =>
      bookingsWithEvents
        .filter(
          ({ booking }) =>
            booking.status === "confirmed" &&
            !booking.cancelled_at &&
            new Date(booking.occurrence_date).getTime() <= Date.now(),
        )
        .map(({ booking, event }) => ({
          booking,
          event,
          at: new Date(booking.occurrence_date),
        })),
    [bookingsWithEvents],
  );

  const badgeStates = useMemo(() => computeBadges(moments), [moments]);
  const badgesByBooking = useMemo(() => {
    const m = new Map<string, BadgeState[]>();
    for (const s of badgeStates) {
      if (!s.earned || !s.earnedAt) continue;
      const id = s.earnedAt.booking.id;
      m.set(id, [...(m.get(id) ?? []), s]);
    }
    return m;
  }, [badgeStates]);

  const firstMoment = useMemo(
    () =>
      moments.length
        ? moments.reduce((a, b) => (a.at <= b.at ? a : b))
        : undefined,
    [moments],
  );

  // Story stats, all from what actually happened.
  const cities = new Set(
    moments
      .filter(({ event }) => !event.is_online && event.location)
      .map(({ event }) => event.location!.split(",").pop()!.trim()),
  ).size;
  const hostsMet = new Set(moments.map(({ event }) => event.host_id)).size;
  const hours = Math.round(
    moments.reduce((sum, { event }) => sum + (event.duration_minutes ?? 0), 0) /
      60,
  );

  const savedEvents = (saved ?? [])
    .map((s) => ({ saved: s, event: eventById.get(s.event_id) }))
    .filter((s): s is { saved: (typeof s)["saved"]; event: EventDTO } =>
      Boolean(s.event),
    );

  // Whether cancelling the booking in the dialog returns the guest's money. The
  // server makes the same call (cancellation_policy.go); this keeps the dialog
  // from promising a refund the policy does not give.
  const cancelTarget = bookingsWithEvents.find(
    ({ booking }) => booking.id === activeCancelBookingId,
  );
  const cancelRefunds =
    !cancelTarget ||
    !(
      cancelTarget.booking.amount_cents && cancelTarget.booking.amount_cents > 0
    ) ||
    refundDueOnCancel(
      cancelTarget.event.cancellation_policy,
      cancelTarget.booking.occurrence_date,
    );

  const handleCancelBooking = async () => {
    if (!activeCancelBookingId || !userId) return;

    setIsCancelling(true);
    try {
      await cancelBooking.mutateAsync({
        bookingId: activeCancelBookingId,
        userId,
        refundDestination,
      });
      toast.success(
        !cancelRefunds
          ? "Booking cancelled. No refund under this experience's cancellation policy."
          : refundDestination === "source"
            ? "Booking cancelled. Refund sent to your card (may take 5–7 working days)."
            : "Booking cancelled. Refund added to your wallet.",
      );
      setActiveCancelBookingId(null);
      setRefundDestination("wallet");
    } catch (err) {
      console.error("Cancellation error:", err);
      toast.error("Failed to cancel booking. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  const loading = bookingsLoading && isHydrated;
  const signedIn = isHydrated && Boolean(userId);
  const firstName = bookingUser?.name?.trim().split(/\s+/)[0];

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "upcoming", label: "Upcoming", count: upcoming.length },
    { key: "memories", label: "Memories", count: moments.length },
    { key: "saved", label: "Saved", count: savedEvents.length },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-clip bg-[#080914] text-white max-md:pb-28">
      <components.Navbar dark />

      <div className="mx-auto w-full max-w-[1210px] px-6 pt-6 pb-16 font-[family-name:var(--font-inter)] md:px-10 md:pt-10">
        {isHydrated && !userId && (firebaseLoading || firebaseUser) ? (
          firebaseLoading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B57BFF] border-t-transparent" />
            </div>
          ) : (
            <Empty
              title="We couldn't load your account"
              text="You're signed in, but your account details didn't load. Try reloading, or log out and back in."
              cta={false}
            >
              <button
                type="button"
                onClick={() => window.location.reload()}
                className={`mt-5 rounded-full px-6 py-2.5 text-sm font-semibold ${GRADIENT_BTN}`}
              >
                Reload
              </button>
            </Empty>
          )
        ) : isHydrated && !userId ? (
          <Empty
            title="Log in to see your journey"
            text="Your plans, memories, milestones and saved experiences show up here once you're signed in."
            cta={false}
          >
            <button
              type="button"
              // Navbar listens for this and opens the login modal.
              onClick={() =>
                window.dispatchEvent(new Event("msm:open-profile"))
              }
              className={`mt-5 rounded-full px-6 py-2.5 text-sm font-semibold ${GRADIENT_BTN}`}
            >
              Log in
            </button>
          </Empty>
        ) : loading || !signedIn ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B57BFF] border-t-transparent" />
          </div>
        ) : (
          <>
            <JourneyHero
              firstName={firstName}
              memberSince={bookingUser?.created_at}
              firstMoment={firstMoment}
              next={upcoming[0]}
              stats={[
                [moments.length, "Experiences"],
                [hostsMet, "Hosts met"],
                [hours, "Hours"],
                [cities, "Cities"],
              ]}
            />

            <div className="mt-10">
              <Milestones states={badgeStates} />
            </div>

            <div
              role="tablist"
              aria-label="Journey"
              className="mt-10 flex gap-1 border-b border-white/[0.08]"
            >
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={`-mb-px flex items-center gap-2 border-b-2 px-3 pb-3 text-sm font-semibold transition md:px-4 ${
                    tab === t.key
                      ? "border-[#B724EA] text-white"
                      : "border-transparent text-white/55 hover:text-white"
                  }`}
                >
                  {t.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      tab === t.key
                        ? "bg-[#A020F0]/25 text-[#E9D5FF]"
                        : "bg-white/[0.06] text-white/50"
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-6">
              {tab === "upcoming" ? (
                <>
                  <MyPassesSection
                    events={allEvents ?? []}
                    bookings={bookings ?? []}
                    onDownloadTicket={(booking, event) =>
                      void handleDownloadTicket(booking, event)
                    }
                    downloadingTicketId={downloadingTicketId}
                  />
                  {upcoming.length > 0 ? (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {upcoming.map(({ booking, event }) => (
                        <UpcomingCard
                          key={booking.id}
                          booking={booking}
                          event={event}
                          host={hostById.get(event.host_id)}
                          downloading={downloadingTicketId === booking.id}
                          onTicket={() =>
                            void handleDownloadTicket(booking, event)
                          }
                          onInbox={() => setActiveInboxEventId(event.id)}
                          onCancel={() => setActiveCancelBookingId(booking.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <Empty
                      title="Nothing planned yet"
                      text="Your next chapter starts with a booking. It'll show up here with your ticket."
                    />
                  )}
                </>
              ) : tab === "memories" ? (
                <div className="max-w-3xl">
                  {moments.length > 0 ? (
                    <MemoryTimeline
                      moments={moments}
                      badgesByBooking={badgesByBooking}
                      onReview={setActiveReviewEventId}
                      onBadge={setOpenBadge}
                    />
                  ) : (
                    <Empty
                      title="No memories yet"
                      text="Every experience you go to becomes a page in your story. The first one even earns a badge."
                    />
                  )}

                  {cancelled.length > 0 && (
                    <details className="mt-8">
                      <summary className="cursor-pointer text-sm font-semibold text-white/55 hover:text-white">
                        Cancelled plans ({cancelled.length})
                      </summary>
                      <div className="mt-3 flex flex-col gap-2">
                        {cancelled.map(({ booking, event }) => (
                          <Link
                            key={booking.id}
                            href={`/experience/${event.slug}`}
                            className={`flex items-center justify-between gap-3 px-4 py-3 text-sm ${CARD}`}
                          >
                            <span className="truncate text-white/75">
                              {event.title}
                            </span>
                            <span className="flex shrink-0 items-center gap-3 text-xs text-white/45">
                              {formatIST(booking.occurrence_date, "MMM d")}
                              <StatusPill status={booking.status} />
                            </span>
                          </Link>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ) : savedEvents.length > 0 ? (
                <>
                  <p className="mb-4 text-sm text-white/55">
                    Chapters you&apos;re saving for later.
                  </p>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {savedEvents.map(({ saved: s, event }) => (
                      <Link
                        key={s.id}
                        href={`/experience/${event.slug}`}
                        className={`group flex flex-col overflow-hidden ${CARD}`}
                      >
                        <div className="relative aspect-[4/5] overflow-hidden">
                          <EventCover
                            src={event.cover_image_url}
                            alt={event.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                          <span className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 backdrop-blur">
                            <FiHeart className="h-3.5 w-3.5 fill-[#F472B6] text-[#F472B6]" />
                          </span>
                        </div>
                        <div className="p-3">
                          <p className="truncate text-[13px] font-semibold">
                            {event.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-white/50">
                            {categoryOf(event).label} · Saved{" "}
                            {formatIST(s.saved_at, "MMM d")}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <Empty
                  title="Nothing saved yet"
                  text="Tap the heart on any experience to keep it here for later."
                />
              )}
            </div>
          </>
        )}
      </div>

      <components.Home.Footer dark />

      {openBadge && (
        <BadgeSheet state={openBadge} onClose={() => setOpenBadge(null)} />
      )}

      {activeInboxEventId && userId && (
        <InboxSidebar
          eventId={activeInboxEventId}
          hostId={eventById.get(activeInboxEventId)?.host_id ?? ""}
          eventTitle={eventById.get(activeInboxEventId)?.title ?? "Event"}
          participantCount={
            eventById.get(activeInboxEventId)?.total_bookings ?? 0
          }
          userId={userId}
          isOpen={!!activeInboxEventId}
          onClose={() => setActiveInboxEventId(null)}
        />
      )}

      {activeReviewEventId && userId && (
        <ReviewModal
          eventId={activeReviewEventId}
          hostId={eventById.get(activeReviewEventId)?.host_id ?? ""}
          eventTitle={eventById.get(activeReviewEventId)?.title ?? "Event"}
          userId={userId}
          isOpen={!!activeReviewEventId}
          onClose={() => setActiveReviewEventId(null)}
          onSuccess={() => undefined}
        />
      )}

      {activeCancelBookingId && (
        <div className="animate-in fade-in msm-modal fixed inset-0 z-[260] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-300">
          <div className="animate-in zoom-in-95 w-full max-w-sm rounded-2xl border border-white/10 bg-[#131328] p-6 text-white shadow-2xl duration-300">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
                <FiAlertCircle className="text-red-400" size={24} />
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setActiveCancelBookingId(null)}
                className="text-white/50 transition hover:text-white"
              >
                <FiX size={20} />
              </button>
            </div>

            <h3 className="font-outfit mb-2 text-lg font-bold">
              Cancel Booking?
            </h3>
            <p className="mb-4 text-sm leading-relaxed text-white/60">
              Are you sure you want to cancel this booking? This action will
              notify the host and may be subject to cancellation policies.
            </p>

            {!cancelRefunds && (
              <p className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
                This experience&apos;s cancellation policy gives no refund if
                you cancel now. Your seat will be released and you won&apos;t
                get your money back.
              </p>
            )}

            {/* Refund destination picker — comment out this block to disable
                source refund for users (keeping wallet-only as default). */}
            {cancelRefunds && (
              <fieldset className="mb-6">
                <legend className="mb-2 text-xs font-semibold tracking-wide text-white/50 uppercase">
                  Refund destination
                </legend>
                <label className="mb-2 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-3 transition hover:bg-white/5">
                  <input
                    type="radio"
                    name="refund-destination"
                    value="wallet"
                    checked={refundDestination === "wallet"}
                    onChange={() => setRefundDestination("wallet")}
                    className="mt-0.5 h-4 w-4 accent-[#9B30FF]"
                    disabled={isCancelling}
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium">
                      Refund to wallet
                    </span>
                    <span className="block text-xs text-white/50">
                      Instant. Use for another booking.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-3 transition hover:bg-white/5">
                  <input
                    type="radio"
                    name="refund-destination"
                    value="source"
                    checked={refundDestination === "source"}
                    onChange={() => setRefundDestination("source")}
                    className="mt-0.5 h-4 w-4 accent-[#9B30FF]"
                    disabled={isCancelling}
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium">
                      Refund to original card/UPI
                    </span>
                    <span className="block text-xs text-white/50">
                      Takes 5–7 working days. Falls back to wallet if not
                      available.
                    </span>
                  </span>
                </label>
              </fieldset>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setActiveCancelBookingId(null)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 font-semibold text-white/80 transition hover:bg-white/5"
                disabled={isCancelling}
              >
                No, Keep it
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <FiXCircle className="h-4 w-4" /> Yes, Cancel
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
