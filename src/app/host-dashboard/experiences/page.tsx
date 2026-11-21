"use client";

import {
  useEventsByHost,
  useMyHost,
  useResumeEvent,
  usePauseEvent,
  useEventOccurrencesForHost,
  useEventAttendees,
  useHostBoosts,
} from "~/hooks/useApi";
import { useIdToken } from "~/hooks/useIdToken";
import { boostHref } from "~/components/host-dashboard/boost/BoostButton";
import type { BoostStatus, EventDTO } from "~/lib/api";
import {
  BOOST_ENABLED,
  BOOST_STATUS_LABEL,
  boostBlockers,
  isOpenBoost,
} from "~/lib/boost";
import { cancelEvent, deleteEvent, type BookingDTO } from "~/lib/api";
import type { OccurrenceAvailability } from "~/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  type ComponentType,
} from "react";
import {
  FiSearch,
  FiStar,
  FiEdit2,
  FiTrash2,
  FiExternalLink,
  FiCalendar,
  FiTrendingUp,
  FiImage,
  FiMoreHorizontal,
  FiPause,
  FiPlay,
  FiShield,
  FiAlertTriangle,
  FiUserPlus,
  FiKey,
} from "react-icons/fi";
import { LuBookOpen, LuRotateCcw, LuFileSpreadsheet } from "react-icons/lu";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import HostOnSpotBookingModal from "~/components/host-dashboard/HostOnSpotBookingModal";
import HostBulkImportModal from "~/components/host-dashboard/HostBulkImportModal";
import ManageCodesModal from "~/components/host-dashboard/ManageCodesModal";
import { CANCELLATION_POLICIES } from "~/components/host-dashboard/EventFormKit";
import EventCover from "~/components/EventCover";

function formatNextDate(dateStr: string | null): string {
  if (!dateStr) return "Not set";
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const policyLabel = (p: string | null) =>
  CANCELLATION_POLICIES.find((c) => c.value === p)?.label ?? "No refund policy";

/* ------------------------------------------------------------------ */
/*  Card "⋯" menu                                                      */
/* ------------------------------------------------------------------ */
interface MenuItem {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onSelect: () => void;
  hidden?: boolean;
  tone?: "amber" | "red" | "purple";
}

function CardMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const tone = {
    amber: "text-amber-300 hover:bg-amber-500/10",
    red: "text-red-300 hover:bg-red-500/10",
    purple: "text-[#E9D5FF] hover:bg-[#B724EA]/10",
    none: "text-white/80 hover:bg-white/[0.06]",
  };

  return (
    <div ref={ref} className="relative -mt-1 -mr-1 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[#A5A8C3] transition hover:bg-white/10 hover:text-white"
      >
        <FiMoreHorizontal className="h-5 w-5" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#1A1C33] py-1 shadow-xl shadow-black/40"
        >
          {items
            .filter((i) => !i.hidden)
            .map(({ label, icon: Icon, onSelect, tone: t }) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onSelect();
                }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition ${tone[t ?? "none"]}`}
              >
                <Icon className="h-4 w-4 opacity-80" />
                {label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status Badge Component                                             */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }: { status: string }) {
  const config = {
    live: {
      bg: "bg-green-500",
      text: "text-white",
      dot: "bg-[#121426]",
      label: "LIVE",
    },
    draft: {
      bg: "bg-gray-600",
      text: "text-white",
      dot: "bg-[#121426]",
      label: "DRAFT",
    },
    paused: {
      bg: "bg-amber-500",
      text: "text-white",
      dot: "bg-[#121426]",
      label: "PAUSED",
    },
  }[status] ?? {
    bg: "bg-gray-500",
    text: "text-white",
    dot: "bg-[#121426]",
    label: status.toUpperCase(),
  };

  return (
    <span
      className={`inline-flex items-center gap-1 ${config.bg} ${config.text} rounded-full px-2 py-0.5 text-[10px] font-semibold`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Experience Card Component                                          */
/* ------------------------------------------------------------------ */
interface ExperienceCardProps {
  event: EventDTO;
  hostId: string;
  onResume: (eventId: string) => Promise<void>;
  onPause: (
    eventId: string,
    options?: { pausedFrom?: string; pausedDate?: string },
  ) => Promise<void>;
  isProcessing: boolean;
  /** Latest Marketing Boost status on this event, if any. */
  boostStatus?: BoostStatus;
}

function ExperienceCard({
  event,
  hostId: _hostId,
  onResume,
  onPause,
  isProcessing,
  boostStatus,
}: ExperienceCardProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [showOnSpot, setShowOnSpot] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const [pauseOption, setPauseOption] = useState<"all" | "from" | "date">(
    "all",
  );
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  // Shared by on-spot and bulk import: refresh the attendee list plus every
  // host-events view, so the booking count on the card updates immediately
  // (mirrors delete).
  const refreshAfterBooking = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["eventAttendees", event.id],
    });
    void queryClient.invalidateQueries({ queryKey: ["eventsByHost", _hostId] });
    void queryClient.invalidateQueries({
      queryKey: ["hostEventsFiltered", _hostId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["calendarEvents", _hostId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["todaySchedule", _hostId],
    });
  }, [queryClient, event.id, _hostId]);

  const isPaused = event.status === "paused";
  const isDraft = event.status === "draft";
  const isLive = event.status === "live";

  // A non-recurring event whose start time has passed is expired — no on-spot
  // booking. Recurring events keep generating future occurrences, so the modal's
  // availability check (which only lists upcoming slots) guards those instead.
  //
  // `event.time` holds the FIRST date and is never rolled forward for a
  // custom-dates event, so it says nothing about whether the event is over: a
  // three-date trip would read as expired the moment its first date passed,
  // while the other two were still bookable. Any future custom date keeps it
  // live.
  const hasFutureCustomDate = (event.custom_dates ?? []).some(
    (d: string) => new Date(d).getTime() > Date.now(),
  );
  const isExpired =
    !event.is_recurring &&
    !hasFutureCustomDate &&
    new Date(event.time).getTime() <= Date.now();

  // Active (pending/confirmed) bookings on this event — only fetched while
  // the Delete modal is open, to power the "you're about to refund N
  // attendees" warning. Backend's CancelEvent skips past confirmed bookings
  // (those attendees already attended), so the count below matches what the
  // backend will actually refund.
  const { data: deleteAttendees } = useEventAttendees(
    showDeleteConfirm ? event.id : null,
  );
  const deleteAffected = useMemo(() => {
    const now = new Date();
    const rows = (deleteAttendees ?? []).filter((b: BookingDTO) => {
      if (b.status !== "confirmed" && b.status !== "pending") return false;
      return new Date(b.occurrence_date) >= now;
    });
    const totalCents = rows.reduce(
      (sum: number, b: BookingDTO) => sum + (b.amount_cents ?? 0),
      0,
    );
    return { count: rows.length, totalCents };
  }, [deleteAttendees]);
  const fmtRupees = (cents: number) =>
    `₹${(cents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  // Pause shape: full series pause vs partial (from-session or specific-dates)
  const hasPausedFrom = !!event.paused_from;
  const hasPausedDates = (event.paused_dates?.length ?? 0) > 0;
  const isPartialPause = isPaused && (hasPausedFrom || hasPausedDates);
  const isFullPause = isPaused && !isPartialPause;

  // For a partial pause we still have bookable sessions ahead, so show the next
  // available date instead of just "Paused".
  const nextDate = isFullPause
    ? null
    : (event.next_available_date ?? event.time);

  const pauseDetail = isFullPause
    ? "Paused"
    : hasPausedFrom
      ? `Paused from ${formatNextDate(event.paused_from)}`
      : hasPausedDates && event.paused_dates
        ? `${event.paused_dates.length} session${event.paused_dates.length > 1 ? "s" : ""} paused`
        : null;

  const editHref = `/host-dashboard/experiences/${event.id}`;

  // Boost: paid events only. When it can't be boosted yet, the button stays
  // (so hosts always know where Boost lives) and says why.
  const isFree = event.is_free || !event.price_cents;
  const blockers = boostBlockers(event);
  const boostReady =
    blockers.length === 0 || (!!boostStatus && isOpenBoost(boostStatus));
  const boostHint = isDraft
    ? "publish first"
    : isPaused
      ? "resume the event first"
      : (blockers[0]?.replace(/\.$/, "").toLowerCase() ?? "");

  const handlePauseConfirm = async () => {
    setShowPauseConfirm(false);
    const options: { pausedFrom?: string; pausedDate?: string } = {};
    if (pauseOption === "from") options.pausedFrom = selectedDate;
    if (pauseOption === "date") options.pausedDate = selectedDate;
    await onPause(event.id, options);
  };

  return (
    <article className="group/card flex gap-3 rounded-2xl border border-white/10 bg-[#121426] p-3 transition hover:border-white/20">
      {/* 4:5 cover thumbnail: opens the editor. */}
      <Link
        href={editHref}
        aria-label={`Edit ${event.title}`}
        className="relative aspect-[4/5] w-24 shrink-0 self-start overflow-hidden rounded-xl sm:w-[104px]"
      >
        <EventCover
          src={event.cover_image_url}
          alt={event.title}
          seed={event.id}
          mood={event.mood}
          blurFill
          className="h-full w-full"
          imgClassName="transition duration-500 group-hover/card:scale-[1.04]"
        >
          <FiImage className="h-5 w-5 text-white/70" aria-hidden />
          <span className="px-2 text-[10px] leading-tight font-semibold text-white/85">
            Add a cover
          </span>
        </EventCover>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <StatusBadge status={event.status} />
            {boostStatus && isOpenBoost(boostStatus) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#7038F5] to-[#B724EA] px-2 py-0.5 text-[10px] font-semibold text-white">
                <FiTrendingUp className="h-3 w-3" aria-hidden />
                {BOOST_STATUS_LABEL[boostStatus]}
              </span>
            )}
          </div>
          <CardMenu
            items={[
              {
                label: "Boost this event",
                icon: FiTrendingUp,
                onSelect: () => router.push(boostHref(event.id)),
                hidden: !BOOST_ENABLED || isFree,
                tone: "purple",
              },
              {
                label: "View public page",
                icon: FiExternalLink,
                onSelect: () =>
                  window.open(`/experience/${event.slug}`, "_blank"),
                hidden: isDraft || !event.slug,
              },
              {
                label: "On-spot booking",
                icon: FiUserPlus,
                onSelect: () => setShowOnSpot(true),
                hidden: !(isLive && !isExpired),
              },
              {
                label: "Bulk add (Excel)",
                icon: LuFileSpreadsheet,
                onSelect: () => setShowBulkImport(true),
                hidden: !(isLive && !isExpired),
              },
              {
                label: "Codes & passkey",
                icon: FiKey,
                onSelect: () => setShowCodes(true),
              },
              {
                label: "Resume all sessions",
                icon: FiPlay,
                onSelect: () => void onResume(event.id),
                hidden: !isPartialPause,
              },
              {
                label: "Pause",
                icon: FiPause,
                onSelect: () => setShowPauseConfirm(true),
                hidden: !isLive && !isPartialPause,
                tone: "amber",
              },
              {
                label: "Delete",
                icon: FiTrash2,
                onSelect: () => setShowDeleteConfirm(true),
                tone: "red",
              },
            ]}
          />
        </div>

        <Link
          href={editHref}
          className="mt-1.5 line-clamp-2 text-[15px] leading-snug font-semibold text-white transition hover:text-[#E9D5FF]"
        >
          {event.title}
        </Link>

        {/* One line of facts */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#A5A8C3]">
          <span
            className={`inline-flex items-center gap-1 ${isFullPause ? "font-medium text-amber-300" : ""}`}
          >
            <FiCalendar className="h-3.5 w-3.5 text-[#777B98]" aria-hidden />
            {isFullPause
              ? "Paused"
              : isExpired
                ? "Ended"
                : formatNextDate(nextDate)}
          </span>
          <span className="inline-flex items-center gap-1">
            <LuBookOpen className="h-3.5 w-3.5 text-[#777B98]" aria-hidden />
            {event.total_bookings} booked
          </span>
          <span className="inline-flex items-center gap-1">
            <FiStar
              className={`h-3.5 w-3.5 ${event.avg_rating !== null ? "text-amber-400" : "text-[#777B98]"}`}
              aria-hidden
            />
            {event.avg_rating !== null
              ? `${event.avg_rating.toFixed(1)} (${event.total_reviews})`
              : "New"}
          </span>
          <span className="inline-flex items-center gap-1">
            <FiShield className="h-3.5 w-3.5 text-[#777B98]" aria-hidden />
            {policyLabel(event.cancellation_policy)}
          </span>
          {isPaused && pauseDetail && !isFullPause && (
            <span className="font-medium text-amber-300">{pauseDetail}</span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
          <Link
            href={editHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/[0.06]"
          >
            <FiEdit2 className="h-3.5 w-3.5" aria-hidden />
            Edit
          </Link>
          {isDraft ? (
            <Link
              href={editHref}
              className="inline-flex items-center rounded-full bg-[#A020F0] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#8A1AD0]"
            >
              Publish
            </Link>
          ) : isFullPause ? (
            <button
              type="button"
              onClick={() => void onResume(event.id)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1.5 text-xs font-semibold text-green-300 transition hover:bg-green-500/25 disabled:opacity-50"
            >
              {isProcessing ? (
                <LuRotateCcw className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <FiPlay className="h-3.5 w-3.5" aria-hidden />
              )}
              Resume
            </button>
          ) : (
            <Link
              href={`${editHref}?tab=bookings`}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/[0.06]"
            >
              <LuBookOpen className="h-3.5 w-3.5" aria-hidden />
              Bookings
            </Link>
          )}
          {BOOST_ENABLED && !isFree && (
            <Link
              href={boostHref(event.id)}
              title={
                boostReady ? "Promote this event with paid ads" : boostHint
              }
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                boostReady
                  ? "bg-gradient-to-r from-[#7038F5] to-[#B724EA] text-white hover:opacity-90"
                  : "border border-[#B724EA]/40 text-[#D8B4FE] hover:bg-[#B724EA]/10"
              }`}
            >
              <FiTrendingUp className="h-3.5 w-3.5" aria-hidden />
              {boostStatus && isOpenBoost(boostStatus)
                ? BOOST_STATUS_LABEL[boostStatus]
                : "Boost"}
            </Link>
          )}
        </div>
        {BOOST_ENABLED && !isFree && !boostReady && boostHint && (
          <p className="mt-1.5 text-[11px] text-[#777B98]">
            Boost: {boostHint}
          </p>
        )}
      </div>

      {/* Quick codes & passkey manager */}
      <ManageCodesModal
        eventId={event.id}
        eventTitle={event.title}
        hostId={_hostId}
        isOpen={showCodes}
        onClose={() => setShowCodes(false)}
      />

      {/* On-spot booking modal */}
      {showOnSpot && (
        <HostOnSpotBookingModal
          eventId={event.id}
          eventTitle={event.title}
          hostId={_hostId}
          isOpen={showOnSpot}
          onClose={() => setShowOnSpot(false)}
          onBooked={refreshAfterBooking}
        />
      )}

      {/* Bulk import modal — same post-booking refresh as on-spot. */}
      {showBulkImport && (
        <HostBulkImportModal
          eventId={event.id}
          eventTitle={event.title}
          isOpen={showBulkImport}
          onClose={() => setShowBulkImport(false)}
          onImported={refreshAfterBooking}
        />
      )}

      {/* Pause Confirmation Modal */}
      {showPauseConfirm && (
        <PauseModalContent
          event={event}
          hostId={_hostId}
          onCancel={() => setShowPauseConfirm(false)}
          onConfirm={handlePauseConfirm}
          option={pauseOption}
          setOption={setPauseOption}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="msm-modal fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#121426] p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
              <FiTrash2 className="text-red-300" size={24} />
            </div>
            <h2 className="mb-2 text-xl font-bold text-white">
              Delete {event.title}?
            </h2>
            <p className="mb-4 text-[#A5A8C3]">
              This will cancel and refund every upcoming attendee (money goes
              back to their wallet) and then remove the experience from your
              account. Past attendees (if any) keep their bookings — they
              already attended, so we don&apos;t refund them.
            </p>

            {/* Refund warning — shown only when there's actually money on the
                line. Powered by useEventAttendees, scoped to upcoming bookings
                so the number matches what the backend's CancelEvent will
                refund (past confirmed bookings are skipped). */}
            {deleteAffected.count > 0 ? (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                <FiAlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-red-300"
                  aria-hidden
                />
                <div className="text-xs leading-relaxed">
                  <p className="font-semibold text-red-300">
                    {deleteAffected.count}{" "}
                    {deleteAffected.count === 1 ? "attendee" : "attendees"} will
                    be refunded
                  </p>
                  <p className="mt-0.5 text-red-300">
                    {fmtRupees(deleteAffected.totalCents)} will be credited back
                    to{" "}
                    {deleteAffected.count === 1
                      ? "their wallet"
                      : "their wallets"}{" "}
                    the moment you confirm. This cannot be undone.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-[#A5A8C3]">
                No upcoming bookings — safe to delete.
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-white/[0.06] py-3 font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!_hostId) return;
                  setIsDeleting(true);
                  try {
                    // Two-step: cancel (refunds every upcoming booking via the
                    // F4 path on the backend, marks event status=cancelled),
                    // then delete (now allowed because no active bookings
                    // remain). Calling cancel on an event with no active
                    // bookings is a no-op refund-wise — it just marks status.
                    await cancelEvent(event.id, _hostId);
                    await deleteEvent(event.id, _hostId);

                    toast.success(
                      "Experience cancelled and removed. Refunds sent to attendees' wallets.",
                    );
                    // Invalidate every cache keyed off this host's events so
                    // the list, calendar, filtered views, and "today" widget
                    // all drop the deleted row immediately.
                    await Promise.all([
                      queryClient.invalidateQueries({
                        queryKey: ["eventsByHost", _hostId],
                      }),
                      queryClient.invalidateQueries({
                        queryKey: ["hostEventsFiltered", _hostId],
                      }),
                      queryClient.invalidateQueries({
                        queryKey: ["calendarEvents", _hostId],
                      }),
                      queryClient.invalidateQueries({
                        queryKey: ["todaySchedule", _hostId],
                      }),
                    ]);
                    setShowDeleteConfirm(false);
                  } catch (err) {
                    console.error("Delete failed:", err);
                    const msg =
                      err instanceof Error
                        ? err.message
                        : "Failed to delete event";
                    toast.error(msg);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-red-600 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting
                  ? "Cancelling…"
                  : deleteAffected.count > 0
                    ? `Delete & refund ${deleteAffected.count}`
                    : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Create New Card Component                                          */
/* ------------------------------------------------------------------ */
function CreateNewCard() {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push("/host-dashboard/experiences/new")}
      className="group flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-[#121426] p-4 transition hover:border-[#A020F0] hover:bg-white/[0.04]"
    >
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] group-hover:bg-[#A020F0]/10">
        <span className="text-2xl text-[#777B98] group-hover:text-[#D8B4FE]">
          +
        </span>
      </div>
      <h3 className="text-base font-semibold text-white">
        Create New Experience
      </h3>
      <p className="mt-1 px-4 text-center text-xs text-[#777B98]">
        Ready to host something new? Get started with a new listing.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */
export default function ExperiencesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [tab, setTab] = useState<"all" | "live" | "draft" | "paused">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    setUserId(localStorage.getItem("msm_user_id"));
    setIsHydrated(true);
  }, []);

  const { data: host, isLoading: hostLoading } = useMyHost(userId);
  const {
    data: events,
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = useEventsByHost(host?.id ?? null);
  const resumeEvent = useResumeEvent();
  const pauseEvent = usePauseEvent();
  const idToken = useIdToken();
  const { data: boosts } = useHostBoosts(idToken);
  // Latest Boost per event (newest request wins).
  const boostByEvent = useMemo(() => {
    const m = new Map<string, BoostStatus>();
    [...(boosts ?? [])]
      .sort((a, b) => a.requested_at.localeCompare(b.requested_at))
      .forEach((b) => m.set(b.event_id, b.status));
    return m;
  }, [boosts]);

  useEffect(() => {
    if (isHydrated && !userId && !hostLoading) {
      router.push("/");
    }
  }, [userId, hostLoading, router, isHydrated]);

  // Tab counts
  const counts = useMemo(() => {
    const all = events?.length ?? 0;
    const live = events?.filter((e) => e.status === "live").length ?? 0;
    const draft = events?.filter((e) => e.status === "draft").length ?? 0;
    const paused = events?.filter((e) => e.status === "paused").length ?? 0;
    return { all, live, draft, paused };
  }, [events]);

  // Filtered, searched, and sorted events
  const filteredEvents = useMemo(() => {
    let filtered = events ?? [];
    if (tab !== "all") {
      filtered = filtered.filter((e) => e.status === tab);
    }
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(s) ||
          (e.hook_line?.toLowerCase().includes(s) ?? false),
      );
    }
    filtered = filtered.slice().sort((a, b) => {
      if (sort === "newest") {
        return (
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      } else {
        return (
          new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
        );
      }
    });
    return filtered;
  }, [events, tab, search, sort]);

  const handleResume = async (eventId: string) => {
    if (!host?.id) return;
    setProcessingId(eventId);
    try {
      await resumeEvent.mutateAsync({ eventId, hostId: host.id });
      toast.success("Experience resumed successfully!");
      await refetchEvents();
    } catch (error) {
      console.error("Failed to resume event:", error);
      toast.error("Failed to resume experience");
    } finally {
      setProcessingId(null);
    }
  };

  const handlePause = async (
    eventId: string,
    options?: { pausedFrom?: string; pausedDate?: string },
  ) => {
    if (!host?.id) return;
    setProcessingId(eventId);
    try {
      await pauseEvent.mutateAsync({
        eventId,
        hostId: host.id,
        pausedFrom: options?.pausedFrom,
        pausedDate: options?.pausedDate,
      });
      toast.success("Experience paused successfully!");
      await refetchEvents();
    } catch (error) {
      console.error("Failed to pause event:", error);
      toast.error("Failed to pause experience");
    } finally {
      setProcessingId(null);
    }
  };

  if (hostLoading || eventsLoading) {
    return (
      <div className="msm-dark-form min-h-screen bg-[#080914] pb-10 text-white">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A020F0] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!host) {
    return (
      <div className="msm-dark-form min-h-screen bg-[#080914] pb-10 text-white">
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-[#A5A8C3]">Host profile not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="msm-dark-form min-h-screen bg-[#080914] pb-10 text-white">
      <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 md:py-10 lg:px-10">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-outfit text-[26px] leading-tight font-semibold tracking-[-0.01em] text-white sm:text-[32px]">
              My Experiences
            </h1>
            <p className="mt-1 text-sm text-[#A5A8C3]">
              Manage your listings, check availability, and view performance
              insights.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {BOOST_ENABLED && (
              <Link
                href="/host-dashboard/promote"
                className="flex items-center gap-2 rounded-lg border border-[#B724EA]/40 px-4 py-2.5 text-sm font-semibold text-[#E9D5FF] transition hover:bg-[#B724EA]/10"
              >
                <FiTrendingUp className="h-4 w-4" aria-hidden />
                Boost an event
              </Link>
            )}
            <button
              onClick={() => router.push("/host-dashboard/experiences/new")}
              className="flex items-center gap-2 rounded-lg bg-[#A020F0] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8A1AD0]"
            >
              <span>+</span>
              Create New Experience
            </button>
          </div>
        </div>

        {/* Tabs and Filters */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Tabs */}
          <div className="-mx-4 flex items-center gap-1 overflow-x-auto border-b border-white/10 px-4 pb-0 sm:mx-0 sm:px-0">
            {[
              { key: "all" as const, label: "All Listings", count: counts.all },
              { key: "live" as const, label: "Live", count: counts.live },
              { key: "draft" as const, label: "Drafts", count: counts.draft },
              { key: "paused" as const, label: "Paused", count: counts.paused },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`relative shrink-0 px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
                  tab === key
                    ? "text-white"
                    : "text-[#A5A8C3] hover:text-white/80"
                }`}
              >
                {label}
                <span
                  className={`ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    tab === key
                      ? "bg-[#A020F0] text-white"
                      : "bg-white/[0.06] text-[#A5A8C3]"
                  }`}
                >
                  {count}
                </span>
                {tab === key && (
                  <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-[#A020F0]" />
                )}
              </button>
            ))}
          </div>

          {/* Search and Sort */}
          <div className="flex items-center gap-3">
            <div className="relative min-w-0 flex-1 lg:flex-none">
              <FiSearch className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#777B98]" />
              <input
                type="text"
                placeholder="Search by title or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-white/10 bg-[#121426] py-2 pr-4 pl-10 text-sm text-white placeholder-[#777B98] focus:border-[#A020F0] focus:ring-1 focus:ring-[#A020F0] focus:outline-none sm:w-64"
              />
            </div>
            <button
              onClick={() => setSort(sort === "newest" ? "oldest" : "newest")}
              className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-[#121426] px-4 py-2 text-sm font-medium whitespace-nowrap text-white/80 transition hover:bg-white/[0.04]"
            >
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                className="text-[#777B98]"
              >
                <path
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  d="M3 6h18M3 12h12M3 18h6"
                />
              </svg>
              Sort by:{" "}
              <span className="font-semibold">
                {sort === "newest" ? "Newest" : "Oldest"}
              </span>
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredEvents.length > 0 ? (
            <>
              {filteredEvents.map((event) => (
                <ExperienceCard
                  key={event.id}
                  event={event}
                  hostId={host.id}
                  onResume={handleResume}
                  onPause={handlePause}
                  isProcessing={processingId === event.id}
                  boostStatus={boostByEvent.get(event.id)}
                />
              ))}
              <CreateNewCard />
            </>
          ) : (
            <>
              <div className="col-span-full flex flex-col items-center justify-center py-16">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.06]">
                  <LuBookOpen className="h-8 w-8 text-[#777B98]" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  No experiences found
                </h3>
                <p className="mt-1 text-sm text-[#A5A8C3]">
                  {search
                    ? "Try adjusting your search terms"
                    : "Create your first experience to get started"}
                </p>
                <button
                  onClick={() => router.push("/host-dashboard/experiences/new")}
                  className="mt-4 rounded-lg bg-[#A020F0] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8A1AD0]"
                >
                  Create New Experience
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pause Modal Content Component                                      */
/* ------------------------------------------------------------------ */
function PauseModalContent({
  event,
  hostId,
  onCancel,
  onConfirm,
  option,
  setOption,
  selectedDate,
  setSelectedDate,
}: {
  event: { id: string; title: string; is_recurring: boolean };
  hostId: string;
  onCancel: () => void;
  onConfirm: () => void;
  option: "all" | "from" | "date";
  setOption: (o: "all" | "from" | "date") => void;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
}) {
  const { data: availability, isLoading: availLoading } =
    useEventOccurrencesForHost(event.id, hostId);

  // Active bookings on this event (the attendees endpoint already filters to
  // pending+confirmed on the backend). We use this to warn the host how many
  // people will be refunded the moment they click "Pause Now".
  const { data: attendees } = useEventAttendees(event.id);

  // Compute who actually gets refunded given the host's current selection.
  // Pause semantics match backend eventService.PauseEvent:
  //   - "all" (full pause)        → every UPCOMING confirmed/pending booking
  //   - "from <date>"             → bookings on or after that date
  //   - "date <date>"             → bookings on exactly that date
  const affected = useMemo(() => {
    const now = new Date();
    const target = selectedDate ? new Date(selectedDate) : null;
    const rows = (attendees ?? []).filter((b: BookingDTO) => {
      if (b.status !== "confirmed" && b.status !== "pending") return false;
      const occ = new Date(b.occurrence_date);
      if (option === "all") return occ >= now;
      if (option === "from") return target ? occ >= target : false;
      if (option === "date") {
        if (!target) return false;
        // same-day match (compare YYYY-MM-DD only)
        return (
          occ.toISOString().slice(0, 10) === target.toISOString().slice(0, 10)
        );
      }
      return false;
    });
    const totalCents = rows.reduce(
      (sum: number, b: BookingDTO) => sum + (b.amount_cents ?? 0),
      0,
    );
    return { count: rows.length, totalCents };
  }, [attendees, option, selectedDate]);

  const fmtCurrency = (cents: number) =>
    `₹${(cents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  return (
    <div className="msm-modal fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#121426] p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
          <FiPause className="text-amber-300" size={24} />
        </div>
        <h2 className="mb-2 text-xl font-bold text-white">
          Pause {event.title}?
        </h2>
        <p className="mb-6 text-sm text-[#A5A8C3]">
          Select how you would like to pause this experience.
        </p>

        <div className="mb-6 space-y-3">
          {/* Pause All */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-3 transition hover:bg-white/[0.04]">
            <input
              type="radio"
              name="pause-type"
              checked={option === "all"}
              onChange={() => setOption("all")}
              className="mt-1 h-4 w-4 text-[#D8B4FE]"
            />
            <div>
              <p className="text-sm font-semibold text-white">Pause entirely</p>
              <p className="text-xs text-[#777B98]">
                Hide the entire experience series.
              </p>
            </div>
          </label>

          {/* Pause From Session */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-3 transition hover:bg-white/[0.04]">
            <input
              type="radio"
              name="pause-type"
              checked={option === "from"}
              onChange={() => setOption("from")}
              className="mt-1 h-4 w-4 text-[#D8B4FE]"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">
                Pause from a specific session onwards
              </p>
              <p className="text-xs text-[#777B98]">
                Keep current sessions, but pause this session and all after it.
              </p>
              {option === "from" && (
                <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-white/10">
                  {availLoading ? (
                    <div className="p-3 text-center text-xs text-[#777B98]">
                      Loading sessions...
                    </div>
                  ) : (
                    availability?.map((a: OccurrenceAvailability) => (
                      <div
                        key={a.date}
                        onClick={() => !a.is_paused && setSelectedDate(a.date)}
                        className={`p-2 text-xs transition ${
                          a.is_paused
                            ? "cursor-not-allowed text-[#777B98] line-through"
                            : selectedDate === a.date
                              ? "cursor-pointer bg-[#A020F0]/10 text-[#D8B4FE]"
                              : "cursor-pointer hover:bg-white/[0.04]"
                        }`}
                      >
                        {new Date(a.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {a.is_paused && (
                          <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                            paused
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </label>

          {/* Pause Specific Date */}
          {event.is_recurring && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-3 transition hover:bg-white/[0.04]">
              <input
                type="radio"
                name="pause-type"
                checked={option === "date"}
                onChange={() => setOption("date")}
                className="mt-1 h-4 w-4 text-[#D8B4FE]"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">
                  Pause specific session
                </p>
                <p className="text-xs text-[#777B98]">
                  Skip just one occurrence of this series.
                </p>
                {option === "date" && (
                  <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-white/10">
                    {availLoading ? (
                      <div className="p-3 text-center text-xs text-[#777B98]">
                        Loading sessions...
                      </div>
                    ) : (
                      availability?.map((a: OccurrenceAvailability) => (
                        <div
                          key={a.date}
                          onClick={() =>
                            !a.is_paused && setSelectedDate(a.date)
                          }
                          className={`p-2 text-xs transition ${
                            a.is_paused
                              ? "cursor-not-allowed text-[#777B98] line-through"
                              : selectedDate === a.date
                                ? "cursor-pointer bg-[#A020F0]/10 text-[#D8B4FE]"
                                : "cursor-pointer hover:bg-white/[0.04]"
                          }`}
                        >
                          {new Date(a.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {a.is_paused && (
                            <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                              paused
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </label>
          )}
        </div>

        {/* Refund warning — count + total ₹ of bookings that will be cancelled
            and refunded the moment "Pause Now" is clicked. Visible whenever an
            option resolves to ≥1 affected booking. Helps the host avoid an
            accidental mass refund. */}
        {affected.count > 0 ? (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <FiAlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
              aria-hidden
            />
            <div className="text-xs leading-relaxed">
              <p className="font-semibold text-amber-300">
                {affected.count}{" "}
                {affected.count === 1 ? "attendee" : "attendees"} will be
                refunded
              </p>
              <p className="mt-0.5 text-amber-300">
                {fmtCurrency(affected.totalCents)} will be credited back to{" "}
                their {affected.count === 1 ? "wallet" : "wallets"} — refunds
                happen the moment you confirm. Past attendees (if any) are not
                affected.
              </p>
            </div>
          </div>
        ) : (
          (option === "all" ||
            ((option === "from" || option === "date") && selectedDate)) && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-[#A5A8C3]">
              No upcoming bookings will be affected — safe to pause.
            </div>
          )
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg bg-white/[0.06] py-3 font-semibold text-white transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={(option === "from" || option === "date") && !selectedDate}
            className="flex-1 rounded-lg bg-amber-600 py-3 font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            {affected.count > 0
              ? `Pause & refund ${affected.count}`
              : "Pause Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
