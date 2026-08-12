"use client";

import { useEffect, useMemo, useState } from "react";
import { FiCheck } from "react-icons/fi";
import { formatIST, sameInstant } from "~/lib/datetime";
import type { OccurrenceAvailability } from "~/lib/api";

/**
 * Slot picker for one-on-one experiences.
 *
 * A 1-on-1 host can open a dozen half-hour slots in a single day, which the
 * flat "Choose your session" row renders as a dozen near-identical cards. This
 * splits the choice in two: pick a day, then pick a time within it — so the
 * list stays the length of the host's calendar in days, not in slots.
 */

type Props = {
  sessions: OccurrenceAvailability[];
  selectedDate: string;
  onSelect: (date: string) => void;
};

export default function SessionSlotPicker({
  sessions,
  selectedDate,
  onSelect,
}: Props) {
  // Group by IST calendar day. Slots arrive chronologically from the API, so
  // insertion order is already the order we want inside each day.
  const days = useMemo(() => {
    const byDay = new Map<string, OccurrenceAvailability[]>();
    for (const s of sessions) {
      const key = formatIST(s.date, "yyyy-MM-dd");
      const list = byDay.get(key) ?? [];
      list.push(s);
      byDay.set(key, list);
    }
    return [...byDay.entries()].map(([key, slots]) => ({
      key,
      slots,
      isFullyBooked: slots.every((s) => s.is_fully_booked),
    }));
  }, [sessions]);

  const dayOfSelected = selectedDate
    ? formatIST(selectedDate, "yyyy-MM-dd")
    : "";
  const firstOpenDay = days.find((d) => !d.isFullyBooked)?.key;
  const [activeDay, setActiveDay] = useState(
    dayOfSelected || (firstOpenDay ?? days[0]?.key ?? ""),
  );

  // Follow the selection when it changes elsewhere (e.g. a different slot was
  // picked), and recover if the active day disappears after a refetch.
  useEffect(() => {
    if (dayOfSelected && dayOfSelected !== activeDay) {
      setActiveDay(dayOfSelected);
      return;
    }
    if (days.length > 0 && !days.some((d) => d.key === activeDay)) {
      setActiveDay(firstOpenDay ?? days[0]!.key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayOfSelected, days]);

  const activeSlots = days.find((d) => d.key === activeDay)?.slots ?? [];

  if (days.length === 0) {
    return (
      <div className="rounded-2xl border border-[#dbeaf5] bg-white px-4 py-3 text-sm text-[#6f8daa]">
        No upcoming sessions
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Day strip */}
      <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {days.map((day) => {
          const isActive = day.key === activeDay;
          const sample = day.slots[0]!.date;
          const openCount = day.slots.filter((s) => !s.is_fully_booked).length;
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => setActiveDay(day.key)}
              disabled={day.isFullyBooked}
              className={`flex min-w-[74px] flex-shrink-0 flex-col items-center gap-0.5 rounded-2xl border-2 px-3 py-2 transition ${
                isActive
                  ? "border-transparent bg-gradient-to-br from-[#1fa7ff] to-[#0094CA] text-white shadow-[0_10px_22px_rgba(31,167,255,0.3)]"
                  : "border-[#dbeaf5] bg-white text-[#16304c] hover:border-[#9fd1ee]"
              } ${day.isFullyBooked ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <span className="text-[10px] font-semibold tracking-wide uppercase opacity-80">
                {formatIST(sample, "eee")}
              </span>
              <span className="text-base leading-none font-bold">
                {formatIST(sample, "d")}
              </span>
              <span className="text-[10px] opacity-80">
                {formatIST(sample, "MMM")}
              </span>
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-white/85" : "text-[#6f8daa]"
                }`}
              >
                {day.isFullyBooked ? "Full" : `${openCount} left`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Times within the chosen day */}
      <div className="flex flex-wrap gap-2">
        {activeSlots.map((slot) => {
          const isSelected = sameInstant(selectedDate, slot.date);
          const isDisabled = slot.is_fully_booked;
          return (
            <button
              key={slot.date}
              type="button"
              onClick={() => !isDisabled && onSelect(slot.date)}
              disabled={isDisabled}
              className={`flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition ${
                isSelected
                  ? "border-transparent bg-gradient-to-br from-[#1fa7ff] to-[#0094CA] text-white shadow-[0_10px_22px_rgba(31,167,255,0.3)]"
                  : "border-[#dbeaf5] bg-white text-[#16304c] hover:border-[#9fd1ee]"
              } ${isDisabled ? "cursor-not-allowed line-through opacity-45" : ""}`}
            >
              {formatIST(slot.date, "h:mm a")}
              {isSelected && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white">
                  <FiCheck className="h-2.5 w-2.5 stroke-[3] text-[#0094CA]" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
