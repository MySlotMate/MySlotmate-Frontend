import { istInputToUTCISO, utcToISTInputs } from "./datetime";

/**
 * One-on-one session scheduling.
 *
 * A host running 1-on-1 sessions doesn't enter slots one by one — they say
 * "I'm free 10:00–12:00, 15:00–18:00 and 20:00–22:00 on 15 Aug, 30 minutes
 * each, no break" and expect 14 bookable slots. This module is the expansion:
 * windows + duration + break → individual session start times.
 *
 * Times here are IST wall-clock strings exactly as the host typed them (see
 * datetime.ts for why every event time is IST); conversion to the UTC instants
 * the API stores happens once, at the very end, via istInputToUTCISO.
 *
 * The generator is pure and lives outside the page components because both the
 * create form and the edit form expand the same windows.
 */

/**
 * One stretch of availability. Either dated (a one-off calendar) or weekly
 * (office hours that repeat every week) — never both. Which kind an event uses
 * is decided by its recurrence toggle, not per window.
 */
export type SessionWindow = {
  /** "YYYY-MM-DD" — dated windows only. */
  date: string;
  /** "HH:mm" */
  start: string;
  /** "HH:mm" */
  end: string;
  /** 0 = Sunday … 6 = Saturday — weekly windows only. */
  weekday?: number;
};

/** How far ahead recurring sessions are offered. Mirrors the Go constant. */
export const SESSION_HORIZON_WEEKS = 4;

/**
 * Cap on generated sessions per event, mirroring the Go constant. A schedule
 * dense enough to hit it gets fewer than SESSION_HORIZON_WEEKS weeks, so the
 * host-facing copy has to say so rather than promising four.
 */
export const MAX_GENERATED_SESSIONS = 300;

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type GeneratedSlot = {
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:mm", session start */
  time: string;
  /** "HH:mm", session end — start + durationMinutes */
  endTime: string;
};

export type SlotGenerationResult = {
  slots: GeneratedSlot[];
  /** Human-readable problems with the windows; slots is empty when non-empty. */
  errors: string[];
};

const MINUTES_IN_DAY = 24 * 60;

/** "HH:mm" → minutes past midnight, or null if unparseable. */
function toMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Minutes past midnight → "HH:mm". */
function toTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/* ── Error wording ─────────────────────────────────────────────────────
 * Errors are shown to hosts as-is, so they read as sentences using the same
 * words as the form ("2:00 PM", "Every Monday") rather than raw values.
 */

/** "14:00" → "2:00 PM". */
function time12(time: string): string {
  const mins = toMinutes(time);
  if (mins === null) return time;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ap = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${ap}`;
}

const range12 = (start: number, end: number) =>
  `${time12(toTimeString(start))} to ${time12(toTimeString(end))}`;

/** "2026-12-07" → "Mon 7 Dec". */
function dateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** 60 → "1-hour", 90 → "90-minute". */
const sessionLength = (mins: number) =>
  mins % 60 === 0 ? `${mins / 60}-hour` : `${mins}-minute`;

/** ["a", "b", "c"] → "a, b and c". */
function listOf(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * "Your Tuesday hours need a start time and an end time." Names the day when
 * there is one, so the host can find the row.
 */
function missingMessage(
  day: string | undefined,
  dayWord: "day" | "date",
  w: SessionWindow,
  hasDay: boolean,
): string {
  const missing = [
    !hasDay && `a ${dayWord}`,
    !w.start && "a start time",
    !w.end && "an end time",
  ].filter((x): x is string => Boolean(x));
  const subject = day
    ? dayWord === "day"
      ? `Your ${day} hours`
      : `Your hours on ${day}`
    : w.start && w.end
      ? `Your ${time12(w.start)} to ${time12(w.end)} hours`
      : "One of your rows";
  return `${subject} ${subject === "One of your rows" ? "needs" : "need"} ${listOf(missing)}.`;
}

/**
 * How many sessions of `duration` fit in `windowLength` when consecutive
 * sessions are separated by `breakMinutes`.
 *
 * The break sits *between* sessions, never after the last one, so n sessions
 * occupy `n * duration + (n - 1) * break` minutes. Solving for the largest n
 * that fits gives the formula below. Any leftover time is simply unused — a
 * 10:00–12:00 window at 50 minutes yields 2 sessions and 20 idle minutes,
 * rather than a ragged third session that runs past the window.
 */
export function countSessionsInWindow(
  windowLength: number,
  duration: number,
  breakMinutes: number,
): number {
  if (windowLength <= 0 || duration <= 0) return 0;
  return Math.floor((windowLength + breakMinutes) / (duration + breakMinutes));
}

/**
 * Expand availability windows into individual session slots.
 *
 * Returns every problem it finds rather than the first, so the host can fix a
 * whole step's worth of mistakes in one pass. When `errors` is non-empty,
 * `slots` is empty — a partially valid schedule is never silently published.
 */
export function generateSessionSlots(
  windows: SessionWindow[],
  durationMinutes: number,
  breakMinutes = 0,
): SlotGenerationResult {
  const errors: string[] = [];

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    errors.push("Set a session duration before generating slots.");
  }
  if (!Number.isFinite(breakMinutes) || breakMinutes < 0) {
    errors.push("Break between sessions can't be negative.");
  }

  const filled = windows.filter((w) => w.date || w.start || w.end);
  if (filled.length === 0) {
    errors.push("Add at least one time you're free.");
  }

  // Parse and validate each window on its own before looking at overlaps, so a
  // malformed window doesn't produce a confusing overlap error too.
  type Parsed = { window: SessionWindow; start: number; end: number };
  const parsed: Parsed[] = [];

  for (const w of filled) {
    const day = w.date ? dateLabel(w.date) : undefined;
    if (!w.date || !w.start || !w.end) {
      errors.push(missingMessage(day, "date", w, Boolean(w.date)));
      continue;
    }
    const start = toMinutes(w.start);
    const end = toMinutes(w.end);
    if (start === null || end === null) {
      errors.push(`Your hours on ${day} have a time that isn't valid.`);
      continue;
    }
    if (end <= start) {
      // Overnight windows (22:00–02:00) are deliberately not supported: they'd
      // split across two dates and make the host's "date" ambiguous.
      errors.push(
        `On ${day}, the end time (${time12(w.end)}) must be after the start time (${time12(w.start)}).`,
      );
      continue;
    }
    if (end > MINUTES_IN_DAY) {
      errors.push(`On ${day}, the end time must be on the same day.`);
      continue;
    }
    if (durationMinutes > 0 && end - start < durationMinutes) {
      errors.push(
        `On ${day}, ${range12(start, end)} is too short for a ${sessionLength(durationMinutes)} session.`,
      );
      continue;
    }
    parsed.push({ window: w, start, end });
  }

  // Overlapping windows on the same date would generate slots the host can't
  // actually run back to back.
  const byDate = new Map<string, Parsed[]>();
  for (const p of parsed) {
    const list = byDate.get(p.window.date) ?? [];
    list.push(p);
    byDate.set(p.window.date, list);
  }
  for (const [date, list] of byDate) {
    const sorted = [...list].sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const curr = sorted[i]!;
      if (curr.start < prev.end) {
        errors.push(
          `On ${dateLabel(date)}, ${range12(prev.start, prev.end)} overlaps with ${range12(curr.start, curr.end)}.`,
        );
      }
    }
  }

  if (errors.length > 0) return { slots: [], errors };

  const slots: GeneratedSlot[] = [];
  for (const p of parsed) {
    const count = countSessionsInWindow(
      p.end - p.start,
      durationMinutes,
      breakMinutes,
    );
    for (let i = 0; i < count; i++) {
      const startMin = p.start + i * (durationMinutes + breakMinutes);
      slots.push({
        date: p.window.date,
        time: toTimeString(startMin),
        endTime: toTimeString(startMin + durationMinutes),
      });
    }
  }

  // Windows can be entered in any order; the API and the booking UI both read
  // better with a chronological list.
  slots.sort((a, b) =>
    a.date === b.date
      ? a.time.localeCompare(b.time)
      : a.date.localeCompare(b.date),
  );

  return { slots, errors: [] };
}

export type WeeklyDayPreview = {
  weekday: number;
  slots: { time: string; endTime: string }[];
};

export type WeeklyGenerationResult = {
  days: WeeklyDayPreview[];
  /** Sessions bookable in one week across all weekdays. */
  perWeek: number;
  errors: string[];
};

/**
 * Expand weekly office hours into the sessions of a single representative week.
 *
 * Recurring one-on-one events store no dates: the server generates the next
 * few weeks from these windows on every read, so nothing expires. This function
 * exists for the host's preview and for validation — the dates themselves are
 * never sent.
 */
export function generateWeeklySessions(
  windows: SessionWindow[],
  durationMinutes: number,
  breakMinutes = 0,
): WeeklyGenerationResult {
  const errors: string[] = [];

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    errors.push("Set a session duration before generating slots.");
  }
  if (!Number.isFinite(breakMinutes) || breakMinutes < 0) {
    errors.push("Break between sessions can't be negative.");
  }

  const filled = windows.filter(
    (w) => w.weekday !== undefined || w.start || w.end,
  );
  if (filled.length === 0) {
    errors.push("Add at least one time you're free.");
  }

  type Parsed = { weekday: number; start: number; end: number };
  const parsed: Parsed[] = [];

  for (const w of filled) {
    const day = w.weekday !== undefined ? WEEKDAY_LABELS[w.weekday] : undefined;
    if (w.weekday === undefined || !w.start || !w.end) {
      errors.push(missingMessage(day, "day", w, w.weekday !== undefined));
      continue;
    }
    const start = toMinutes(w.start);
    const end = toMinutes(w.end);
    if (start === null || end === null) {
      errors.push(`Your ${day} hours have a time that isn't valid.`);
      continue;
    }
    if (end <= start) {
      errors.push(
        `On ${day}, the end time (${time12(w.end)}) must be after the start time (${time12(w.start)}).`,
      );
      continue;
    }
    if (durationMinutes > 0 && end - start < durationMinutes) {
      errors.push(
        `On ${day}, ${range12(start, end)} is too short for a ${sessionLength(durationMinutes)} session.`,
      );
      continue;
    }
    parsed.push({ weekday: w.weekday, start, end });
  }

  // Overlaps are checked per weekday: two windows on the same day can't run at
  // the same time, but the same hours on different days are the normal case.
  const byWeekday = new Map<number, Parsed[]>();
  for (const p of parsed) {
    const list = byWeekday.get(p.weekday) ?? [];
    list.push(p);
    byWeekday.set(p.weekday, list);
  }
  for (const [weekday, list] of byWeekday) {
    const sorted = [...list].sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const curr = sorted[i]!;
      if (curr.start < prev.end) {
        errors.push(
          `On ${WEEKDAY_LABELS[weekday]}, ${range12(prev.start, prev.end)} overlaps with ${range12(curr.start, curr.end)}.`,
        );
      }
    }
  }

  if (errors.length > 0) return { days: [], perWeek: 0, errors };

  const days: WeeklyDayPreview[] = [];
  let perWeek = 0;
  for (const weekday of [...byWeekday.keys()].sort((a, b) => a - b)) {
    const slots: { time: string; endTime: string }[] = [];
    for (const p of byWeekday.get(weekday)!.sort((a, b) => a.start - b.start)) {
      const count = countSessionsInWindow(
        p.end - p.start,
        durationMinutes,
        breakMinutes,
      );
      for (let i = 0; i < count; i++) {
        const startMin = p.start + i * (durationMinutes + breakMinutes);
        slots.push({
          time: toTimeString(startMin),
          endTime: toTimeString(startMin + durationMinutes),
        });
      }
    }
    perWeek += slots.length;
    days.push({ weekday, slots });
  }

  return { days, perWeek, errors: [] };
}

/**
 * The soonest concrete session a weekly schedule produces, as IST date/time.
 *
 * Recurring one-on-one events send no dates, but the API still needs a `time`
 * for the event itself (it anchors the recurrence and drives "has this passed"
 * checks). That anchor has to be a real session, so it's derived here rather
 * than guessed. Returns null when the windows produce nothing.
 */
export function nextWeeklySession(
  windows: SessionWindow[],
  durationMinutes: number,
  breakMinutes = 0,
): GeneratedSlot | null {
  const { days } = generateWeeklySessions(
    windows,
    durationMinutes,
    breakMinutes,
  );
  if (days.length === 0) return null;

  const byWeekday = new Map(days.map((d) => [d.weekday, d.slots]));
  const now = Date.now();
  // Start from today's IST calendar date, then step it in UTC so the walk is a
  // pure date-string calculation — no browser timezone can shift it.
  const todayIST = utcToISTInputs(new Date()).date;

  for (let i = 0; i < SESSION_HORIZON_WEEKS * 7; i++) {
    const day = new Date(`${todayIST}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() + i);
    const date = day.toISOString().slice(0, 10);
    for (const slot of byWeekday.get(day.getUTCDay()) ?? []) {
      if (new Date(istInputToUTCISO(date, slot.time)).getTime() > now) {
        return { date, time: slot.time, endTime: slot.endTime };
      }
    }
  }
  return null;
}

/**
 * The weekday (0 = Sunday) of a "YYYY-MM-DD" calendar date.
 *
 * Parsed as UTC midnight and read back in UTC, so the answer is a property of
 * the date string itself. `new Date("2026-08-17T00:00:00").getDay()` would
 * instead parse as browser-local midnight and can land a day early west of IST.
 */
export function weekdayOfDate(date: string): number | undefined {
  if (!date) return undefined;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.getUTCDay();
}

/** Slot start times as the UTC ISO strings the API stores in custom_dates. */
export function slotsToCustomDates(slots: GeneratedSlot[]): string[] {
  return slots.map((s) => istInputToUTCISO(s.date, s.time));
}

/** Group slots by their IST date, preserving chronological order. */
export function groupSlotsByDate(
  slots: GeneratedSlot[],
): [string, GeneratedSlot[]][] {
  const byDate = new Map<string, GeneratedSlot[]>();
  for (const slot of slots) {
    const list = byDate.get(slot.date) ?? [];
    list.push(slot);
    byDate.set(slot.date, list);
  }
  return [...byDate.entries()];
}
