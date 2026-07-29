"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { HostNavbar } from "~/components/host-dashboard";
import AttendeeDetailsConfig from "~/components/host-dashboard/AttendeeDetailsConfig";
import PrivacyAccessSection from "~/components/host/PrivacyAccessSection";
import Breadcrumb from "~/components/Breadcrumb";
import {
  useMyHost,
  useCreateEvent,
  useUploadFiles,
  usePublishEvent,
  useExperienceTemplates,
} from "~/hooks/useApi";
import { useContentModeration } from "~/hooks/useContentModeration";
import { useSuggestions } from "~/hooks/useSuggestions";
import { useDragDrop } from "~/hooks/useDragDrop";
import { SuggestionChips } from "~/components/SuggestionChips";
import { RichTextEditor, RichTextView } from "~/components/RichTextEditor";
import {
  FiArrowLeft,
  FiArrowRight,
  FiUpload,
  FiX,
  FiCheck,
  FiMapPin,
  FiClock,
  FiUsers,
  FiCalendar,
  FiShare2,
  FiExternalLink,
  FiAlertTriangle,
  FiMap,
  FiStar,
  FiBookmark,
  FiChevronDown,
  FiUser,
  FiMessageCircle,
  FiShield,
} from "react-icons/fi";
import { LuLanguages, LuBadgeCheck, LuSparkles, LuTicket } from "react-icons/lu";
import { format } from "date-fns";
import { istInputToUTCISO } from "~/lib/datetime";
import { toast } from "sonner";
import { MapPickerModal, LocationSearchInput } from "~/components";
import { ImageCropModal } from "~/components/ImageCropModal";

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
  languages: string[];
  level: string;
  // Step 2 - Pricing & Schedule
  isFree: boolean;
  priceCents: number;
  // Multiple ticket tiers. When useTiers is true, priceTiers drives pricing
  // instead of the single priceCents. priceStr is the raw input mirror.
  useTiers: boolean;
  priceTiers: { name: string; priceStr: string }[];
  eventDate: string;
  eventTime: string;
  endTime: string;
  isRecurring: boolean;
  recurrenceRule: string;
  cancellationPolicy: string;
  // Attendee details
  requiresAttendeeDetails: boolean;
  attendeeFields: string[];
  // Privacy & access
  isPrivate: boolean;
  accessPasskey: string;
  passkeyGrantsFree: boolean;
}

function getGeneratedDescription(value: unknown): string | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("description" in value)
  ) {
    return null;
  }

  const { description } = value;
  return typeof description === "string" ? description : null;
}

const MOODS = [
  "Adventurous",
  "Social",
  "Wellness",
  "Creative",
  "Culinary",
  "Cultural",
  "Fashion",
  "Fitness",
  "Family",
];

const DURATION_OPTIONS = [30, 60, 90, 120, 180, 240];

// Preset languages an experience can be conducted in. Hosts may also add a
// custom one via the "Other" input. Selection is multi-select.
const LANGUAGE_OPTIONS = ["English", "Hindi", "Bengali", "Assamese"];

const LEVEL_OPTIONS = ["Beginner Friendly", "Intermediate", "Advanced"];

const CANCELLATION_POLICIES = [
  {
    value: "flexible",
    label: "Flexible",
    description: "Full refund up to 24 hours before",
  },
  {
    value: "moderate",
    label: "Moderate",
    description: "Full refund up to 5 days before",
  },
  {
    value: "strict",
    label: "Strict",
    description: "50% refund up to 1 week before",
  },
  {
    value: "no_refund",
    label: "No Refund",
    description: "Non-refundable once booked",
  },
];

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/* ------------------------------------------------------------------ */
/*  Step Indicator Component                                           */
/* ------------------------------------------------------------------ */
function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      <div
        className={`flex items-center gap-2 ${currentStep >= 1 ? "text-[#0094CA]" : "text-gray-400"}`}
      >
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${currentStep >= 1 ? "bg-[#0094CA] text-white" : "bg-gray-200"}`}
        >
          {currentStep > 1 ? <FiCheck /> : "1"}
        </div>
        <span className="hidden text-sm font-medium sm:inline">The Basics</span>
      </div>
      <div
        className={`h-0.5 w-12 ${currentStep > 1 ? "bg-[#0094CA]" : "bg-gray-200"}`}
      />
      <div
        className={`flex items-center gap-2 ${currentStep >= 2 ? "text-[#0094CA]" : "text-gray-400"}`}
      >
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${currentStep >= 2 ? "bg-[#0094CA] text-white" : "bg-gray-200"}`}
        >
          2
        </div>
        <span className="hidden text-sm font-medium sm:inline">
          Schedule & Pricing
        </span>
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
  const dragDropZoneRef = useRef<HTMLDivElement>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Safely adjust slide index when images are added/removed
  useEffect(() => {
    if (currentImageIndex >= previews.length) {
      setCurrentImageIndex(Math.max(0, previews.length - 1));
    }
  }, [previews.length, currentImageIndex]);

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

  function processFiles(files: File[]) {
    if (files.length === 0) return;

    // Validate file sizes
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

    // Show warning if any files exceed limit
    if (oversizedFiles.length > 0) {
      toast.error(
        `File${oversizedFiles.length > 1 ? "s" : ""} too large:\n${oversizedFiles.join(", ")}\n\nMax size is ${MAX_FILE_SIZE_MB}MB per file.`,
      );
    }

    // Only upload valid files
    if (validFiles.length > 0) {
      onUpload(validFiles);
    }
  }

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
          <Image
            src={preview}
            alt="Preview"
            width={640}
            height={360}
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
                      setCurrentImageIndex((prev) => (prev === 0 ? previews.length - 1 : prev - 1));
                    }}
                    className="absolute top-1/2 left-4 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2.5 opacity-0 shadow-md transition group-hover:opacity-100 hover:bg-white"
                    aria-label="Previous image"
                  >
                    <svg className="h-4 w-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {/* Right Arrow */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) => (prev === previews.length - 1 ? 0 : prev + 1));
                    }}
                    className="absolute top-1/2 right-4 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2.5 opacity-0 shadow-md transition group-hover:opacity-100 hover:bg-white"
                    aria-label="Next image"
                  >
                    <svg className="h-4 w-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
                className={`relative cursor-pointer rounded-lg border-2 transition overflow-hidden ${
                  currentImageIndex === i ? "border-[#0094CA]" : "border-transparent"
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
                  className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition shadow"
                >
                  <FiX size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload button */}
      {(!preview || multiple) && (
        <div
          ref={dragDropZoneRef}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition ${isDragging
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

/* ------------------------------------------------------------------ */
/*  Mood Selector Component                                            */
/* ------------------------------------------------------------------ */
function MoodSelector({
  value,
  onChange,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Experience Mood
      </label>
      <p className="text-xs text-gray-500">
        What vibe best describes your experience?
      </p>
      <div
        className={`flex flex-wrap gap-2 rounded-xl p-1 transition ${hasError ? "bg-red-50 ring-1 ring-red-500" : ""}`}
      >
        {MOODS.map((mood) => (
          <button
            key={mood}
            type="button"
            onClick={() => onChange(mood.toLowerCase())}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${value === mood.toLowerCase()
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
/*  Title Autocomplete — typeahead filtered by mood-keyed templates    */
/* ------------------------------------------------------------------ */
type TitleSuggestionsBag = ReturnType<typeof useSuggestions>;

function TitleAutocomplete({
  mood,
  value,
  onChange,
  onSelectTemplate,
  hasError,
  showDropdown,
  setShowDropdown,
  blurTimer,
  titleSuggestions,
}: {
  mood: string;
  value: string;
  onChange: (v: string) => void;
  onSelectTemplate: (title: string, hookLine: string) => void;
  hasError?: boolean;
  showDropdown: boolean;
  setShowDropdown: (v: boolean) => void;
  blurTimer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  titleSuggestions: TitleSuggestionsBag;
}) {
  const { data: templates, isLoading } = useExperienceTemplates(mood || null);

  const q = value.trim().toLowerCase();
  const filtered = (templates ?? []).filter((t) =>
    q === "" ? true : t.title.toLowerCase().includes(q),
  );

  const moodDisabled = !mood;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Experience Title <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          disabled={moodDisabled}
          onChange={(e) => {
            onChange(e.target.value);
            setShowDropdown(true);
            void titleSuggestions.generateSuggestions(e.target.value, "title");
          }}
          onFocus={() => {
            if (blurTimer.current) {
              clearTimeout(blurTimer.current);
              blurTimer.current = null;
            }
            setShowDropdown(true);
          }}
          onBlur={() => {
            // Delay close so option mousedown can register first.
            blurTimer.current = setTimeout(() => {
              setShowDropdown(false);
              titleSuggestions.clearSuggestions();
            }, 120);
          }}
          placeholder={
            moodDisabled
              ? "Pick a mood first to see suggestions"
              : "Start typing — or pick a suggestion below"
          }
          className={`w-full rounded-lg border px-4 py-3 transition outline-none focus:ring-2 focus:ring-[#0094CA] ${moodDisabled ? "cursor-not-allowed bg-gray-50 text-gray-400" : ""
            } ${hasError
              ? "border-red-500 bg-red-50"
              : "border-gray-200 focus:border-transparent"
            }`}
          maxLength={100}
        />

        {showDropdown && !moodDisabled && (
          <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {isLoading && (
              <div className="px-4 py-3 text-sm text-gray-500">
                Loading suggestions…
              </div>
            )}
            {!isLoading && filtered.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-500">
                No matching templates — keep typing your own title.
              </div>
            )}
            {!isLoading &&
              filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  // onMouseDown fires before the input's onBlur, so the click sticks.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelectTemplate(t.title, t.hook_line);
                    setShowDropdown(false);
                  }}
                  className="block w-full border-b border-gray-100 px-4 py-3 text-left text-sm transition last:border-b-0 hover:bg-gray-50"
                >
                  <p className="font-semibold text-gray-900">{t.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{t.hook_line}</p>
                </button>
              ))}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400">{value.length}/100 characters</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Preview Card Component                                             */
/* ------------------------------------------------------------------ */
function PreviewCard({ form }: { form: FormData }) {
  const cancellationCopy =
    form.cancellationPolicy === "flexible"
      ? "Free cancellation up to 24 hours before the experience."
      : form.cancellationPolicy === "moderate"
        ? "Free cancellation up to 5 days before the experience."
        : form.cancellationPolicy === "strict"
          ? "50% refund up to 1 week before the experience."
          : form.cancellationPolicy === "no_refund"
            ? "This experience is non-refundable once booked."
            : "Standard cancellation policy applies.";

  const cancellationBadge =
    form.cancellationPolicy === "flexible"
      ? { label: "Flexible", sub: "cancellation" }
      : form.cancellationPolicy === "moderate"
        ? { label: "Moderate", sub: "cancellation" }
        : form.cancellationPolicy === "strict"
          ? { label: "Strict", sub: "cancellation" }
          : form.cancellationPolicy === "no_refund"
            ? { label: "No refunds", sub: "policy" }
            : { label: "Standard", sub: "policy" };

  const getFormattedDate = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0]!, 10);
    const month = parseInt(parts[1]!, 10) - 1;
    const day = parseInt(parts[2]!, 10);
    const dateObj = new Date(year, month, day);
    return format(dateObj, "eee d MMM");
  };

  const getFormattedTime = (timeStr: string) => {
    if (!timeStr) return "";
    const parts = timeStr.split(":");
    if (parts.length < 2) return timeStr;
    const hours = parseInt(parts[0]!, 10);
    const minutes = parseInt(parts[1]!, 10);
    const dateObj = new Date(2000, 0, 1, hours, minutes);
    return format(dateObj, "h:mm a");
  };

  return (
    <div className="sticky top-20 h-max w-full pl-4 max-w-[420px] mx-auto lg:ml-auto select-none">
      <div className="relative overflow-hidden rounded-3xl border border-[#cfe8fa] bg-gradient-to-br from-white via-[#f4faff] to-[#e9f5ff] p-5 shadow-[0_24px_60px_rgba(58,119,172,0.12)]">
        {/* Header */}
        <div className="mb-3 flex items-start gap-2.5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#cfe8fa] bg-white shadow-[0_8px_20px_rgba(31,167,255,0.18)]">
            <LuTicket className="h-4 w-4 -rotate-12 text-[#0094CA]" />
          </div>
          <div className="flex-1">
            <h2 className="font-outfit text-xl font-extrabold leading-none tracking-tight text-[#16304c]">
              {form.isFree ? (
                "FREE EXPERIENCE"
              ) : (
                <>
                  ₹{((form.priceCents ?? 0) / 100).toFixed(0)}
                  <span className="text-sm font-medium text-[#6f8daa]">
                    /person
                  </span>
                </>
              )}
            </h2>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#5f7e9a]">
              Hosted by verified host
              <LuBadgeCheck
                className="h-3.5 w-3.5 text-[#0094CA]"
                fill="#0094CA"
                stroke="#ffffff"
              />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mb-3 flex items-center justify-start gap-4 border-b border-[#dbeaf5] pb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0094CA] uppercase">NEW</span>
          </div>
          <div className="h-4 w-px bg-[#dbeaf5]" />
          <div className="flex items-center gap-2">
            <FiUsers className="h-4 w-4 text-[#0094CA]" />
            <span className="font-bold text-[#16304c]">0</span>
            <span className="text-[#6f8daa]">people joined</span>
          </div>
        </div>

        {/* Choose Your Session */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5">
            <FiCalendar className="h-4 w-4 text-[#0094CA]" />
            <h3 className="text-sm font-bold text-[#16304c]">
              Choose your session
            </h3>
          </div>
          <p className="mb-4 ml-[22px] text-[11px] leading-tight text-[#6f8daa]">
            Pick a time 
          </p>

          {form.eventDate ? (
            <div className="flex w-full items-center gap-2.5 rounded-2xl border-2 border-transparent bg-gradient-to-br from-[#1fa7ff] to-[#0094CA] px-3.5 py-2.5 text-left text-white shadow-[0_14px_30px_rgba(31,167,255,0.35)]">
              <FiClock className="h-4 w-4 flex-shrink-0 text-white/90" />
              <div className="flex flex-1 items-baseline gap-2">
                <span className="text-sm font-bold">
                  {getFormattedDate(form.eventDate)},
                </span>
                <span className="text-sm text-white/90">
                  {form.eventTime ? getFormattedTime(form.eventTime) : "Time TBD"}
                </span>
              </div>
              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white">
                <FiCheck className="h-3 w-3 stroke-[3] text-[#0094CA]" />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#dbeaf5] bg-white px-4 py-3 text-sm text-[#6f8daa] italic">
              No upcoming sessions
            </div>
          )}
        </div>

        {/* Guests */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5">
            <FiUser className="h-4 w-4 text-[#0094CA]" />
            <h3 className="text-sm font-bold text-[#16304c]">Guests</h3>
          </div>
          <p className="mb-2 ml-[22px] text-[11px] leading-tight text-[#6f8daa]">
            How many are joining?
          </p>
          <div className="relative">
            <div className="w-full rounded-2xl border border-[#dbeaf5] bg-white px-3.5 py-2.5 pr-10 text-sm font-medium text-[#16304c] outline-none flex justify-between items-center">
              <span>1 Guest</span>
              <FiChevronDown className="h-4 w-4 text-[#6f8daa]" />
            </div>
          </div>
        </div>

        {/* Reserve Button Mock */}
        <button
          type="button"
          disabled
          className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1fa7ff] to-[#0094CA] py-2.5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(31,167,255,0.32)] opacity-50 cursor-not-allowed"
        >
          <span>Reserve My Spot</span>
          <FiArrowRight className="h-4 w-4" />
        </button>

        {/* Trust Badges */}
        <div className="mt-3 grid grid-cols-3 gap-1 border-t border-[#dbeaf5] pt-3">
          <div className="flex flex-col items-center gap-1 px-1 text-center">
            <FiShield className="h-4 w-4 text-[#0094CA]" />
            <span className="text-[10px] leading-tight font-semibold text-[#16304c]">
              {cancellationBadge.label}
              <br />
              {cancellationBadge.sub}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 border-x border-[#dbeaf5] px-1 text-center">
            <FiStar className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-[10px] leading-tight font-semibold text-[#16304c]">
              Verified
              <br />
              host
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 px-1 text-center">
            <FiMessageCircle className="h-4 w-4 text-[#0094CA]" />
            <span className="text-[10px] leading-tight font-semibold text-[#16304c]">
              Instant
              <br />
              confirmation
            </span>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-[#5f7e9a]">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 flex-shrink-0 text-[#5fc781]"
          >
            <path
              fill="currentColor"
              d="M17 3c-4 0-9 3-11 9-1.4 4.2.4 7.4 3 9 2-5 5.5-8 10-9-3 2-5 5-6 9 5 0 9-4 9-9V3h-5Z"
            />
          </svg>
          <span>{cancellationCopy}</span>
        </div>

        {/* Rare find banner */}
        {form.maxGroupSize <= 3 && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-500">
              <LuSparkles className="text-white" size={12} />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-600">Rare find</p>
              <p className="text-xs text-red-500">
                Only {form.maxGroupSize} spot{form.maxGroupSize > 1 ? "s" : ""} left!
              </p>
            </div>
          </div>
        )}
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
  experienceSlug,
  isDraft,
}: {
  isOpen: boolean;
  onClose: () => void;
  experienceId: string;
  experienceSlug: string;
  isDraft: boolean;
}) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="animate-in fade-in zoom-in w-full max-w-md rounded-2xl bg-white p-8 text-center duration-200">
        <div
          className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${isDraft ? "bg-gray-100" : "bg-green-100"
            }`}
        >
          <FiCheck
            className={isDraft ? "text-gray-500" : "text-green-600"}
            size={32}
          />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          {isDraft ? "Draft Saved" : "Your Experience is Live! 🎉"}
        </h2>
        <p className="mb-6 text-gray-500">
          {isDraft
            ? "Your draft is safe. Pick it up from the Drafts tab in My Experiences whenever you're ready to finish it."
            : "Congratulations! Your experience has been published and is now visible to guests."}
        </p>
        <div className="flex flex-col gap-3">
          {!isDraft && (
            <>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/experience/${experienceSlug}`;
                  void navigator.clipboard.writeText(url);
                  toast.success("Link copied to clipboard!");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 py-3 font-medium transition hover:bg-gray-200"
              >
                <FiShare2 size={18} />
                Share Experience
              </button>
              <button
                onClick={() => router.push(`/experience/${experienceSlug}`)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 py-3 font-medium transition hover:bg-gray-200"
              >
                <FiExternalLink size={18} />
                View Live Page
              </button>
            </>
          )}
          {isDraft && (
            <button
              onClick={() =>
                router.push(`/host-dashboard/experiences/${experienceId}`)
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 py-3 font-medium transition hover:bg-gray-200"
            >
              Continue Editing
            </button>
          )}
          <button
            onClick={() => router.push("/host-dashboard/experiences")}
            className="w-full rounded-lg bg-[#0094CA] py-3 font-semibold text-white transition hover:bg-[#007ba8]"
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
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitType, setSubmitType] = useState<"draft" | "publish" | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedAsDraft, setSavedAsDraft] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string>("");
  const [createdEventSlug, setCreatedEventSlug] = useState<string>("");
  const [showMapPicker, setShowMapPicker] = useState(false);

  const [showErrors, setShowErrors] = useState(false);

  // Suggestion states
  const titleSuggestions = useSuggestions();
  const hookSuggestions = useSuggestions();
  const descriptionSuggestions = useSuggestions();

  // Title-typeahead dropdown driven by mood-keyed templates.
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const titleBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Image Crop states
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [cropTarget, setCropTarget] = useState<"profile" | "cover">("profile");

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
    languages: ["English"],
    level: "Beginner Friendly",
    isFree: false,
    priceCents: 50000,
    useTiers: false,
    priceTiers: [{ name: "", priceStr: "" }],
    eventDate: "",
    eventTime: "",
    endTime: "",
    isRecurring: false,
    recurrenceRule: "",
    cancellationPolicy: "flexible",
    requiresAttendeeDetails: false,
    attendeeFields: [],
    isPrivate: false,
    accessPasskey: "",
    passkeyGrantsFree: false,
  });

  // Local string trackers for controlled numeric inputs to avoid leading-zero/clearing issues
  const [priceInputStr, setPriceInputStr] = useState<string>(form.isFree ? "" : (form.priceCents / 100).toString());
  const [durationInputStr, setDurationInputStr] = useState<string>(form.durationMinutes.toString());
  const [minGroupInputStr, setMinGroupInputStr] = useState<string>(form.minGroupSize.toString());
  const [maxGroupInputStr, setMaxGroupInputStr] = useState<string>(form.maxGroupSize.toString());

  useEffect(() => {
    if (form.isFree) {
      setPriceInputStr("");
    } else {
      const formVal = form.priceCents / 100;
      if (priceInputStr !== "" && parseFloat(priceInputStr) !== formVal) {
        setPriceInputStr(formVal.toString());
      } else if (priceInputStr === "" && formVal !== 0) {
        setPriceInputStr(formVal.toString());
      }
    }
  }, [form.priceCents, form.isFree]);

  useEffect(() => {
    const formVal = form.durationMinutes;
    if (durationInputStr !== "" && parseInt(durationInputStr) !== formVal) {
      setDurationInputStr(formVal.toString());
    } else if (durationInputStr === "" && formVal !== 0) {
      setDurationInputStr(formVal.toString());
    }
  }, [form.durationMinutes]);

  useEffect(() => {
    const formVal = form.minGroupSize;
    if (minGroupInputStr !== "" && parseInt(minGroupInputStr) !== formVal) {
      setMinGroupInputStr(formVal.toString());
    } else if (minGroupInputStr === "" && formVal !== 0) {
      setMinGroupInputStr(formVal.toString());
    }
  }, [form.minGroupSize]);

  useEffect(() => {
    const formVal = form.maxGroupSize;
    if (maxGroupInputStr !== "" && parseInt(maxGroupInputStr) !== formVal) {
      setMaxGroupInputStr(formVal.toString());
    } else if (maxGroupInputStr === "" && formVal !== 0) {
      setMaxGroupInputStr(formVal.toString());
    }
  }, [form.maxGroupSize]);

  useEffect(() => {
    setUserId(localStorage.getItem("msm_user_id"));
    setIsHydrated(true);
  }, []);

  const { data: host, isLoading: hostLoading } = useMyHost(userId);
  const createEvent = useCreateEvent();
  const uploadFiles = useUploadFiles();
  const publishEvent = usePublishEvent();
  const { checkContentSync } = useContentModeration();
  const [descriptionWarning, setDescriptionWarning] = useState<string | null>(
    null,
  );
  // Plain-text length of the rich-text description, for char counter & maxLength.
  const [descriptionTextLength, setDescriptionTextLength] = useState(0);
  const [isSummarizing, setIsSummarizing] = useState(false);



  useEffect(() => {
    if (isHydrated && !userId && !hostLoading) {
      router.push("/");
    }
  }, [userId, hostLoading, router, isHydrated]);

  const updateForm = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Toggle a language in/out of the multi-select list.
  const toggleLanguage = (lang: string) => {
    setForm((prev) => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang],
    }));
  };

  // Free-text language input for the "Other" option.
  const [customLanguage, setCustomLanguage] = useState("");
  const addCustomLanguage = () => {
    const value = customLanguage.trim();
    if (!value) return;
    if (!form.languages.some((l) => l.toLowerCase() === value.toLowerCase())) {
      updateForm("languages", [...form.languages, value]);
    }
    setCustomLanguage("");
  };

  /* ---------------------------------------------------------------- */
  /*  Image Handlers                                                   */
  /* ---------------------------------------------------------------- */
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

  /* ---------------------------------------------------------------- */
  /*  Ticket tiers                                                     */
  /* ---------------------------------------------------------------- */
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

  /* ---------------------------------------------------------------- */
  /*  Content Moderation                                               */
  /* ---------------------------------------------------------------- */
  const handleDescriptionChange = (value: string) => {
    updateForm("description", value);

    if (value.trim().length > 0) {
      const result = checkContentSync(value);
      if (result.score > 5) {
        setDescriptionWarning(
          `⚠️ Warning: ${result.details} (Risk Level: ${result.score}/10)`,
        );
      } else if (result.score >= 3) {
        setDescriptionWarning(
          `ℹ️ Note: ${result.details} (Risk Level: ${result.score}/10)`,
        );
      } else {
        setDescriptionWarning(null);
      }
    } else {
      setDescriptionWarning(null);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Validation                                                       */
  /* ---------------------------------------------------------------- */
  const validateStep1 = (): boolean => {
    if (!form.title.trim()) {
      setShowErrors(true);
      toast.error("Please enter an experience title");
      return false;
    }
    if (!form.hookLine.trim()) {
      setShowErrors(true);
      toast.error("Please enter a hook line");
      return false;
    }
    if (!form.mood) {
      setShowErrors(true);
      toast.error("Please select a mood");
      return false;
    }
    if (!form.description.trim()) {
      setShowErrors(true);
      toast.error("Please add a description");
      return false;
    }

    // Check description for malicious content
    const descriptionCheck = checkContentSync(form.description);
    if (descriptionCheck.score > 5) {
      toast.error(
        `Description violates community guidelines (Risk Level: ${descriptionCheck.score}/10). ${descriptionCheck.details}`,
      );
      return false;
    }

    return true;
  };

  const validateStep2 = (): boolean => {
    if (!form.eventDate) {
      setShowErrors(true);
      toast.error("Please select an event date");
      return false;
    }
    if (!form.eventTime) {
      setShowErrors(true);
      toast.error("Please select a start time");
      return false;
    }
    if (!form.isFree && !form.useTiers && form.priceCents <= 0) {
      setShowErrors(true);
      toast.error("Please set a valid price");
      return false;
    }
    if (!form.isFree && form.useTiers) {
      const valid = form.priceTiers.filter(
        (t) => t.name.trim() && Number(t.priceStr) > 0,
      );
      if (valid.length === 0) {
        setShowErrors(true);
        toast.error("Add at least one ticket type with a name and price");
        return false;
      }
    }
    if (form.isPrivate && !form.accessPasskey.trim()) {
      setShowErrors(true);
      toast.error("A private experience needs a passkey");
      return false;
    }
    return true;
  };

  /* ---------------------------------------------------------------- */
  /*  Form Submission                                                  */
  /* ---------------------------------------------------------------- */
  const handleSubmit = async (asDraft = false) => {
    // Drafts skip the strict validation so hosts can save work-in-progress.
    // A draft still needs at least a title so the host can find it later.
    if (asDraft) {
      if (!form.title.trim()) {
        toast.error("Add a title before saving as draft");
        return;
      }
    } else if (!validateStep2()) {
      return;
    }
    if (!host?.id) {
      toast.error("Host credentials not found");
      return;
    }
    setSubmitType(asDraft ? "draft" : "publish");
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

      // Construct datetime — drafts may be missing date/time, so fall back to now.
      // Host-entered date/time are India-local (IST); anchor them to +05:30 so the
      // stored UTC instant doesn't drift with the host's browser timezone.
      const hasDateTime = !!(form.eventDate && form.eventTime);
      const eventDateTime = hasDateTime
        ? new Date(istInputToUTCISO(form.eventDate, form.eventTime))
        : new Date();
      let endDateTime: Date;
      if (form.endTime && form.eventDate) {
        endDateTime = new Date(istInputToUTCISO(form.eventDate, form.endTime));
      } else {
        endDateTime = new Date(
          eventDateTime.getTime() + (form.durationMinutes || 60) * 60 * 1000,
        );
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
        google_maps_url: !form.isOnline
          ? form.googleMapsUrl || undefined
          : undefined,
        duration_minutes: form.durationMinutes,
        capacity: form.maxGroupSize,
        min_group_size: form.minGroupSize,
        max_group_size: form.maxGroupSize,
        languages: form.languages,
        level: form.level || undefined,
        price_cents:
          form.isFree || form.useTiers ? 0 : form.priceCents,
        is_free: form.isFree,
        price_tiers:
          !form.isFree && form.useTiers
            ? form.priceTiers
                .filter((t) => t.name.trim() && Number(t.priceStr) > 0)
                .map((t) => ({
                  name: t.name.trim(),
                  price_cents: Math.round(Number(t.priceStr) * 100),
                }))
            : undefined,
        is_recurring: form.isRecurring,
        recurrence_rule: form.isRecurring ? form.recurrenceRule : undefined,
        cancellation_policy: form.cancellationPolicy,
        requires_attendee_details: form.requiresAttendeeDetails,
        attendee_fields: form.requiresAttendeeDetails
          ? form.attendeeFields
          : [],
        is_private: form.isPrivate,
        access_passkey: form.isPrivate ? form.accessPasskey.trim() : "",
        passkey_grants_free:
          form.isPrivate && !form.isFree ? form.passkeyGrantsFree : false,
        status: asDraft ? "draft" : "live",
      });

      // Auto-publish only when the host clicked "Publish Experience".
      if (!asDraft) {
        try {
          await publishEvent.mutateAsync({
            eventId: eventRes.data.id,
            hostId: host.id,
          });
        } catch (publishErr) {
          console.warn("Auto-publish failed, event saved as draft:", publishErr);
        }
      }

      setCreatedEventId(eventRes.data.id);
      setCreatedEventSlug(eventRes.data.slug);
      setSavedAsDraft(asDraft);
      setShowSuccess(true);
      toast.success(
        asDraft
          ? "Draft saved. Find it under Drafts in My Experiences."
          : "Experience created successfully!",
      );
    } catch (err) {
      console.error("Failed to create experience:", err);
      toast.error("Failed to create experience. Please try again.");
    } finally {
      setIsSubmitting(false);
      setSubmitType(null);
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0094CA]" />
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
              { label: "New" },
            ]}
            className="mb-6"
          />

          {/* Header */}
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => router.push("/host-dashboard/experiences")}
              className="rounded-lg p-2 transition hover:bg-gray-100"
            >
              <FiArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Create New Experience
              </h1>
              <p className="text-sm text-gray-500">
                Share something unique with your guests
              </p>
            </div>
          </div>

          <StepIndicator currentStep={currentStep} />

          {/* Step 1: The Basics */}
          {currentStep === 1 && (
            <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  The Basics
                </h2>
                <p className="text-sm text-gray-500">
                  Tell us about your experience
                </p>
              </div>

              {/* Mood Selector — chosen first so the title typeahead can suggest matching templates */}
              <MoodSelector
                value={form.mood}
                onChange={(v) => {
                  updateForm("mood", v);
                  // Reset prefilled title/hook so the new mood's templates surface cleanly.
                  if (v !== form.mood) {
                    updateForm("title", "");
                    updateForm("hookLine", "");
                  }
                }}
                hasError={showErrors && !form.mood}
              />

              {/* Title — typeahead filtered by mood-keyed templates */}
              <TitleAutocomplete
                mood={form.mood}
                value={form.title}
                onChange={(v) => updateForm("title", v)}
                onSelectTemplate={(title, hookLine) => {
                  updateForm("title", title);
                  updateForm("hookLine", hookLine);
                }}
                hasError={showErrors && !form.title.trim()}
                showDropdown={showTitleDropdown}
                setShowDropdown={setShowTitleDropdown}
                blurTimer={titleBlurTimer}
                titleSuggestions={titleSuggestions}
              />

              {/* Hook Line */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Hook Line <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.hookLine}
                  onChange={(e) => {
                    updateForm("hookLine", e.target.value);
                    void hookSuggestions.generateSuggestions(
                      e.target.value,
                      "hookLine",
                      {
                        title: form.title,
                      },
                    );
                  }}
                  onBlur={() => hookSuggestions.clearSuggestions()}
                  placeholder="A short catchy phrase to attract guests"
                  className={`w-full rounded-lg border px-4 py-3 transition outline-none focus:ring-2 focus:ring-[#0094CA] ${showErrors && !form.hookLine.trim()
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 focus:border-transparent"
                    }`}
                  maxLength={150}
                />
                <p className="text-xs text-gray-400">
                  {form.hookLine.length}/150 characters
                </p>
                {hookSuggestions.suggestions.length > 0 && (
                  <SuggestionChips
                    suggestions={hookSuggestions.suggestions}
                    isLoading={hookSuggestions.isLoading}
                    onSelect={(suggestion) => {
                      updateForm("hookLine", suggestion);
                      hookSuggestions.clearSuggestions();
                    }}
                    onDismiss={hookSuggestions.clearSuggestions}
                  />
                )}
              </div>

              {/* Visuals Section */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="mb-4 text-base font-semibold text-gray-900">
                  Visuals
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <ImageUpload
                    label="Profile Image"
                    helpText="This will be the main profile image shown on cards"
                    preview={form.coverImagePreview}
                    onUpload={handleCoverUpload}
                    onRemove={() => {
                      if (form.coverImagePreview)
                        URL.revokeObjectURL(form.coverImagePreview);
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
              </div>

              {/* Logistics Section */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="mb-4 text-base font-semibold text-gray-900">
                  Logistics
                </h3>

                {/* Online/In-Person Toggle */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Experience Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateForm("isOnline", false)}
                      className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${!form.isOnline
                          ? "bg-[#0094CA] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                    >
                      <FiMapPin className="mr-2 inline" size={16} />
                      In-Person
                    </button>
                    <button
                      type="button"
                      onClick={() => updateForm("isOnline", true)}
                      className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${form.isOnline
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
                      placeholder="e.g., https://zoom.us/j/123456789"
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                    />
                    <p className="text-xs text-gray-500">
                      Paste your Zoom, Google Meet, or other video conference
                      link
                    </p>
                  </div>
                )}

                {/* Location (if in-person) */}
                {!form.isOnline && (
                  <div className="mb-4 space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Location
                    </label>
                    <div className="flex gap-2">
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
                        placeholder="Search for a location or locality..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowMapPicker(true)}
                        className="flex items-center gap-2 rounded-lg border border-[#0094CA] bg-white px-4 py-3 text-sm font-semibold text-[#0094CA] transition hover:bg-[#0094CA]/5"
                        title="Pick from map"
                      >
                        <FiMap size={18} />
                        <span className="hidden sm:inline">Pick from Map</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Google Maps URL (if in-person) */}
                {!form.isOnline && (
                  <div className="mb-4 space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Google Maps Link
                    </label>
                    <input
                      type="url"
                      value={form.googleMapsUrl}
                      onChange={(e) =>
                        updateForm("googleMapsUrl", e.target.value)
                      }
                      placeholder="Auto-generated with exact coordinates"
                      readOnly
                      className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                    />
                    <p className="text-xs text-gray-500">
                      Auto-filled with exact location coordinates from Google
                      Maps
                    </p>
                  </div>
                )}

                {/* Duration */}
                <div className="mb-4 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Duration (minutes)
                  </label>
                  <div className="space-y-3">
                    {/* Quick Select Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {DURATION_OPTIONS.map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => updateForm("durationMinutes", mins)}
                          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${form.durationMinutes === mins
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
                        type="text"
                        inputMode="numeric"
                        value={durationInputStr}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || /^\d*$/.test(val)) {
                            setDurationInputStr(val);
                            if (val === "") {
                              updateForm("durationMinutes", 0);
                            } else {
                              const parsed = parseInt(val, 10);
                              if (!isNaN(parsed)) {
                                updateForm("durationMinutes", parsed);
                              }
                            }
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseInt(durationInputStr, 10);
                          if (isNaN(parsed) || parsed < 15) {
                            setDurationInputStr("15");
                            updateForm("durationMinutes", 15);
                          } else {
                            setDurationInputStr(parsed.toString());
                            updateForm("durationMinutes", parsed);
                          }
                        }}
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

                {/* Group Size */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Min Group Size
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={minGroupInputStr}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || /^\d*$/.test(val)) {
                          setMinGroupInputStr(val);
                          if (val === "") {
                            updateForm("minGroupSize", 0);
                          } else {
                            const parsed = parseInt(val, 10);
                            if (!isNaN(parsed)) {
                              updateForm("minGroupSize", parsed);
                            }
                          }
                        }
                      }}
                      onBlur={() => {
                        const parsed = parseInt(minGroupInputStr, 10);
                        if (isNaN(parsed) || parsed < 1) {
                          setMinGroupInputStr("1");
                          updateForm("minGroupSize", 1);
                        } else {
                          setMinGroupInputStr(parsed.toString());
                          updateForm("minGroupSize", parsed);
                        }
                      }}
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Max Group Size
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={maxGroupInputStr}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || /^\d*$/.test(val)) {
                          setMaxGroupInputStr(val);
                          if (val === "") {
                            updateForm("maxGroupSize", 0);
                          } else {
                            const parsed = parseInt(val, 10);
                            if (!isNaN(parsed)) {
                              updateForm("maxGroupSize", parsed);
                            }
                          }
                        }
                      }}
                      onBlur={() => {
                        const parsed = parseInt(maxGroupInputStr, 10);
                        const minVal = form.minGroupSize || 1;
                        if (isNaN(parsed) || parsed < minVal) {
                          setMaxGroupInputStr(minVal.toString());
                          updateForm("maxGroupSize", minVal);
                        } else {
                          setMaxGroupInputStr(parsed.toString());
                          updateForm("maxGroupSize", parsed);
                        }
                      }}
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  <span className="font-medium">Max group size</span> = total spots
                  that can book this session (the event capacity).
                </p>

                {/* Languages */}
                <div className="mt-4 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Languages
                  </label>
                  <p className="text-xs text-gray-500">
                    Pick every language this experience is conducted in.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGE_OPTIONS.map((lang) => {
                      const selected = form.languages.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => toggleLanguage(lang)}
                          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${selected
                              ? "bg-[#0094CA] text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                          {lang}
                        </button>
                      );
                    })}
                    {/* Custom languages already added */}
                    {form.languages
                      .filter((l) => !LANGUAGE_OPTIONS.includes(l))
                      .map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => toggleLanguage(lang)}
                          className="flex items-center gap-1.5 rounded-lg bg-[#0094CA] px-4 py-2 text-sm font-medium text-white transition"
                        >
                          {lang}
                          <span className="text-white/80">✕</span>
                        </button>
                      ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customLanguage}
                      onChange={(e) => setCustomLanguage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomLanguage();
                        }
                      }}
                      placeholder="Other language…"
                      className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                    />
                    <button
                      type="button"
                      onClick={addCustomLanguage}
                      className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Level */}
                <div className="mt-4 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Level
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LEVEL_OPTIONS.map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => updateForm("level", lvl)}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${form.level === lvl
                            ? "bg-[#0094CA] text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="mt-2 space-y-2">
                  <div className="flex items-start justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Description <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <RichTextEditor
                    value={form.description}
                    onChange={(html) => {
                      handleDescriptionChange(html);
                      // AI suggestions work better on plain text — strip tags before sending.
                      const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
                      void descriptionSuggestions.generateSuggestions(
                        plain,
                        "description",
                        {
                          title: form.title,
                          hookLine: form.hookLine,
                          mood: form.mood,
                        },
                      );
                    }}
                    onLengthChange={setDescriptionTextLength}
                    placeholder="Describe what guests will experience, what they'll learn, and what makes your experience special..."
                    maxLength={2000}
                    error={showErrors && !form.description.trim()}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {descriptionTextLength}/2000 characters
                    </p>
                  </div>
                  {descriptionWarning && (
                    <div
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${descriptionWarning.includes("⚠️")
                          ? "border border-red-200 bg-red-50 text-red-700"
                          : "border border-blue-200 bg-blue-50 text-blue-700"
                        }`}
                    >
                      <FiAlertTriangle size={16} className="shrink-0" />
                      <span>{descriptionWarning}</span>
                    </div>
                  )}
                  {descriptionSuggestions.suggestions.length > 0 && (
                    <SuggestionChips
                      suggestions={descriptionSuggestions.suggestions}
                      isLoading={descriptionSuggestions.isLoading}
                      onSelect={(suggestion) => {
                        const newText = form.description + " " + suggestion;
                        handleDescriptionChange(newText);
                        descriptionSuggestions.clearSuggestions();
                      }}
                      onDismiss={descriptionSuggestions.clearSuggestions}
                    />
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setIsSummarizing(true);
                        const res = await fetch("/api/generate-description", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            title: form.title,
                            hookLine: form.hookLine,
                            mood: form.mood,
                            location: form.location,
                            durationMinutes: form.durationMinutes,
                          }),
                        });

                        const data: unknown = await res.json();
                        const generatedDescription =
                          getGeneratedDescription(data);

                        if (res.ok && generatedDescription) {
                          handleDescriptionChange(generatedDescription);
                          toast.success("Description generated");
                        } else {
                          console.error("Generation error", data);
                          toast.error("Failed to generate description");
                        }
                      } catch (err) {
                        console.error(err);
                        toast.error("Failed to generate description");
                      } finally {
                        setIsSummarizing(false);
                      }
                    }}
                    disabled={isSummarizing}
                    className="inline-flex items-center gap-2 rounded-md bg-[#0094CA] px-3 py-2 text-sm text-white hover:bg-[#007ba8] disabled:opacity-60"
                  >
                    {isSummarizing ? "Summarizing..." : "Summarize"}
                  </button>
                </div>
              </div>

              {/* Step 1 footer — draft save + continue */}
              <div className="flex flex-col sm:flex-row gap-4 border-t border-gray-100 pt-6">
                <button
                  onClick={() => void handleSubmit(true)}
                  disabled={isSubmitting}
                  className="flex flex-1 items-center justify-center gap-2.5 rounded-xl border border-gray-250 bg-white py-3.5 px-6 font-semibold text-gray-700 transition duration-300 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitType === "draft" ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save as Draft</span>
                  )}
                </button>
                <button
                  onClick={goToStep2}
                  disabled={isSubmitting}
                  className="flex flex-1 items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#0094CA] via-[#00a6e2] to-[#00bde5] py-3.5 px-6 font-bold text-white shadow-md shadow-[#0094CA]/15 transition-all duration-300 hover:shadow-lg hover:shadow-[#0094CA]/25 hover:-translate-y-0.5 hover:scale-[1.01] active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>Continue to Schedule & Pricing</span>
                  <FiArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Schedule & Pricing */}
          {currentStep === 2 && (
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Form Section */}
              <div className="max-h-[calc(100vh-200px)] space-y-6 overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-sm [scrollbar-width:none] lg:col-span-7 [&::-webkit-scrollbar]:hidden">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Schedule & Pricing
                  </h2>
                  <p className="text-sm text-gray-500">Set when and how much</p>
                </div>

                {/* Pricing Section */}
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                    <span className="inline-flex h-4 w-4 items-center justify-center text-sm leading-none font-bold">
                      ₹
                    </span>{" "}
                    Pricing
                  </h3>

                  {/* Free/Paid Toggle */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateForm("isFree", false)}
                      className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition ${!form.isFree
                          ? "bg-[#0094CA] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                    >
                      Paid Experience
                    </button>
                    <button
                      type="button"
                      onClick={() => updateForm("isFree", true)}
                      className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition ${form.isFree
                          ? "bg-[#0094CA] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                    >
                      Free Experience
                    </button>
                  </div>

                  {/* Pricing mode: single price vs. multiple ticket types */}
                  {!form.isFree && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateForm("useTiers", false)}
                        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${!form.useTiers
                            ? "bg-[#0094CA] text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                      >
                        Single price
                      </button>
                      <button
                        type="button"
                        onClick={() => updateForm("useTiers", true)}
                        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${form.useTiers
                            ? "bg-[#0094CA] text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                      >
                        Multiple ticket types
                      </button>
                    </div>
                  )}

                  {/* Single Price Input */}
                  {!form.isFree && !form.useTiers && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Price per person (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-500">
                          ₹
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={priceInputStr}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^\d*\.?\d*$/.test(val)) {
                              setPriceInputStr(val);
                              if (val === "") {
                                updateForm("priceCents", 0);
                              } else {
                                const parsed = parseFloat(val);
                                if (!isNaN(parsed)) {
                                  updateForm("priceCents", Math.round(parsed * 100));
                                }
                              }
                            }
                          }}
                          onBlur={() => {
                            const parsed = parseFloat(priceInputStr);
                            if (isNaN(parsed) || parsed < 0) {
                              setPriceInputStr("0");
                              updateForm("priceCents", 0);
                            } else {
                              setPriceInputStr(parsed.toString());
                              updateForm("priceCents", Math.round(parsed * 100));
                            }
                          }}
                          className={`w-full rounded-lg border py-3 pr-4 pl-8 transition outline-none focus:ring-2 focus:ring-[#0094CA] ${showErrors && !form.isFree && form.priceCents <= 0
                              ? "border-red-500 bg-red-50"
                              : "border-gray-200 focus:border-transparent"
                            }`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Ticket Tier Editor */}
                  {!form.isFree && form.useTiers && (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Ticket types
                      </label>
                      {form.priceTiers.map((tier, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <input
                            type="text"
                            value={tier.name}
                            onChange={(e) =>
                              updatePriceTier(index, "name", e.target.value)
                            }
                            placeholder="e.g. General, VIP"
                            className={`flex-1 rounded-lg border py-2.5 px-3 text-sm transition outline-none focus:ring-2 focus:ring-[#0094CA] ${showErrors && !tier.name.trim()
                                ? "border-red-500 bg-red-50"
                                : "border-gray-200 focus:border-transparent"
                              }`}
                          />
                          <div className="relative w-32">
                            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                              ₹
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={tier.priceStr}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                  updatePriceTier(index, "priceStr", val);
                                }
                              }}
                              placeholder="Price"
                              className={`w-full rounded-lg border py-2.5 pr-3 pl-7 text-sm transition outline-none focus:ring-2 focus:ring-[#0094CA] ${showErrors && !(Number(tier.priceStr) > 0)
                                  ? "border-red-500 bg-red-50"
                                  : "border-gray-200 focus:border-transparent"
                                }`}
                            />
                          </div>
                          {form.priceTiers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePriceTier(index)}
                              className="mt-1.5 text-gray-400 transition hover:text-red-500"
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
                      <p className="text-xs text-gray-500">
                        Guests pick one ticket type when booking.
                      </p>
                    </div>
                  )}
                </div>

                {/* Availability Section */}
                <div className="space-y-4 border-t border-gray-100 pt-6">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                    <FiCalendar /> Availability
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={form.eventDate}
                        onChange={(e) =>
                          updateForm("eventDate", e.target.value)
                        }
                        min={new Date().toISOString().split("T")[0]}
                        className={`w-full rounded-lg border px-4 py-3 transition outline-none focus:ring-2 focus:ring-[#0094CA] ${showErrors && !form.eventDate
                            ? "border-red-500 bg-red-50"
                            : "border-gray-200 focus:border-transparent"
                          }`}
                      />
                    </div>
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
                        className={`w-full rounded-lg border px-4 py-3 transition outline-none focus:ring-2 focus:ring-[#0094CA] ${showErrors && !form.eventTime
                            ? "border-red-500 bg-red-50"
                            : "border-gray-200 focus:border-transparent"
                          }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      End Time (optional)
                    </label>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => updateForm("endTime", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
                    />
                    <p className="text-xs text-gray-500">
                      Leave empty to auto-calculate based on duration
                    </p>
                  </div>

                  {/* Recurring Toggle */}
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        Recurring Experience
                      </p>
                      <p className="text-sm text-gray-500">
                        This experience repeats on a schedule
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateForm("isRecurring", !form.isRecurring)
                      }
                      className={`h-6 w-12 rounded-full transition ${form.isRecurring ? "bg-[#0094CA]" : "bg-gray-300"}`}
                    >
                      <div
                        className={`h-5 w-5 transform rounded-full bg-white shadow transition ${form.isRecurring ? "translate-x-6" : "translate-x-0.5"}`}
                      />
                    </button>
                  </div>

                  {form.isRecurring && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Recurrence Rule
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
                        <option value="FREQ=WEEKLY;INTERVAL=2">Every 2 weeks</option>
                        <option value="FREQ=MONTHLY">Monthly</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Cancellation Policy */}
                <div className="space-y-4 border-t border-gray-100 pt-6">
                  <h3 className="text-base font-semibold text-gray-900">
                    Cancellation Policy
                  </h3>
                  <div className="space-y-2">
                    {CANCELLATION_POLICIES.map((policy) => (
                      <div
                        key={policy.value}
                        onClick={() =>
                          updateForm("cancellationPolicy", policy.value)
                        }
                        className={`cursor-pointer rounded-lg border p-4 transition ${form.cancellationPolicy === policy.value
                            ? "border-[#0094CA] bg-[#0094CA]/5"
                            : "border-gray-200 hover:border-gray-300"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${form.cancellationPolicy === policy.value
                                ? "border-[#0094CA]"
                                : "border-gray-300"
                              }`}
                          >
                            {form.cancellationPolicy === policy.value && (
                              <div className="h-2 w-2 rounded-full bg-[#0094CA]" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {policy.label}
                            </p>
                            <p className="text-sm text-gray-500">
                              {policy.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attendee Details */}
                <AttendeeDetailsConfig
                  enabled={form.requiresAttendeeDetails}
                  fields={form.attendeeFields}
                  onToggle={(next) =>
                    updateForm("requiresAttendeeDetails", next)
                  }
                  onFieldsChange={(next) => updateForm("attendeeFields", next)}
                />

                <PrivacyAccessSection
                  isPrivate={form.isPrivate}
                  accessPasskey={form.accessPasskey}
                  passkeyGrantsFree={form.passkeyGrantsFree}
                  isFree={form.isFree}
                  showError={showErrors}
                  onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
                />

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 border-t border-gray-100 pt-6">
                  <button
                    onClick={goToStep1}
                    className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3.5 font-semibold text-gray-700 transition duration-300 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 active:scale-[0.99]"
                  >
                    <FiArrowLeft size={16} />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={() => void handleSubmit(true)}
                    disabled={isSubmitting}
                    className="flex flex-1 items-center justify-center gap-2.5 rounded-xl border border-gray-250 bg-white py-3.5 px-6 font-semibold text-gray-700 transition duration-300 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitType === "draft" ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save as Draft</span>
                    )}
                  </button>
                  <button
                    onClick={() => void handleSubmit(false)}
                    disabled={isSubmitting}
                    className="relative overflow-hidden flex flex-[1.5] items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#0094CA] via-[#00a6e2] to-[#00bde5] py-3.5 px-6 font-bold text-white shadow-lg shadow-[#0094CA]/20 transition-all duration-300 ease-out hover:from-[#008bbd] hover:to-[#00b0d6] hover:shadow-xl hover:shadow-[#0094CA]/30 hover:-translate-y-0.5 hover:scale-[1.01] active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                  >
                    {submitType === "publish" ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <FiCheck className="text-lg transition-transform group-hover:scale-110" size={18} />
                        <span>Publish Experience</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Preview Card Sidebar */}
              <div className="lg:col-span-5">
                <div className="sticky top-24">
                  <h3 className="mb-4 text-sm font-semibold text-gray-500 uppercase">
                    Preview
                  </h3>
                  <PreviewCard form={form} />
                  <p className="mt-4 text-center text-xs text-gray-400">
                    This is how your experience will appear to guests
                  </p>
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
        experienceSlug={createdEventSlug}
        isDraft={savedAsDraft}
      />

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

      <ImageCropModal
        file={cropQueue.length > 0 ? cropQueue[0]! : null}
        aspect={16 / 9}
        onClose={() => setCropQueue([])}
        onConfirm={handleCropConfirm}
      />
    </>
  );
}
