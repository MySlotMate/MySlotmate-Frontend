/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
"use client";

import { useEffect, useState, useRef, use, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CoHostManager } from "~/components/host-dashboard";
import AttendeeDetailsConfig from "~/components/host-dashboard/AttendeeDetailsConfig";
import PrivacyAccessSection from "~/components/host/PrivacyAccessSection";
import CouponsManager from "~/components/host/CouponsManager";
import { RichTextEditor } from "~/components/RichTextEditor";
import {
  useMyHost,
  useEvent,
  useUpdateEvent,
  useUploadFiles,
  usePublishEvent,
} from "~/hooks/useApi";
import { useDragDrop } from "~/hooks/useDragDrop";
import { useHostTier } from "~/hooks/useHostTier";
import { VerifyToEarnSheet } from "~/components/host-dashboard/VerifyToEarn";
import { FREE_HOST_LIMITS, findOffPlatformPayment } from "~/lib/hostTier";
import {
  FiArrowLeft,
  FiX,
  FiUpload,
  FiTrash2,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiCalendar,
  FiUsers,
  FiDownload,
  FiMap,
  FiMapPin,
  FiVideo,
} from "react-icons/fi";
import {
  deleteEvent,
  getEvent,
  getEventAttendees,
  type BookingDTO,
  type PayoutMode,
} from "~/lib/api";
import BoostCard from "~/components/host-dashboard/boost/BoostCard";
import PayoutTimingFields, {
  refundPayoutSummary,
} from "~/components/host-dashboard/PayoutTimingFields";
import { WEEKLY_PAYOUTS_ENABLED } from "~/lib/boost";
import { istInputToUTCISO, utcToISTInputs } from "~/lib/datetime";
import {
  generateSessionSlots,
  generateWeeklySessions,
  nextWeeklySession,
  slotsToCustomDates,
  type SessionWindow,
} from "~/lib/sessionSlots";
import type { SessionType } from "~/lib/api";
import SessionWindowsEditor from "~/components/host-dashboard/SessionWindowsEditor";
import {
  AddPill,
  Chip,
  CoverPoster,
  FIELD,
  GRADIENT,
  INLINE_FIELD,
  INLINE_PICKER,
  MoodSelector,
  MoreOptions,
  ROW_INPUT,
  Row,
  Rows,
  Section,
  Segmented,
  ToggleRow,
} from "~/components/host-dashboard/EventFormKit";
import { DatePill, TimePill } from "~/components/host-dashboard/DateTimePills";
import { LocationSearchInput, MapPickerModal } from "~/components";
import { LuGlobe, LuLock } from "react-icons/lu";
import { toast } from "sonner";
import PassHoldersPanel from "~/components/host/PassHoldersPanel";
import { useQueryClient } from "@tanstack/react-query";
import { ImageCropModal } from "~/components/ImageCropModal";
import { downloadTicketPdf } from "~/lib/ticket";
import { exportBookingsToExcel } from "~/lib/excelExport";

export const runtime = "edge";

interface EventFormData {
  title: string;
  hookLine: string;
  mood: string;
  description: string;
  coverImage: File | null;
  coverImagePreview: string | null;
  galleryImages: File[];
  galleryPreviews: string[];
  isOnline: boolean;
  location: string;
  meetingLink: string;
  googleMapsUrl: string;
  durationMinutes: number;
  minGroupSize: number;
  maxGroupSize: number;
  isFree: boolean;
  priceCents: number;
  useTiers: boolean;
  priceTiers: { name: string; priceStr: string }[];
  // Monthly pass: one payment covers a month of sessions. Recurring, paid
  // experiences only.
  monthlyPassEnabled: boolean;
  monthlyPassPriceStr: string;
  monthlyPassSessionsStr: string; // "" = every session
  monthlyPassCapacityStr: string; // "" = unlimited passes
  eventDate: string;
  eventTime: string;
  endTime: string;
  isRecurring: boolean;
  recurrenceRule: string;
  scheduleType: "one_time" | "recurring" | "custom_dates";
  customDatesList: { date: string; time: string }[];
  sessionType: SessionType;
  sessionWindows: SessionWindow[];
  breakMinutes: number;
  sessionIsWeekly: boolean;
  cancellationPolicy: string;
  payoutMode: PayoutMode;
  requiresAttendeeDetails: boolean;
  attendeeFields: string[];
  isPrivate: boolean;
  privateAccessMode: "passkey" | "rsvp";
  accessMode: "shared" | "unique";
  accessPasskey: string;
  passkeyGrantsFree: boolean;
}

const DURATION_OPTIONS = [30, 60, 90, 120, 180, 240];

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function ImageUpload({
  label,
  helpText,
  preview,
  onUpload,
  onRemove,
  multiple = false,
  previews = [],
  onRemoveMultiple,
}: {
  label: string;
  helpText?: string;
  preview?: string | null;
  onUpload: (files: File[]) => void;
  onRemove?: () => void;
  multiple?: boolean;
  previews?: string[];
  onRemoveMultiple?: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDropZoneRef = useRef<HTMLDivElement>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Safely adjust slide index when images are added/removed
  useEffect(() => {
    if (currentImageIndex >= previews.length) {
      setCurrentImageIndex(Math.max(0, previews.length - 1));
    }
  }, [previews.length, currentImageIndex]);

  const processFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;

      const oversizedFiles: string[] = [];
      const validFiles: File[] = [];

      files.forEach((file) => {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          oversizedFiles.push(
            `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB)`,
          );
        } else {
          validFiles.push(file);
        }
      });

      if (oversizedFiles.length > 0) {
        toast.error(
          `File${oversizedFiles.length > 1 ? "s" : ""} too large:\n${oversizedFiles.join(", ")}\n\nMax size is ${MAX_FILE_SIZE_MB}MB per file.`,
        );
      }

      if (validFiles.length > 0) {
        onUpload(validFiles);
      }
    },
    [onUpload],
  );

  const {
    isDragging,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  } = useDragDrop({
    onDrop: processFiles,
    accept: "image/*",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    processFiles(files);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white/80">{label}</label>
      {helpText && <p className="text-xs text-[#A5A8C3]">{helpText}</p>}

      {!multiple && preview && (
        <div className="relative inline-block w-full max-w-[280px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            loading="lazy"
            className="aspect-[4/5] w-full rounded-lg object-cover"
          />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <FiX size={14} />
          </button>
        </div>
      )}

      {multiple && previews.length > 0 && (
        <div className="space-y-4">
          <div className="group relative">
            {/* Photos are cropped to 4:5 on upload, matching the poster frame
                used across the site. Older photos in other shapes are shown
                whole over a blurred fill rather than cropped. */}
            <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-xl bg-white/[0.06]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previews[currentImageIndex]}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl"
              />
              {/* Main Image */}
              <img
                src={previews[currentImageIndex]}
                alt={`Cover photo preview ${currentImageIndex + 1}`}
                loading="lazy"
                className="relative block h-full w-full object-contain transition-opacity duration-300"
              />

              {/* Navigation Arrows */}
              {previews.length > 1 && (
                <>
                  {/* Left Arrow */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) =>
                        prev === 0 ? previews.length - 1 : prev - 1,
                      );
                    }}
                    className="absolute top-1/2 left-4 z-10 -translate-y-1/2 rounded-full bg-[#121426]/80 p-2.5 opacity-0 shadow-md transition group-hover:opacity-100 hover:bg-[#121426]"
                    aria-label="Previous image"
                  >
                    <svg
                      className="h-4 w-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>

                  {/* Right Arrow */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) =>
                        prev === previews.length - 1 ? 0 : prev + 1,
                      );
                    }}
                    className="absolute top-1/2 right-4 z-10 -translate-y-1/2 rounded-full bg-[#121426]/80 p-2.5 opacity-0 shadow-md transition group-hover:opacity-100 hover:bg-[#121426]"
                    aria-label="Next image"
                  >
                    <svg
                      className="h-4 w-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>

                  {/* Image Counter */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                    {currentImageIndex + 1} / {previews.length}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Thumbnail list with delete actions */}
          <div className="flex flex-wrap gap-2">
            {previews.map((p, i) => (
              <div
                key={i}
                onClick={() => setCurrentImageIndex(i)}
                className={`relative cursor-pointer overflow-hidden rounded-lg border-2 transition ${
                  currentImageIndex === i
                    ? "border-[#A020F0]"
                    : "border-transparent"
                }`}
              >
                <img
                  src={p}
                  alt={`Thumbnail ${i + 1}`}
                  loading="lazy"
                  className="h-16 w-16 object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveMultiple?.(i);
                  }}
                  className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow transition hover:bg-red-600"
                >
                  <FiX size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!preview || multiple) && (
        <div
          ref={dragDropZoneRef}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition ${
            isDragging
              ? "scale-105 border-[#A020F0] bg-[#A020F0]/10"
              : "border-white/15 hover:border-[#A020F0] hover:bg-white/[0.04]"
          }`}
        >
          <FiUpload
            className={`mx-auto mb-2 transition ${isDragging ? "text-[#D8B4FE]" : "text-[#777B98]"}`}
            size={24}
          />
          <p
            className={`text-sm transition ${isDragging ? "font-semibold text-[#D8B4FE]" : "text-[#A5A8C3]"}`}
          >
            {isDragging
              ? `Drop ${multiple ? "images" : "image"} here`
              : `Click to upload or drag ${multiple ? "images" : "image"}`}
          </p>
          <p className="mt-1 text-xs text-[#777B98]">PNG, JPG up to 5MB</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

function AttendeeRow({
  attendee,
  event,
}: {
  attendee: BookingDTO;
  event: any;
}) {
  const [downloadingTicket, setDownloadingTicket] = useState(false);

  return (
    <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 first:border-t-0">
      <div className="flex min-w-0 items-center gap-3">
        {attendee.user_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attendee.user_avatar_url}
            alt={attendee.user_name ?? ""}
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#A020F0]/10 text-sm font-semibold text-[#D8B4FE]">
            {(attendee.user_name ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {attendee.user_name ?? "Unknown user"}
          </p>
          {attendee.user_email && (
            <p className="truncate text-xs text-[#A5A8C3]">
              {attendee.user_email}
            </p>
          )}
          <p className="text-xs text-[#A5A8C3]">
            Qty: {attendee.quantity}
            {attendee.amount_cents !== null && (
              <span className="ml-2 text-[#777B98]">
                ₹{(attendee.amount_cents / 100).toFixed(2)}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
            attendee.status === "pending"
              ? "bg-yellow-500/15 text-yellow-300"
              : attendee.status === "confirmed"
                ? "bg-green-500/15 text-green-300"
                : attendee.status === "cancelled"
                  ? "bg-red-500/15 text-red-300"
                  : attendee.status === "refunded"
                    ? "bg-orange-500/15 text-orange-300"
                    : "bg-white/[0.06] text-white"
          }`}
        >
          {attendee.status.charAt(0).toUpperCase() + attendee.status.slice(1)}
        </span>
        <button
          type="button"
          onClick={() => {
            void downloadTicketPdf(
              attendee,
              event,
              { name: attendee.user_name, email: attendee.user_email },
              setDownloadingTicket,
            );
          }}
          disabled={downloadingTicket}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-[#121426] px-2 py-1 text-xs font-medium text-white/80 transition hover:border-[#A020F0] hover:text-[#D8B4FE] disabled:opacity-50"
          title="Download Ticket PDF"
        >
          {downloadingTicket ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#A020F0] border-t-transparent" />
          ) : (
            <FiDownload className="h-3 w-3 text-[#A5A8C3]" />
          )}
          Ticket
        </button>
      </div>
    </div>
  );
}

function SessionGroup({
  occurrenceDate,
  bookings,
  defaultOpen,
  isRecurring,
  event,
}: {
  occurrenceDate: string;
  bookings: BookingDTO[];
  defaultOpen: boolean;
  isRecurring: boolean;
  event: any;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const activeBookings = bookings.filter(
    (b) => b.status !== "cancelled" && b.status !== "refunded",
  );
  const totalGuests = activeBookings.reduce((sum, b) => sum + b.quantity, 0);
  const revenueCents = activeBookings.reduce(
    (sum, b) => sum + (b.amount_cents ?? 0),
    0,
  );

  const dateLabel = new Date(occurrenceDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const isPast = new Date(occurrenceDate) < new Date();

  // For non-recurring events with a single session, skip the collapsible chrome.
  if (!isRecurring) {
    return (
      <div className="divide-y divide-white/10 rounded-lg border border-white/10">
        {bookings.map((b) => (
          <AttendeeRow key={b.id} attendee={b} event={event} />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 bg-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.06]"
      >
        {open ? (
          <FiChevronDown className="h-4 w-4 text-[#777B98]" />
        ) : (
          <FiChevronRight className="h-4 w-4 text-[#777B98]" />
        )}
        <FiCalendar className="h-4 w-4 text-[#D8B4FE]" />
        <span className="text-sm font-semibold text-white">{dateLabel}</span>
        {isPast && (
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-[#A5A8C3]">
            past
          </span>
        )}
        <span className="ml-auto flex items-center gap-3 text-xs text-[#A5A8C3]">
          <span className="inline-flex items-center gap-1">
            <FiUsers className="h-3.5 w-3.5" />
            {totalGuests} guest{totalGuests === 1 ? "" : "s"}
          </span>
          {revenueCents > 0 && (
            <span className="font-medium text-white/80">
              ₹{(revenueCents / 100).toFixed(2)}
            </span>
          )}
          <span className="text-[#777B98]">
            {bookings.length} booking{bookings.length === 1 ? "" : "s"}
          </span>
        </span>
      </button>
      {open && (
        <div className="bg-[#121426]">
          {bookings.map((b) => (
            <AttendeeRow key={b.id} attendee={b} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function AttendeesList({
  eventId,
  isRecurring,
  event,
}: {
  eventId: string;
  isRecurring: boolean;
  event: any;
}) {
  const [attendees, setAttendees] = useState<BookingDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async () => {
      try {
        const res = await getEventAttendees(eventId);
        setAttendees(res.data ?? []);
      } catch (err) {
        console.error("Failed to fetch attendees:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [eventId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-[#A020F0]" />
      </div>
    );
  }

  if (!attendees || attendees.length === 0) {
    return <p className="py-8 text-center text-[#A5A8C3]">No bookings yet</p>;
  }

  // Group bookings by occurrence date (date+time keyed string)
  const groups = new Map<string, BookingDTO[]>();
  for (const b of attendees) {
    const key = b.occurrence_date;
    const arr = groups.get(key);
    if (arr) arr.push(b);
    else groups.set(key, [b]);
  }

  const sortedKeys = Array.from(groups.keys()).sort();

  // Default-open the first upcoming session (or the last past one if all are past).
  const now = Date.now();
  const firstUpcomingKey =
    sortedKeys.find((k) => new Date(k).getTime() >= now) ??
    sortedKeys[sortedKeys.length - 1];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <span className="text-xs text-[#A5A8C3]">
          Total Bookings:{" "}
          <strong className="text-white">{attendees.length}</strong>
        </span>
        <button
          type="button"
          onClick={() =>
            void exportBookingsToExcel(
              event?.title ?? "experience",
              attendees,
              setExporting,
            )
          }
          disabled={exporting || attendees.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-50"
          title="Download Excel Sheet of all bookings for this experience"
        >
          {exporting ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
          ) : (
            <FiDownload className="h-3.5 w-3.5" />
          )}
          Download Excel Sheet
        </button>
      </div>

      <div className="space-y-3">
        {sortedKeys.map((key) => (
          <SessionGroup
            key={key}
            occurrenceDate={key}
            bookings={groups.get(key)!}
            defaultOpen={key === firstUpcomingKey}
            isRecurring={isRecurring}
            event={event}
          />
        ))}
      </div>
    </div>
  );
}

export default function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const showBookings = searchParams.get("tab") === "bookings";
  const [userId, setUserId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Image Crop states
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [cropTarget, setCropTarget] = useState<"profile" | "cover">("profile");

  const [form, setForm] = useState<EventFormData>({
    title: "",
    hookLine: "",
    mood: "",
    description: "",
    coverImage: null,
    coverImagePreview: null,
    galleryImages: [],
    galleryPreviews: [],
    isOnline: false,
    location: "",
    meetingLink: "",
    googleMapsUrl: "",
    durationMinutes: 60,
    minGroupSize: 1,
    maxGroupSize: 10,
    isFree: false,
    priceCents: 50000,
    useTiers: false,
    priceTiers: [{ name: "", priceStr: "" }],
    monthlyPassEnabled: false,
    monthlyPassPriceStr: "",
    monthlyPassSessionsStr: "",
    monthlyPassCapacityStr: "",
    eventDate: "",
    eventTime: "",
    endTime: "",
    isRecurring: false,
    recurrenceRule: "",
    scheduleType: "one_time",
    customDatesList: [{ date: "", time: "" }],
    sessionType: "group",
    sessionWindows: [{ date: "", start: "", end: "" }],
    breakMinutes: 0,
    sessionIsWeekly: true,
    cancellationPolicy: "flexible",
    payoutMode: "after_event",
    requiresAttendeeDetails: false,
    attendeeFields: [],
    isPrivate: false,
    privateAccessMode: "passkey",
    accessMode: "shared",
    accessPasskey: "",
    passkeyGrantsFree: false,
  });

  const addCustomSlot = () => {
    setForm((prev) => ({
      ...prev,
      customDatesList: [...prev.customDatesList, { date: "", time: "" }],
    }));
  };

  const removeCustomSlot = (index: number) => {
    setForm((prev) => ({
      ...prev,
      customDatesList: prev.customDatesList.filter((_, i) => i !== index),
    }));
  };

  const updateCustomSlot = (
    index: number,
    field: "date" | "time",
    val: string,
  ) => {
    setForm((prev) => {
      const list = [...prev.customDatesList];
      const current = list[index] ?? { date: "", time: "" };
      list[index] = { ...current, [field]: val };
      return { ...prev, customDatesList: list };
    });
  };

  useEffect(() => {
    setUserId(localStorage.getItem("msm_user_id"));
    setIsHydrated(true);
  }, []);

  const { data: host, isLoading: hostLoading } = useMyHost(userId);
  // Unverified hosts can only run free events, within the free-host limits.
  const {
    isVerified: verifiedHost,
    isLoading: tierLoading,
    applicationStatus,
  } = useHostTier();
  // Optimistic while loading: verified hosts never see the free-host locks
  // flash, and the backend still enforces the rule.
  const isVerified = tierLoading || verifiedHost;
  const [verifyOpen, setVerifyOpen] = useState(false);
  const { data: event, isLoading: eventLoading } = useEvent(id);
  const updateEvent = useUpdateEvent();
  const publishEvent = usePublishEvent();
  const uploadFiles = useUploadFiles();
  const queryClient = useQueryClient();

  // Populate form when event loads
  useEffect(() => {
    if (event) {
      // event.time / end_time are stored as UTC; the form inputs are IST.
      const { date: dateStr, time: timeStr } = utcToISTInputs(event.time);
      const endTime = event.end_time ? utcToISTInputs(event.end_time).time : "";

      const parsedCustomSlots =
        event.schedule_type === "custom_dates" ||
        (event.custom_dates && event.custom_dates.length > 0)
          ? (event.custom_dates ?? []).map((d) => utcToISTInputs(d))
          : [{ date: dateStr, time: timeStr }];

      const computedScheduleType: "one_time" | "recurring" | "custom_dates" =
        event.schedule_type === "custom_dates" ||
        (event.custom_dates && event.custom_dates.length > 0)
          ? "custom_dates"
          : event.is_recurring
            ? "recurring"
            : "one_time";

      setForm({
        title: event.title ?? "",
        hookLine: event.hook_line ?? "",
        mood: event.mood ?? "",
        description: event.description ?? "",
        coverImage: null,
        coverImagePreview: event.cover_image_url ?? null,
        galleryImages: [],
        galleryPreviews: event.gallery_urls ?? [],
        isOnline: event.is_online ?? false,
        location: event.location ?? "",
        meetingLink: event.meeting_link ?? "",
        googleMapsUrl: event.google_maps_url ?? "",
        durationMinutes: event.duration_minutes ?? 60,
        minGroupSize: event.min_group_size ?? 1,
        maxGroupSize: event.max_group_size ?? 10,
        isFree: event.is_free ?? false,
        priceCents: event.price_cents ?? 0,
        useTiers: (event.price_tiers?.length ?? 0) > 0,
        priceTiers:
          event.price_tiers && event.price_tiers.length > 0
            ? event.price_tiers.map((t) => ({
                name: t.name,
                priceStr: (t.price_cents / 100).toString(),
              }))
            : [{ name: "", priceStr: "" }],
        monthlyPassEnabled: !!event.monthly_pass_price_cents,
        monthlyPassPriceStr: event.monthly_pass_price_cents
          ? (event.monthly_pass_price_cents / 100).toString()
          : "",
        monthlyPassSessionsStr:
          event.monthly_pass_session_limit?.toString() ?? "",
        monthlyPassCapacityStr: event.monthly_pass_capacity?.toString() ?? "",
        eventDate: dateStr,
        eventTime: timeStr,
        endTime: endTime,
        isRecurring: event.is_recurring ?? false,
        recurrenceRule: event.recurrence_rule ?? "",
        scheduleType: computedScheduleType,
        customDatesList:
          parsedCustomSlots.length > 0
            ? parsedCustomSlots
            : [{ date: dateStr, time: timeStr }],
        sessionType:
          event.session_type === "one_on_one" ? "one_on_one" : "group",
        // Windows are what the host actually typed; custom_dates is the expansion.
        // A one-on-one event saved before session_windows existed falls back to an
        // empty row rather than showing the host a list of generated slots.
        sessionWindows:
          event.session_windows && event.session_windows.length > 0
            ? event.session_windows.map((w) => ({
                date: w.date,
                start: w.start,
                end: w.end,
              }))
            : [{ date: "", start: "", end: "" }],
        breakMinutes: event.break_minutes ?? 0,
        // Weekly windows carry a weekday; dated ones carry a date. The stored
        // windows are what decides the mode, not a separate flag.
        sessionIsWeekly: (event.session_windows ?? []).some(
          (w) => w.weekday !== undefined && w.weekday !== null,
        ),
        cancellationPolicy: event.cancellation_policy ?? "flexible",
        payoutMode: event.payout_mode ?? "after_event",
        requiresAttendeeDetails: event.requires_attendee_details ?? false,
        attendeeFields: event.attendee_fields ?? [],
        isPrivate: event.is_private ?? false,
        privateAccessMode:
          event.private_access_mode === "rsvp" ? "rsvp" : "passkey",
        // Corrected by the passkey refetch below (shared if a passkey exists,
        // otherwise unique — access via per-guest codes).
        accessMode: "shared",
        // access_passkey is stripped from the shared event fetch; the effect
        // below refetches it with host_id so the host can view/re-share it.
        accessPasskey: event.access_passkey ?? "",
        passkeyGrantsFree: event.passkey_grants_free ?? false,
      });
    }
  }, [event]);

  // For a private event, refetch with the owning host_id to load the passkey
  // (the plain event fetch strips it) so the field prefills for re-sharing.
  useEffect(() => {
    if (!event?.is_private || !host?.id || !id) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await getEvent(id, host.id);
        if (cancelled) return;
        const passkey = res.data.access_passkey ?? "";
        // A private event with a shared passkey is "shared" mode; one without is
        // "unique" (access granted by the per-guest codes).
        setForm((prev) => ({
          ...prev,
          accessPasskey: passkey,
          accessMode: passkey ? "shared" : "unique",
        }));
      } catch {
        // Non-fatal: leave blank; host can set a new passkey.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [event?.is_private, host?.id, id]);

  useEffect(() => {
    if (isHydrated && !userId && !hostLoading) {
      router.push("/");
    }
  }, [userId, hostLoading, router, isHydrated]);

  const updateForm = <K extends keyof EventFormData>(
    key: K,
    value: EventFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // With an end time, the length is just end minus start.
  useEffect(() => {
    if (form.sessionType !== "group" || !form.eventTime || !form.endTime)
      return;
    const [sh = 0, sm = 0] = form.eventTime.split(":").map(Number);
    const [eh = 0, em = 0] = form.endTime.split(":").map(Number);
    let mins = eh * 60 + em - (sh * 60 + sm);
    if (mins <= 0) mins += 24 * 60; // ends after midnight
    if (mins >= 15 && mins !== form.durationMinutes)
      setForm((prev) => ({ ...prev, durationMinutes: mins }));
  }, [form.sessionType, form.eventTime, form.endTime, form.durationMinutes]);

  const addPriceTier = () => {
    updateForm("priceTiers", [...form.priceTiers, { name: "", priceStr: "" }]);
  };
  const removePriceTier = (index: number) => {
    updateForm(
      "priceTiers",
      form.priceTiers.filter((_, i) => i !== index),
    );
  };
  const updatePriceTier = (
    index: number,
    field: "name" | "priceStr",
    value: string,
  ) => {
    updateForm(
      "priceTiers",
      form.priceTiers.map((t, i) =>
        i === index ? { ...t, [field]: value } : t,
      ),
    );
  };

  const handleCoverUpload = (files: File[]) => {
    const file = files[0];
    if (file) {
      setCropTarget("profile");
      setCropQueue([file]);
    }
  };

  const handleGalleryUpload = (files: File[]) => {
    if (files.length > 0) {
      setCropTarget("cover");
      setCropQueue(files);
    }
  };

  const handleCropConfirm = (blob: Blob, originalName: string) => {
    const ext = blob.type === "image/png" ? "png" : "jpg";
    const baseName = originalName.replace(/\.[^.]+$/, "") || "image";
    const croppedFile = new File([blob], `${baseName}-cropped.${ext}`, {
      type: blob.type,
    });

    if (cropTarget === "profile") {
      updateForm("coverImage", croppedFile);
      updateForm("coverImagePreview", URL.createObjectURL(croppedFile));
    } else {
      const newPreview = URL.createObjectURL(croppedFile);
      updateForm("galleryImages", [...form.galleryImages, croppedFile]);
      updateForm("galleryPreviews", [...form.galleryPreviews, newPreview]);
    }

    // Move to next image in queue
    setCropQueue((prev) => prev.slice(1));
  };

  const removeGalleryImage = (index: number) => {
    // galleryPreviews mixes already-uploaded https URLs with blob: previews for
    // not-yet-uploaded galleryImages files. Only blob previews have a matching
    // File; its position in galleryImages is the number of blob previews before
    // this index (not `index`, which also counts existing URLs).
    const preview = form.galleryPreviews[index];
    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
      const blobIndex = form.galleryPreviews
        .slice(0, index)
        .filter((p) => p.startsWith("blob:")).length;
      updateForm(
        "galleryImages",
        form.galleryImages.filter((_, i) => i !== blobIndex),
      );
    }
    updateForm(
      "galleryPreviews",
      form.galleryPreviews.filter((_, i) => i !== index),
    );
  };

  // Returns the first validation error string, or null if the draft is
  // complete enough to publish.
  const validateForPublish = (): string | null => {
    if (!form.title.trim()) return "Add a title before publishing";
    if (!form.hookLine.trim()) return "Add a hook line before publishing";
    if (!form.mood) return "Pick a mood before publishing";
    if (!form.description.trim()) return "Add a description before publishing";
    if (!form.eventDate || !form.eventTime)
      return "Set a date and time before publishing";
    if (!form.isFree && !form.useTiers && form.priceCents <= 0)
      return "Set a price (or mark as free) before publishing";
    if (
      !form.isFree &&
      form.useTiers &&
      form.priceTiers.filter((t) => t.name.trim() && Number(t.priceStr) > 0)
        .length === 0
    )
      return "Add at least one ticket type with a name and price";
    if (!form.isOnline && !form.location.trim())
      return "Add a location (or mark as online) before publishing";
    if (form.isOnline && !form.meetingLink.trim())
      return "Add a meeting link before publishing";
    if (form.maxGroupSize < 1)
      return "Set a valid group size before publishing";
    if (!form.cancellationPolicy)
      return "Pick a cancellation policy before publishing";
    if (!isVerified) {
      if (!form.isFree) return "Only verified hosts can sell tickets";
      if (
        form.sessionType !== "one_on_one" &&
        form.maxGroupSize > FREE_HOST_LIMITS.maxGuests
      )
        return `Free events can have up to ${FREE_HOST_LIMITS.maxGuests} guests`;
      const payment = findOffPlatformPayment(
        `${form.title} ${form.hookLine} ${form.description}`,
      );
      if (payment) return payment;
    }
    return null;
  };

  const handleUpdate = async (publishAfter = false) => {
    if (!host?.id || !event?.id) {
      toast.error("Unable to update event");
      return;
    }
    if (!isVerified && !form.isFree) {
      setVerifyOpen(true);
      return;
    }

    // A shared-passkey private event is unbookable without its passkey. (Unique
    // mode needs no passkey — access comes from the per-guest codes.)
    // RSVP-gated events have no passkey at all — access comes from an approved
    // request — so the passkey requirement applies only to the passkey gate.
    if (
      form.isPrivate &&
      form.privateAccessMode === "passkey" &&
      form.accessMode === "shared" &&
      !form.accessPasskey.trim()
    ) {
      toast.error("A private experience needs a passkey");
      return;
    }

    // An RSVP host approves people on the strength of what they submit, so the
    // request form can't be empty — without required fields every request would
    // arrive as a bare name and there'd be nothing to judge.
    if (
      form.isPrivate &&
      form.privateAccessMode === "rsvp" &&
      (!form.requiresAttendeeDetails || form.attendeeFields.length === 0)
    ) {
      toast.error(
        "Request-to-join needs attendee details — turn them on and pick at least one field",
      );
      return;
    }

    // Saving broken windows would wipe custom_dates and leave the event with no
    // bookable sessions at all, so this is enforced on save, not just on publish.
    if (form.sessionType === "one_on_one") {
      const { errors, count } = form.sessionIsWeekly
        ? (() => {
            const r = generateWeeklySessions(
              form.sessionWindows,
              form.durationMinutes,
              form.breakMinutes,
            );
            return { errors: r.errors, count: r.perWeek };
          })()
        : (() => {
            const r = generateSessionSlots(
              form.sessionWindows,
              form.durationMinutes,
              form.breakMinutes,
            );
            return { errors: r.errors, count: r.slots.length };
          })();
      if (errors.length > 0) {
        toast.error(errors[0]);
        return;
      }
      if (count === 0) {
        toast.error("Your availability windows don't fit a single session");
        return;
      }
    }

    // Only enforce completeness when the host is actually trying to publish.
    if (publishAfter) {
      const err = validateForPublish();
      if (err) {
        toast.error(err);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let coverImageUrl: string | undefined =
        form.coverImagePreview ?? undefined;
      let galleryUrls: string[] = form.galleryPreviews;

      // Upload new cover image if selected
      if (form.coverImage) {
        try {
          const uploadRes = await uploadFiles.mutateAsync({
            files: [form.coverImage],
            folder: "events/covers",
          });
          coverImageUrl = (uploadRes.data as Array<{ url: string }>)[0]?.url;
        } catch (err) {
          console.warn("Cover upload failed:", err);
        }
      }

      // Upload new gallery images
      if (form.galleryImages.length > 0) {
        try {
          const uploadRes = await uploadFiles.mutateAsync({
            files: form.galleryImages,
            folder: "events/gallery",
          });
          const newUrls = (uploadRes.data as Array<{ url: string }>).map(
            (r) => r.url,
          );
          galleryUrls = [
            ...form.galleryPreviews.filter((p) => !p.startsWith("blob:")),
            ...newUrls,
          ];
        } catch (err) {
          console.warn("Gallery upload failed:", err);
        }
      }

      const isWeeklyOneOnOne =
        form.sessionType === "one_on_one" && form.sessionIsWeekly;
      const oneOnOneSlots =
        form.sessionType === "one_on_one" && !form.sessionIsWeekly
          ? generateSessionSlots(
              form.sessionWindows,
              form.durationMinutes,
              form.breakMinutes,
            ).slots
          : [];
      // Weekly schedules store no dates; the event still needs a real upcoming
      // session as its anchor time.
      const weeklyAnchor = isWeeklyOneOnOne
        ? nextWeeklySession(
            form.sessionWindows,
            form.durationMinutes,
            form.breakMinutes,
          )
        : null;

      const firstSlot =
        form.sessionType === "one_on_one"
          ? {
              date:
                (isWeeklyOneOnOne
                  ? weeklyAnchor?.date
                  : oneOnOneSlots[0]?.date) ?? form.eventDate,
              time:
                (isWeeklyOneOnOne
                  ? weeklyAnchor?.time
                  : oneOnOneSlots[0]?.time) ?? form.eventTime,
            }
          : form.scheduleType === "custom_dates" &&
              form.customDatesList[0]?.date &&
              form.customDatesList[0]?.time
            ? form.customDatesList[0]
            : { date: form.eventDate, time: form.eventTime };

      // Form inputs are IST; anchor to +05:30 so the stored UTC instant is stable.
      const eventDateTime = new Date(
        istInputToUTCISO(firstSlot.date, firstSlot.time),
      );
      let endDateTime: Date | undefined;
      if (form.sessionType === "one_on_one") {
        // Spans one session, not the whole day — see the create form.
        endDateTime = new Date(
          eventDateTime.getTime() + form.durationMinutes * 60 * 1000,
        );
      } else if (form.endTime) {
        endDateTime = new Date(istInputToUTCISO(firstSlot.date, form.endTime));
      } else {
        endDateTime = new Date(
          eventDateTime.getTime() + form.durationMinutes * 60 * 1000,
        );
      }

      await updateEvent.mutateAsync({
        eventId: event.id,
        body: {
          host_id: host.id,
          title: form.title.trim(),
          hook_line: form.hookLine.trim(),
          mood: form.mood,
          description: form.description.trim(),
          // Send explicit values so removals persist: the backend keeps the
          // existing image(s) when these fields are omitted, so a removed cover
          // must be sent as "" and an emptied gallery as [].
          cover_image_url: coverImageUrl ?? "",
          // Guard against a failed upload leaving unresolved blob: previews in the
          // list — only ever persist real hosted URLs.
          gallery_urls: galleryUrls.filter((u) => !u.startsWith("blob:")),
          time: eventDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          is_online: form.isOnline,
          location: form.isOnline ? undefined : form.location || undefined,
          meeting_link: form.isOnline
            ? form.meetingLink || undefined
            : undefined,
          google_maps_url: !form.isOnline
            ? form.googleMapsUrl || undefined
            : undefined,
          duration_minutes: form.durationMinutes,
          capacity: form.sessionType === "one_on_one" ? 1 : form.maxGroupSize,
          min_group_size:
            form.sessionType === "one_on_one" ? 1 : form.minGroupSize,
          max_group_size:
            form.sessionType === "one_on_one" ? 1 : form.maxGroupSize,
          price_cents: form.isFree || form.useTiers ? 0 : form.priceCents,
          is_free: form.isFree,
          price_tiers:
            !form.isFree && form.useTiers
              ? form.priceTiers
                  .filter((t) => t.name.trim() && Number(t.priceStr) > 0)
                  .map((t) => ({
                    name: t.name.trim(),
                    price_cents: Math.round(Number(t.priceStr) * 100),
                  }))
              : [],
          monthly_pass: {
            price_cents:
              form.monthlyPassEnabled &&
              !form.isFree &&
              form.scheduleType !== "one_time"
                ? Math.round(Number(form.monthlyPassPriceStr) * 100)
                : 0,
            session_limit: form.monthlyPassSessionsStr
              ? Number(form.monthlyPassSessionsStr)
              : undefined,
            capacity: form.monthlyPassCapacityStr
              ? Number(form.monthlyPassCapacityStr)
              : undefined,
          },
          is_recurring: isWeeklyOneOnOne || form.scheduleType === "recurring",
          recurrence_rule: isWeeklyOneOnOne
            ? "FREQ=WEEKLY"
            : form.scheduleType === "recurring"
              ? form.recurrenceRule
              : undefined,
          schedule_type: isWeeklyOneOnOne ? "recurring" : form.scheduleType,
          custom_dates: isWeeklyOneOnOne
            ? []
            : form.sessionType === "one_on_one"
              ? slotsToCustomDates(oneOnOneSlots)
              : form.scheduleType === "custom_dates"
                ? form.customDatesList
                    .filter((s) => s.date && s.time)
                    .map((s) => istInputToUTCISO(s.date, s.time))
                : undefined,
          session_type: form.sessionType,
          break_minutes:
            form.sessionType === "one_on_one" ? form.breakMinutes : undefined,
          session_windows:
            form.sessionType === "one_on_one" ? form.sessionWindows : undefined,
          cancellation_policy: form.cancellationPolicy,
          ...(WEEKLY_PAYOUTS_ENABLED && !form.isFree
            ? { payout_mode: form.payoutMode }
            : {}),
          requires_attendee_details: form.requiresAttendeeDetails,
          attendee_fields: form.requiresAttendeeDetails
            ? form.attendeeFields
            : [],
          is_private: form.isPrivate,
          private_access_mode: form.privateAccessMode,
          // Unique mode clears the shared passkey (access via per-guest codes).
          access_passkey:
            form.isPrivate && form.accessMode === "shared"
              ? form.accessPasskey.trim()
              : "",
        },
      });

      // Publish the event only when the host explicitly clicked "Publish Now"
      // and validation passed. Otherwise the event keeps its current status
      // (a draft stays a draft).
      if (publishAfter) {
        try {
          await publishEvent.mutateAsync({
            eventId: event.id,
            hostId: host.id,
          });
        } catch (publishErr) {
          console.warn("Publish failed after save:", publishErr);
          toast.error("Saved, but publish failed. Try again.");
          await queryClient.invalidateQueries({ queryKey: ["events"] });
          return;
        }
      }

      toast.success(
        publishAfter
          ? "Experience published! It's now visible to guests."
          : "Changes saved.",
      );
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      router.push("/host-dashboard/experiences");
    } catch (err) {
      console.error("Failed to update event:", err);
      toast.error("Failed to update event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!host?.id || !event?.id) {
      toast.error("Unable to delete event");
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteEvent(event.id, host.id);

      toast.success("Experience deleted successfully!");
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      router.push("/host-dashboard/experiences");
    } catch (err) {
      console.error("Failed to delete event:", err);
      toast.error("Failed to delete event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hostLoading || eventLoading) {
    return (
      <div className="min-h-screen bg-[#080914]">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A020F0] border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="msm-dark-form relative min-h-screen overflow-x-clip bg-[#080914] pb-24 text-white">
        {/* Soft colour from the poster behind everything, like the event page */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 overflow-hidden"
        >
          {form.coverImagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.coverImagePreview}
              alt=""
              className="h-full w-full scale-125 object-cover opacity-40 blur-[90px]"
            />
          ) : (
            <div className="absolute -top-40 left-1/3 h-[560px] w-[560px] rounded-full bg-[#7B2FFF]/20 blur-[140px]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-[#080914]/30 via-[#080914]/70 to-[#080914]" />
        </div>

        <div className="relative mx-auto max-w-[1120px] px-5 py-8 md:px-10">
          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <button
              onClick={() => router.push("/host-dashboard/experiences")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/10"
              aria-label="Back to my experiences"
            >
              <FiArrowLeft size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="font-outfit text-2xl font-bold text-white">
                Edit experience
              </h1>
              <p className="text-sm text-white/50">
                Changes go live as soon as you save.
              </p>
            </div>
            {event?.status && (
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  event.status === "live"
                    ? "bg-emerald-400/15 text-emerald-300"
                    : "bg-white/10 text-white/70"
                }`}
              >
                {event.status}
              </span>
            )}
          </div>

          {/* Tabs */}
          <div className="mb-8 flex gap-1 border-b border-white/[0.08]">
            {(
              [
                ["details", "Details", `/host-dashboard/experiences/${id}`],
                [
                  "bookings",
                  "Bookings",
                  `/host-dashboard/experiences/${id}?tab=bookings`,
                ],
              ] as const
            ).map(([key, label, href]) => {
              const on = (key === "bookings") === showBookings;
              return (
                <button
                  key={key}
                  onClick={() => router.push(href)}
                  className={`-mb-px border-b-2 px-3 pb-3 text-sm font-semibold transition outline-none ${
                    on
                      ? "border-[#B724EA] text-white"
                      : "border-transparent text-white/55 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Details: laid out like the event page, typed into directly */}
          {!showBookings && (
            <div className="grid gap-8 lg:grid-cols-[420px_minmax(0,1fr)] lg:gap-12">
              {/* Left — poster, host and co-hosts */}
              <aside className="min-w-0 space-y-5 lg:sticky lg:top-6 lg:self-start">
                <CoverPoster
                  preview={form.coverImagePreview}
                  title={form.title}
                  mood={form.mood}
                  isPrivate={form.isPrivate}
                  onUpload={handleCoverUpload}
                  onRemove={() => {
                    updateForm("coverImage", null);
                    updateForm("coverImagePreview", null);
                  }}
                />
                {event && (
                  <BoostCard
                    event={event}
                    hostId={host?.id ?? null}
                    autoOpen={searchParams.get("boost") === "1"}
                  />
                )}
                <div className="space-y-3">
                  <div className="border-b border-white/[0.08] pb-2">
                    <h2 className="font-outfit text-base font-semibold text-white">
                      Hosted by
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold text-white ${GRADIENT}`}
                    >
                      {(host?.first_name?.[0] ?? "H").toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {`${host?.first_name ?? ""} ${host?.last_name ?? ""}`.trim() ||
                          "You"}
                      </p>
                      {host?.city && (
                        <p className="truncate text-xs text-white/40">
                          {host.city}
                        </p>
                      )}
                    </div>
                  </div>
                  {event?.id && <CoHostManager eventId={event.id} />}
                </div>
              </aside>

              {/* Right — the event, editable */}
              <div className="min-w-0 space-y-7">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateForm("isPrivate", !form.isPrivate)}
                    title="Tap to switch"
                    className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[13px] font-medium text-white transition hover:border-white/30"
                  >
                    {form.isPrivate ? (
                      <LuLock className="h-3.5 w-3.5 text-[#D8B4FE]" />
                    ) : (
                      <LuGlobe className="h-3.5 w-3.5 text-[#D8B4FE]" />
                    )}
                    {form.isPrivate ? "Private event" : "Public event"}
                  </button>
                  {form.sessionType === "one_on_one" && (
                    <span className="rounded-full border border-white/15 px-3.5 py-1.5 text-[13px] font-medium text-white/75">
                      1:1 session
                    </span>
                  )}
                </div>

                {/* What */}
                <section className="space-y-4">
                  <MoodSelector
                    kind={
                      form.sessionType === "one_on_one"
                        ? "session"
                        : "experience"
                    }
                    value={form.mood}
                    onChange={(v) => updateForm("mood", v)}
                  />
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => updateForm("title", e.target.value)}
                    placeholder="Event name"
                    aria-label="Event name"
                    maxLength={100}
                    className="font-outfit w-full rounded-2xl border border-transparent bg-transparent px-2 py-2 text-[28px] leading-tight font-bold text-white transition outline-none placeholder:text-white/30 hover:bg-white/[0.03] focus:border-white/10 focus:bg-white/[0.05] md:text-[32px]"
                  />
                  <input
                    type="text"
                    value={form.hookLine}
                    onChange={(e) => updateForm("hookLine", e.target.value)}
                    placeholder="A short tagline (optional)"
                    aria-label="Short tagline"
                    maxLength={150}
                    className={INLINE_FIELD}
                  />
                </section>

                {/* When */}
                <section className="space-y-3">
                  {form.sessionType === "group" &&
                    (form.scheduleType === "one_time" ||
                      form.scheduleType === "recurring") && (
                      <div className="flex flex-wrap items-center gap-2">
                        <DatePill
                          value={form.eventDate}
                          onChange={(v) => updateForm("eventDate", v)}
                        />
                        <TimePill
                          value={form.eventTime}
                          onChange={(v) => updateForm("eventTime", v)}
                          placeholder="Start time"
                          ariaLabel="Start time"
                        />
                        <span className="text-white/35">to</span>
                        <TimePill
                          value={form.endTime}
                          onChange={(v) => updateForm("endTime", v)}
                          placeholder="End time"
                          start={form.eventTime || undefined}
                          ariaLabel="End time"
                        />
                      </div>
                    )}

                  {form.sessionType === "group" && (
                    <div className="flex flex-wrap items-center gap-2">
                      {(
                        [
                          ["one_time", "Just once"],
                          ["recurring", "Repeats"],
                          ["custom_dates", "Several dates"],
                        ] as const
                      ).map(([key, label]) => (
                        <Chip
                          key={key}
                          active={form.scheduleType === key}
                          onClick={() => {
                            updateForm("scheduleType", key);
                            updateForm("isRecurring", key === "recurring");
                          }}
                        >
                          {label}
                        </Chip>
                      ))}
                      {form.scheduleType === "recurring" && (
                        <select
                          value={form.recurrenceRule}
                          onChange={(e) =>
                            updateForm("recurrenceRule", e.target.value)
                          }
                          className={INLINE_PICKER}
                          aria-label="How often it repeats"
                        >
                          <option value="">How often?</option>
                          <option value="FREQ=DAILY">Daily</option>
                          <option value="FREQ=WEEKLY">Weekly</option>
                          <option value="FREQ=WEEKLY;INTERVAL=2">
                            Every 2 weeks
                          </option>
                          <option value="FREQ=MONTHLY">Monthly</option>
                          {form.recurrenceRule &&
                            ![
                              "FREQ=DAILY",
                              "FREQ=WEEKLY",
                              "FREQ=WEEKLY;INTERVAL=2",
                              "FREQ=MONTHLY",
                            ].includes(form.recurrenceRule) && (
                              <option value={form.recurrenceRule}>
                                Custom ({form.recurrenceRule})
                              </option>
                            )}
                        </select>
                      )}
                    </div>
                  )}

                  {form.sessionType === "group" &&
                    form.scheduleType === "custom_dates" && (
                      <div className="space-y-2">
                        {form.customDatesList.map((slot, idx) => (
                          <div
                            key={idx}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <DatePill
                              value={slot.date}
                              onChange={(v) => updateCustomSlot(idx, "date", v)}
                              placeholder={`Date ${idx + 1}`}
                            />
                            <TimePill
                              value={slot.time}
                              onChange={(v) => updateCustomSlot(idx, "time", v)}
                              placeholder="Start time"
                              ariaLabel={`Start time ${idx + 1}`}
                            />
                            {form.customDatesList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeCustomSlot(idx)}
                                className="p-1.5 text-white/40 transition hover:text-red-400"
                                aria-label="Remove this date"
                              >
                                <FiX size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addCustomSlot}
                          className="px-2 text-sm font-medium text-[#D8B4FE] transition hover:text-white"
                        >
                          + Add another date
                        </button>
                      </div>
                    )}

                  {form.sessionType === "one_on_one" && (
                    <SessionWindowsEditor
                      windows={form.sessionWindows}
                      onWindowsChange={(windows) =>
                        updateForm("sessionWindows", windows)
                      }
                      breakMinutes={form.breakMinutes}
                      onBreakMinutesChange={(minutes) =>
                        updateForm("breakMinutes", minutes)
                      }
                      durationMinutes={form.durationMinutes}
                      isWeekly={form.sessionIsWeekly}
                      onIsWeeklyChange={(weekly) =>
                        updateForm("sessionIsWeekly", weekly)
                      }
                    />
                  )}

                  {(form.sessionType === "one_on_one" ||
                    form.scheduleType === "custom_dates") && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mr-1 text-sm text-white/55">
                        {form.sessionType === "one_on_one"
                          ? "Each session"
                          : "Each date lasts"}
                      </span>
                      {DURATION_OPTIONS.map((mins) => (
                        <Chip
                          key={mins}
                          active={form.durationMinutes === mins}
                          onClick={() => updateForm("durationMinutes", mins)}
                        >
                          {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                        </Chip>
                      ))}
                    </div>
                  )}
                </section>

                {/* Location */}
                <Section title="Location">
                  {form.isOnline ? (
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.07]">
                        <FiVideo className="h-5 w-5 text-[#D8B4FE]" />
                      </span>
                      <input
                        type="url"
                        value={form.meetingLink}
                        onChange={(e) =>
                          updateForm("meetingLink", e.target.value)
                        }
                        placeholder="Meeting link (Zoom, Google Meet…)"
                        aria-label="Meeting link"
                        className={INLINE_FIELD}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.07]">
                        <FiMapPin className="h-5 w-5 text-[#D8B4FE]" />
                      </span>
                      <LocationSearchInput
                        value={form.location}
                        onChange={(val) => updateForm("location", val)}
                        onSelect={(addr, lat, lng) => {
                          updateForm("location", addr);
                          updateForm(
                            "googleMapsUrl",
                            `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
                          );
                        }}
                        placeholder="Search a place or area"
                        className="!rounded-xl !border-transparent !bg-transparent !px-2 !text-[15px] !ring-0 hover:!bg-white/[0.04] focus:!bg-white/[0.06]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMapPicker(true)}
                        aria-label="Pick on map"
                        title="Pick on map"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-white transition hover:bg-white/15"
                      >
                        <FiMap size={18} />
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => updateForm("isOnline", !form.isOnline)}
                    className="px-2 text-sm font-medium text-white/50 transition hover:text-white"
                  >
                    {form.isOnline
                      ? "Meeting in person instead?"
                      : "Hosting it online instead?"}
                  </button>
                </Section>

                {/* About */}
                <Section title="About the event">
                  <RichTextEditor
                    value={form.description}
                    onChange={(html) => updateForm("description", html)}
                    placeholder="Describe what guests will experience..."
                    maxLength={2000}
                  />
                </Section>

                {/* Tickets */}
                <Section
                  title={
                    form.sessionType === "one_on_one" ? "Price" : "Tickets"
                  }
                >
                  {form.sessionType === "group" && (
                    <Rows>
                      <Row label="Slots">
                        <input
                          type="number"
                          min={1}
                          value={form.maxGroupSize}
                          onChange={(e) =>
                            updateForm(
                              "maxGroupSize",
                              Math.max(1, parseInt(e.target.value) || 1),
                            )
                          }
                          className={ROW_INPUT}
                        />
                      </Row>
                    </Rows>
                  )}
                  <Segmented<"paid" | "free">
                    value={form.isFree ? "free" : "paid"}
                    onChange={(v) => {
                      if (v === "paid" && !isVerified) {
                        setVerifyOpen(true);
                        return;
                      }
                      updateForm("isFree", v === "free");
                    }}
                    options={[
                      {
                        value: "paid",
                        label: isVerified ? (
                          "Paid"
                        ) : (
                          <>
                            <LuLock className="h-3.5 w-3.5" /> Paid
                          </>
                        ),
                      },
                      { value: "free", label: "Free" },
                    ]}
                  />
                  {!isVerified && (
                    <p className="px-1 text-xs leading-5 text-white/50">
                      Free hosts can run free events for up to{" "}
                      {FREE_HOST_LIMITS.maxGuests} guests.{" "}
                      <button
                        type="button"
                        onClick={() => setVerifyOpen(true)}
                        className="font-semibold text-[#D8B4FE] hover:text-white"
                      >
                        Get verified to sell tickets
                      </button>
                    </p>
                  )}
                  {!form.isFree && !form.useTiers && (
                    <Rows>
                      <Row label="Price per person (₹)">
                        <input
                          type="number"
                          min={0}
                          value={form.priceCents / 100}
                          onChange={(e) =>
                            updateForm(
                              "priceCents",
                              Math.round(parseFloat(e.target.value) * 100) || 0,
                            )
                          }
                          className={ROW_INPUT}
                        />
                      </Row>
                    </Rows>
                  )}
                </Section>

                {/* Everything optional, folded away */}
                <Section
                  title="More options"
                  hint="All optional. Open one to change it."
                >
                  <div>
                    <MoreOptions
                      title="Who can see it"
                      summary={form.isPrivate ? "Private" : "Public"}
                      defaultOpen={form.isPrivate}
                    >
                      <Segmented<"public" | "private">
                        value={form.isPrivate ? "private" : "public"}
                        onChange={(v) =>
                          updateForm("isPrivate", v === "private")
                        }
                        options={[
                          { value: "public", label: "Public" },
                          { value: "private", label: "Private" },
                        ]}
                      />
                      {form.isPrivate && (
                        <PrivacyAccessSection
                          isPrivate={form.isPrivate}
                          privateAccessMode={form.privateAccessMode}
                          accessMode={form.accessMode}
                          accessPasskey={form.accessPasskey}
                          canGenerateCodes
                          onChange={(patch) =>
                            setForm((prev) => ({ ...prev, ...patch }))
                          }
                        />
                      )}
                      {host?.id && event?.id && form.isPrivate && (
                        <CouponsManager
                          eventId={event.id}
                          hostId={host.id}
                          kind="access"
                        />
                      )}
                    </MoreOptions>

                    <MoreOptions
                      title="Refunds & payout"
                      summary={refundPayoutSummary(
                        form.cancellationPolicy,
                        form.payoutMode,
                      )}
                    >
                      <PayoutTimingFields
                        hostId={host?.id ?? null}
                        isFree={form.isFree}
                        policy={form.cancellationPolicy}
                        mode={form.payoutMode}
                        onChange={(patch) =>
                          setForm((prev) => ({
                            ...prev,
                            ...(patch.policy !== undefined && {
                              cancellationPolicy: patch.policy,
                            }),
                            ...(patch.mode !== undefined && {
                              payoutMode: patch.mode,
                            }),
                          }))
                        }
                      />
                    </MoreOptions>

                    {!form.isFree && (
                      <MoreOptions
                        title="Ticket types & monthly pass"
                        summary={
                          form.useTiers
                            ? `${form.priceTiers.length} ticket types`
                            : form.monthlyPassEnabled
                              ? "One price · pass on"
                              : "One price"
                        }
                      >
                        <Segmented<"single" | "tiers">
                          value={form.useTiers ? "tiers" : "single"}
                          onChange={(v) =>
                            updateForm("useTiers", v === "tiers")
                          }
                          options={[
                            { value: "single", label: "Single price" },
                            { value: "tiers", label: "Multiple ticket types" },
                          ]}
                        />
                        {form.useTiers && (
                          <div className="space-y-2">
                            {form.priceTiers.map((tier, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <input
                                  type="text"
                                  value={tier.name}
                                  onChange={(e) =>
                                    updatePriceTier(
                                      index,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Ticket name, e.g. VIP"
                                  className={`${FIELD} !py-2.5`}
                                />
                                <input
                                  type="number"
                                  min={0}
                                  value={tier.priceStr}
                                  onChange={(e) =>
                                    updatePriceTier(
                                      index,
                                      "priceStr",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="₹ Price"
                                  className={`${FIELD} !w-32 !py-2.5`}
                                />
                                {form.priceTiers.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removePriceTier(index)}
                                    className="p-1.5 text-white/40 transition hover:text-red-400"
                                    aria-label="Remove ticket type"
                                  >
                                    <FiX className="h-5 w-5" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <AddPill onClick={addPriceTier}>
                              Add another ticket type
                            </AddPill>
                          </div>
                        )}
                        <ToggleRow
                          label="Monthly pass"
                          hint={
                            form.scheduleType === "one_time"
                              ? "Repeating or several-dates events only."
                              : "Guests pay once and attend for 30 days."
                          }
                          checked={form.monthlyPassEnabled}
                          disabled={form.scheduleType === "one_time"}
                          onChange={(next) =>
                            updateForm("monthlyPassEnabled", next)
                          }
                        />
                        {form.monthlyPassEnabled &&
                          form.scheduleType !== "one_time" && (
                            <Rows>
                              <Row label="Pass price (₹)">
                                <input
                                  type="number"
                                  min={1}
                                  value={form.monthlyPassPriceStr}
                                  onChange={(e) =>
                                    updateForm(
                                      "monthlyPassPriceStr",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="2500"
                                  className={ROW_INPUT}
                                />
                              </Row>
                              <Row label="Sessions included">
                                <input
                                  type="number"
                                  min={1}
                                  value={form.monthlyPassSessionsStr}
                                  onChange={(e) =>
                                    updateForm(
                                      "monthlyPassSessionsStr",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="All"
                                  className={ROW_INPUT}
                                />
                              </Row>
                              <Row label="Passes available">
                                <input
                                  type="number"
                                  min={1}
                                  value={form.monthlyPassCapacityStr}
                                  onChange={(e) =>
                                    updateForm(
                                      "monthlyPassCapacityStr",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Unlimited"
                                  className={ROW_INPUT}
                                />
                              </Row>
                            </Rows>
                          )}
                        {form.monthlyPassEnabled && (
                          <PassHoldersPanel eventId={id} />
                        )}
                      </MoreOptions>
                    )}

                    {host?.id && event?.id && !form.isFree && (
                      <MoreOptions
                        title="Coupons & free codes"
                        summary="Discounts and comps"
                      >
                        <CouponsManager
                          eventId={event.id}
                          hostId={host.id}
                          kind="discount"
                        />
                        <CouponsManager
                          eventId={event.id}
                          hostId={host.id}
                          kind="free"
                        />
                      </MoreOptions>
                    )}

                    <MoreOptions
                      title="More photos"
                      summary={
                        form.galleryPreviews.length
                          ? `${form.galleryPreviews.length} added`
                          : "None"
                      }
                    >
                      <ImageUpload
                        label=""
                        multiple
                        previews={form.galleryPreviews}
                        onUpload={handleGalleryUpload}
                        onRemoveMultiple={removeGalleryImage}
                      />
                    </MoreOptions>

                    <MoreOptions
                      title="Guest details at booking"
                      summary={
                        form.requiresAttendeeDetails
                          ? `${form.attendeeFields.length} field${form.attendeeFields.length === 1 ? "" : "s"} required`
                          : "Off"
                      }
                    >
                      <AttendeeDetailsConfig
                        enabled={form.requiresAttendeeDetails}
                        fields={form.attendeeFields}
                        onToggle={(next) =>
                          updateForm("requiresAttendeeDetails", next)
                        }
                        onFieldsChange={(next) =>
                          updateForm("attendeeFields", next)
                        }
                      />
                    </MoreOptions>

                    <MoreOptions title="Delete experience" summary="">
                      <p className="text-sm text-white/55">
                        Removes this experience for good. Confirmed bookings are
                        refunded.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 rounded-full border border-rose-400/25 bg-rose-500/[0.08] px-5 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/[0.14]"
                      >
                        <FiTrash2 size={16} /> Delete experience
                      </button>
                    </MoreOptions>
                  </div>
                </Section>

                {/* Save: one floating pill under the form */}
                <div className="msm-publish-bar sticky bottom-[max(16px,env(safe-area-inset-bottom))] z-30 mt-10">
                  <div className="flex w-full gap-2 rounded-[28px] border border-white/10 bg-[#121426]/90 p-2 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                    {event?.status === "draft" ? (
                      <>
                        <button
                          onClick={() => void handleUpdate(false)}
                          disabled={isSubmitting}
                          className="shrink-0 rounded-full px-4 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                        >
                          Save draft
                        </button>
                        <button
                          onClick={() => void handleUpdate(true)}
                          disabled={isSubmitting}
                          className={`flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 ${GRADIENT}`}
                        >
                          <FiCheck size={18} />
                          {isSubmitting ? "Saving..." : "Publish event"}
                        </button>
                      </>
                    ) : (
                      <>
                        {event?.slug && (
                          <a
                            href={`/experience/${event.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 rounded-full px-4 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/[0.06] hover:text-white"
                          >
                            View event
                          </a>
                        )}
                        <button
                          onClick={() => void handleUpdate(false)}
                          disabled={isSubmitting}
                          className={`flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 ${GRADIENT}`}
                        >
                          <FiCheck size={18} />
                          {isSubmitting ? "Saving..." : "Save changes"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bookings */}
          {showBookings && (
            <div className="rounded-3xl border border-white/[0.08] bg-[#121426]/80 p-6">
              <h2 className="font-outfit mb-4 text-lg font-semibold text-white">
                Bookings
              </h2>
              <AttendeesList
                eventId={id}
                isRecurring={form.isRecurring}
                event={event}
              />
            </div>
          )}
        </div>
      </main>

      <MapPickerModal
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelect={(lat, lng, addr) => {
          updateForm("location", addr);
          updateForm(
            "googleMapsUrl",
            `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
          );
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="msm-modal fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#121426] p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
              <FiTrash2 className="text-red-300" size={24} />
            </div>
            <h2 className="mb-2 text-xl font-bold text-white">
              Delete Experience?
            </h2>
            <p className="mb-6 text-[#A5A8C3]">
              This will permanently delete your experience. All confirmed
              bookings will be refunded.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg bg-white/[0.06] py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex-1 rounded-lg bg-red-600 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <VerifyToEarnSheet
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        applicationStatus={applicationStatus}
      />
      <ImageCropModal
        file={cropQueue.length > 0 ? cropQueue[0]! : null}
        aspect={4 / 5}
        onClose={() => setCropQueue([])}
        onConfirm={handleCropConfirm}
      />
    </>
  );
}
