"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { HostNavbar } from "~/components/host-dashboard";
import { useMyHost, useCreateEvent, useUploadFiles, usePublishEvent } from "~/hooks/useApi";
import { FiArrowLeft, FiArrowRight, FiUpload, FiX, FiCheck, FiMapPin, FiClock, FiUsers, FiCalendar, FiDollarSign, FiShare2, FiExternalLink } from "react-icons/fi";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface FormData {
  // Step 1 - Basics
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
  // Step 2 - Pricing & Schedule
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

const DURATION_OPTIONS = [30, 60, 90, 120, 180, 240];

const CANCELLATION_POLICIES = [
  { value: "flexible", label: "Flexible", description: "Full refund up to 24 hours before" },
  { value: "moderate", label: "Moderate", description: "Full refund up to 5 days before" },
  { value: "strict", label: "Strict", description: "50% refund up to 1 week before" },
];

/* ------------------------------------------------------------------ */
/*  Step Indicator Component                                           */
/* ------------------------------------------------------------------ */
function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      <div className={`flex items-center gap-2 ${currentStep >= 1 ? "text-[#0094CA]" : "text-gray-400"}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep >= 1 ? "bg-[#0094CA] text-white" : "bg-gray-200"}`}>
          {currentStep > 1 ? <FiCheck /> : "1"}
        </div>
        <span className="text-sm font-medium hidden sm:inline">The Basics</span>
      </div>
      <div className={`w-12 h-0.5 ${currentStep > 1 ? "bg-[#0094CA]" : "bg-gray-200"}`} />
      <div className={`flex items-center gap-2 ${currentStep >= 2 ? "text-[#0094CA]" : "text-gray-400"}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep >= 2 ? "bg-[#0094CA] text-white" : "bg-gray-200"}`}>
          2
        </div>
        <span className="text-sm font-medium hidden sm:inline">Schedule & Pricing</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Image Upload Component                                             */
/* ------------------------------------------------------------------ */
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
    if (files.length) onUpload(files);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {helpText && <p className="text-xs text-gray-500">{helpText}</p>}

      {/* Single image preview */}
      {!multiple && preview && (
        <div className="relative inline-block">
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

      {/* Multiple images preview */}
      {multiple && previews.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {previews.map((p, i) => (
            <div key={i} className="relative">
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

      {/* Upload button */}
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

/* ------------------------------------------------------------------ */
/*  Mood Selector Component                                            */
/* ------------------------------------------------------------------ */
function MoodSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Experience Mood</label>
      <p className="text-xs text-gray-500">What vibe best describes your experience?</p>
      <div className="flex flex-wrap gap-2">
        {MOODS.map((mood) => (
          <button
            key={mood}
            type="button"
            onClick={() => onChange(mood.toLowerCase())}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              value === mood.toLowerCase()
                ? "bg-[#0094CA] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {mood}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Preview Card Component                                             */
/* ------------------------------------------------------------------ */
function PreviewCard({ form }: { form: FormData }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="relative">
        {form.coverImagePreview ? (
          <img src={form.coverImagePreview} alt="Preview" className="w-full h-40 object-cover" />
        ) : (
          <div className="w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-sm">No image uploaded</span>
          </div>
        )}
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-full text-xs font-semibold">
          {form.mood || "No mood"}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1">{form.title || "Experience Title"}</h3>
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{form.hookLine || "Add a hook line to attract guests"}</p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <FiClock size={12} />
            {form.durationMinutes} min
          </span>
          <span className="flex items-center gap-1">
            <FiUsers size={12} />
            {form.minGroupSize}-{form.maxGroupSize} guests
          </span>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-[#0094CA]">
            {form.isFree ? "Free" : `₹${(form.priceCents / 100).toFixed(0)}`}
          </span>
          <span className="text-xs text-gray-400">
            {form.isOnline ? "Online" : form.location || "Location TBD"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Success Modal Component                                            */
/* ------------------------------------------------------------------ */
function SuccessModal({
  isOpen,
  onClose: _onClose,
  experienceId,
}: {
  isOpen: boolean;
  onClose: () => void;
  experienceId: string;
}) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in duration-200">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiCheck className="text-green-600" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Experience is Live! 🎉</h2>
        <p className="text-gray-500 mb-6">
          Congratulations! Your experience has been published and is now visible to guests.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              const url = `${window.location.origin}/experiences/${experienceId}`;
              void navigator.clipboard.writeText(url);
              toast.success("Link copied to clipboard!");
            }}
            className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
          >
            <FiShare2 size={18} />
            Share Experience
          </button>
          <button
            onClick={() => router.push(`/experiences/${experienceId}`)}
            className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
          >
            <FiExternalLink size={18} />
            View Live Page
          </button>
          <button
            onClick={() => router.push("/host-dashboard/experiences")}
            className="w-full py-3 bg-[#0094CA] hover:bg-[#007ba8] text-white rounded-lg font-semibold transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */
export default function CreateExperiencePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string>("");

  const [form, setForm] = useState<FormData>({
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
    setHostId(localStorage.getItem("msm_host_id"));
    setIsHydrated(true);
  }, []);

  const { data: host, isLoading: hostLoading } = useMyHost(userId);
  const createEvent = useCreateEvent();
  const uploadFiles = useUploadFiles();
  const publishEvent = usePublishEvent();

  useEffect(() => {
    if (isHydrated && !userId && !hostLoading) {
      router.push("/");
    }
  }, [userId, hostLoading, router, isHydrated]);

  const updateForm = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  /* ---------------------------------------------------------------- */
  /*  Image Handlers                                                   */
  /* ---------------------------------------------------------------- */
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

  /* ---------------------------------------------------------------- */
  /*  Validation                                                       */
  /* ---------------------------------------------------------------- */
  const validateStep1 = (): boolean => {
    if (!form.title.trim()) {
      toast.error("Please enter an experience title");
      return false;
    }
    if (!form.hookLine.trim()) {
      toast.error("Please enter a hook line");
      return false;
    }
    if (!form.mood) {
      toast.error("Please select a mood");
      return false;
    }
    if (!form.description.trim()) {
      toast.error("Please add a description");
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!form.eventDate) {
      toast.error("Please select an event date");
      return false;
    }
    if (!form.eventTime) {
      toast.error("Please select a start time");
      return false;
    }
    if (!form.isFree && form.priceCents <= 0) {
      toast.error("Please set a valid price");
      return false;
    }
    return true;
  };

  /* ---------------------------------------------------------------- */
  /*  Form Submission                                                  */
  /* ---------------------------------------------------------------- */
  const handleSubmit = async () => {
    if (!validateStep2()) return;
    if (!host?.id) {
      toast.error("Host credentials not found");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images to S3
      let coverImageUrl: string | undefined;
      let galleryUrls: string[] = [];

      if (form.coverImage) {
        try {
          const uploadRes = await uploadFiles.mutateAsync({
            files: [form.coverImage],
            folder: "events/covers",
          });
          coverImageUrl = uploadRes.data[0]?.url;
        } catch (uploadErr) {
          console.warn("Cover image upload failed:", uploadErr);
        }
      }

      if (form.galleryImages.length > 0) {
        try {
          const uploadRes = await uploadFiles.mutateAsync({
            files: form.galleryImages,
            folder: "events/gallery",
          });
          galleryUrls = uploadRes.data.map((r) => r.url);
        } catch (uploadErr) {
          console.warn("Gallery upload failed:", uploadErr);
        }
      }

      // Construct datetime
      const eventDateTime = new Date(`${form.eventDate}T${form.eventTime}`);
      let endDateTime: Date | undefined;
      if (form.endTime) {
        endDateTime = new Date(`${form.eventDate}T${form.endTime}`);
      } else {
        endDateTime = new Date(eventDateTime.getTime() + form.durationMinutes * 60 * 1000);
      }

      // Create event
      const eventRes = await createEvent.mutateAsync({
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
      });

      // Publish the event immediately
      try {
        await publishEvent.mutateAsync({
          eventId: eventRes.data.id,
          hostId: host.id,
        });
      } catch (publishErr) {
        console.warn("Auto-publish failed, event saved as draft:", publishErr);
      }

      setCreatedEventId(eventRes.data.id);
      setShowSuccess(true);
      toast.success("Experience created successfully!");
    } catch (err) {
      console.error("Failed to create experience:", err);
      toast.error("Failed to create experience. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Step Navigation                                                  */
  /* ---------------------------------------------------------------- */
  const goToStep2 = () => {
    if (validateStep1()) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goToStep1 = () => {
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  if (hostLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0094CA]" />
      </div>
    );
  }

  return (
    <>
      <HostNavbar />

      <main className="min-h-screen bg-gray-50 pb-24">
        <div className="max-w-4xl mx-auto site-x py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push("/host-dashboard/experiences")}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <FiArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Experience</h1>
              <p className="text-sm text-gray-500">Share something unique with your guests</p>
            </div>
          </div>

          <StepIndicator currentStep={currentStep} />

          {/* Step 1: The Basics */}
          {currentStep === 1 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-semibold text-gray-900">The Basics</h2>
                <p className="text-sm text-gray-500">Tell us about your experience</p>
              </div>

              {/* Title */}
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

              {/* Hook Line */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Hook Line <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.hookLine}
                  onChange={(e) => updateForm("hookLine", e.target.value)}
                  placeholder="A short catchy phrase to attract guests"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0094CA] focus:border-transparent outline-none"
                  maxLength={150}
                />
                <p className="text-xs text-gray-400">{form.hookLine.length}/150 characters</p>
              </div>

              {/* Mood Selector */}
              <MoodSelector value={form.mood} onChange={(v) => updateForm("mood", v)} />

              {/* Description */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  placeholder="Describe what guests will experience, what they'll learn, and what makes your experience special..."
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0094CA] focus:border-transparent outline-none resize-none"
                  maxLength={2000}
                />
                <p className="text-xs text-gray-400">{form.description.length}/2000 characters</p>
              </div>

              {/* Visuals Section */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Visuals</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <ImageUpload
                    label="Cover Image"
                    helpText="This will be the main image shown to guests"
                    preview={form.coverImagePreview}
                    onUpload={handleCoverUpload}
                    onRemove={() => {
                      if (form.coverImagePreview) URL.revokeObjectURL(form.coverImagePreview);
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
              </div>

              {/* Logistics Section */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Logistics</h3>

                {/* Online/In-Person Toggle */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Experience Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateForm("isOnline", false)}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                        !form.isOnline
                          ? "bg-[#0094CA] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <FiMapPin className="inline mr-2" size={16} />
                      In-Person
                    </button>
                    <button
                      type="button"
                      onClick={() => updateForm("isOnline", true)}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                        form.isOnline
                          ? "bg-[#0094CA] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      🌐 Online
                    </button>
                  </div>
                </div>

                {/* Meeting Link (if online) */}
                {form.isOnline && (
                  <div className="space-y-2 mb-4">
                    <label className="block text-sm font-medium text-gray-700">Meeting Link</label>
                    <input
                      type="url"
                      value={form.meetingLink}
                      onChange={(e) => updateForm("meetingLink", e.target.value)}
                      placeholder="e.g., https://zoom.us/j/123456789"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0094CA] focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-500">Paste your Zoom, Google Meet, or other video conference link</p>
                  </div>
                )}

                {/* Location (if in-person) */}
                {!form.isOnline && (
                  <div className="space-y-2 mb-4">
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => updateForm("location", e.target.value)}
                      placeholder="Enter the meeting location"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0094CA] focus:border-transparent outline-none"
                    />
                  </div>
                )}

                {/* Google Maps URL (if in-person) */}
                {!form.isOnline && (
                  <div className="space-y-2 mb-4">
                    <label className="block text-sm font-medium text-gray-700">Google Maps Link</label>
                    <input
                      type="url"
                      value={form.googleMapsUrl}
                      onChange={(e) => updateForm("googleMapsUrl", e.target.value)}
                      placeholder="e.g., https://maps.google.com/..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0094CA] focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-500">Share a Google Maps link so guests can view the location</p>
                  </div>
                )}

                {/* Duration */}
                <div className="space-y-2 mb-4">
                  <label className="block text-sm font-medium text-gray-700">Duration</label>
                  <div className="flex flex-wrap gap-2">
                    {DURATION_OPTIONS.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => updateForm("durationMinutes", mins)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          form.durationMinutes === mins
                            ? "bg-[#0094CA] text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Group Size */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Min Group Size</label>
                    <input
                      type="number"
                      min={1}
                      value={form.minGroupSize}
                      onChange={(e) => updateForm("minGroupSize", Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0094CA] focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Max Group Size</label>
                    <input
                      type="number"
                      min={form.minGroupSize}
                      value={form.maxGroupSize}
                      onChange={(e) => updateForm("maxGroupSize", Math.max(form.minGroupSize, parseInt(e.target.value) || 1))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0094CA] focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Next Button */}
              <div className="pt-6 border-t border-gray-100">
                <button
                  onClick={goToStep2}
                  className="w-full py-3 bg-[#0094CA] hover:bg-[#007ba8] text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition"
                >
                  Continue to Schedule & Pricing
                  <FiArrowRight />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Schedule & Pricing */}
          {currentStep === 2 && (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Form Section */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Schedule & Pricing</h2>
                  <p className="text-sm text-gray-500">Set when and how much</p>
                </div>

                {/* Pricing Section */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <FiDollarSign /> Pricing
                  </h3>

                  {/* Free/Paid Toggle */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateForm("isFree", false)}
                      className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition ${
                        !form.isFree
                          ? "bg-[#0094CA] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Paid Experience
                    </button>
                    <button
                      type="button"
                      onClick={() => updateForm("isFree", true)}
                      className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition ${
                        form.isFree
                          ? "bg-[#0094CA] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Free Experience
                    </button>
                  </div>

                  {/* Price Input */}
                  {!form.isFree && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Price per person (₹)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                        <input
                          type="number"
                          min={0}
                          value={form.priceCents / 100}
                          onChange={(e) => updateForm("priceCents", Math.max(0, parseFloat(e.target.value) || 0) * 100)}
                          className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0094CA] focus:border-transparent outline-none"
                        />
                      </div>
                      <p className="text-xs text-gray-500">Platform fee: 15% • You&apos;ll earn: ₹{((form.priceCents / 100) * 0.85).toFixed(0)} per booking</p>
                    </div>
                  )}
                </div>

                {/* Availability Section */}
                <div className="border-t border-gray-100 pt-6 space-y-4">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <FiCalendar /> Availability
                  </h3>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Date <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        value={form.eventDate}
                        onChange={(e) => updateForm("eventDate", e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0094CA] focus:border-transparent outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Start Time <span className="text-red-500">*</span></label>
                      <input
                        type="time"
                        value={form.eventTime}
                        onChange={(e) => updateForm("eventTime", e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0094CA] focus:border-transparent outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">End Time (optional)</label>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => updateForm("endTime", e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0094CA] focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-500">Leave empty to auto-calculate based on duration</p>
                  </div>

                  {/* Recurring Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Recurring Experience</p>
                      <p className="text-sm text-gray-500">This experience repeats on a schedule</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateForm("isRecurring", !form.isRecurring)}
                      className={`w-12 h-6 rounded-full transition ${form.isRecurring ? "bg-[#0094CA]" : "bg-gray-300"}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow transform transition ${form.isRecurring ? "translate-x-6" : "translate-x-0.5"}`} />
                    </button>
                  </div>

                  {form.isRecurring && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Recurrence Rule</label>
                      <select
                        value={form.recurrenceRule}
                        onChange={(e) => updateForm("recurrenceRule", e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0094CA] focus:border-transparent outline-none"
                      >
                        <option value="">Select frequency</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Every 2 weeks</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Cancellation Policy */}
                <div className="border-t border-gray-100 pt-6 space-y-4">
                  <h3 className="text-base font-semibold text-gray-900">Cancellation Policy</h3>
                  <div className="space-y-2">
                    {CANCELLATION_POLICIES.map((policy) => (
                      <div
                        key={policy.value}
                        onClick={() => updateForm("cancellationPolicy", policy.value)}
                        className={`p-4 border rounded-lg cursor-pointer transition ${
                          form.cancellationPolicy === policy.value
                            ? "border-[#0094CA] bg-[#0094CA]/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            form.cancellationPolicy === policy.value
                              ? "border-[#0094CA]"
                              : "border-gray-300"
                          }`}>
                            {form.cancellationPolicy === policy.value && (
                              <div className="w-2 h-2 rounded-full bg-[#0094CA]" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{policy.label}</p>
                            <p className="text-sm text-gray-500">{policy.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-6 border-t border-gray-100 flex gap-4">
                  <button
                    onClick={goToStep1}
                    className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition"
                  >
                    <FiArrowLeft />
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-[#0094CA] hover:bg-[#007ba8] text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <FiCheck />
                        Publish Experience
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Preview Card Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Preview</h3>
                  <PreviewCard form={form} />
                  <p className="text-xs text-gray-400 mt-4 text-center">This is how your experience will appear to guests</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        experienceId={createdEventId}
      />
    </>
  );
}
