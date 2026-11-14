"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AttendeeDetailsConfig from "~/components/host-dashboard/AttendeeDetailsConfig";
import SessionWindowsEditor from "~/components/host-dashboard/SessionWindowsEditor";
import PrivacyAccessSection from "~/components/host/PrivacyAccessSection";
import CouponsManager from "~/components/host/CouponsManager";
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
import { RichTextEditor } from "~/components/RichTextEditor";
import { RichTextView } from "~/components/RichTextView";
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
import {
  LuLanguages,
  LuBadgeCheck,
  LuSparkles,
  LuTicket,
} from "react-icons/lu";
import { format } from "date-fns";
import { istInputToUTCISO } from "~/lib/datetime";
import {
  generateSessionSlots,
  generateWeeklySessions,
  nextWeeklySession,
  slotsToCustomDates,
  type SessionWindow,
} from "~/lib/sessionSlots";
import type { SessionType } from "~/lib/api";
import { toast } from "sonner";
import { MapPickerModal, LocationSearchInput } from "~/components";
import { ImageCropModal } from "~/components/ImageCropModal";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
/**
 * A monthly pass only makes sense on a repeating, paid experience: nothing
 * repeats on a one-time event, and nothing is saved on a free one. The server
 * enforces this too — this just keeps the form honest.
 */
function passEligible(form: {
  monthlyPassEnabled: boolean;
  monthlyPassPriceStr: string;
  isFree: boolean;
  scheduleType: string;
}): boolean {
  return (
    form.monthlyPassEnabled &&
    !form.isFree &&
    form.scheduleType !== "one_time" &&
    Number(form.monthlyPassPriceStr) > 0
  );
}

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
  // Monthly pass: one payment covers a month of sessions. Recurring, paid
  // experiences only — there is nothing to repeat otherwise.
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
  // One-on-one mode: the host gives availability windows and we expand them
  // into single-seat sessions (see src/lib/sessionSlots.ts).
  sessionType: SessionType;
  sessionWindows: SessionWindow[];
  breakMinutes: number;
  // Weekly office hours (repeat forever, generated server-side) vs a fixed
  // list of dated windows expanded into custom_dates.
  sessionIsWeekly: boolean;
  cancellationPolicy: string;
  // Attendee details
  requiresAttendeeDetails: boolean;
  attendeeFields: string[];
  // Privacy & access
  isPrivate: boolean;
  privateAccessMode: "passkey" | "rsvp";
  accessMode: "shared" | "unique";
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
/*  Form building blocks — glass row-cards, pill chips, toggle rows    */
/* ------------------------------------------------------------------ */
const GRADIENT = "bg-gradient-to-r from-[#7038F5] to-[#B724EA]";
const FIELD =
  "w-full rounded-2xl border border-white/10 bg-[#121426] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#B57BFF]";
const ROW_INPUT =
  "row-input min-w-0 flex-1 bg-transparent text-right text-sm text-white outline-none placeholder:text-white/30";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="border-b border-white/[0.08] pb-2">
        <h2 className="font-outfit text-base font-semibold text-white">
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-xs text-white/40">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Rows({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.06] bg-[#131328] px-4">
      {children}
    </div>
  );
}

function Row({
  label,
  error,
  children,
}: {
  label: string;
  error?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex min-h-[52px] items-center justify-between gap-4 py-2">
      <span
        className={`shrink-0 text-sm ${error ? "text-red-400" : "text-white/50"}`}
      >
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        {children}
      </div>
    </label>
  );
}

function Chip({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition disabled:opacity-40 ${
        active
          ? `border-transparent ${GRADIENT} text-white`
          : "border-white/10 bg-white/[0.06] text-white/70 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-full border border-white/[0.06] bg-[#131328] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
            value === o.value
              ? "bg-white/15 text-white"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-[#131328] px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm text-white">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-white/40">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-40 ${
          checked ? GRADIENT : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-[#fff] shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

function AddPill({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-full border border-white/10 bg-white/[0.06] px-5 py-3 text-sm text-white transition hover:bg-white/10"
    >
      <span>{children}</span>
      <span className="text-lg leading-none text-white/70">+</span>
    </button>
  );
}

/* Poster-style cover: shows the profile image, or a gradient with the live title. */
function CoverPoster({
  preview,
  title,
  mood,
  onUpload,
  onRemove,
}: {
  preview: string | null;
  title: string;
  mood: string;
  onUpload: (files: File[]) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const ok = files.filter((f) => f.size <= MAX_FILE_SIZE_BYTES);
    if (ok.length < files.length) {
      toast.error(`Max size is ${MAX_FILE_SIZE_MB}MB per file.`);
    }
    if (ok.length > 0) onUpload(ok);
    e.target.value = "";
  };

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#2b1470] via-[#5a1fc4] to-[#B724EA]">
      {preview ? (
        <Image
          src={preview}
          alt="Cover preview"
          fill
          unoptimized
          className="object-cover"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <LuSparkles className="h-6 w-6 text-white/70" />
          <p className="font-outfit line-clamp-3 text-2xl leading-tight font-extrabold tracking-tight break-words text-white/90">
            {title.trim() || "Your experience starts here"}
          </p>
          {mood && (
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white capitalize">
              {mood}
            </span>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={pick}
        className="hidden"
      />
      {preview && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove cover image"
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
        >
          <FiX size={16} />
        </button>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={preview ? "Change cover image" : "Upload cover image"}
        className="absolute right-4 bottom-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#fff] text-[#5a1fc4] shadow-lg transition hover:scale-105"
      >
        <FiUpload size={18} />
      </button>
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
      {label && (
        <label className="block text-sm font-medium text-white/80">{label}</label>
      )}
      {helpText && <p className="text-xs text-white/50">{helpText}</p>}

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
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-white/[0.06]">
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
                    className="absolute top-1/2 right-4 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2.5 opacity-0 shadow-md transition group-hover:opacity-100 hover:bg-white"
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
                    ? "border-[#B57BFF]"
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
                  className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500/100 text-white shadow transition hover:bg-red-600"
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
          className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition ${
            isDragging
              ? "scale-105 border-[#B57BFF] bg-[#7038F5]/15"
              : "border-white/10 hover:border-[#B57BFF] hover:bg-white/[0.06]"
          }`}
        >
          <FiUpload
            className={`mx-auto mb-2 transition ${isDragging ? "text-[#D8B4FE]" : "text-white/40"}`}
            size={24}
          />
          <p
            className={`text-sm transition ${isDragging ? "font-semibold text-[#D8B4FE]" : "text-white/50"}`}
          >
            {isDragging
              ? `Drop ${multiple ? "images" : "image"} here`
              : `Click to upload or drag ${multiple ? "images" : "image"}`}
          </p>
          <p className="mt-1 text-xs text-white/40">PNG, JPG up to 5MB</p>
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
      <p className="text-sm text-white/50">
        What vibe best describes your experience?
      </p>
      <div
        className={`flex flex-wrap gap-2 rounded-xl p-1 transition ${hasError ? "bg-red-500/10 ring-1 ring-red-500" : ""}`}
      >
        {MOODS.map((mood) => (
          <button
            key={mood}
            type="button"
            onClick={() => onChange(mood.toLowerCase())}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              value === mood.toLowerCase()
                ? "bg-gradient-to-r from-[#7038F5] to-[#B724EA] text-white"
                : "bg-white/[0.06] text-white/80 hover:bg-white/10"
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
          className={`font-outfit w-full rounded-2xl border border-white/10 bg-[#121426] px-4 py-4 text-xl font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-[#B57BFF] ${
            moodDisabled ? "cursor-not-allowed opacity-50" : ""
          } ${hasError ? "!border-red-500 !bg-red-500/10" : ""}`}
          maxLength={100}
        />

        {showDropdown && !moodDisabled && (
          <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-white/10 bg-[#131328] shadow-lg">
            {isLoading && (
              <div className="px-4 py-3 text-sm text-white/50">
                Loading suggestions…
              </div>
            )}
            {!isLoading && filtered.length === 0 && (
              <div className="px-4 py-3 text-sm text-white/50">
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
                  className="block w-full border-b border-white/[0.06] px-4 py-3 text-left text-sm transition last:border-b-0 hover:bg-white/[0.06]"
                >
                  <p className="font-semibold text-white">{t.title}</p>
                  <p className="mt-0.5 text-xs text-white/50">{t.hook_line}</p>
                </button>
              ))}
          </div>
        )}
      </div>
      <p className="text-xs text-white/40">{value.length}/100 characters</p>
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
    <div className="sticky top-20 mx-auto h-max w-full max-w-[420px] pl-4 select-none lg:ml-auto">
      <div className="relative overflow-hidden rounded-3xl border border-[#cfe8fa] bg-gradient-to-br from-white via-[#f4faff] to-[#e9f5ff] p-5 shadow-[0_24px_60px_rgba(58,119,172,0.12)]">
        {/* Header */}
        <div className="mb-3 flex items-start gap-2.5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#cfe8fa] bg-white shadow-[0_8px_20px_rgba(31,167,255,0.18)]">
            <LuTicket className="h-4 w-4 -rotate-12 text-[#0094CA]" />
          </div>
          <div className="flex-1">
            <h2 className="font-outfit text-xl leading-none font-extrabold tracking-tight text-[#16304c]">
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
                  {form.eventTime
                    ? getFormattedTime(form.eventTime)
                    : "Time TBD"}
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
            <div className="flex w-full items-center justify-between rounded-2xl border border-[#dbeaf5] bg-white px-3.5 py-2.5 pr-10 text-sm font-medium text-[#16304c] outline-none">
              <span>1 Guest</span>
              <FiChevronDown className="h-4 w-4 text-[#6f8daa]" />
            </div>
          </div>
        </div>

        {/* Reserve Button Mock */}
        <button
          type="button"
          disabled
          className="group flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1fa7ff] to-[#0094CA] py-2.5 text-sm font-semibold text-white opacity-50 shadow-[0_16px_32px_rgba(31,167,255,0.32)]"
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
                Only {form.maxGroupSize} spot{form.maxGroupSize > 1 ? "s" : ""}{" "}
                left!
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
  onClose,
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
          className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
            isDraft ? "bg-gray-100" : "bg-green-100"
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
          <button
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#0094CA] py-3 font-semibold text-[#0094CA] transition hover:bg-[#0094CA]/5"
          >
            Add access &amp; coupon codes
          </button>
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitType, setSubmitType] = useState<"draft" | "publish" | null>(
    null,
  );
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

  // Local string trackers for controlled numeric inputs to avoid leading-zero/clearing issues
  const [priceInputStr, setPriceInputStr] = useState<string>(
    form.isFree ? "" : (form.priceCents / 100).toString(),
  );
  const [durationInputStr, setDurationInputStr] = useState<string>(
    form.durationMinutes.toString(),
  );
  const [minGroupInputStr, setMinGroupInputStr] = useState<string>(
    form.minGroupSize.toString(),
  );
  const [maxGroupInputStr, setMaxGroupInputStr] = useState<string>(
    form.maxGroupSize.toString(),
  );

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
        setShowErrors(true);
        toast.error(errors[0]);
        return false;
      }
      if (count === 0) {
        setShowErrors(true);
        toast.error("Your availability windows don't fit a single session");
        return false;
      }
    } else if (form.scheduleType === "custom_dates") {
      const valid = form.customDatesList.filter((s) => s.date && s.time);
      if (valid.length === 0) {
        setShowErrors(true);
        toast.error("Please add at least one custom date and time slot");
        return false;
      }
    } else {
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
    }
    if (!form.isFree && !form.useTiers && form.priceCents <= 0) {
      setShowErrors(true);
      toast.error("Please set a valid price");
      return false;
    }
    if (
      form.monthlyPassEnabled &&
      form.scheduleType !== "one_time" &&
      !form.isFree &&
      Number(form.monthlyPassPriceStr) <= 0
    ) {
      setShowErrors(true);
      toast.error("Please set a monthly pass price, or switch the pass off");
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
    // RSVP-gated events have no passkey at all — access comes from an approved
    // request — so the passkey requirement applies only to the passkey gate.
    if (
      form.isPrivate &&
      form.privateAccessMode === "passkey" &&
      form.accessMode === "shared" &&
      !form.accessPasskey.trim()
    ) {
      setShowErrors(true);
      toast.error("A private experience needs a passkey");
      return false;
    }
    // An RSVP host approves people on the strength of what they submit, so the
    // request form can't be empty — without required fields every request would
    // arrive as a bare name and there'd be nothing to judge.
    if (
      form.isPrivate &&
      form.privateAccessMode === "rsvp" &&
      (!form.requiresAttendeeDetails || form.attendeeFields.length === 0)
    ) {
      setShowErrors(true);
      toast.error(
        "Request-to-join needs attendee details — turn them on and pick at least one field",
      );
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
    } else if (!validateStep1() || !validateStep2()) {
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
      // One-on-one: expand the host's windows into the individual sessions that
      // become custom_dates. Empty for group events.
      // Dated one-on-one: expand the windows into the sessions that become
      // custom_dates. Weekly one-on-one sends no dates at all — the server
      // regenerates them from the windows on every read — but still needs a
      // real upcoming session as the event's anchor time.
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
                  : oneOnOneSlots[0]?.date) ?? "",
              time:
                (isWeeklyOneOnOne
                  ? weeklyAnchor?.time
                  : oneOnOneSlots[0]?.time) ?? "",
            }
          : form.scheduleType === "custom_dates" &&
              form.customDatesList[0]?.date &&
              form.customDatesList[0]?.time
            ? form.customDatesList[0]
            : { date: form.eventDate, time: form.eventTime };

      const hasDateTime = !!(firstSlot.date && firstSlot.time);
      const eventDateTime = hasDateTime
        ? new Date(istInputToUTCISO(firstSlot.date, firstSlot.time))
        : new Date();
      let endDateTime: Date;
      if (form.sessionType === "one_on_one") {
        // end_time spans ONE session, not the whole day: consumers derive a
        // per-occurrence duration from (end_time - time), so stretching it to
        // the last window would make every slot look hours long.
        endDateTime = new Date(
          eventDateTime.getTime() + (form.durationMinutes || 60) * 60 * 1000,
        );
      } else if (form.endTime && firstSlot.date) {
        endDateTime = new Date(istInputToUTCISO(firstSlot.date, form.endTime));
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
        // A one-on-one slot seats exactly one guest — that single seat is what
        // stops a second booking landing on the same session.
        capacity: form.sessionType === "one_on_one" ? 1 : form.maxGroupSize,
        min_group_size:
          form.sessionType === "one_on_one" ? 1 : form.minGroupSize,
        max_group_size:
          form.sessionType === "one_on_one" ? 1 : form.maxGroupSize,
        languages: form.languages,
        level: form.level || undefined,
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
            : undefined,
        monthly_pass: {
          price_cents: passEligible(form)
            ? Math.round(Number(form.monthlyPassPriceStr) * 100)
            : 0,
          session_limit: form.monthlyPassSessionsStr
            ? Number(form.monthlyPassSessionsStr)
            : undefined,
          capacity: form.monthlyPassCapacityStr
            ? Number(form.monthlyPassCapacityStr)
            : undefined,
        },
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
        is_recurring: isWeeklyOneOnOne || form.scheduleType === "recurring",
        // The weekdays live in the windows, so the rule only says "weekly".
        recurrence_rule: isWeeklyOneOnOne
          ? "FREQ=WEEKLY"
          : form.scheduleType === "recurring"
            ? form.recurrenceRule
            : undefined,
        cancellation_policy: form.cancellationPolicy,
        requires_attendee_details: form.requiresAttendeeDetails,
        attendee_fields: form.requiresAttendeeDetails
          ? form.attendeeFields
          : [],
        is_private: form.isPrivate,
        private_access_mode: form.privateAccessMode,
        // Shared mode sends the one passkey; unique mode clears it (access comes
        // from the per-guest access codes generated after saving).
        access_passkey:
          form.isPrivate && form.accessMode === "shared"
            ? form.accessPasskey.trim()
            : "",
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
          console.warn(
            "Auto-publish failed, event saved as draft:",
            publishErr,
          );
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
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  // Digits-only numeric field that clamps to `min` on blur.
  const intField = (
    str: string,
    setStr: (v: string) => void,
    key: "durationMinutes" | "minGroupSize" | "maxGroupSize",
    min: number,
  ) => ({
    inputMode: "numeric" as const,
    value: str,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val !== "" && !/^\d*$/.test(val)) return;
      setStr(val);
      updateForm(key, val === "" ? 0 : parseInt(val, 10));
    },
    onBlur: () => {
      const parsed = parseInt(str, 10);
      const next = isNaN(parsed) || parsed < min ? min : parsed;
      setStr(next.toString());
      updateForm(key, next);
    },
  });

  const scheduleModes = [
    {
      label: "One-time",
      hint: "Single date & time",
      active: form.sessionType === "group" && form.scheduleType === "one_time",
      apply: () => {
        updateForm("scheduleType", "one_time");
        updateForm("isRecurring", false);
        updateForm("sessionType", "group");
      },
    },
    {
      label: "Recurring",
      hint: "Repeats daily, weekly or monthly",
      active: form.sessionType === "group" && form.scheduleType === "recurring",
      apply: () => {
        updateForm("scheduleType", "recurring");
        updateForm("isRecurring", true);
        updateForm("sessionType", "group");
      },
    },
    {
      label: "Custom dates",
      hint: "Pick specific dates, e.g. Aug 15, 22, Sept 5",
      active:
        form.sessionType === "group" && form.scheduleType === "custom_dates",
      apply: () => {
        updateForm("scheduleType", "custom_dates");
        updateForm("isRecurring", false);
        updateForm("sessionType", "group");
      },
    },
    {
      label: "One-on-one",
      hint: "Set your hours, we split them into 1:1 slots",
      active: form.sessionType === "one_on_one",
      apply: () => {
        // One-on-one is stored as a custom-dates event whose slots
        // we generate from the host's availability windows.
        updateForm("sessionType", "one_on_one");
        updateForm("scheduleType", "custom_dates");
        updateForm("isRecurring", false);
      },
    },
  ];

  const draftLabel =
    submitType === "draft" ? (
      <>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
        <span>Saving...</span>
      </>
    ) : (
      <span>Save as draft</span>
    );

  if (hostLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080914]">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#B57BFF]" />
      </div>
    );
  }

  return (
    <>
      <main className="msm-dark-form min-h-screen bg-[#080914] pb-28 text-white md:pl-20 min-[80rem]:pl-[230px]">
        <div className="mx-auto max-w-[1120px] px-5 py-8 md:px-10">
          {/* Header */}
          <div className="mb-8 flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/10"
              aria-label="Back to home"
            >
              <FiArrowLeft size={18} />
            </button>
            <div>
              <h1 className="font-outfit text-2xl font-bold text-white">
                Create an Experience
              </h1>
              <p className="text-sm text-white/50">
                Share something unique with your guests
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[420px_minmax(0,1fr)] lg:gap-12">
            {/* Left — cover + host */}
            <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
              <CoverPoster
                preview={form.coverImagePreview}
                title={form.title}
                mood={form.mood}
                onUpload={handleCoverUpload}
                onRemove={() => {
                  if (form.coverImagePreview)
                    URL.revokeObjectURL(form.coverImagePreview);
                  updateForm("coverImage", null);
                  updateForm("coverImagePreview", null);
                }}
              />
              <p className="px-1 text-xs text-white/40">
                Profile image — shown on experience cards. Add more photos
                below.
              </p>

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
              </div>
            </aside>

            {/* Right — form */}
            <div className="min-w-0 space-y-9">
              <Segmented<"public" | "private">
                value={form.isPrivate ? "private" : "public"}
                onChange={(v) => updateForm("isPrivate", v === "private")}
                options={[
                  { value: "public", label: "Public" },
                  { value: "private", label: "Private" },
                ]}
              />

              {/* Basics */}
              <div className="space-y-5">
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

                <div className="space-y-2">
                  <input
                    type="text"
                    value={form.hookLine}
                    onChange={(e) => {
                      updateForm("hookLine", e.target.value);
                      void hookSuggestions.generateSuggestions(
                        e.target.value,
                        "hookLine",
                        { title: form.title },
                      );
                    }}
                    onBlur={() => hookSuggestions.clearSuggestions()}
                    placeholder="Hook line — a short catchy phrase *"
                    aria-label="Hook line"
                    className={`${FIELD} ${
                      showErrors && !form.hookLine.trim()
                        ? "!border-red-500 !bg-red-500/10"
                        : ""
                    }`}
                    maxLength={150}
                  />
                  <p className="px-1 text-xs text-white/40">
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
              </div>

              {/* When */}
              <Section title="When">
                <div className="grid gap-2 sm:grid-cols-2">
                  {scheduleModes.map((m) => (
                    <button
                      key={m.label}
                      type="button"
                      onClick={m.apply}
                      className={`rounded-2xl border p-3.5 text-left transition ${
                        m.active
                          ? "border-[#B57BFF] bg-[#7038F5]/15"
                          : "border-white/[0.06] bg-[#131328] hover:border-white/20"
                      }`}
                    >
                      <div
                        className={`text-sm font-medium ${m.active ? "text-[#D8B4FE]" : "text-white"}`}
                      >
                        {m.label}
                      </div>
                      <div className="mt-0.5 text-xs text-white/40">
                        {m.hint}
                      </div>
                    </button>
                  ))}
                </div>

                {form.sessionType === "group" &&
                  (form.scheduleType === "one_time" ||
                    form.scheduleType === "recurring") && (
                    <Rows>
                      <Row label="Date" error={showErrors && !form.eventDate}>
                        <input
                          type="date"
                          value={form.eventDate}
                          onChange={(e) =>
                            updateForm("eventDate", e.target.value)
                          }
                          min={new Date().toISOString().split("T")[0]}
                          className={ROW_INPUT}
                        />
                      </Row>
                      <Row
                        label="Start time"
                        error={showErrors && !form.eventTime}
                      >
                        <input
                          type="time"
                          value={form.eventTime}
                          onChange={(e) =>
                            updateForm("eventTime", e.target.value)
                          }
                          className={ROW_INPUT}
                        />
                      </Row>
                      <Row label="End time (optional)">
                        <input
                          type="time"
                          value={form.endTime}
                          onChange={(e) =>
                            updateForm("endTime", e.target.value)
                          }
                          className={ROW_INPUT}
                        />
                      </Row>
                      {form.scheduleType === "recurring" && (
                        <Row label="Repeats">
                          <select
                            value={form.recurrenceRule}
                            onChange={(e) =>
                              updateForm("recurrenceRule", e.target.value)
                            }
                            className={ROW_INPUT}
                          >
                            <option value="">Select frequency</option>
                            <option value="FREQ=DAILY">Daily</option>
                            <option value="FREQ=WEEKLY">Weekly</option>
                            <option value="FREQ=WEEKLY;INTERVAL=2">
                              Every 2 weeks
                            </option>
                            <option value="FREQ=MONTHLY">Monthly</option>
                          </select>
                        </Row>
                      )}
                    </Rows>
                  )}
                {form.sessionType === "group" &&
                  (form.scheduleType === "one_time" ||
                    form.scheduleType === "recurring") && (
                    <p className="px-1 text-xs text-white/40">
                      Leave the end time empty to calculate it from the
                      duration.
                    </p>
                  )}

                {form.sessionType === "group" &&
                  form.scheduleType === "custom_dates" && (
                    <div className="space-y-3">
                      {form.customDatesList.map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <Rows>
                              <Row label="Date">
                                <input
                                  type="date"
                                  value={slot.date}
                                  onChange={(e) =>
                                    updateCustomSlot(
                                      idx,
                                      "date",
                                      e.target.value,
                                    )
                                  }
                                  min={new Date().toISOString().split("T")[0]}
                                  className={ROW_INPUT}
                                />
                              </Row>
                              <Row label="Start time">
                                <input
                                  type="time"
                                  value={slot.time}
                                  onChange={(e) =>
                                    updateCustomSlot(
                                      idx,
                                      "time",
                                      e.target.value,
                                    )
                                  }
                                  className={ROW_INPUT}
                                />
                              </Row>
                            </Rows>
                          </div>
                          {form.customDatesList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCustomSlot(idx)}
                              className="p-2 text-white/40 transition hover:text-red-400"
                              title="Remove slot"
                              aria-label="Remove slot"
                            >
                              <FiX size={18} />
                            </button>
                          )}
                        </div>
                      ))}
                      <AddPill onClick={addCustomSlot}>Add another date</AddPill>
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
                    showErrors={showErrors}
                  />
                )}
              </Section>

              {/* Where */}
              <Section title="Where">
                <Segmented<"in_person" | "online">
                  value={form.isOnline ? "online" : "in_person"}
                  onChange={(v) => updateForm("isOnline", v === "online")}
                  options={[
                    {
                      value: "in_person",
                      label: (
                        <>
                          <FiMapPin size={15} /> In-person
                        </>
                      ),
                    },
                    { value: "online", label: <>🌐 Online</> },
                  ]}
                />

                {form.isOnline ? (
                  <Rows>
                    <Row label="Meeting link">
                      <input
                        type="url"
                        value={form.meetingLink}
                        onChange={(e) =>
                          updateForm("meetingLink", e.target.value)
                        }
                        placeholder="Zoom, Google Meet…"
                        className={ROW_INPUT}
                      />
                    </Row>
                  </Rows>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="min-w-0 flex-1">
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
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowMapPicker(true)}
                        className="flex shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-[#D8B4FE] transition hover:bg-white/10"
                        title="Pick from map"
                      >
                        <FiMap size={18} />
                        <span className="hidden sm:inline">Pick on map</span>
                      </button>
                    </div>
                    {form.googleMapsUrl && (
                      <p className="truncate px-1 text-xs text-white/40">
                        Pinned: {form.googleMapsUrl}
                      </p>
                    )}
                  </div>
                )}
              </Section>

              {/* Details */}
              <Section title="Add details">
                <div className="space-y-2">
                  <RichTextEditor
                    value={form.description}
                    onChange={(html) => {
                      handleDescriptionChange(html);
                      // AI suggestions work better on plain text — strip tags before sending.
                      const plain = html
                        .replace(/<[^>]+>/g, " ")
                        .replace(/\s+/g, " ")
                        .trim();
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
                  <div className="flex items-center justify-between gap-3 px-1">
                    <p className="text-xs text-white/40">
                      {descriptionTextLength}/2000 characters
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setIsSummarizing(true);
                          const res = await fetch(
                            "/api/generate-description",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                title: form.title,
                                hookLine: form.hookLine,
                                mood: form.mood,
                                location: form.location,
                                durationMinutes: form.durationMinutes,
                              }),
                            },
                          );

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
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-xs font-medium text-[#D8B4FE] transition hover:bg-white/10 disabled:opacity-60"
                    >
                      <LuSparkles className="h-3.5 w-3.5" />
                      {isSummarizing ? "Writing..." : "Write with AI"}
                    </button>
                  </div>
                  {descriptionWarning && (
                    <div
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                        descriptionWarning.includes("⚠️")
                          ? "border border-red-500/30 bg-red-500/10 text-red-300"
                          : "border border-blue-400/30 bg-blue-500/10 text-blue-300"
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
                </div>

                <Rows>
                  <Row label="Duration (min)">
                    <input
                      type="text"
                      {...intField(
                        durationInputStr,
                        setDurationInputStr,
                        "durationMinutes",
                        15,
                      )}
                      placeholder="Minimum 15"
                      className={ROW_INPUT}
                    />
                  </Row>
                  <Row label="Min group size">
                    <input
                      type="text"
                      {...intField(
                        minGroupInputStr,
                        setMinGroupInputStr,
                        "minGroupSize",
                        1,
                      )}
                      className={ROW_INPUT}
                    />
                  </Row>
                  <Row label="Max group size">
                    <input
                      type="text"
                      {...intField(
                        maxGroupInputStr,
                        setMaxGroupInputStr,
                        "maxGroupSize",
                        form.minGroupSize || 1,
                      )}
                      className={ROW_INPUT}
                    />
                  </Row>
                </Rows>
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map((mins) => (
                    <Chip
                      key={mins}
                      active={form.durationMinutes === mins}
                      onClick={() => {
                        updateForm("durationMinutes", mins);
                        setDurationInputStr(mins.toString());
                      }}
                    >
                      {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                    </Chip>
                  ))}
                </div>
                <p className="px-1 text-xs text-white/40">
                  Max group size is the total number of spots that can book
                  this session (the event capacity).
                </p>

                <div className="space-y-2 pt-2">
                  <p className="text-sm text-white/50">
                    Languages — pick every language you&apos;ll host in
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <Chip
                        key={lang}
                        active={form.languages.includes(lang)}
                        onClick={() => toggleLanguage(lang)}
                      >
                        {lang}
                      </Chip>
                    ))}
                    {/* Custom languages already added */}
                    {form.languages
                      .filter((l) => !LANGUAGE_OPTIONS.includes(l))
                      .map((lang) => (
                        <Chip
                          key={lang}
                          active
                          onClick={() => toggleLanguage(lang)}
                        >
                          {lang} <span className="text-white/80">✕</span>
                        </Chip>
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
                      className={`${FIELD} !py-2.5`}
                    />
                    <button
                      type="button"
                      onClick={addCustomLanguage}
                      className="rounded-full border border-white/10 bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-sm text-white/50">Level</p>
                  <div className="flex flex-wrap gap-2">
                    {LEVEL_OPTIONS.map((lvl) => (
                      <Chip
                        key={lvl}
                        active={form.level === lvl}
                        onClick={() => updateForm("level", lvl)}
                      >
                        {lvl}
                      </Chip>
                    ))}
                  </div>
                </div>
              </Section>

              {/* Photos */}
              <Section title="Photos" hint="Cover and gallery photos">
                <ImageUpload
                  label=""
                  multiple
                  previews={form.galleryPreviews}
                  onUpload={handleGalleryUpload}
                  onRemoveMultiple={removeGalleryImage}
                />
              </Section>

              {/* Pricing */}
              <Section title="Tickets">
                <Segmented<"paid" | "free">
                  value={form.isFree ? "free" : "paid"}
                  onChange={(v) => updateForm("isFree", v === "free")}
                  options={[
                    { value: "paid", label: "Paid" },
                    { value: "free", label: "Free" },
                  ]}
                />

                {!form.isFree && (
                  <Segmented<"single" | "tiers">
                    value={form.useTiers ? "tiers" : "single"}
                    onChange={(v) => updateForm("useTiers", v === "tiers")}
                    options={[
                      { value: "single", label: "Single price" },
                      { value: "tiers", label: "Multiple ticket types" },
                    ]}
                  />
                )}

                {!form.isFree && !form.useTiers && (
                  <Rows>
                    <Row
                      label="Price per person (₹)"
                      error={showErrors && form.priceCents <= 0}
                    >
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
                                updateForm(
                                  "priceCents",
                                  Math.round(parsed * 100),
                                );
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
                        className={ROW_INPUT}
                      />
                    </Row>
                  </Rows>
                )}

                {!form.isFree && form.useTiers && (
                  <div className="space-y-3">
                    {form.priceTiers.map((tier, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <Rows>
                            <Row
                              label="Ticket name"
                              error={showErrors && !tier.name.trim()}
                            >
                              <input
                                type="text"
                                value={tier.name}
                                onChange={(e) =>
                                  updatePriceTier(index, "name", e.target.value)
                                }
                                placeholder="General, VIP…"
                                className={ROW_INPUT}
                              />
                            </Row>
                            <Row
                              label="Price (₹)"
                              error={showErrors && !(Number(tier.priceStr) > 0)}
                            >
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
                                placeholder="0"
                                className={ROW_INPUT}
                              />
                            </Row>
                          </Rows>
                        </div>
                        {form.priceTiers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePriceTier(index)}
                            className="p-2 text-white/40 transition hover:text-red-400"
                            aria-label="Remove ticket type"
                          >
                            <FiX className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <AddPill onClick={addPriceTier}>Add another ticket type</AddPill>
                    <p className="px-1 text-xs text-white/40">
                      Guests pick one ticket type when booking.
                    </p>
                  </div>
                )}

                {/* Monthly Pass — one payment covers a month of sessions. */}
                {!form.isFree && (
                  <>
                    <ToggleRow
                      label="Monthly pass"
                      hint={
                        form.scheduleType === "one_time"
                          ? "Pick a recurring or custom-dates schedule to offer a pass."
                          : "Guests pay once and attend for 30 days."
                      }
                      checked={form.monthlyPassEnabled}
                      disabled={form.scheduleType === "one_time"}
                      onChange={(v) => updateForm("monthlyPassEnabled", v)}
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
                                updateForm("monthlyPassPriceStr", e.target.value)
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
                  </>
                )}
              </Section>

              {/* Manage */}
              <Section title="Manage your experience">
                <div className="space-y-2">
                  <p className="px-1 text-sm text-white/50">
                    Cancellation policy
                  </p>
                  {CANCELLATION_POLICIES.map((policy) => {
                    const selected = form.cancellationPolicy === policy.value;
                    return (
                      <button
                        key={policy.value}
                        type="button"
                        onClick={() =>
                          updateForm("cancellationPolicy", policy.value)
                        }
                        className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                          selected
                            ? "border-[#B57BFF] bg-[#7038F5]/15"
                            : "border-white/[0.06] bg-[#131328] hover:border-white/20"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                            selected ? "border-[#B57BFF]" : "border-white/30"
                          }`}
                        >
                          {selected && (
                            <span className="h-2 w-2 rounded-full bg-[#B57BFF]" />
                          )}
                        </span>
                        <span>
                          <span className="block text-sm font-medium text-white">
                            {policy.label}
                          </span>
                          <span className="block text-xs text-white/50">
                            {policy.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Attendee Details */}
                <AttendeeDetailsConfig
                  enabled={form.requiresAttendeeDetails}
                  fields={form.attendeeFields}
                  onToggle={(next) => updateForm("requiresAttendeeDetails", next)}
                  onFieldsChange={(next) => updateForm("attendeeFields", next)}
                />

                <PrivacyAccessSection
                  isPrivate={form.isPrivate}
                  privateAccessMode={form.privateAccessMode}
                  accessMode={form.accessMode}
                  accessPasskey={form.accessPasskey}
                  showError={showErrors}
                  canGenerateCodes={!!createdEventId}
                  onChange={(patch) =>
                    setForm((prev) => ({ ...prev, ...patch }))
                  }
                />

                {/* Codes attach to a saved event, so they unlock once the
                    experience has been created (draft or published). */}
                {createdEventId && host?.id ? (
                  <div className="space-y-6">
                    {/* Access codes only matter for a private event. */}
                    {form.isPrivate && (
                      <CouponsManager
                        eventId={createdEventId}
                        hostId={host.id}
                        kind="access"
                      />
                    )}
                    {/* Free-booking coupons only matter for a paid event. */}
                    {!form.isFree && (
                      <>
                        <CouponsManager
                          eventId={createdEventId}
                          hostId={host.id}
                          kind="free"
                        />
                        <CouponsManager
                          eventId={createdEventId}
                          hostId={host.id}
                          kind="discount"
                        />
                      </>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/40">
                    Save this experience (draft or publish) to add access codes
                    and free-booking coupons — they attach to the saved event.
                  </div>
                )}
              </Section>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => void handleSubmit(false)}
                  disabled={isSubmitting}
                  className={`flex w-full items-center justify-center gap-2.5 rounded-full px-6 py-4 font-semibold text-white transition hover:opacity-90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 ${GRADIENT}`}
                >
                  {submitType === "publish" ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <FiCheck size={18} />
                      <span>Publish experience</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => void handleSubmit(true)}
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2.5 rounded-full border border-white/15 px-6 py-4 font-semibold text-white transition hover:bg-white/[0.06] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {draftLabel}
                </button>
              </div>
            </div>
          </div>
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
