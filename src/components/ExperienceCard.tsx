"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock3, Heart, Star, Users } from "lucide-react";
import { toast } from "sonner";
import {
  useIsExperienceSaved,
  useSaveExperience,
  useUnsaveExperience,
} from "~/hooks/useApi";

export type ExperienceCardItem = {
  id?: string;
  headline: string;
  title: string;
  description: string;
  imageUrl: string;
  rating: string;
  price: string;
  time?: string;
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
  rating,
  price,
  time,
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

  const isFull = capacity !== undefined && totalBookings !== undefined && totalBookings >= capacity;

  // Local fallback if backend didn't provide nextAvailableDate
  const nextDateLocal =
    isFull && isRecurring && !nextAvailableDate && time
      ? getNextOccurrence(time, recurrenceRule)
      : null;

  const nextDateLabel = nextDateLocal ? formatEventDate(nextDateLocal.toISOString()) : null;

  const displayDate = isShowingNext ? dateLabel : (nextDateLabel ?? dateLabel);
  const useNextStyle = isShowingNext || (isFull && !!nextDateLabel);

  const spotsLeft =
    capacity !== undefined && totalBookings !== undefined
      ? Math.max(0, capacity - totalBookings)
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

  return (
    <Link
      href={href}
      className={`group flex flex-col overflow-hidden rounded-[32px] border border-[#aeddf840] bg-white p-2.5 shadow-[0_16px_40px_rgba(72,128,173,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(72,128,173,0.12)] ${className}`}
    >
      <div className="relative aspect-[1.1/1] w-full shrink-0 overflow-hidden rounded-[24px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl || "/assets/home/hiking.jpg"}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />

        {id && (
          <button
            onClick={handleSave}
            disabled={saveExperience.isPending || unsaveExperience.isPending}
            className="absolute top-2.5 right-2.5 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[#0094CA] shadow-lg backdrop-blur-md transition hover:scale-110 hover:bg-white active:scale-90 disabled:opacity-50"
            aria-label={isSaved ? "Remove from saved" : "Save experience"}
          >
            <Heart
              className="h-4 w-4 transition-colors"
              fill={isSaved ? "#0094CA" : "none"}
              stroke="#0094CA"
              strokeWidth={2.5}
            />
          </button>
        )}

        <div className="absolute top-2.5 left-2.5 z-40 flex flex-col gap-1">
          {isRecurring ? (
            <span className="rounded-full bg-[#0e8ae0] px-2 py-0.5 text-[8px] font-black tracking-widest text-white uppercase shadow-md">
              Recurring
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-2 pt-2.5 pb-3">
        <div className="flex h-5 items-center">
          <span className="inline-block rounded-full bg-[#f0f9ff] px-2 py-0.5 text-[8px] font-black tracking-widest text-[#0e8ae0] uppercase truncate">
            {headline}
          </span>
        </div>
        
        <div className="mt-1.5 h-11">
          <h3 className="line-clamp-2 text-base font-black leading-tight tracking-tight text-[#16304c] group-hover:text-[#0e8ae0] transition-colors">
            {title}
          </h3>
        </div>
        
        <div className="mt-1 h-9">
          <p className="line-clamp-2 text-[12px] leading-relaxed text-[#5c84a5]">
            {description}
          </p>
        </div>

        <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-50 pt-2.5 h-[42px] justify-center">
          <div className="flex items-center gap-1.5">
            <Clock3 size={11} className="text-[#0e8ae0]" strokeWidth={2.5} />
            {useNextStyle ? (
              <p className="text-[10px] font-bold tracking-[0.02em] text-emerald-600 truncate">
                Next: {displayDate}
              </p>
            ) : displayDate ? (
              <p className="text-[10px] font-bold tracking-[0.02em] text-[#16304c] truncate">
                {displayDate}
              </p>
            ) : (
              <p className="text-[10px] font-bold tracking-[0.02em] text-[#a0aec0] truncate">
                Schedule TBD
              </p>
            )}
          </div>

          {spotsLeft !== null && !(isFull && isRecurring) && (
            <div className="flex items-center gap-1.5">
              <Users size={11} className={isFull ? "text-red-500" : "text-emerald-600"} strokeWidth={2.5} />
              <p className={`text-[10px] font-bold tracking-[0.02em] ${
                isFull ? "text-red-500" : "text-emerald-600"
              } truncate`}>
                {isFull
                  ? "Fully Booked"
                  : spotsLeft === 1
                    ? "Last spot!"
                    : `${spotsLeft} spots available`}
              </p>
            </div>
          )}
          {isFull && isRecurring && nextDateLabel && (
            <div className="flex items-center gap-1.5">
              <Users size={11} className="text-emerald-600" strokeWidth={2.5} />
              <p className="text-[10px] font-bold tracking-[0.02em] text-emerald-600 truncate">
                Next session available
              </p>
            </div>
          )}
        </div>

        <div className="mt-auto pt-3">
          <div className="flex items-center justify-between rounded-xl bg-[#fafcfe] p-1.5">
            <div className="flex flex-col px-1">
              <div className="flex items-baseline gap-0.5">
                <span className="text-xs font-black text-[#16304c]">{price.split(' ')[0]}</span>
                <span className="text-[9px] font-bold text-[#a0aec0]">
                  {price.includes('/') ? `/${price.split('/').pop()?.trim()}` : '/ session'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 shadow-sm ring-1 ring-slate-100">
              {rating !== "New" && (
                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              )}
              <span className="text-[10px] font-black text-[#16304c]">
                {rating}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
