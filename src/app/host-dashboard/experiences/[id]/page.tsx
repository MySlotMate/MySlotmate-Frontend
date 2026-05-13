"use client";

import { useEffect, useState, useRef, use, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HostNavbar } from "~/components/host-dashboard";
import Breadcrumb from "~/components/Breadcrumb";
import {
  useMyHost,
  useEvent,
  useUpdateEvent,
  useUploadFiles,
} from "~/hooks/useApi";
import { useDragDrop } from "~/hooks/useDragDrop";
import { FiArrowLeft, FiX, FiUpload, FiTrash2, FiCheck, FiChevronDown, FiChevronRight, FiCalendar, FiUsers } from "react-icons/fi";
import type { BookingDTO } from "~/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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
  eventDate: string;
  eventTime: string;
  endTime: string;
  isRecurring: boolean;
  recurrenceRule: string;
  cancellationPolicy: string;
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
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            loading="lazy"
            className="h-40 w-full max-w-xs rounded-lg object-cover"
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
        <div className="mb-2 flex flex-wrap gap-2">
          {previews.map((p, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p}
                alt={`Gallery ${i + 1}`}
                loading="lazy"
                className="h-20 w-20 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => onRemoveMultiple?.(i)}
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
              >
                <FiX size={12} />
              </button>
            </div>
          ))}
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

function AttendeeRow({ attendee }: { attendee: BookingDTO }) {
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
            <p className="truncate text-xs text-gray-500">{attendee.user_email}</p>
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
    </div>
  );
}

function SessionGroup({
  occurrenceDate,
  bookings,
  defaultOpen,
  isRecurring,
}: {
  occurrenceDate: string;
  bookings: BookingDTO[];
  defaultOpen: boolean;
  isRecurring: boolean;
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
          <AttendeeRow key={b.id} attendee={b} />
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
            <AttendeeRow key={b.id} attendee={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function AttendeesList({
  eventId,
  isRecurring,
}: {
  eventId: string;
  isRecurring: boolean;
}) {
  const [attendees, setAttendees] = useState<BookingDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    <div className="space-y-3">
      {sortedKeys.map((key) => (
        <SessionGroup
          key={key}
          occurrenceDate={key}
          bookings={groups.get(key)!}
          defaultOpen={key === firstUpcomingKey}
          isRecurring={isRecurring}
        />
      ))}
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
    eventDate: "",
    eventTime: "",
    endTime: "",
    isRecurring: false,
    recurrenceRule: "",
    cancellationPolicy: "flexible",
  });

  useEffect(() => {
    setUserId(localStorage.getItem("msm_user_id"));
    setIsHydrated(true);
  }, []);

  const { data: host, isLoading: hostLoading } = useMyHost(userId);
  const { data: event, isLoading: eventLoading } = useEvent(id);
  const updateEvent = useUpdateEvent();
  const uploadFiles = useUploadFiles();
  const queryClient = useQueryClient();

  // Populate form when event loads
  useEffect(() => {
    if (event) {
      const [dateStr, timeStr] = (event.time ?? "").split("T");
      const endTime = event.end_time
        ? new Date(event.end_time).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "";

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
        eventDate: dateStr ?? "",
        eventTime: timeStr?.slice(0, 5) ?? "",
        endTime: endTime ?? "",
        isRecurring: event.is_recurring ?? false,
        recurrenceRule: event.recurrence_rule ?? "",
        cancellationPolicy: event.cancellation_policy ?? "flexible",
      });
    }
  }, [event]);

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

  const handleCoverUpload = (files: File[]) => {
    const file = files[0];
    if (file) {
      updateForm("coverImage", file);
      updateForm("coverImagePreview", URL.createObjectURL(file));
    }
  };

  const handleGalleryUpload = (files: File[]) => {
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    updateForm("galleryImages", [...form.galleryImages, ...files]);
    updateForm("galleryPreviews", [...form.galleryPreviews, ...newPreviews]);
  };

  const removeGalleryImage = (index: number) => {
    URL.revokeObjectURL(form.galleryPreviews[index]!);
    updateForm(
      "galleryImages",
      form.galleryImages.filter((_, i) => i !== index),
    );
    updateForm(
      "galleryPreviews",
      form.galleryPreviews.filter((_, i) => i !== index),
    );
  };

  const handleUpdate = async () => {
    if (!host?.id || !event?.id) {
      toast.error("Unable to update event");
      return;
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

      const eventDateTime = new Date(`${form.eventDate}T${form.eventTime}`);
      let endDateTime: Date | undefined;
      if (form.endTime) {
        endDateTime = new Date(`${form.eventDate}T${form.endTime}`);
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
          cover_image_url: coverImageUrl,
          gallery_urls: galleryUrls.length > 0 ? galleryUrls : undefined,
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
          capacity: form.maxGroupSize,
          min_group_size: form.minGroupSize,
          max_group_size: form.maxGroupSize,
          price_cents: form.isFree ? 0 : form.priceCents,
          is_free: form.isFree,
          is_recurring: form.isRecurring,
          recurrence_rule: form.isRecurring ? form.recurrenceRule : undefined,
          cancellation_policy: form.cancellationPolicy,
        },
      });

      toast.success("Experience updated successfully!");
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
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  placeholder="Describe your experience..."
                  rows={5}
                  className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                  maxLength={2000}
                />
              </div>

              {/* Schedule & Pricing Section */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="mb-4 text-base font-semibold text-gray-900">
                  Schedule & Pricing
                </h3>

                {/* Date */}
                <div className="mb-4 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Event Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.eventDate}
                    onChange={(e) => updateForm("eventDate", e.target.value)}
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
                      onChange={(e) => updateForm("eventTime", e.target.value)}
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
                      onChange={(e) => updateForm("endTime", e.target.value)}
                      placeholder="Optional - auto-calculated from duration if not set"
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                    />
                  </div>
                </div>

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

                {/* Group Size */}
                <div className="mb-4 grid gap-4 md:grid-cols-2">
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
                  label="Cover Image"
                  helpText="This will be the main image shown to guests"
                  preview={form.coverImagePreview}
                  onUpload={handleCoverUpload}
                  onRemove={() => {
                    updateForm("coverImage", null);
                    updateForm("coverImagePreview", null);
                  }}
                />
                <ImageUpload
                  label="Gallery Images"
                  helpText="Add more photos to showcase your experience"
                  multiple
                  previews={form.galleryPreviews}
                  onUpload={handleGalleryUpload}
                  onRemoveMultiple={removeGalleryImage}
                />
              </div>

              <div className="flex gap-4 border-t border-gray-100 pt-6">
                <button
                  onClick={handleUpdate}
                  disabled={isSubmitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0094CA] py-3 font-semibold text-white transition hover:bg-[#007ba8] disabled:opacity-50"
                >
                  <FiCheck size={18} />
                  Save Changes
                </button>
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
              <AttendeesList eventId={id} isRecurring={form.isRecurring} />
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
    </>
  );
}
