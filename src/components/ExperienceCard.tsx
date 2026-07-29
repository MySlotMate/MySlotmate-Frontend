"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  useIsExperienceSaved,
  useSaveExperience,
  useUnsaveExperience,
} from "~/hooks/useApi";
import {
  Clock3,
  Heart,
  Star,
  MapPin,
  Calendar,
  ArrowRight,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

export type ExperienceCardItem = {
  id?: string;
  /** Clean slug for the detail-page link; falls back to id (both resolve). */
  slug?: string;
  headline: string;
  title: string;
  description: string;
  imageUrl: string;
  rating: string;
  price: string;
  time?: string;
  location?: string | null;
  isRecurring?: boolean;
  capacity?: number;
  totalBookings?: number;
  recurrenceRule?: string | null;
  nextAvailableDate?: string | null;
  /** Private events show a lock badge; booking requires the host's passkey. */
  isPrivate?: boolean;
};

export const formatEventDate = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Parse a simple RRULE (e.g. "FREQ=WEEKLY;BYDAY=MO,WE") and compute the next
 * occurrence after `baseDate` that falls on or after `now`.
 * Returns null if the rule can't be parsed or isn't weekly/daily.
 */
export const getNextOccurrence = (
  baseDate: string,
  rule: string | null | undefined,
): Date | null => {
  if (!rule) return null;

  const parts: Record<string, string> = {};
  if (rule.includes("=")) {
    for (const segment of rule.split(";")) {
      const eqIdx = segment.indexOf("=");
      if (eqIdx > 0) {
        parts[segment.slice(0, eqIdx).toUpperCase()] = segment.slice(eqIdx + 1);
      }
    }
  } else {
    // Fallback for simple strings like "weekly", "daily"
    const lower = rule.toLowerCase();
    if (lower === "daily") parts.FREQ = "DAILY";
    else if (lower === "weekly") parts.FREQ = "WEEKLY";
    else if (lower === "monthly") parts.FREQ = "MONTHLY";
  }

  const freq = parts.FREQ;
  if (freq !== "WEEKLY" && freq !== "DAILY") return null;

  const base = new Date(baseDate);
  if (isNaN(base.getTime())) return null;

  // To find the NEXT occurrence after the currently full one, 
  // we start our search from the base date itself.
  const now = new Date();
  const searchFrom = new Date(Math.max(now.getTime(), base.getTime() + 1000));

  const interval = parseInt(parts.INTERVAL ?? "1");
  const cursor = new Date(searchFrom);
  cursor.setHours(base.getHours(), base.getMinutes(), 0, 0);

  if (freq === "DAILY") {
    // If we are daily with interval, we need to find the correct day
    // For simplicity, if it's just DAILY, we already handled it.
    // But let's make it more general.
    const diffTime = cursor.getTime() - base.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      const remainder = diffDays % interval;
      if (remainder !== 0) cursor.setDate(cursor.getDate() + (interval - remainder));
    }
    if (cursor <= searchFrom) cursor.setDate(cursor.getDate() + interval);
    return cursor;
  }

  // Weekly handling with potentially multiple days (though we mostly use single day rules for now)
  const dayMap: Record<string, number> = {
    SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
  };
  const byDay = parts.BYDAY;
  const targetDays: number[] = [];
  if (byDay) {
    for (const token of byDay.split(",")) {
      const mapped = dayMap[token.trim()];
      if (mapped !== undefined) targetDays.push(mapped);
    }
  } else {
    // Default to the base date's day of week
    targetDays.push(base.getDay());
  }
  targetDays.sort((a, b) => a - b);

  for (let i = 0; i < 60; i++) {
    const dayOfWeek = cursor.getDay();
    if (targetDays.includes(dayOfWeek) && cursor > searchFrom) {
      // Check interval
      const diffTime = cursor.getTime() - base.getTime();
      const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
      if (diffWeeks % interval === 0) {
        return cursor;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
};

interface ExperienceCardProps extends ExperienceCardItem {
  className?: string;
}

export const ExperienceCard = ({
  id,
  slug,
  headline,
  title,
  description,
  imageUrl,
  rating: _rating,
  price,
  time,
  location,
  isRecurring,
  capacity,
  totalBookings,
  recurrenceRule,
  nextAvailableDate,
  isPrivate,
  className = "",
}: ExperienceCardProps) => {
  const [userId, setUserId] = useState<string | null>(null);
  const experienceRef = slug ?? id;
  const href = experienceRef ? `/experience/${experienceRef}` : "/experiences";
  const effectiveDate = nextAvailableDate ?? time;
  const isShowingNext = !!nextAvailableDate && nextAvailableDate !== time;
  const dateLabel = formatEventDate(effectiveDate);

  const { data: savedStatus } = useIsExperienceSaved(id ?? null, userId);
  const saveExperience = useSaveExperience();
  const unsaveExperience = useUnsaveExperience();

  const isSaved = savedStatus?.saved ?? false;

  const isFull = !isRecurring && capacity !== undefined && totalBookings !== undefined && totalBookings >= capacity;

  // Local fallback if backend didn't provide nextAvailableDate
  const nextDateLocal =
    isFull && isRecurring && !nextAvailableDate && time
      ? getNextOccurrence(time, recurrenceRule)
      : null;

  const nextDateLabel = nextDateLocal ? formatEventDate(nextDateLocal.toISOString()) : null;

  const displayDate = isShowingNext ? dateLabel : (nextDateLabel ?? dateLabel);

  const spotsLeft =
    capacity !== undefined && totalBookings !== undefined
      ? (isRecurring ? capacity : Math.max(0, capacity - totalBookings))
      : null;

  useEffect(() => {
    const id = localStorage.getItem("msm_user_id");
    if (id) {
      setUserId(id);
    }
  }, []);

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!id || !userId) {
      if (!userId) toast.error("Please login to save experiences");
      return;
    }

    if (isSaved) {
      unsaveExperience.mutate(
        { eventId: id, userId },
        { onSuccess: () => toast.success("Removed from saved") },
      );
    } else {
      saveExperience.mutate(
        { user_id: userId, event_id: id },
        { onSuccess: () => toast.success("Saved to your list") },
      );
    }
  };

  // Split price into amount + unit (e.g. "Free" / "" or "₹50" / "/slot")
  const priceAmount = price.split(/\s|\//)[0] ?? price;
  const isFree = /free/i.test(priceAmount);
  const priceUnit = price.includes("/")
    ? `/${price.split("/").pop()?.trim()}`
    : isFree
      ? "session"
      : "/slot";

  const numericRating = parseFloat(_rating || "0");
  const isNew = isNaN(numericRating) || numericRating === 0;

  const badge = {
    label: isNew ? "NEW" : (Number.isInteger(numericRating) ? numericRating.toFixed(1) : numericRating.toString()),
    icon: Star,
  };

  // Date label split into "Tue, 12 May" + "at 8:30 PM" stack
  const renderDateLabel = (label: string) => {
    const atIdx = label.lastIndexOf(" at ");
    if (atIdx !== -1) {
      return {
        top: label.slice(0, atIdx).trim(),
        bottom: label.slice(atIdx + 1).trim(),
      };
    }

    // Match comma followed by time (e.g. "Fri 31 Jul, 6:00 am" or "Fri, Jul 31, 6:00 AM")
    const match = /^(.*?),\s*(\d{1,2}:\d{2}.*)$/.exec(label);
    if (match?.[1] && match[2]) {
      const top = match[1].trim();
      const bottom = match[2].trim();
      return {
        top,
        bottom: bottom.toLowerCase().startsWith("at") ? bottom : `at ${bottom}`,
      };
    }

    // Fallback: split on comma. e.g. "Thu, May 15, 8:30 PM"
    const commaSplit = label.split(", ");
    if (commaSplit.length >= 3) {
      const timePart = commaSplit.slice(2).join(", ");
      return {
        top: commaSplit.slice(0, 2).join(", ").trim(),
        bottom: timePart.toLowerCase().startsWith("at") ? timePart : `at ${timePart}`,
      };
    }

    return { top: label, bottom: "" };
  };

  const date = displayDate ? renderDateLabel(displayDate) : null;

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-[24px] border border-[#eef3f8] bg-white shadow-[0_10px_30px_rgba(72,128,173,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(72,128,173,0.12)] ${className}`}
    >
      {/* Image Container - with white framing padding */}
      <div className="p-2.5 pb-0">
        {/* Event posters come in any ratio, so show the whole image
            (object-contain) over a blurred, over-scaled copy of itself —
            nothing on the poster is cropped, and the frame is filled instead of
            showing empty bars. The backdrop is decorative; the foreground <img>
            carries the alt text. */}
        <Link
          href={href}
          className="relative block aspect-[16/9] w-full overflow-hidden rounded-[20px] bg-slate-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl || "/assets/home/hiking.webp"}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl || "/assets/home/hiking.webp"}
            alt={title}
            loading="lazy"
            className="relative h-full w-full object-contain transition-transform duration-700 group-hover:scale-110"
          />

          {/* Top-left Badges */}
          <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold tracking-wider text-[#16304c] uppercase shadow-sm">
              <badge.icon className="h-3 w-3 text-[#f59e0b] fill-[#f59e0b]" strokeWidth={2.5} />
              {badge.label}
            </span>
            {isPrivate && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#16304c]/90 px-3 py-1.5 text-[10px] font-bold tracking-wider text-white uppercase shadow-sm">
                <Lock className="h-3 w-3" strokeWidth={2.5} />
                Private
              </span>
            )}
          </div>

          {/* Top-right Save Button */}
          {id && (
            <button
              onClick={(e) => {
                e.preventDefault();
                handleSave(e);
              }}
              disabled={saveExperience.isPending || unsaveExperience.isPending}
              className="absolute top-3 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#16304c] shadow-sm transition hover:scale-110 hover:bg-white active:scale-90 disabled:opacity-50"
              aria-label={isSaved ? "Remove from saved" : "Save experience"}
            >
              <Heart
                className="h-[17px] w-[17px] transition-colors"
                fill={isSaved ? "#ef3838ff" : "none"}
                stroke={isSaved ? "#f02f2fff" : "#16304c"}
                strokeWidth={2.5}
              />
            </button>
          )}
        </Link>
      </div>

      {/* Content Body */}
      <div className="flex flex-1 flex-col px-4 pt-4 pb-4">
        {/* Title */}
        <Link href={href} className="block">
          <h3 className="line-clamp-1 text-[15px] font-bold leading-tight tracking-tight text-[#16304c] transition-colors group-hover:bg-[linear-gradient(135deg,#1fa7ff,#63ceff)] group-hover:bg-clip-text group-hover:text-transparent">
            {title}
          </h3>
        </Link>

        {/* Description */}
        <p className="mt-1.5 line-clamp-2 min-h-[34px] text-[12px] leading-snug text-[#5c84a5]">
          {description}
        </p>

        <svg width="0" height="0" className="absolute" aria-hidden="true">
          <defs>
            <linearGradient id={`icon-gradient-${id ?? "default"}`} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1fa7ff" offset="0%" />
              <stop stopColor="#63ceff" offset="100%" />
            </linearGradient>
          </defs>
        </svg>
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#f0f4f8] pt-3">
          <div className="flex items-start gap-3">
            <Calendar
              className="mt-0.5 h-4.5 w-4.5 shrink-0"
              style={{ stroke: `url(#icon-gradient-${id ?? "default"})` }}
              strokeWidth={2.5}
            />
            {date ? (
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-[#16304c]">
                  {date.top}
                </p>
                <p className="text-[11px] font-medium text-[#5c84a5]">
                  {date.bottom}
                </p>
              </div>
            ) : (
              <p className="text-[12px] font-bold text-[#a0aec0]">Schedule TBD</p>
            )}
          </div>

          <div className="flex items-start gap-2 border-l border-[#f0f4f8] pl-3">
            <MapPin
              className="mt-0.5 h-4.5 w-4.5 shrink-0"
              style={{ stroke: `url(#icon-gradient-${id ?? "default"})` }}
              strokeWidth={2.5}
            />
            {location ? (
              <div className="min-w-0">
                <p className="line-clamp-2 text-[12px] font-bold leading-snug text-[#16304c]">
                  {location}
                </p>
              </div>
            ) : (
              <p className="text-[12px] font-bold text-[#a0aec0]">Location TBD</p>
            )}
          </div>
        </div>
      </div>

      {/* Pricing + Book Action — light pill row */}
      <div className="mt-auto px-4 pb-3 pt-2">
        <div className="flex items-center justify-between rounded-2xl bg-[#fcfdff] px-4 py-3 ring-1 ring-[#e6eef7]">
          <div className="flex items-baseline gap-1">
            <span className="text-[15px] font-bold text-[#16304c]">
              {priceAmount}
            </span>
            <span className="text-[10px] font-medium text-[#5c84a5]">
              {priceUnit}
            </span>
          </div>

          <Link
            href={href}
            className="inline-flex items-center gap-1 rounded-md bg-[linear-gradient(135deg,#1fa7ff,#63ceff)] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-[#004bb1] active:scale-95"
          >
            Book Now
            <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  );
};
