"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  nextSaturday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Repeat,
} from "lucide-react";

/**
 * Date and time pickers that read like the event page: a pill showing
 * "Sat, 28 Nov" or "2:00 PM", opening a small calendar or time list.
 * Values stay in the browser formats the form already uses
 * ("YYYY-MM-DD", "HH:mm", "YYYY-MM-DDTHH:mm", "YYYY-MM").
 *
 * Kept identical to the admin's src/components/event-form/DateTimePills.tsx.
 * Besides date and time: past dates (filters), a Clear option, a date + time
 * pill (datetime-local) and a month pill. Use these instead of native
 * <input type="date|time|datetime-local|month">.
 */

function useOutside(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element;
      // The panel lives in a portal (see Floating), outside the pill's box.
      if (t.closest?.("[data-msm-picker]")) return;
      if (ref.current && !ref.current.contains(t)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
}

function Pill({
  icon,
  label,
  empty,
  error,
  open,
  onClick,
  ariaLabel,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  empty: boolean;
  error?: boolean;
  open: boolean;
  onClick: () => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-expanded={open}
      className={`flex h-11 items-center gap-2 rounded-full border px-4 text-[15px] font-medium whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-50 ${
        open
          ? "border-[#B57BFF] bg-[#7B2FFF]/15 text-white"
          : error
            ? "border-red-500/70 bg-red-500/10 text-white"
            : "border-white/12 bg-white/[0.05] text-white hover:border-white/30 hover:bg-white/[0.08]"
      }`}
    >
      <span className="text-[#D8B4FE]">{icon}</span>
      <span className={empty ? "text-white/50" : ""}>{label}</span>
    </button>
  );
}

const PANEL_BASE =
  "rounded-3xl border border-white/10 bg-[#14152a] p-3 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.85)]";

/**
 * The open panel, drawn in a portal on <body> so no card's overflow or a later
 * card can hide it. Placed under the pill, or above it when there is no room
 * below; lined up with the pill's right side near the right edge. Follows the
 * pill on scroll and resize.
 */
function Floating({
  anchor,
  width,
  className = "",
  children,
}: {
  anchor: RefObject<HTMLDivElement | null>;
  width: number;
  className?: string;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const a = anchor.current?.getBoundingClientRect();
      if (!a) return;
      const w = Math.min(width, window.innerWidth - 32);
      const h = panel.current?.offsetHeight ?? 0;
      let left = a.left;
      if (left + w > window.innerWidth - 16) left = Math.max(16, a.right - w);
      let top = a.bottom + 8;
      if (top + h > window.innerHeight - 16 && a.top - 8 - h >= 16)
        top = a.top - 8 - h;
      setPos({ top, left });
    };
    // Measure once the panel is in the page, then keep up with the pill.
    const frame = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor, width]);
  return createPortal(
    <div
      ref={panel}
      data-msm-picker
      style={{
        position: "fixed",
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        zIndex: 1000,
        visibility: pos ? "visible" : "hidden",
      }}
      className={`${PANEL_BASE} ${className}`}
    >
      {children}
    </div>,
    document.body,
  );
}

export function DatePill({
  value,
  onChange,
  min,
  max,
  allowPast,
  clearable,
  disabled,
  error,
  placeholder = "Add date",
  ariaLabel = "Date",
}: {
  value: string;
  onChange: (v: string) => void;
  /** Earliest pickable day, "YYYY-MM-DD". Default today, unless allowPast. */
  min?: string;
  /** Latest pickable day, "YYYY-MM-DD". */
  max?: string;
  /** Any day can be picked (filters, reports). */
  allowPast?: boolean;
  /** Show a Clear option when a day is set. */
  clearable?: boolean;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const selected = value ? parseISO(value) : null;
  const minDate = useMemo(
    () =>
      min
        ? parseISO(min)
        : allowPast
          ? new Date(1970, 0, 1)
          : new Date(new Date().toDateString()),
    [min, allowPast],
  );
  const maxDate = useMemo(() => (max ? parseISO(max) : null), [max]);
  const [month, setMonth] = useState(() =>
    startOfMonth(selected ?? new Date()),
  );

  // Weeks of the month, Monday first. In the current month, start from this
  // week: rows of days that can't be picked only take up room.
  const days = useMemo(() => {
    const firstOfMonth = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const thisWeek = startOfWeek(minDate, { weekStartsOn: 1 });
    const start = isBefore(firstOfMonth, thisWeek) ? thisWeek : firstOfMonth;
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = start; !isBefore(end, d); d = addDays(d, 1)) out.push(d);
    return out;
  }, [month, minDate]);

  const pick = (d: Date) => {
    onChange(format(d, "yyyy-MM-dd"));
    setOpen(false);
  };
  const today = new Date();
  const tooLate = (d: Date) =>
    maxDate !== null && isBefore(maxDate, d) && !isSameDay(d, maxDate);
  // On a weekend "this Saturday" is today or just gone, so offer the next one.
  const weekend = today.getDay() === 6 || today.getDay() === 0;
  const quick = (
    allowPast
      ? [
          { label: "Today", day: today },
          { label: "Yesterday", day: addDays(today, -1) },
          { label: "7 days ago", day: addDays(today, -7) },
        ]
      : [
          { label: "Today", day: today },
          { label: "Tomorrow", day: addDays(today, 1) },
          {
            label: weekend ? "Next Saturday" : "This Saturday",
            day: nextSaturday(today),
          },
        ]
  ).filter(
    (q) =>
      (!isBefore(q.day, minDate) || isSameDay(q.day, minDate)) &&
      !tooLate(q.day),
  );

  return (
    <div ref={ref} className="relative">
      <Pill
        icon={<Calendar className="h-[18px] w-[18px]" />}
        label={selected ? format(selected, "EEE, d MMM") : placeholder}
        empty={!selected}
        error={error}
        open={open}
        disabled={disabled}
        onClick={() => {
          setMonth(startOfMonth(selected ?? new Date()));
          setOpen((v) => !v);
        }}
        ariaLabel={ariaLabel}
      />
      {open && (
        <Floating
          anchor={ref}
          width={296}
          className="w-[min(296px,calc(100vw-32px))]"
        >
          <div className="mb-3 flex flex-wrap gap-1.5">
            {quick.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => pick(q.day)}
                className="rounded-full border border-white/12 px-3 py-1 text-xs font-medium text-white/80 transition hover:border-[#B57BFF] hover:text-white"
              >
                {q.label}
              </button>
            ))}
          </div>
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="font-outfit text-[15px] font-semibold">
              {format(month, "MMMM yyyy")}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Previous month"
                disabled={!isBefore(startOfMonth(minDate), month)}
                onClick={() => setMonth((m) => addMonths(m, -1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 disabled:opacity-25"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next month"
                disabled={
                  maxDate !== null && !isBefore(month, startOfMonth(maxDate))
                }
                onClick={() => setMonth((m) => addMonths(m, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-white/40">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {days.map((d) => {
              const inMonth = isSameMonth(d, month);
              const off =
                (isBefore(d, minDate) && !isSameDay(d, minDate)) || tooLate(d);
              const on = selected && isSameDay(d, selected);
              const isToday = isSameDay(d, today);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  disabled={off}
                  onClick={() => pick(d)}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[13px] transition ${
                    on
                      ? "bg-gradient-to-br from-[#7038F5] to-[#B724EA] font-semibold text-white"
                      : off
                        ? "text-white/15"
                        : inMonth
                          ? "text-white hover:bg-white/10"
                          : "text-white/30 hover:bg-white/10"
                  } ${isToday && !on ? "ring-1 ring-white/30" : ""}`}
                >
                  {format(d, "d")}
                </button>
              );
            })}
          </div>
          {selected && (
            <div className="mt-2 flex items-center justify-between px-1">
              <p className="text-xs text-white/45">
                {format(selected, "EEEE, d MMMM yyyy")}
              </p>
              {clearable && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="text-xs font-medium text-[#D8B4FE] hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </Floating>
      )}
    </div>
  );
}

const toMins = (v: string) => {
  const [h = 0, m = 0] = v.split(":").map(Number);
  return h * 60 + m;
};
const label12 = (mins: number) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ap = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
};
const hhmm = (mins: number) =>
  `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
const lengthLabel = (mins: number) =>
  mins < 60
    ? `${mins} min`
    : mins % 60
      ? `${Math.floor(mins / 60)} h ${mins % 60} min`
      : `${mins / 60} h`;

export function TimePill({
  value,
  onChange,
  placeholder,
  error,
  start,
  clearable,
  ariaLabel,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: boolean;
  /** For an end time: list times after this one, with the length. */
  start?: string;
  /** Show a "No end time" option. */
  clearable?: boolean;
  ariaLabel: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const listRef = useRef<HTMLDivElement>(null);

  // Every 15 minutes. An end time runs from just after the start, up to 12 h.
  const options = useMemo(() => {
    if (start) {
      const s = toMins(start);
      return Array.from({ length: 48 }, (_, i) => s + 15 * (i + 1));
    }
    return Array.from({ length: 96 }, (_, i) => i * 15);
  }, [start]);

  // Open on the chosen time, or a sensible hour, not at midnight.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const target = value
      ? listRef.current.querySelector<HTMLElement>(`[data-v="${value}"]`)
      : start
        ? null
        : listRef.current.querySelector<HTMLElement>(`[data-v="10:00"]`);
    // Scroll only the list, never the page behind it.
    if (target)
      listRef.current.scrollTop =
        target.offsetTop -
        listRef.current.clientHeight / 2 +
        target.clientHeight / 2;
  }, [open, value, start]);

  const shown = value ? label12(toMins(value)) : placeholder;

  return (
    <div ref={ref} className="relative">
      <Pill
        icon={<Clock className="h-[18px] w-[18px]" />}
        label={shown}
        empty={!value}
        error={error}
        open={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        ariaLabel={ariaLabel}
      />
      {open && (
        <Floating anchor={ref} width={220} className="w-[220px] p-2">
          {clearable && value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="mb-1 w-full rounded-xl px-3 py-2 text-left text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              No end time
            </button>
          )}
          <div
            ref={listRef}
            className="relative max-h-64 overflow-y-auto overscroll-contain [scrollbar-width:thin]"
          >
            {options.map((mins) => {
              const v = hhmm(mins);
              const on = v === value;
              return (
                <button
                  key={mins}
                  type="button"
                  data-v={v}
                  onClick={() => {
                    onChange(v);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                    on
                      ? "bg-gradient-to-r from-[#7038F5] to-[#B724EA] font-semibold text-white"
                      : "text-white/85 hover:bg-white/10"
                  }`}
                >
                  <span>{label12(mins)}</span>
                  {start && (
                    <span className={on ? "text-white/80" : "text-white/40"}>
                      {lengthLabel(mins - toMins(start))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Floating>
      )}
    </div>
  );
}

/** Monday first, matching the calendar. Values are JS weekdays (0 = Sunday). */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** A repeating day of the week, shown as "Every Monday". */
export function WeekdayPill({
  value,
  onChange,
  error,
  placeholder = "Pick a day",
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  error?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const has = value !== undefined;

  return (
    <div ref={ref} className="relative">
      <Pill
        icon={<Repeat className="h-[18px] w-[18px]" />}
        label={has ? `Every ${WEEKDAY_NAMES[value]}` : placeholder}
        empty={!has}
        error={error}
        open={open}
        onClick={() => setOpen((v) => !v)}
        ariaLabel="Day of the week"
      />
      {open && (
        <Floating anchor={ref} width={200} className="w-[200px] p-2">
          {WEEK_ORDER.map((day) => {
            const on = day === value;
            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  onChange(day);
                  setOpen(false);
                }}
                className={`flex w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                  on
                    ? "bg-gradient-to-r from-[#7038F5] to-[#B724EA] font-semibold text-white"
                    : "text-white/85 hover:bg-white/10"
                }`}
              >
                {WEEKDAY_NAMES[day]}
              </button>
            );
          })}
        </Floating>
      )}
    </div>
  );
}

/**
 * A date and a time together, for what a native datetime-local input held.
 * Value "YYYY-MM-DDTHH:mm" in the browser's local time, or "" when empty.
 * Picking a day with no time yet sets 10:00 AM; picking a time first uses today.
 */
export function DateTimePill({
  value,
  onChange,
  min,
  allowPast,
  clearable,
  disabled,
  error,
  datePlaceholder = "Add date",
  timePlaceholder = "Add time",
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Earliest pickable day, "YYYY-MM-DD". Default today, unless allowPast. */
  min?: string;
  allowPast?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  error?: boolean;
  datePlaceholder?: string;
  timePlaceholder?: string;
  /** Names the pair for screen readers, e.g. "Planned start". */
  label?: string;
}) {
  const [date = "", time = ""] = value ? value.split("T") : [];
  const hm = time.slice(0, 5);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DatePill
        value={date}
        min={min}
        allowPast={allowPast}
        disabled={disabled}
        error={error}
        placeholder={datePlaceholder}
        ariaLabel={label ? `${label} date` : "Date"}
        onChange={(d) => onChange(d ? `${d}T${hm || "10:00"}` : "")}
      />
      <TimePill
        value={hm}
        disabled={disabled}
        error={error}
        placeholder={timePlaceholder}
        ariaLabel={label ? `${label} time` : "Time"}
        onChange={(t) =>
          onChange(`${date || format(new Date(), "yyyy-MM-dd")}T${t}`)
        }
      />
      {clearable && value && !disabled && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="px-1 text-xs font-medium text-[#D8B4FE] hover:text-white"
        >
          Clear
        </button>
      )}
    </div>
  );
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** A calendar month, value "YYYY-MM" (what a native month input held). */
export function MonthPill({
  value,
  onChange,
  max,
  disabled,
  error,
  placeholder = "Pick a month",
  ariaLabel = "Month",
}: {
  value: string;
  onChange: (v: string) => void;
  /** Latest pickable month, "YYYY-MM". */
  max?: string;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const parts = value ? value.split("-").map(Number) : [];
  const vy = parts[0] ?? 0;
  const vm = parts[1] ?? 0;
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(() => (vy > 0 ? vy : thisYear));
  const maxKey = max ?? "9999-12";
  const key = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

  return (
    <div ref={ref} className="relative">
      <Pill
        icon={<Calendar className="h-[18px] w-[18px]" />}
        label={
          value ? format(new Date(vy, vm - 1, 1), "MMMM yyyy") : placeholder
        }
        empty={!value}
        error={error}
        open={open}
        disabled={disabled}
        onClick={() => {
          setYear(vy > 0 ? vy : thisYear);
          setOpen((v) => !v);
        }}
        ariaLabel={ariaLabel}
      />
      {open && (
        <Floating anchor={ref} width={260} className="w-[260px]">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="font-outfit text-[15px] font-semibold">{year}</p>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Previous year"
                onClick={() => setYear((y) => y - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next year"
                disabled={key(year + 1, 1) > maxKey}
                onClick={() => setYear((y) => y + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 disabled:opacity-25"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS.map((name, i) => {
              const k = key(year, i + 1);
              const on = k === value;
              const off = k > maxKey;
              return (
                <button
                  key={k}
                  type="button"
                  disabled={off}
                  onClick={() => {
                    onChange(k);
                    setOpen(false);
                  }}
                  className={`rounded-xl py-2 text-sm transition ${
                    on
                      ? "bg-gradient-to-br from-[#7038F5] to-[#B724EA] font-semibold text-white"
                      : off
                        ? "text-white/15"
                        : "text-white/85 hover:bg-white/10"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </Floating>
      )}
    </div>
  );
}
