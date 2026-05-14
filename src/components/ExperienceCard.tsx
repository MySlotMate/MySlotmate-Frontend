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
  Users,
  MapPin,
  Calendar,
  ArrowRight,
  RotateCcw,
  Ticket,
  Palette,
} from "lucide-react";
import { toast } from "sonner";

export type ExperienceCardItem = {
  id?: string;
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
  className = "",
}: ExperienceCardProps) => {
  const [userId, setUserId] = useState<string | null>(null);
  const href = id ? `/experience/${id}` : "/experiences";
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

  // Helper to get badge content based on headline/mood
  const getBadge = () => {
    const text = (isRecurring ? "Recurring" : headline || "Experience").toLowerCase();
    
    if (text.includes("morning")) return { label: "MORNING", icon: Clock3 };
    if (text.includes("beginner") || text.includes("friendly")) return { label: "BEGINNER FRIENDLY", icon: Star };
    if (text.includes("social")) return { label: "SOCIAL", icon: Users };
    if (text.includes("one-time") || !isRecurring) return { label: "ONE-TIME", icon: Ticket };
    if (text.includes("creative")) return { label: "CREATIVE", icon: Palette };
    if (isRecurring) return { label: "RECURRING", icon: RotateCcw };
    
    return { label: headline.toUpperCase() || "EXPERIENCE", icon: Star };
  };

  const badge = getBadge();

  // Date label split into "Tue, 12 May" + "at 8:30 PM" stack
  const renderDateLabel = (label: string) => {
    const atIdx = label.lastIndexOf(" at ");
    if (atIdx !== -1) {
      return {
        top: label.slice(0, atIdx).trim(),
        bottom: label.slice(atIdx + 1).trim(),
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
        <Link 
          href={href} 
          className="relative block aspect-[1.55/1] w-full overflow-hidden rounded-[20px]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl || "/assets/home/hiking.jpg"}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />

          {/* Top-left Badge */}
          <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold tracking-wider text-[#16304c] uppercase shadow-sm">
            <badge.icon className="h-3.5 w-3.5" strokeWidth={2.5} />
            {badge.label}
          </span>

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
                fill={isSaved ? "#16304c" : "none"}
                stroke="#16304c"
                strokeWidth={2.5}
              />
            </button>
          )}
        </Link>
      </div>

      {/* Content Body */}
      <div className="flex flex-1 flex-col px-4 pt-3 pb-3">
        {/* Location Row */}
        {location && (
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#16304c]">
            <MapPin className="h-4 w-4 shrink-0 text-[#0060df]" strokeWidth={2.5} />
            <span className="line-clamp-1">{location}</span>
          </div>
        )}

        {/* Title */}
        <Link href={href} className="mt-2 block">
          <h3 className="line-clamp-1 text-[18px] font-bold leading-tight tracking-tight text-[#16304c] transition-colors group-hover:text-[#0060df]">
            {title}
          </h3>
        </Link>

        {/* Description */}
        <p className="mt-1.5 line-clamp-2 min-h-[34px] text-[12px] leading-snug text-[#5c84a5]">
          {description}
        </p>

        {/* Info Grid (Date & Spots) - Two Column with Divider */}
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#f0f4f8] pt-3">
          <div className="flex items-start gap-3">
            <Calendar
              className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#0060df]"
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

          <div className="flex items-start gap-3 border-l border-[#f0f4f8] pl-4">
            <Users
              className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${isFull ? "text-red-500" : "text-[#0060df]"}`}
              strokeWidth={2.5}
            />
            {isRecurring && (isShowingNext || (isFull && !!nextDateLabel)) ? (
              <div className="min-w-0">
                <p className="truncate text-[12px] font-bold text-[#16304c]">Next session</p>
                <p className="truncate text-[11px] font-medium text-[#0060df]">available</p>
              </div>
            ) : spotsLeft !== null ? (
              <div className="min-w-0">
                <p
                  className={`text-[12px] font-bold ${isFull ? "text-red-500" : "text-[#16304c]"}`}
                >
                  {isFull ? "Fully" : `${spotsLeft} spots`}
                </p>
                <p
                  className={`text-[11px] font-medium ${isFull ? "text-red-500" : "text-[#5c84a5]"}`}
                >
                  {isFull ? "booked" : "available"}
                </p>
              </div>
            ) : (
              <p className="text-[12px] font-bold text-[#a0aec0]">—</p>
            )}
          </div>
        </div>
      </div>

      {/* Pricing + Book Action — light pill row */}
      <div className="mt-auto px-4 pb-3 pt-2">
        <div className="flex items-center justify-between rounded-2xl bg-[#f3f7fc] px-3.5 py-2 ring-1 ring-[#e6eef7]">
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
            className="inline-flex items-center gap-1 rounded-md bg-[#0060df] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-[#004bb1] active:scale-95"
          >
            Book Now
            <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  );
};
