"use client";

import {
  useEventsByHost,
  useMyHost,
  useResumeEvent,
  usePauseEvent,
  useEventOccurrencesForHost,
  useEventAttendees,
} from "~/hooks/useApi";
import type { BookingDTO } from "~/lib/api";
import type { OccurrenceAvailability } from "~/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { HostNavbar } from "~/components/host-dashboard";
import Breadcrumb from "~/components/Breadcrumb";
import {
  FiSearch,
  FiStar,
  FiCalendar,
  FiEdit2,
  FiTrash2,
  FiEye,
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

/* ------------------------------------------------------------------ */
/*  Helper: relative time formatting                                   */
/* ------------------------------------------------------------------ */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}H AGO`;
  if (diffDays === 1) return "1D AGO";
  if (diffDays < 7) return `${diffDays}D AGO`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}W AGO`;
  return date
    .toLocaleDateString("en-US", { month: "short", year: "numeric" })
    .toUpperCase();
}

function formatNextDate(dateStr: string | null): string {
  if (!dateStr) return "Not Scheduled";
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ------------------------------------------------------------------ */
/*  Status Badge Component                                             */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }: { status: string }) {
  const config = {
    live: {
      bg: "bg-green-500",
      text: "text-white",
      dot: "bg-white",
      label: "LIVE",
    },
    draft: {
      bg: "bg-gray-600",
      text: "text-white",
      dot: "bg-white",
      label: "DRAFT",
    },
    paused: {
      bg: "bg-amber-500",
      text: "text-white",
      dot: "bg-white",
      label: "PAUSED",
    },
  }[status] ?? {
    bg: "bg-gray-500",
    text: "text-white",
    dot: "bg-white",
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
  event: {
    id: string;
    title: string;
    hook_line: string | null;
    cover_image_url: string | null;
    status: string;
    time: string;
    next_available_date: string | null;
    avg_rating: number | null;
    total_bookings: number;
    total_reviews: number;
    created_at: string;
    updated_at: string;
    paused_at: string | null;
    paused_from: string | null;
    paused_dates: string[] | null;
    cancellation_policy: string | null;
    is_recurring: boolean;
  };
  hostId: string;
  onResume: (eventId: string) => Promise<void>;
  onPause: (
    eventId: string,
    options?: { pausedFrom?: string; pausedDate?: string },
  ) => Promise<void>;
  isProcessing: boolean;
}

function ExperienceCard({
  event,
  hostId: _hostId,
  onResume,
  onPause,
  isProcessing,
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
  const isExpired =
    !event.is_recurring && new Date(event.time).getTime() <= Date.now();

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

  const footerText = isPaused
    ? `PAUSED ${formatRelativeTime(event.paused_at ?? event.updated_at)}`
    : isDraft
      ? `CREATED ${formatRelativeTime(event.created_at)}`
      : `LAST EDITED ${formatRelativeTime(event.updated_at)}`;

  const handleEdit = () => {
    router.push(`/host-dashboard/experiences/${event.id}`);
  };

  const handleViewBookings = () => {
    router.push(`/host-dashboard/experiences/${event.id}?tab=bookings`);
  };

  const togglePause = async () => {
    if (isPaused) {
      await onResume(event.id);
    } else {
      setShowPauseConfirm(true);
    }
  };

  const handlePauseConfirm = async () => {
    setShowPauseConfirm(false);
    const options: { pausedFrom?: string; pausedDate?: string } = {};
    if (pauseOption === "from") options.pausedFrom = selectedDate;
    if (pauseOption === "date") options.pausedDate = selectedDate;
    await onPause(event.id, options);
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Image with status badge */}
      <div className="relative h-44 bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.cover_image_url ?? "/assets/home/hiking.webp"}
          alt={event.title}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <div className="absolute top-3 left-3">
          <StatusBadge status={event.status} />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title row */}
        <h3 className="line-clamp-1 text-base font-semibold text-gray-900">
          {event.title}
        </h3>

        {/* Info rows */}
        <div className="mt-3 space-y-2">
          {/* Next date */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <FiCalendar className="h-3.5 w-3.5" />
            <span>Next:</span>
            <span
              className={
                isFullPause ? "font-medium text-amber-600" : "text-gray-700"
              }
            >
              {isFullPause ? "Paused" : formatNextDate(nextDate)}
            </span>
            {isLive && event.avg_rating !== null && (
              <>
                <span className="ml-auto flex items-center gap-1 text-gray-700">
                  <FiStar className="h-3.5 w-3.5 text-amber-400" />
                  {event.avg_rating.toFixed(1)}
                </span>
                <span className="text-[#0094CA]">({event.total_reviews})</span>
              </>
            )}
            {(isDraft || (isLive && event.avg_rating === null)) && (
              <span className="ml-auto text-gray-400">New</span>
            )}
          </div>

          {/* Pause detail (partial pauses keep "Next" populated and show this) */}
          {isPaused && pauseDetail && !isFullPause && (
            <div className="flex items-center gap-2 text-xs">
              <FiPause className="h-3.5 w-3.5 text-amber-600" />
              <span className="font-medium text-amber-600">{pauseDetail}</span>
            </div>
          )}

          {/* Bookings */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <LuBookOpen className="h-3.5 w-3.5" />
            <span className="text-gray-700">{event.total_bookings}</span>
            <span>Bookings total</span>
          </div>

          {/* Cancellation Policy */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <FiShield className="h-3.5 w-3.5" />
            <span className="font-medium text-gray-700 capitalize">
              {event.cancellation_policy ?? "Not set"}
            </span>
            <span>Policy</span>
          </div>
        </div>

        {/* Action buttons and footer */}
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="mb-2 flex items-center gap-2">
            {/* Edit button */}
            <div className="group relative">
              <button
                onClick={handleEdit}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-[#0094CA]"
                title="Edit"
              >
                <FiEdit2 className="h-4 w-4" />
              </button>
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition group-hover:opacity-100">
                Edit
              </span>
            </div>

            {/* View Bookings button */}
            {!isDraft && (
              <div className="group relative">
                <button
                  onClick={handleViewBookings}
                  className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-[#0094CA]"
                  title="View bookings"
                >
                  <FiEye className="h-4 w-4" />
                </button>
                <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition group-hover:opacity-100">
                  View Bookings
                </span>
              </div>
            )}

            {/* On-spot booking button — only for LIVE, non-expired events,
                where taking a walk-in guest makes sense. */}
            {isLive && !isExpired && (
              <div className="group relative">
                <button
                  onClick={() => setShowOnSpot(true)}
                  className="rounded-lg p-2 text-gray-400 transition hover:bg-[#e6f8ff] hover:text-[#0094CA]"
                  title="On-spot booking"
                >
                  <FiUserPlus className="h-4 w-4" />
                </button>
                <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition group-hover:opacity-100">
                  On-spot Booking
                </span>
              </div>
            )}

            {/* Bulk import — the same guest-entry job as on-spot booking, but
                from a spreadsheet. Same live/non-expired gate. */}
            {isLive && !isExpired && (
              <div className="group relative">
                <button
                  onClick={() => setShowBulkImport(true)}
                  className="rounded-lg p-2 text-gray-400 transition hover:bg-[#e6f8ff] hover:text-[#0094CA]"
                  title="Bulk add bookings"
                >
                  <LuFileSpreadsheet className="h-4 w-4" />
                </button>
                <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition group-hover:opacity-100">
                  Bulk Add (Excel)
                </span>
              </div>
            )}

            {/* Codes & passkey — quick manage without opening the full editor. */}
            <div className="group relative">
              <button
                onClick={() => setShowCodes(true)}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-[#e6f8ff] hover:text-[#0094CA]"
                title="Codes & passkey"
              >
                <FiKey className="h-4 w-4" />
              </button>
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition group-hover:opacity-100">
                Codes &amp; passkey
              </span>
            </div>

            {/* Pause/Resume button — disabled (but visible) for drafts since a
                draft is neither live nor paused. */}
            <div className="group relative">
              <button
                onClick={togglePause}
                disabled={isProcessing || isDraft}
                className={`rounded-lg p-2 transition ${
                  isDraft
                    ? "cursor-not-allowed text-gray-300"
                    : isPaused
                      ? "text-green-600 hover:bg-green-50"
                      : "text-amber-600 hover:bg-amber-50"
                } ${isProcessing ? "cursor-not-allowed opacity-50" : ""}`}
                title={
                  isDraft
                    ? "Publish the experience first"
                    : isPaused
                      ? "Resume"
                      : "Pause"
                }
              >
                {isProcessing ? (
                  <LuRotateCcw className="h-4 w-4 animate-spin" />
                ) : isPaused ? (
                  <FiPlay className="h-4 w-4" />
                ) : (
                  <FiPause className="h-4 w-4" />
                )}
              </button>
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition group-hover:opacity-100">
                {isDraft
                  ? "Publish first to enable"
                  : isPaused
                    ? "Resume Experience"
                    : "Pause Experience"}
              </span>
            </div>

            {/* Delete button */}
            <div className="group relative ml-auto">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                title="Delete"
              >
                <FiTrash2 className="h-4 w-4" />
              </button>
              <span className="pointer-events-none absolute right-0 bottom-full mb-2 rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition group-hover:opacity-100">
                Delete
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium tracking-wide text-gray-400">
              {footerText}
            </span>
          </div>
        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <FiTrash2 className="text-red-600" size={24} />
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Delete {event.title}?
            </h2>
            <p className="mb-4 text-gray-500">
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
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
                <FiAlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
                  aria-hidden
                />
                <div className="text-xs leading-relaxed">
                  <p className="font-semibold text-red-900">
                    {deleteAffected.count}{" "}
                    {deleteAffected.count === 1 ? "attendee" : "attendees"} will
                    be refunded
                  </p>
                  <p className="mt-0.5 text-red-800">
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
              <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500">
                No upcoming bookings — safe to delete.
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-gray-100 py-3 font-semibold text-gray-900 transition hover:bg-gray-200 disabled:opacity-50"
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
                    const cancelRes = await fetch(
                      `${process.env.NEXT_PUBLIC_API_URL}/events/${event.id}/cancel`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ host_id: _hostId }),
                      },
                    );
                    if (!cancelRes.ok) {
                      const errBody = (await cancelRes
                        .json()
                        .catch(() => ({}))) as { error?: string };
                      throw new Error(
                        errBody?.error ??
                          "Could not refund upcoming attendees — please try again.",
                      );
                    }

                    const delRes = await fetch(
                      `${process.env.NEXT_PUBLIC_API_URL}/events/${event.id}`,
                      {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ host_id: _hostId }),
                      },
                    );
                    if (!delRes.ok) {
                      // Refunds succeeded but the row couldn't be removed —
                      // the event is already marked cancelled, so the host is
                      // not stuck. Surface honestly.
                      const errBody = (await delRes
                        .json()
                        .catch(() => ({}))) as { error?: string };
                      throw new Error(
                        errBody?.error ??
                          "Attendees were refunded, but the experience couldn't be fully removed. It's marked Cancelled — refresh to confirm.",
                      );
                    }

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
    </div>
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
      className="group flex min-h-70 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white transition hover:border-[#0094CA] hover:bg-gray-50"
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 group-hover:bg-[#0094CA]/10">
        <span className="text-2xl text-gray-400 group-hover:text-[#0094CA]">
          +
        </span>
      </div>
      <h3 className="text-base font-semibold text-gray-900">
        Create New Experience
      </h3>
      <p className="mt-1 px-4 text-center text-xs text-gray-400">
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
      <div className="min-h-screen bg-gray-50">
        <HostNavbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0094CA] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!host) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HostNavbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-gray-500">Host profile not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HostNavbar />

      <main className="site-x mx-auto max-w-7xl py-8">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Dashboard", href: "/host-dashboard" },
            { label: "Experiences" },
          ]}
          className="mb-6"
        />

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Experiences</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your listings, check availability, and view performance
              insights.
            </p>
          </div>
          <button
            onClick={() => router.push("/host-dashboard/experiences/new")}
            className="flex items-center gap-2 rounded-lg bg-[#0094CA] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#007dab]"
          >
            <span>+</span>
            Create New Experience
          </button>
        </div>

        {/* Tabs and Filters */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-gray-200 pb-0">
            {[
              { key: "all" as const, label: "All Listings", count: counts.all },
              { key: "live" as const, label: "Live", count: counts.live },
              { key: "draft" as const, label: "Drafts", count: counts.draft },
              { key: "paused" as const, label: "Paused", count: counts.paused },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`relative px-4 py-2 text-sm font-medium transition ${
                  tab === key
                    ? "text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
                <span
                  className={`ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    tab === key
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {count}
                </span>
                {tab === key && (
                  <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-gray-900" />
                )}
              </button>
            ))}
          </div>

          {/* Search and Sort */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <FiSearch className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-gray-200 bg-white py-2 pr-4 pl-10 text-sm text-gray-900 placeholder-gray-400 focus:border-[#0094CA] focus:ring-1 focus:ring-[#0094CA] focus:outline-none sm:w-64"
              />
            </div>
            <button
              onClick={() => setSort(sort === "newest" ? "oldest" : "newest")}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                className="text-gray-400"
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                />
              ))}
              <CreateNewCard />
            </>
          ) : (
            <>
              <div className="col-span-full flex flex-col items-center justify-center py-16">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <LuBookOpen className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  No experiences found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {search
                    ? "Try adjusting your search terms"
                    : "Create your first experience to get started"}
                </p>
                <button
                  onClick={() => router.push("/host-dashboard/experiences/new")}
                  className="mt-4 rounded-lg bg-[#0094CA] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#007dab]"
                >
                  Create New Experience
                </button>
              </div>
            </>
          )}
        </div>

        {/* Load More (placeholder) */}
        {filteredEvents.length > 6 && (
          <div className="mt-8 flex justify-center">
            <button className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700">
              Load More
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        )}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <FiPause className="text-amber-600" size={24} />
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">
          Pause {event.title}?
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          Select how you would like to pause this experience.
        </p>

        <div className="mb-6 space-y-3">
          {/* Pause All */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 p-3 transition hover:bg-gray-50">
            <input
              type="radio"
              name="pause-type"
              checked={option === "all"}
              onChange={() => setOption("all")}
              className="mt-1 h-4 w-4 text-[#0094CA]"
            />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Pause entirely
              </p>
              <p className="text-xs text-gray-400">
                Hide the entire experience series.
              </p>
            </div>
          </label>

          {/* Pause From Session */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 p-3 transition hover:bg-gray-50">
            <input
              type="radio"
              name="pause-type"
              checked={option === "from"}
              onChange={() => setOption("from")}
              className="mt-1 h-4 w-4 text-[#0094CA]"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">
                Pause from a specific session onwards
              </p>
              <p className="text-xs text-gray-400">
                Keep current sessions, but pause this session and all after it.
              </p>
              {option === "from" && (
                <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-gray-100">
                  {availLoading ? (
                    <div className="p-3 text-center text-xs text-gray-400">
                      Loading sessions...
                    </div>
                  ) : (
                    availability?.map((a: OccurrenceAvailability) => (
                      <div
                        key={a.date}
                        onClick={() => !a.is_paused && setSelectedDate(a.date)}
                        className={`p-2 text-xs transition ${
                          a.is_paused
                            ? "cursor-not-allowed text-gray-400 line-through"
                            : selectedDate === a.date
                              ? "cursor-pointer bg-[#0094CA]/10 text-[#0094CA]"
                              : "cursor-pointer hover:bg-gray-50"
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
                          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
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
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 p-3 transition hover:bg-gray-50">
              <input
                type="radio"
                name="pause-type"
                checked={option === "date"}
                onChange={() => setOption("date")}
                className="mt-1 h-4 w-4 text-[#0094CA]"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  Pause specific session
                </p>
                <p className="text-xs text-gray-400">
                  Skip just one occurrence of this series.
                </p>
                {option === "date" && (
                  <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-gray-100">
                    {availLoading ? (
                      <div className="p-3 text-center text-xs text-gray-400">
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
                              ? "cursor-not-allowed text-gray-400 line-through"
                              : selectedDate === a.date
                                ? "cursor-pointer bg-[#0094CA]/10 text-[#0094CA]"
                                : "cursor-pointer hover:bg-gray-50"
                          }`}
                        >
                          {new Date(a.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {a.is_paused && (
                            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
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
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <FiAlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
              aria-hidden
            />
            <div className="text-xs leading-relaxed">
              <p className="font-semibold text-amber-900">
                {affected.count}{" "}
                {affected.count === 1 ? "attendee" : "attendees"} will be
                refunded
              </p>
              <p className="mt-0.5 text-amber-800">
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
            <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500">
              No upcoming bookings will be affected — safe to pause.
            </div>
          )
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg bg-gray-100 py-3 font-semibold text-gray-900 transition hover:bg-gray-200"
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
