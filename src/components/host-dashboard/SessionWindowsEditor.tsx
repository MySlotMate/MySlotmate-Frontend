"use client";

import type { ReactNode } from "react";
import { FiPlus, FiX } from "react-icons/fi";
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
import {
  DatePill,
  TimePill,
  WeekdayPill,
} from "~/components/host-dashboard/DateTimePills";
import {
  Chip,
  DURATION_OPTIONS,
  Segmented,
} from "~/components/host-dashboard/EventFormKit";

/**
 * Availability editor for one-on-one experiences.
 *
 * The host describes when they're free ("Mondays 10 AM to 1 PM") rather than
 * listing every slot; this component splits those hours into sessions live so
 * they can see exactly what guests will be able to book before publishing.
 *
 * Laid out top to bottom in the order a host decides things: how it repeats,
 * how long a session is, which hours, and the break. Uses the same pill
 * pickers as group events.
 *
 * Shared by the create and edit forms — both drive the same generator.
 */

const BREAK_OPTIONS = [0, 5, 10, 15, 30];

const formatDayLabel = (date: string) => {
  try {
    return format(parseISO(date), "EEE d MMM");
  } catch {
    return date;
  }
};

const shortLength = (mins: number) =>
  mins >= 60 ? `${mins / 60}h` : `${mins}m`;

/** "14:00" → "2:00 PM", to match the pickers. */
const time12 = (v: string) => {
  const [h = 0, m = 0] = v.split(":").map(Number);
  const ap = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${ap}`;
};

function Step({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-white/55">{label}</p>
      {children}
    </div>
  );
}

function SlotChips({ slots }: { slots: { time: string; endTime: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {slots.map((slot) => (
        <span
          key={slot.time}
          className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-white/85"
        >
          {time12(slot.time)}
        </span>
      ))}
    </div>
  );
}

type Props = {
  windows: SessionWindow[];
  onWindowsChange: (windows: SessionWindow[]) => void;
  breakMinutes: number;
  onBreakMinutesChange: (minutes: number) => void;
  /** Length of one session — each slot is one session. */
  durationMinutes: number;
  onDurationMinutesChange: (minutes: number) => void;
  /** True = weekly hours; false = a fixed list of dates. */
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
  onDurationMinutesChange,
  isWeekly,
  onIsWeeklyChange,
  showErrors = false,
}: Props) {
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
      windows.map((w) =>
        weeklyMode
          ? {
              date: "",
              start: w.start,
              end: w.end,
              weekday: weekdayOfDate(w.date),
            }
          : { date: "", start: w.start, end: w.end },
      ),
    );
    onIsWeeklyChange(weeklyMode);
  };

  const patchWindow = (index: number, patch: Partial<SessionWindow>) => {
    onWindowsChange(
      windows.map((w, i) => (i === index ? { ...w, ...patch } : w)),
    );
  };

  const addWindow = () => {
    // A second stretch on the same day is the common case (a lunch break), so
    // carry the last day forward.
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
  // Keep a break saved from before (say 20 min) selectable.
  const breakOptions = BREAK_OPTIONS.includes(breakMinutes)
    ? BREAK_OPTIONS
    : [...BREAK_OPTIONS, breakMinutes].sort((a, b) => a - b);

  const sessionCount = isWeekly ? weekly.perWeek : dated.slots.length;

  return (
    <div className="space-y-6">
      <div className="max-w-sm">
        <Segmented
          options={[
            { value: "weekly", label: "Every week" },
            { value: "dates", label: "Specific dates" },
          ]}
          value={isWeekly ? "weekly" : "dates"}
          onChange={(v) => switchMode(v === "weekly")}
        />
      </div>

      <Step label="Each session lasts">
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((mins) => (
            <Chip
              key={mins}
              active={durationMinutes === mins}
              onClick={() => onDurationMinutesChange(mins)}
            >
              {shortLength(mins)}
            </Chip>
          ))}
        </div>
      </Step>

      <Step label="When you're free">
        <div className="space-y-3">
          {windows.map((w, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2">
              {isWeekly ? (
                <WeekdayPill
                  value={w.weekday}
                  onChange={(day) => patchWindow(idx, { weekday: day })}
                  error={showErrors && w.weekday === undefined}
                />
              ) : (
                <DatePill
                  value={w.date}
                  min={today}
                  onChange={(v) => patchWindow(idx, { date: v })}
                  error={showErrors && !w.date}
                />
              )}
              {/* Keep From–Until together so phones wrap the whole pair. */}
              <div className="flex items-center gap-2">
                <TimePill
                  value={w.start}
                  onChange={(v) => patchWindow(idx, { start: v })}
                  placeholder="From"
                  error={showErrors && !w.start}
                  ariaLabel={`Free from, row ${idx + 1}`}
                />
                <span className="text-white/35">to</span>
                <TimePill
                  value={w.end}
                  onChange={(v) => patchWindow(idx, { end: v })}
                  placeholder="Until"
                  start={w.start || undefined}
                  error={showErrors && !w.end}
                  ariaLabel={`Free until, row ${idx + 1}`}
                />
                {windows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWindow(idx)}
                    className="p-1.5 text-white/40 transition hover:text-red-400"
                    aria-label="Remove these hours"
                  >
                    <FiX size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addWindow}
            className="flex items-center gap-1.5 px-2 text-sm font-medium text-[#D8B4FE] transition hover:text-white"
          >
            <FiPlus size={15} /> Add more hours
          </button>
        </div>
      </Step>

      <Step label="Break between sessions">
        <div className="flex flex-wrap gap-2">
          {breakOptions.map((mins) => (
            <Chip
              key={mins}
              active={breakMinutes === mins}
              onClick={() => onBreakMinutesChange(mins)}
            >
              {mins === 0 ? "None" : `${mins}m`}
            </Chip>
          ))}
        </div>
      </Step>

      {visibleErrors.length > 0 && (
        <ul className="space-y-1 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
          {visibleErrors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      {sessionCount > 0 && (
        <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-[#131328] p-4">
          <p className="text-sm font-semibold text-white">
            Guests can book {sessionCount} session
            {sessionCount === 1 ? "" : "s"}
            {isWeekly ? " a week" : ""}
            <span className="font-normal text-white/45"> · one guest each</span>
          </p>

          {isWeekly
            ? weekly.days.map((day) => (
                <div key={day.weekday} className="space-y-1.5">
                  <p className="text-xs text-white/50">
                    {WEEKDAY_LABELS[day.weekday]}s
                  </p>
                  <SlotChips slots={day.slots} />
                </div>
              ))
            : grouped.map(([date, daySlots]) => (
                <div key={date} className="space-y-1.5">
                  <p className="text-xs text-white/50">
                    {formatDayLabel(date)}
                  </p>
                  <SlotChips slots={daySlots} />
                </div>
              ))}

          {isWeekly && (
            <p className="text-xs text-white/45">
              {weekly.perWeek * SESSION_HORIZON_WEEKS > MAX_GENERATED_SESSIONS
                ? `Guests see your next ${MAX_GENERATED_SESSIONS} sessions at a time.`
                : `Guests can book up to ${SESSION_HORIZON_WEEKS} weeks ahead.`}{" "}
              It keeps rolling forward, so you never run out.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
