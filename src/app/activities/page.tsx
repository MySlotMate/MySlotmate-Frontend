"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import {
  useBookingsByUser,
  useListHosts,
  useListPublicEvents,
  useCancelBooking,
  useSavedExperiences,
  useUserProfile,
} from "~/hooks/useApi";
import {
  type BookingDTO,
  type EventDTO,
  type PublicHostProfileDTO,
} from "~/lib/api";
import { downloadTicketPdf } from "~/lib/ticket";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { formatIST } from "~/lib/datetime";
import { getMoodDisplayLabel, normalizeMood } from "~/lib/moods";
import * as components from "~/components";
import {
  InboxSidebar,
  MyPassesSection,
  ReviewModal,
} from "~/components/activities";
import {
  FiAlertCircle,
  FiBookOpen,
  FiCalendar,
  FiMapPin,
  FiMessageCircle,
  FiStar,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import { LuQrCode } from "react-icons/lu";
import { toast } from "sonner";

// Sizes follow the Figma "journey-upcoming / -completed / -saved" frames.
const CARD = "rounded-2xl border border-white/[0.06] bg-[#131328]";
const GRADIENT_BTN =
  "bg-gradient-to-r from-[#7038F5] to-[#B724EA] text-white transition hover:brightness-110";
const FALLBACK_COVER = "/assets/home/hiking.webp";

type Tab = "upcoming" | "completed" | "saved";

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
        className="h-[200px] overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.cover_image_url ?? FALLBACK_COVER}
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
          <FiMapPin className="h-3.5 w-3.5 shrink-0" />
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

export default function ActivitiesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  // The navbar counts a Firebase session as logged in even before the app user
  // id is stored, so "logged out" has to mean neither exists.
  const [firebaseUser, firebaseLoading] = useAuthState(auth);
  const [tab, setTab] = useState<Tab>("upcoming");
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

  // Fetch user profile for ticket PDF generation
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

  // Fetch user's bookings
  const { data: bookings, isLoading: bookingsLoading } =
    useBookingsByUser(userId);

  // Fetch all public events to get event details
  const { data: allEvents } = useListPublicEvents();
  const { data: hosts } = useListHosts();
  const { data: saved } = useSavedExperiences(userId);

  const cancelBooking = useCancelBooking();

  // Merge bookings with event details
  const bookingsWithEvents: BookingWithEvent[] = (bookings ?? [])
    .map((booking) => {
      const event = allEvents?.find((e: EventDTO) => e.id === booking.event_id);
      return { booking, event: event! };
    })
    .filter(({ event }) => event); // Only show if event exists

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
        isFuture(booking),
    )
    .sort(
      (a, b) =>
        new Date(a.booking.occurrence_date).getTime() -
        new Date(b.booking.occurrence_date).getTime(),
    );
  const completed = bookingsWithEvents
    .filter(
      ({ booking }) => booking.status === "confirmed" && !isFuture(booking),
    )
    .sort(
      (a, b) =>
        new Date(b.booking.occurrence_date).getTime() -
        new Date(a.booking.occurrence_date).getTime(),
    );
  const cancelled = bookingsWithEvents.filter(
    ({ booking }) =>
      booking.status === "cancelled" || booking.status === "refunded",
  );

  // Passport stats, all derived from the completed bookings.
  const cities = new Set(
    completed
      .filter(({ event }) => !event.is_online && event.location)
      .map(({ event }) => event.location!.split(",").pop()!.trim()),
  ).size;
  const hostsMet = new Set(completed.map(({ event }) => event.host_id)).size;
  const hours =
    Math.round(
      completed.reduce(
        (sum, { event }) => sum + (event.duration_minutes ?? 0),
        0,
      ) / 6,
    ) / 10;
  const moodCounts = [
    ...completed
      .reduce((m, { event }) => {
        const mood = normalizeMood(event.mood);
        if (mood) m.set(mood, (m.get(mood) ?? 0) + 1);
        return m;
      }, new Map<string, number>())
      .entries(),
  ].sort((a, b) => b[1] - a[1]);

  const savedEvents = (saved ?? [])
    .map((s) => ({
      saved: s,
      event: allEvents?.find((e) => e.id === s.event_id),
    }))
    .filter((s): s is { saved: (typeof s)["saved"]; event: EventDTO } =>
      Boolean(s.event),
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
        refundDestination === "source"
          ? "Booking cancelled. Refund sent to your card (may take 5–7 working days)."
          : "Booking cancelled. Refund added to your wallet.",
      );
      setActiveCancelBookingId(null);
      setRefundDestination("wallet"); // reset for next use
    } catch (err) {
      console.error("Cancellation error:", err);
      toast.error("Failed to cancel booking. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  const loading = bookingsLoading && isHydrated;

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-clip bg-[#080914] text-white max-md:pb-28 md:pl-20 min-[90rem]:pl-[230px]">
      <components.Navbar dark />

      <div className="mx-auto w-full max-w-[1210px] px-6 pt-6 pb-16 font-[family-name:var(--font-inter)] md:px-10 md:pt-10">
        <h1 className="font-outfit text-[28px] leading-9 font-bold">Journey</h1>
        <p className="mt-0.5 text-sm text-white/60">
          Your experiences, memories and upcoming plans.
        </p>

        <div
          role="tablist"
          aria-label="Journey"
          className="mt-5 grid h-10 w-full max-w-[430px] grid-cols-3 rounded-xl border border-white/[0.06] bg-[#131328] p-1"
        >
          {(["upcoming", "completed", "saved"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-lg text-[13px] font-semibold capitalize transition ${
                tab === t
                  ? "bg-gradient-to-r from-[#7038F5] to-[#B724EA] text-white"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-6">
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
              text="Your bookings, memories and saved experiences show up here once you're signed in."
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
          ) : loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B57BFF] border-t-transparent" />
            </div>
          ) : tab === "upcoming" ? (
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
                <div className="grid gap-5 md:grid-cols-2">
                  {upcoming.map(({ booking, event }) => (
                    <UpcomingCard
                      key={booking.id}
                      booking={booking}
                      event={event}
                      host={hostById.get(event.host_id)}
                      downloading={downloadingTicketId === booking.id}
                      onTicket={() => void handleDownloadTicket(booking, event)}
                      onInbox={() => setActiveInboxEventId(event.id)}
                      onCancel={() => setActiveCancelBookingId(booking.id)}
                    />
                  ))}
                </div>
              ) : isHydrated ? (
                <Empty
                  title="Nothing planned yet"
                  text="Book an experience and it will show up here with your ticket."
                />
              ) : null}
            </>
          ) : tab === "completed" ? (
            <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
              <aside className="flex flex-col gap-6">
                <div className="rounded-2xl border border-[#9B30FF]/50 bg-[#131328] p-4">
                  <div className="flex items-center gap-2">
                    <FiBookOpen className="h-4 w-4 text-[#D8B4FE]" />
                    <h2 className="font-outfit text-[15px] font-semibold">
                      Experience Passport
                    </h2>
                    <span className="rounded bg-[#9B30FF]/20 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[#D8B4FE] uppercase">
                      Explorer
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    {[
                      [completed.length, "Experiences"],
                      [cities, "Cities Explored"],
                      [hours, "Hours Spent"],
                      [hostsMet, "Hosts Met"],
                    ].map(([value, label]) => (
                      <div
                        key={label}
                        className="rounded-xl bg-[#1B1C33] px-3 py-2.5"
                      >
                        <p className="font-outfit text-lg font-bold">{value}</p>
                        <p className="text-[11px] text-white/55">{label}</p>
                      </div>
                    ))}
                  </div>
                  {bookingUser?.created_at && (
                    <p className="mt-3 text-center text-[11px] text-white/45">
                      Member since{" "}
                      {formatIST(bookingUser.created_at, "MMMM yyyy")}
                    </p>
                  )}
                </div>

                {moodCounts.length > 0 && (
                  <div>
                    <h2 className="font-outfit mb-3 text-[15px] font-semibold">
                      Your Categories
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {moodCounts.map(([mood, count]) => (
                        <span
                          key={mood}
                          className={`px-3 py-2 text-xs text-white/75 ${CARD}`}
                        >
                          {getMoodDisplayLabel(mood)}{" "}
                          <span className="text-white/45">({count})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </aside>

              <div>
                <h2 className="font-outfit mb-3 text-[15px] font-semibold">
                  Your Memories
                </h2>
                {completed.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {completed.map(({ booking, event }) => (
                      <div
                        key={booking.id}
                        className={`flex flex-col overflow-hidden ${CARD}`}
                      >
                        <Link
                          href={`/experience/${event.slug}`}
                          className="h-[140px] overflow-hidden"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={event.cover_image_url ?? FALLBACK_COVER}
                            alt={event.title}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </Link>
                        <div className="flex flex-1 flex-col p-3">
                          <p className="line-clamp-2 text-[13px] leading-5 font-semibold">
                            {event.title}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-white/55">
                            {event.avg_rating ? (
                              <>
                                <FiStar className="h-3 w-3 fill-amber-400 text-amber-400" />
                                <span className="font-semibold text-amber-400">
                                  {event.avg_rating.toFixed(1)}
                                </span>
                                <span>·</span>
                              </>
                            ) : null}
                            {formatIST(booking.occurrence_date, "MMM d")}
                          </p>
                          <button
                            type="button"
                            onClick={() => setActiveReviewEventId(event.id)}
                            className="mt-auto pt-2 text-left text-xs font-semibold text-[#D8B4FE] hover:text-white"
                          >
                            Add review
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty
                    title="No memories yet"
                    text="Experiences you've attended will collect here."
                  />
                )}

                {cancelled.length > 0 && (
                  <div className="mt-8">
                    <h2 className="font-outfit mb-3 text-[15px] font-semibold text-white/70">
                      Cancelled
                    </h2>
                    <div className="flex flex-col gap-2">
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
                  </div>
                )}
              </div>
            </div>
          ) : savedEvents.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {savedEvents.map(({ saved: s, event }) => (
                <Link
                  key={s.id}
                  href={`/experience/${event.slug}`}
                  className={`group flex flex-col overflow-hidden ${CARD}`}
                >
                  <div className="h-[150px] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={event.cover_image_url ?? FALLBACK_COVER}
                      alt={event.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <p className="truncate text-[13px] font-semibold">
                      {event.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/50">
                      {event.mood
                        ? `${getMoodDisplayLabel(event.mood)} · `
                        : ""}
                      Saved {formatIST(s.saved_at, "MMM d")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="Nothing saved yet"
              text="Tap the heart on any experience to keep it here for later."
            />
          )}
        </div>
      </div>

      <components.Home.Footer dark />

      {/* Inbox Sidebar */}
      {activeInboxEventId && userId && (
        <InboxSidebar
          eventId={activeInboxEventId}
          hostId={
            bookingsWithEvents.find((b) => b.event.id === activeInboxEventId)
              ?.event.host_id ?? ""
          }
          eventTitle={
            bookingsWithEvents.find((b) => b.event.id === activeInboxEventId)
              ?.event.title ?? "Event"
          }
          participantCount={
            bookingsWithEvents.find((b) => b.event.id === activeInboxEventId)
              ?.event.total_bookings ?? 0
          }
          userId={userId}
          isOpen={!!activeInboxEventId}
          onClose={() => setActiveInboxEventId(null)}
        />
      )}

      {/* Review Modal */}
      {activeReviewEventId && userId && (
        <ReviewModal
          eventId={activeReviewEventId}
          hostId={
            bookingsWithEvents.find((b) => b.event.id === activeReviewEventId)
              ?.event.host_id ?? ""
          }
          eventTitle={
            bookingsWithEvents.find((b) => b.event.id === activeReviewEventId)
              ?.event.title ?? "Event"
          }
          userId={userId}
          isOpen={!!activeReviewEventId}
          onClose={() => setActiveReviewEventId(null)}
          onSuccess={() => {
            // Optional: show success message or refresh reviews
          }}
        />
      )}

      {/* Cancellation Modal */}
      {activeCancelBookingId && (
        <div className="animate-in fade-in fixed inset-0 z-[260] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-300">
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

            {/* Refund destination picker — comment out this block to disable
                source refund for users (keeping wallet-only as default). */}
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
