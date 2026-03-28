"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HostNavbar } from "~/components/host-dashboard";
import { useMyHost, useEvent, useUpdateEvent, useUploadFiles } from "~/hooks/useApi";
import { FiArrowLeft, FiX, FiUpload, FiTrash2, FiCheck } from "react-icons/fi";
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
  "Adventurous", "Relaxing", "Creative", "Social", "Educational", "Wellness", "Culinary", "Cultural"
];

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const oversizedFiles: string[] = [];
    const validFiles: File[] = [];

    files.forEach((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        oversizedFiles.push(`${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
      } else {
        validFiles.push(file);
      }
    });

    if (oversizedFiles.length > 0) {
      toast.error(
        `File${oversizedFiles.length > 1 ? 's' : ''} too large:\n${oversizedFiles.join(', ')}\n\nMax size is ${MAX_FILE_SIZE_MB}MB per file.`
      );
    }

    if (validFiles.length > 0) {
      onUpload(validFiles);
    }

    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {helpText && <p className="text-xs text-gray-500">{helpText}</p>}

      {!multiple && preview && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="w-full max-w-xs h-40 object-cover rounded-lg" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
          >
            <FiX size={14} />
          </button>
        </div>
      )}

      {multiple && previews.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {previews.map((p, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt={`Gallery ${i + 1}`} className="w-20 h-20 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => onRemoveMultiple?.(i)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white"
              >
                <FiX size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {(!preview || multiple) && (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#0094CA] hover:bg-gray-50 transition"
        >
          <FiUpload className="mx-auto text-gray-400 mb-2" size={24} />
          <p className="text-sm text-gray-500">Click to upload {multiple ? "images" : "image"}</p>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
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

function AttendeesList({ eventId }: { eventId: string }) {
  const [attendees, setAttendees] = useState<BookingDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/events/${eventId}/attendees`
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
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0094CA]" /></div>;
  }

  if (!attendees || attendees.length === 0) {
    return <p className="text-center text-gray-500 py-8">No bookings yet</p>;
  }

  return (
    <div className="space-y-3">
      {attendees.map((attendee) => (
        <div key={attendee.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <p className="font-semibold text-gray-900">User ID: {attendee.user_id}</p>
            <p className="text-sm text-gray-500">Qty: {attendee.quantity}</p>
            {attendee.amount_cents !== null && <p className="text-xs text-gray-400">₹{(attendee.amount_cents / 100).toFixed(2)}</p>}
          </div>
          <div className="text-right">
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
              attendee.status === "pending" ? "bg-yellow-100 text-yellow-800" :
              attendee.status === "confirmed" ? "bg-green-100 text-green-800" :
              attendee.status === "cancelled" ? "bg-red-100 text-red-800" :
              "bg-gray-100 text-gray-800"
            }`}>
              {attendee.status.charAt(0).toUpperCase() + attendee.status.slice(1)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
         
export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
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
      const endTime = event.end_time ? new Date(event.end_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }) : "";
      
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

  const updateForm = <K extends keyof EventFormData>(key: K, value: EventFormData[K]) => {
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
      form.galleryImages.filter((_, i) => i !== index)
    );
    updateForm(
      "galleryPreviews",
      form.galleryPreviews.filter((_, i) => i !== index)
    );
  };

  const handleUpdate = async () => {
    if (!host?.id || !event?.id) {
      toast.error("Unable to update event");
      return;
    }

    setIsSubmitting(true);
    try {
      let coverImageUrl: string | undefined = form.coverImagePreview ?? undefined;
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
          const newUrls = (uploadRes.data as Array<{ url: string }>).map((r) => r.url);
          galleryUrls = [...form.galleryPreviews.filter(p => !p.startsWith("blob:")), ...newUrls];
        } catch (err) {
          console.warn("Gallery upload failed:", err);
        }
      }

      const eventDateTime = new Date(`${form.eventDate}T${form.eventTime}`);
      let endDateTime: Date | undefined;
      if (form.endTime) {
        endDateTime = new Date(`${form.eventDate}T${form.endTime}`);
      } else {
        endDateTime = new Date(eventDateTime.getTime() + form.durationMinutes * 60 * 1000);
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
          meeting_link: form.isOnline ? form.meetingLink || undefined : undefined,
          google_maps_url: !form.isOnline ? form.googleMapsUrl || undefined : undefined,
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
        }
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
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0094CA] border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <>
      <HostNavbar />

      <main className="min-h-screen bg-gray-50 pb-24">
        <div className="max-w-4xl mx-auto site-x py-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push("/host-dashboard/experiences")}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <FiArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Experience</h1>
              <p className="text-sm text-gray-500">Update your experience details</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-gray-200">
            <button
              onClick={() => router.push(`/host-dashboard/experiences/${id}`)}
              className={`pb-3 px-1 font-medium transition ${
                !showBookings
                  ? "border-b-2 border-[#0094CA] text-[#0094CA]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Details
            </button>
            <button
              onClick={() => router.push(`/host-dashboard/experiences/${id}?tab=bookings`)}
              className={`pb-3 px-1 font-medium transition ${
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
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Experience Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  placeholder="e.g., Morning Yoga by the Beach"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0094CA] focus:border-transparent outline-none"
                  maxLength={100}
                />
                <p className="text-xs text-gray-400">{form.title.length}/100 characters</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Hook Line</label>
                <input
                  type="text"
                  value={form.hookLine}
                  onChange={(e) => updateForm("hookLine", e.target.value)}
                  placeholder="A short catchy phrase to attract guests"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0094CA] focus:border-transparent outline-none"
                  maxLength={150}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Mood</label>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((mood) => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => updateForm("mood", mood.toLowerCase())}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition ${
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
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  placeholder="Describe your experience..."
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0094CA] focus:border-transparent outline-none resize-none"
                  maxLength={2000}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
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

              <div className="pt-6 border-t border-gray-100 flex gap-4">
                <button
                  onClick={handleUpdate}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-[#0094CA] hover:bg-[#007ba8] text-white rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FiCheck size={18} />
                  Save Changes
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="py-3 px-6 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  <FiTrash2 size={18} />
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Bookings Tab */}
          {showBookings && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Bookings</h2>
              <AttendeesList eventId={id} />
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <FiTrash2 className="text-red-600" size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Experience?</h2>
            <p className="text-gray-500 mb-6">
              This will permanently delete your experience. All confirmed bookings will be refunded.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
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
