"use client";

import { useState } from "react";
import { FiClock, FiX } from "react-icons/fi";
import { format, parseISO } from "date-fns";
import {
  generateSessionSlots,
  generateWeeklySessions,
  groupSlotsByDate,
  MAX_GENERATED_SESSIONS,
  SESSION_HORIZON_WEEKS,
  weekdayOfDate,
  WEEKDAY_LABELS,
  type SessionWindow,
} from "~/lib/sessionSlots";

/**
 * Availability editor for one-on-one experiences.
 *
 * The host describes their day in windows ("10:00–12:00, 15:00–18:00") rather
 * than listing every slot; this component expands those windows live so they
 * can see exactly what guests will be able to book before publishing.
 *
 * Shared by the create and edit forms — both drive the same generator.
 */

const formatDayLabel = (date: string) => {
  try {
    return format(parseISO(date), "EEE d MMM");
  } catch {
    return date;
  }
};

type Props = {
  windows: SessionWindow[];
  onWindowsChange: (windows: SessionWindow[]) => void;
  breakMinutes: number;
  onBreakMinutesChange: (minutes: number) => void;
  /** Session length, set in the Basics step — one session per slot. */
  durationMinutes: number;
  /** True = weekly office hours; false = a fixed list of dates. */
  isWeekly: boolean;
  onIsWeeklyChange: (weekly: boolean) => void;
  /** Show validation errors even before the host has touched anything. */
  showErrors?: boolean;
};

export default function SessionWindowsEditor({
  windows,
  onWindowsChange,
  breakMinutes,
  onBreakMinutesChange,
  durationMinutes,
  isWeekly,
  onIsWeeklyChange,
  showErrors = false,
}: Props) {
  // Mirror the numeric input as a string so clearing the field doesn't snap
  // back to "0" mid-edit (same pattern as the other numeric inputs in the form).
  // Resyncing happens during render rather than in an effect — the value is
  // derived from a prop, so an effect would cost an extra render pass.
  const [breakInputStr, setBreakInputStr] = useState(String(breakMinutes));
  const [lastBreakMinutes, setLastBreakMinutes] = useState(breakMinutes);
  if (breakMinutes !== lastBreakMinutes) {
    setLastBreakMinutes(breakMinutes);
    setBreakInputStr(String(breakMinutes));
  }

  const dated = generateSessionSlots(windows, durationMinutes, breakMinutes);
  const weekly = generateWeeklySessions(windows, durationMinutes, breakMinutes);
  const grouped = groupSlotsByDate(dated.slots);

  // Errors about empty windows are noise while the host is still filling the
  // first row in — only surface them once they've asked to move on.
  const touched = windows.some(
    (w) => w.date || w.start || w.end || w.weekday !== undefined,
  );
  const errors = isWeekly ? weekly.errors : dated.errors;
  const visibleErrors = touched || showErrors ? errors : [];

  // Switching mode rewrites the rows, because a dated window and a weekly one
  // aren't the same shape — keeping the times but swapping day for date is the
  // least surprising translation.
  const switchMode = (weeklyMode: boolean) => {
    if (weeklyMode === isWeekly) return;
    onWindowsChange(
      windows.map((w) => {
        if (weeklyMode) {
          return {
            date: "",
            start: w.start,
            end: w.end,
            weekday: weekdayOfDate(w.date),
          };
        }
        return { date: "", start: w.start, end: w.end };
      }),
    );
    onIsWeeklyChange(weeklyMode);
  };

  const updateWindow = (
    index: number,
    field: keyof SessionWindow,
    value: string,
  ) => {
    onWindowsChange(
      windows.map((w, i) => (i === index ? { ...w, [field]: value } : w)),
    );
  };

  const addWindow = () => {
    // A second window on the same day is the common case (a lunch break), so
    // carry the last date forward.
    const last = windows[windows.length - 1];
    onWindowsChange([
      ...windows,
      isWeekly
        ? { date: "", start: "", end: "", weekday: last?.weekday }
        : { date: last?.date ?? "", start: "", end: "" },
    ]);
  };

  const removeWindow = (index: number) => {
    onWindowsChange(windows.filter((_, i) => i !== index));
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-4 rounded-xl border border-[#A020F0] bg-[#A020F0]/10 p-5">
      <div>
        <h4 className="text-sm font-semibold text-white">Your availability</h4>
        <p className="text-xs text-[#A5A8C3]">
          Add the stretches of time you&apos;re free. We&apos;ll split each one
          into{" "}
          {durationMinutes > 0 ? `${durationMinutes}-minute` : "individual"}{" "}
          sessions that guests book one at a time.
        </p>
        <p className="mt-1 text-xs text-[#A5A8C3]">
          Each session seats one guest, so the group size you set in Basics
          doesn&apos;t apply here.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => switchMode(true)}
          className={`flex-1 rounded-lg border p-3 text-left transition ${
            isWeekly
              ? "border-[#A020F0] bg-[#121426] font-semibold text-[#D8B4FE]"
              : "border-white/10 bg-[#121426] text-white/80 hover:border-white/15"
          }`}
        >
          <div className="text-sm font-medium">Weekly hours</div>
          <div className="mt-0.5 text-xs text-[#A5A8C3]">
            Same hours every week, repeating indefinitely
          </div>
        </button>
        <button
          type="button"
          onClick={() => switchMode(false)}
          className={`flex-1 rounded-lg border p-3 text-left transition ${
            !isWeekly
              ? "border-[#A020F0] bg-[#121426] font-semibold text-[#D8B4FE]"
              : "border-white/10 bg-[#121426] text-white/80 hover:border-white/15"
          }`}
        >
          <div className="text-sm font-medium">Specific dates</div>
          <div className="mt-0.5 text-xs text-[#A5A8C3]">
            A fixed set of days, one by one
          </div>
        </button>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-[#A5A8C3]">
          Break between sessions
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step={5}
            value={breakInputStr}
            onChange={(e) => {
              setBreakInputStr(e.target.value);
              const parsed = parseInt(e.target.value, 10);
              onBreakMinutesChange(
                Number.isNaN(parsed) || parsed < 0 ? 0 : parsed,
              );
            }}
            onBlur={() => setBreakInputStr(String(breakMinutes))}
            className="w-28 rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#A020F0]"
          />
          <span className="text-sm text-[#A5A8C3]">minutes</span>
        </div>
        <p className="text-xs text-[#A5A8C3]">
          Buffer to catch your breath between back-to-back guests. 0 means no
          gap.
        </p>
      </div>

      <div className="space-y-3">
        {windows.map((w, idx) => (
          <div
            key={idx}
            className="flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-[#121426] p-3 shadow-sm"
          >
            <div className="min-w-[150px] flex-1">
              <label className="mb-1 block text-xs font-medium text-[#A5A8C3]">
                {isWeekly ? "Day" : "Date"}
              </label>
              {isWeekly ? (
                <select
                  value={w.weekday ?? ""}
                  onChange={(e) =>
                    onWindowsChange(
                      windows.map((win, i) =>
                        i === idx
                          ? {
                              ...win,
                              weekday:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            }
                          : win,
                      ),
                    )
                  }
                  className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#A020F0]"
                >
                  <option value="">Pick a day</option>
                  {WEEKDAY_LABELS.map((label, day) => (
                    <option key={label} value={day}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="date"
                  value={w.date}
                  min={today}
                  onChange={(e) => updateWindow(idx, "date", e.target.value)}
                  className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#A020F0]"
                />
              )}
            </div>
            <div className="w-32 min-w-[110px]">
              <label className="mb-1 block text-xs font-medium text-[#A5A8C3]">
                From
              </label>
              <input
                type="time"
                value={w.start}
                onChange={(e) => updateWindow(idx, "start", e.target.value)}
                className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#A020F0]"
              />
            </div>
            <div className="w-32 min-w-[110px]">
              <label className="mb-1 block text-xs font-medium text-[#A5A8C3]">
                To
              </label>
              <input
                type="time"
                value={w.end}
                onChange={(e) => updateWindow(idx, "end", e.target.value)}
                className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#A020F0]"
              />
            </div>
            {windows.length > 1 && (
              <button
                type="button"
                onClick={() => removeWindow(idx)}
                className="p-2 text-[#777B98] transition hover:text-red-400"
                title="Remove window"
              >
                <FiX size={18} />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addWindow}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#D8B4FE] hover:underline"
      >
        + Add another {isWeekly ? "weekly window" : "time window"}
      </button>

      {visibleErrors.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          {visibleErrors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      {isWeekly && weekly.perWeek > 0 && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-[#121426] p-4">
          <div className="flex items-center gap-1.5">
            <FiClock className="h-4 w-4 text-[#D8B4FE]" />
            <h5 className="text-sm font-semibold text-white">
              {weekly.perWeek} session{weekly.perWeek === 1 ? "" : "s"} a week,
              every week
            </h5>
          </div>
          {weekly.days.map((day) => (
            <div key={day.weekday} className="space-y-1.5">
              <p className="text-xs font-medium text-[#A5A8C3]">
                {WEEKDAY_LABELS[day.weekday]}s · {day.slots.length} session
                {day.slots.length === 1 ? "" : "s"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {day.slots.map((slot) => (
                  <span
                    key={slot.time}
                    className="rounded-md border border-[#A020F0] bg-[#A020F0]/10 px-2 py-1 text-xs font-medium text-white"
                  >
                    {slot.time}–{slot.endTime}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-[#A5A8C3]">
            {weekly.perWeek * SESSION_HORIZON_WEEKS > MAX_GENERATED_SESSIONS
              ? `That's a dense schedule — guests will see the next ${MAX_GENERATED_SESSIONS} sessions rather than the full ${SESSION_HORIZON_WEEKS} weeks.`
              : `Guests can book up to ${SESSION_HORIZON_WEEKS} weeks ahead.`}{" "}
            The window rolls forward on its own, so your calendar never runs
            out.
          </p>
        </div>
      )}

      {!isWeekly && dated.slots.length > 0 && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-[#121426] p-4">
          <div className="flex items-center gap-1.5">
            <FiClock className="h-4 w-4 text-[#D8B4FE]" />
            <h5 className="text-sm font-semibold text-white">
              {dated.slots.length} session{dated.slots.length === 1 ? "" : "s"}{" "}
              will be created
            </h5>
          </div>
          {grouped.map(([date, daySlots]) => (
            <div key={date} className="space-y-1.5">
              <p className="text-xs font-medium text-[#A5A8C3]">
                {formatDayLabel(date)} · {daySlots.length} session
                {daySlots.length === 1 ? "" : "s"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {daySlots.map((slot) => (
                  <span
                    key={`${slot.date}-${slot.time}`}
                    className="rounded-md border border-[#A020F0] bg-[#A020F0]/10 px-2 py-1 text-xs font-medium text-white"
                  >
                    {slot.time}–{slot.endTime}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
