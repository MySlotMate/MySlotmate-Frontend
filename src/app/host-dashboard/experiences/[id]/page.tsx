/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
"use client";

import { useEffect, useState, useRef, use, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HostNavbar } from "~/components/host-dashboard";
import AttendeeDetailsConfig from "~/components/host-dashboard/AttendeeDetailsConfig";
import PrivacyAccessSection from "~/components/host/PrivacyAccessSection";
import CouponsManager from "~/components/host/CouponsManager";
import Breadcrumb from "~/components/Breadcrumb";
import { RichTextEditor } from "~/components/RichTextEditor";
import {
  useMyHost,
  useEvent,
  useUpdateEvent,
  useUploadFiles,
  usePublishEvent,
} from "~/hooks/useApi";
import { useDragDrop } from "~/hooks/useDragDrop";
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
} from "react-icons/fi";
import { getEvent, type BookingDTO } from "~/lib/api";
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
import { toast } from "sonner";
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
  requiresAttendeeDetails: boolean;
  attendeeFields: string[];
  isPrivate: boolean;
  accessMode: "shared" | "unique";
  accessPasskey: string;
  passkeyGrantsFree: boolean;
}

const MOODS = [
  "Adventurous",
  "Relaxing",
  "Creative",
  "Social",
  "Educational",
  "Wellness",
  "Culinary",
  "Cultural",
];

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
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {helpText && <p className="text-xs text-gray-500">{helpText}</p>}

      {!multiple && preview && (
        <div className="relative inline-block w-full max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            loading="lazy"
            className="aspect-[16/9] w-full rounded-lg object-cover"
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
            {/* Photos are cropped to 16:9 on upload, so this preview matches the
                fixed 16:9 frame the live experience page renders them in. */}
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-gray-100">
              {/* Main Image */}
              <img
                src={previews[currentImageIndex]}
                alt={`Cover photo preview ${currentImageIndex + 1}`}
                loading="lazy"
                className="block h-full w-full object-cover transition-opacity duration-300"
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
                    className="absolute top-1/2 left-4 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2.5 opacity-0 shadow-md transition group-hover:opacity-100 hover:bg-white"
                    aria-label="Previous image"
                  >
                    <svg
                      className="h-4 w-4 text-gray-800"
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
                    className="absolute top-1/2 right-4 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2.5 opacity-0 shadow-md transition group-hover:opacity-100 hover:bg-white"
                    aria-label="Next image"
                  >
                    <svg
                      className="h-4 w-4 text-gray-800"
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
                    ? "border-[#0094CA]"
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
              ? "scale-105 border-[#0094CA] bg-[#0094CA]/5"
              : "border-gray-300 hover:border-[#0094CA] hover:bg-gray-50"
          }`}
        >
          <FiUpload
            className={`mx-auto mb-2 transition ${isDragging ? "text-[#0094CA]" : "text-gray-400"}`}
            size={24}
          />
          <p
            className={`text-sm transition ${isDragging ? "font-semibold text-[#0094CA]" : "text-gray-500"}`}
          >
            {isDragging
              ? `Drop ${multiple ? "images" : "image"} here`
              : `Click to upload or drag ${multiple ? "images" : "image"}`}
          </p>
          <p className="mt-1 text-xs text-gray-400">PNG, JPG up to 5MB</p>
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
    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 first:border-t-0">
      <div className="flex min-w-0 items-center gap-3">
        {attendee.user_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attendee.user_avatar_url}
            alt={attendee.user_name ?? ""}
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0094CA]/10 text-sm font-semibold text-[#0094CA]">
            {(attendee.user_name ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">
            {attendee.user_name ?? "Unknown user"}
          </p>
          {attendee.user_email && (
            <p className="truncate text-xs text-gray-500">
              {attendee.user_email}
            </p>
          )}
          <p className="text-xs text-gray-500">
            Qty: {attendee.quantity}
            {attendee.amount_cents !== null && (
              <span className="ml-2 text-gray-400">
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
              ? "bg-yellow-100 text-yellow-800"
              : attendee.status === "confirmed"
                ? "bg-green-100 text-green-800"
                : attendee.status === "cancelled"
                  ? "bg-red-100 text-red-800"
                  : attendee.status === "refunded"
                    ? "bg-orange-100 text-orange-800"
                    : "bg-gray-100 text-gray-800"
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
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 transition hover:border-[#0094CA] hover:text-[#0094CA] disabled:opacity-50"
          title="Download Ticket PDF"
        >
          {downloadingTicket ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#0094CA] border-t-transparent" />
          ) : (
            <FiDownload className="h-3 w-3 text-gray-500" />
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
      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {bookings.map((b) => (
          <AttendeeRow key={b.id} attendee={b} event={event} />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 bg-gray-50 px-4 py-3 text-left transition hover:bg-gray-100"
      >
        {open ? (
          <FiChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <FiChevronRight className="h-4 w-4 text-gray-400" />
        )}
        <FiCalendar className="h-4 w-4 text-[#0094CA]" />
        <span className="text-sm font-semibold text-gray-900">{dateLabel}</span>
        {isPast && (
          <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
            past
          </span>
        )}
        <span className="ml-auto flex items-center gap-3 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <FiUsers className="h-3.5 w-3.5" />
            {totalGuests} guest{totalGuests === 1 ? "" : "s"}
          </span>
          {revenueCents > 0 && (
            <span className="font-medium text-gray-700">
              ₹{(revenueCents / 100).toFixed(2)}
            </span>
          )}
          <span className="text-gray-400">
            {bookings.length} booking{bookings.length === 1 ? "" : "s"}
          </span>
        </span>
      </button>
      {open && (
        <div className="bg-white">
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
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/events/${eventId}/attendees`,
        );
        if (response.ok) {
          const data = (await response.json()) as { data: BookingDTO[] };
          setAttendees(data.data ?? []);
        }
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
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-[#0094CA]" />
      </div>
    );
  }

  if (!attendees || attendees.length === 0) {
    return <p className="py-8 text-center text-gray-500">No bookings yet</p>;
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
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <span className="text-xs text-gray-500">
          Total Bookings:{" "}
          <strong className="text-gray-900">{attendees.length}</strong>
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
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
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
    requiresAttendeeDetails: false,
    attendeeFields: [],
    isPrivate: false,
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
        requiresAttendeeDetails: event.requires_attendee_details ?? false,
        attendeeFields: event.attendee_fields ?? [],
        isPrivate: event.is_private ?? false,
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
    return null;
  };

  const handleUpdate = async (publishAfter = false) => {
    if (!host?.id || !event?.id) {
      toast.error("Unable to update event");
      return;
    }

    // A shared-passkey private event is unbookable without its passkey. (Unique
    // mode needs no passkey — access comes from the per-guest codes.)
    if (
      form.isPrivate &&
      form.accessMode === "shared" &&
      !form.accessPasskey.trim()
    ) {
      toast.error("A private experience needs a passkey");
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
          requires_attendee_details: form.requiresAttendeeDetails,
          attendee_fields: form.requiresAttendeeDetails
            ? form.attendeeFields
            : [],
          is_private: form.isPrivate,
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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/events/${event.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ host_id: host.id }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete event");
      }

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
      <div className="min-h-screen bg-gray-50">
        <HostNavbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0094CA] border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <>
      <HostNavbar />

      <main className="min-h-screen bg-gray-50 pb-24">
        <div className="site-x mx-auto max-w-4xl py-8">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Dashboard", href: "/host-dashboard" },
              { label: "Experiences", href: "/host-dashboard/experiences" },
              { label: "Edit" },
            ]}
            className="mb-6"
          />

          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => router.push("/host-dashboard/experiences")}
              className="rounded-lg p-2 transition hover:bg-gray-100"
            >
              <FiArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Edit Experience
              </h1>
              <p className="text-sm text-gray-500">
                Update your experience details
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-4 border-b border-gray-200">
            <button
              onClick={() => router.push(`/host-dashboard/experiences/${id}`)}
              className={`px-1 pb-3 font-medium transition ${
                !showBookings
                  ? "border-b-2 border-[#0094CA] text-[#0094CA]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Details
            </button>
            <button
              onClick={() =>
                router.push(`/host-dashboard/experiences/${id}?tab=bookings`)
              }
              className={`px-1 pb-3 font-medium transition ${
                showBookings
                  ? "border-b-2 border-[#0094CA] text-[#0094CA]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Bookings
            </button>
          </div>

          {/* Details Tab */}
          {!showBookings && (
            <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Experience Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  placeholder="e.g., Morning Yoga by the Beach"
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                  maxLength={100}
                />
                <p className="text-xs text-gray-400">
                  {form.title.length}/100 characters
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Hook Line
                </label>
                <input
                  type="text"
                  value={form.hookLine}
                  onChange={(e) => updateForm("hookLine", e.target.value)}
                  placeholder="A short catchy phrase to attract guests"
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                  maxLength={150}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Mood
                </label>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((mood) => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => updateForm("mood", mood.toLowerCase())}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        form.mood === mood.toLowerCase()
                          ? "bg-[#0094CA] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <RichTextEditor
                  value={form.description}
                  onChange={(html) => updateForm("description", html)}
                  placeholder="Describe your experience..."
                  maxLength={2000}
                />
              </div>

              {/* Schedule & Pricing Section */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="mb-4 text-base font-semibold text-gray-900">
                  Schedule & Pricing
                </h3>

                {/* Schedule Type Selection Tabs */}
                <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <button
                    type="button"
                    onClick={() => {
                      updateForm("scheduleType", "one_time");
                      updateForm("isRecurring", false);
                      updateForm("sessionType", "group");
                    }}
                    className={`rounded-xl border p-3.5 text-left transition ${
                      form.sessionType === "group" &&
                      form.scheduleType === "one_time"
                        ? "border-[#0094CA] bg-[#0094CA]/5 font-semibold text-[#0094CA]"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-sm font-medium">One-Time Event</div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      Single specific date & time
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateForm("scheduleType", "recurring");
                      updateForm("isRecurring", true);
                      updateForm("sessionType", "group");
                    }}
                    className={`rounded-xl border p-3.5 text-left transition ${
                      form.sessionType === "group" &&
                      form.scheduleType === "recurring"
                        ? "border-[#0094CA] bg-[#0094CA]/5 font-semibold text-[#0094CA]"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-sm font-medium">Recurring</div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      Repeats daily, weekly, or monthly
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateForm("scheduleType", "custom_dates");
                      updateForm("isRecurring", false);
                      updateForm("sessionType", "group");
                    }}
                    className={`rounded-xl border p-3.5 text-left transition ${
                      form.sessionType === "group" &&
                      form.scheduleType === "custom_dates"
                        ? "border-[#0094CA] bg-[#0094CA]/5 font-semibold text-[#0094CA]"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-sm font-medium">Custom Dates</div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      Pick dynamic dates (e.g. Aug 15, 22, Sept 5)
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateForm("sessionType", "one_on_one");
                      updateForm("scheduleType", "custom_dates");
                      updateForm("isRecurring", false);
                    }}
                    className={`rounded-xl border p-3.5 text-left transition ${
                      form.sessionType === "one_on_one"
                        ? "border-[#0094CA] bg-[#0094CA]/5 font-semibold text-[#0094CA]"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-sm font-medium">One-on-One</div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      Set your hours, we split them into 1:1 slots
                    </div>
                  </button>
                </div>

                {/* Standard One-Time & Recurring Inputs */}
                {form.sessionType === "group" &&
                  (form.scheduleType === "one_time" ||
                    form.scheduleType === "recurring") && (
                    <>
                      {/* Date */}
                      <div className="mb-4 space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Event Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={form.eventDate}
                          onChange={(e) =>
                            updateForm("eventDate", e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                        />
                      </div>

                      {/* Time */}
                      <div className="mb-4 grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Start Time <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="time"
                            value={form.eventTime}
                            onChange={(e) =>
                              updateForm("eventTime", e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            End Time
                          </label>
                          <input
                            type="time"
                            value={form.endTime}
                            onChange={(e) =>
                              updateForm("endTime", e.target.value)
                            }
                            placeholder="Optional - auto-calculated from duration if not set"
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                          />
                        </div>
                      </div>

                      {form.scheduleType === "recurring" && (
                        <div className="mb-4 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <label className="block text-sm font-medium text-gray-700">
                            Recurrence Frequency{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={form.recurrenceRule}
                            onChange={(e) =>
                              updateForm("recurrenceRule", e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                          >
                            <option value="">Select frequency</option>
                            <option value="FREQ=DAILY">Daily</option>
                            <option value="FREQ=WEEKLY">Weekly</option>
                            <option value="FREQ=WEEKLY;INTERVAL=2">
                              Every 2 weeks
                            </option>
                            <option value="FREQ=MONTHLY">Monthly</option>
                          </select>
                        </div>
                      )}
                    </>
                  )}

                {/* Dynamic Custom Selected Dates Inputs */}
                {form.sessionType === "group" &&
                  form.scheduleType === "custom_dates" && (
                    <div className="mb-6 space-y-4 rounded-xl border border-[#0094CA]/30 bg-[#0094CA]/5 p-5">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">
                          Selected Specific Dates & Times
                        </h4>
                        <p className="text-xs text-gray-500">
                          Add the specific dates and times when this experience
                          will take place.
                        </p>
                      </div>

                      {form.customDatesList.map((slot, idx) => (
                        <div
                          key={idx}
                          className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                        >
                          <div className="min-w-[150px] flex-1">
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                              Date
                            </label>
                            <input
                              type="date"
                              value={slot.date}
                              onChange={(e) =>
                                updateCustomSlot(idx, "date", e.target.value)
                              }
                              min={new Date().toISOString().split("T")[0]}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0094CA]"
                            />
                          </div>
                          <div className="w-36 min-w-[120px]">
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                              Start Time
                            </label>
                            <input
                              type="time"
                              value={slot.time}
                              onChange={(e) =>
                                updateCustomSlot(idx, "time", e.target.value)
                              }
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0094CA]"
                            />
                          </div>
                          {form.customDatesList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCustomSlot(idx)}
                              className="mt-5 p-2 text-gray-400 transition hover:text-red-500"
                              title="Remove slot"
                            >
                              <FiX size={18} />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={addCustomSlot}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0094CA] hover:underline"
                      >
                        + Add Another Date
                      </button>
                    </div>
                  )}

                {form.sessionType === "one_on_one" && (
                  <div className="mb-6">
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
                  </div>
                )}

                {/* Duration */}
                <div className="mb-4 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Duration (minutes) <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    {/* Quick Select Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {DURATION_OPTIONS.map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => updateForm("durationMinutes", mins)}
                          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                            form.durationMinutes === mins
                              ? "bg-[#0094CA] text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                        </button>
                      ))}
                    </div>
                    {/* Custom Input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={15}
                        step={5}
                        value={form.durationMinutes}
                        onChange={(e) =>
                          updateForm(
                            "durationMinutes",
                            Math.max(15, parseInt(e.target.value) || 30),
                          )
                        }
                        className="flex-1 rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                        placeholder="Enter custom duration"
                      />
                      <span className="text-sm font-medium text-gray-600">
                        min
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Click quick options or enter custom duration (minimum 15
                      min)
                    </p>
                  </div>
                </div>

                {/* Pricing */}
                <div className="mb-4 space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.isFree}
                      onChange={(e) => updateForm("isFree", e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Free Experience
                    </span>
                  </label>
                </div>

                {!form.isFree && (
                  <div className="mb-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateForm("useTiers", false)}
                      className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${!form.useTiers ? "bg-[#0094CA] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    >
                      Single price
                    </button>
                    <button
                      type="button"
                      onClick={() => updateForm("useTiers", true)}
                      className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${form.useTiers ? "bg-[#0094CA] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    >
                      Multiple ticket types
                    </button>
                  </div>
                )}

                {!form.isFree && !form.useTiers && (
                  <div className="mb-4 space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      value={form.priceCents / 100}
                      onChange={(e) =>
                        updateForm(
                          "priceCents",
                          Math.round(parseFloat(e.target.value) * 100) || 0,
                        )
                      }
                      placeholder="e.g., 500"
                      min="0"
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                    />
                  </div>
                )}

                {!form.isFree && form.useTiers && (
                  <div className="mb-4 space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Ticket types
                    </label>
                    {form.priceTiers.map((tier, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={tier.name}
                          onChange={(e) =>
                            updatePriceTier(index, "name", e.target.value)
                          }
                          placeholder="e.g. General, VIP"
                          className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                        />
                        <input
                          type="number"
                          value={tier.priceStr}
                          onChange={(e) =>
                            updatePriceTier(index, "priceStr", e.target.value)
                          }
                          placeholder="₹ Price"
                          min="0"
                          className="w-32 rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                        />
                        {form.priceTiers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePriceTier(index)}
                            className="text-gray-400 transition hover:text-red-500"
                            aria-label="Remove ticket type"
                          >
                            <FiX className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addPriceTier}
                      className="text-sm font-semibold text-[#0094CA] hover:underline"
                    >
                      + Add ticket type
                    </button>
                  </div>
                )}

                {/* Group Size */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Min Group Size
                    </label>
                    <input
                      type="number"
                      value={form.minGroupSize}
                      onChange={(e) =>
                        updateForm(
                          "minGroupSize",
                          parseInt(e.target.value) || 1,
                        )
                      }
                      min="1"
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Max Group Size
                    </label>
                    <input
                      type="number"
                      value={form.maxGroupSize}
                      onChange={(e) =>
                        updateForm(
                          "maxGroupSize",
                          parseInt(e.target.value) || 10,
                        )
                      }
                      min="1"
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                    />
                  </div>
                </div>
                <p className="mt-2 mb-4 text-xs text-gray-500">
                  <span className="font-medium">Max group size</span> = total
                  spots that can book this session (the event capacity).
                </p>

                {/* Location Type */}
                <div className="mb-4 space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.isOnline}
                      onChange={(e) => updateForm("isOnline", e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Online Experience
                    </span>
                  </label>
                </div>

                {form.isOnline ? (
                  <div className="mb-4 space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Meeting Link
                    </label>
                    <input
                      type="url"
                      value={form.meetingLink}
                      onChange={(e) =>
                        updateForm("meetingLink", e.target.value)
                      }
                      placeholder="e.g., https://zoom.us/j/... or https://meet.google.com/..."
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                    />
                  </div>
                ) : (
                  <>
                    <div className="mb-4 space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Location <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.location}
                        onChange={(e) => updateForm("location", e.target.value)}
                        placeholder="e.g., Central Park, New York"
                        className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                      />
                    </div>
                    <div className="mb-4 space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Google Maps URL
                      </label>
                      <input
                        type="url"
                        value={form.googleMapsUrl}
                        onChange={(e) =>
                          updateForm("googleMapsUrl", e.target.value)
                        }
                        placeholder="https://maps.google.com/..."
                        className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                      />
                    </div>
                  </>
                )}

                {/* Cancellation Policy */}
                <div className="mb-4 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Cancellation Policy
                  </label>
                  <select
                    value={form.cancellationPolicy}
                    onChange={(e) =>
                      updateForm("cancellationPolicy", e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                  >
                    <option value="flexible">
                      Flexible - Full refund up to 24 hours before
                    </option>
                    <option value="moderate">
                      Moderate - Full refund up to 5 days before
                    </option>
                    <option value="strict">
                      Strict - 50% refund up to 1 week before
                    </option>
                    <option value="no_refund">
                      No Refund - Non-refundable once booked
                    </option>
                  </select>
                </div>

                {/* Attendee Details */}
                <div className="mb-4">
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
                </div>

                {/* Privacy & Access */}
                <div className="mb-4">
                  <PrivacyAccessSection
                    isPrivate={form.isPrivate}
                    accessMode={form.accessMode}
                    accessPasskey={form.accessPasskey}
                    canGenerateCodes
                    onChange={(patch) =>
                      setForm((prev) => ({ ...prev, ...patch }))
                    }
                  />
                </div>

                {/* Passkey codes — per-guest access (private events) */}
                {host?.id && event?.id && form.isPrivate && (
                  <div className="mb-4 border-t border-gray-100 pt-6">
                    <CouponsManager
                      eventId={event.id}
                      hostId={host.id}
                      kind="access"
                    />
                  </div>
                )}

                {/* Free-booking codes — comp specific guests (paid events) */}
                {host?.id && event?.id && !form.isFree && (
                  <div className="mb-4 border-t border-gray-100 pt-6">
                    <CouponsManager
                      eventId={event.id}
                      hostId={host.id}
                      kind="free"
                    />
                  </div>
                )}

                {/* Recurring */}
                <div className="mb-4 space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.isRecurring}
                      onChange={(e) =>
                        updateForm("isRecurring", e.target.checked)
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Recurring Experience
                    </span>
                  </label>
                </div>

                {form.isRecurring && (
                  <div className="mb-4 space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Recurrence Rule
                    </label>
                    <input
                      type="text"
                      value={form.recurrenceRule}
                      onChange={(e) =>
                        updateForm("recurrenceRule", e.target.value)
                      }
                      placeholder="e.g., FREQ=WEEKLY;BYDAY=MO,WE,FR"
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 text-xs outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                    />
                    <p className="text-xs text-gray-500">
                      Use iCalendar format for recurrence rules
                    </p>
                  </div>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <ImageUpload
                  label="Profile Image"
                  helpText="This will be the main profile image shown on cards"
                  preview={form.coverImagePreview}
                  onUpload={handleCoverUpload}
                  onRemove={() => {
                    updateForm("coverImage", null);
                    updateForm("coverImagePreview", null);
                  }}
                />
                <ImageUpload
                  label="Cover Image"
                  helpText="Add cover and gallery photos for the experience"
                  multiple
                  previews={form.galleryPreviews}
                  onUpload={handleGalleryUpload}
                  onRemoveMultiple={removeGalleryImage}
                />
              </div>

              <div className="flex flex-wrap gap-4 border-t border-gray-100 pt-6">
                <button
                  onClick={() => void handleUpdate(false)}
                  disabled={isSubmitting}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 font-semibold transition disabled:opacity-50 ${
                    event?.status === "draft"
                      ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      : "bg-[#0094CA] text-white hover:bg-[#007ba8]"
                  }`}
                >
                  <FiCheck size={18} />
                  {event?.status === "draft" ? "Save Draft" : "Save Changes"}
                </button>

                {event?.status === "draft" && (
                  <button
                    onClick={() => void handleUpdate(true)}
                    disabled={isSubmitting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0094CA] py-3 font-semibold text-white transition hover:bg-[#007ba8] disabled:opacity-50"
                  >
                    <FiCheck size={18} />
                    Publish Now
                  </button>
                )}

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center justify-center gap-2 rounded-lg bg-red-50 px-6 py-3 font-semibold text-red-600 transition hover:bg-red-100"
                >
                  <FiTrash2 size={18} />
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Bookings Tab */}
          {showBookings && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Event Bookings
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <FiTrash2 className="text-red-600" size={24} />
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Delete Experience?
            </h2>
            <p className="mb-6 text-gray-500">
              This will permanently delete your experience. All confirmed
              bookings will be refunded.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg bg-gray-100 py-3 font-semibold text-gray-900 transition hover:bg-gray-200"
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

      <ImageCropModal
        file={cropQueue.length > 0 ? cropQueue[0]! : null}
        aspect={16 / 9}
        onClose={() => setCropQueue([])}
        onConfirm={handleCropConfirm}
      />
    </>
  );
}
