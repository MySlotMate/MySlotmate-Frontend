"use client";

/**
 * Shared pieces of the create- and edit-event pages, so both read like the
 * finished event page: poster, plain section headings, folded "More options"
 * rows, category pills, chips and toggles.
 */

import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { FiChevronDown, FiUpload, FiX } from "react-icons/fi";
import { LuGlobe, LuLock, LuSparkles } from "react-icons/lu";
import { categoriesFor, type EventKind } from "~/lib/categories";

export const DURATION_OPTIONS = [30, 60, 90, 120, 180, 240];

// Preset languages an experience can be conducted in. Hosts may also add a
// custom one via the "Other" input. Selection is multi-select.
export const LANGUAGE_OPTIONS = ["English", "Hindi", "Bengali", "Assamese"];

export const LEVEL_OPTIONS = ["Beginner Friendly", "Intermediate", "Advanced"];

export const CANCELLATION_POLICIES = [
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

export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/* ------------------------------------------------------------------ */
/*  Form building blocks — glass row-cards, pill chips, toggle rows    */
/* ------------------------------------------------------------------ */
export const GRADIENT = "bg-gradient-to-r from-[#7038F5] to-[#B724EA]";
export const FIELD =
  "w-full rounded-2xl border border-white/10 bg-[#121426] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#B57BFF]";
/** Borderless text field that reads like the event page until focused. */
export const INLINE_FIELD =
  "w-full rounded-xl border border-transparent bg-transparent px-2 py-2 text-[15px] text-white outline-none transition placeholder:text-white/35 hover:bg-white/[0.04] focus:border-white/10 focus:bg-white/[0.06]";
/** Date/time/select pickers shown inline as text. */
export const INLINE_PICKER =
  "cursor-pointer rounded-xl bg-transparent px-2 py-1.5 text-[15px] text-white outline-none [color-scheme:dark] transition hover:bg-white/[0.05] focus:bg-white/[0.08] [&::-webkit-calendar-picker-indicator]:hidden";
export const ROW_INPUT =
  "row-input min-w-0 flex-1 bg-transparent text-right text-sm text-white outline-none placeholder:text-white/30";

export function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-white/[0.08] pt-6">
      {title && (
        <div>
          <h2 className="font-outfit text-lg font-semibold text-white">
            {title}
          </h2>
          {hint && <p className="mt-0.5 text-xs text-white/45">{hint}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * A one-line row that opens to show optional settings, with the current
 * choice summarised on the right so hosts can skip it at a glance.
 */
export function MoreOptions({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/[0.08] last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-lg py-3.5 text-left transition outline-none hover:text-white focus-visible:bg-white/[0.04]"
      >
        <span className="flex-1 text-sm font-medium text-white">{title}</span>
        {summary && (
          <span className="max-w-[45%] truncate text-xs text-white/45">
            {summary}
          </span>
        )}
        <FiChevronDown
          className={`h-4 w-4 shrink-0 text-white/40 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="space-y-4 pb-5">{children}</div>}
    </div>
  );
}

export function Rows({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.06] bg-[#131328] px-4">
      {children}
    </div>
  );
}

export function Row({
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

export function Chip({
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

export function Segmented<T extends string>({
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

export function ToggleRow({
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

export function AddPill({
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
export function CoverPoster({
  preview,
  title,
  mood,
  isPrivate,
  onUpload,
  onRemove,
}: {
  preview: string | null;
  title: string;
  mood: string;
  /** Drives the Public / Private badge on the poster. */
  isPrivate: boolean;
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
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#2b1470] via-[#5a1fc4] to-[#B724EA]">
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
      {/* Who can find this event: updates live with the Public/Private switch */}
      <span
        key={isPrivate ? "private" : "public"}
        role="img"
        aria-label={isPrivate ? "Private event" : "Public event"}
        title={isPrivate ? "Private event" : "Public event"}
        className={`absolute top-4 left-4 flex h-10 w-10 animate-[hero-stack-fade_0.3s_ease-out] items-center justify-center rounded-full backdrop-blur-md ${
          isPrivate
            ? "bg-[#080914]/80 text-white ring-1 ring-[#D8B4FE]/40"
            : "bg-white/90 text-[#080914]"
        }`}
      >
        {isPrivate ? (
          <LuLock className="h-[18px] w-[18px] text-[#D8B4FE]" />
        ) : (
          <LuGlobe className="h-[18px] w-[18px] text-[#7B2FFF]" />
        )}
      </span>
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
/*  Mood Selector Component                                            */
/* ------------------------------------------------------------------ */
export function MoodSelector({
  value,
  onChange,
  hasError,
  kind,
}: {
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
  /** Group experiences and 1:1 sessions have separate category lists. */
  kind: EventKind;
}) {
  const options = categoriesFor(kind);
  const [open, setOpen] = useState(false);
  const chosen = options.find((c) => c.moods.includes(value));
  // Once picked, show just that pill (tap to change) so the page stays short.
  if (chosen && !open) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-[#B57BFF]/60 bg-[#7B2FFF]/15 px-3.5 py-1.5 text-[13px] font-medium text-white">
          <chosen.icon className="h-3.5 w-3.5 text-[#D8B4FE]" />
          {chosen.label}
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-1 text-[13px] font-medium text-white/50 transition hover:text-white"
        >
          Change
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      <p className="text-sm text-white/55">
        {kind === "session"
          ? "What is your 1:1 session about?"
          : "What kind of experience is it?"}
      </p>
      <div
        className={`flex flex-wrap gap-2 rounded-2xl transition ${hasError ? "p-1.5 ring-1 ring-red-500" : ""}`}
      >
        {options.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => {
              onChange(c.moods[0]!);
              setOpen(false);
            }}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${
              c.moods.includes(value)
                ? "border-[#B57BFF]/60 bg-[#7B2FFF]/15 text-white"
                : "border-white/15 text-white/75 hover:border-white/35 hover:text-white"
            }`}
          >
            <c.icon className="h-3.5 w-3.5" />
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
