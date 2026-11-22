"use client";

import { useStoredAuth } from "~/hooks/useStoredAuth";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { formatIST } from "~/lib/datetime";
import {
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiMapPin,
  FiClock,
  FiUsers,
  FiCalendar,
  FiVideo,
} from "react-icons/fi";
import { LuScanLine, LuBookOpen } from "react-icons/lu";
import {
  useCalendarEvents,
  useEventAttendees,
  useMyHost,
} from "~/hooks/useApi";
import type { EventDTO } from "~/lib/api";
import EventCover from "~/components/EventCover";

const dayKeyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const STATUS_DOT: Record<string, string> = {
  live: "bg-[#C084FC]",
  paused: "bg-amber-400",
};

/**
 * Host calendar: a month at a glance on the left, the selected day's sessions
 * on the right. Every control here does something — no placeholder buttons.
 */
export default function HostCalendarPage() {
  const { userId } = useStoredAuth();
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => setIsHydrated(true), []);

  const { data: host } = useMyHost(userId);
  const { data: allEvents, isLoading } = useCalendarEvents(host?.id ?? null);

  // Drafts are work in progress; they don't belong on the calendar.
  const events = useMemo(
    () => (allEvents ?? []).filter((ev) => ev.status !== "draft"),
    [allEvents],
  );

  const [cursorMonth, setCursorMonth] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [openId, setOpenId] = useState<string | null>(null);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventDTO[]>();
    for (const ev of events) {
      const k = dayKeyOf(new Date(ev.time));
      map.set(k, [...(map.get(k) ?? []), ev]);
    }
    for (const arr of map.values())
      arr.sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
      );
    return map;
  }, [events]);

  const gridDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursorMonth), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(cursorMonth), { weekStartsOn: 0 }),
  });

  const dayEvents = eventsByDay.get(dayKeyOf(selectedDay)) ?? [];

  // Open the first session of the chosen day.
  useEffect(() => {
    setOpenId(dayEvents[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay, eventsByDay]);

  const nextSession = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => new Date(e.time).getTime() > now)
      .sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
      )[0];
  }, [events]);

  const monthCount = useMemo(
    () =>
      events.filter((e) => isSameMonth(new Date(e.time), cursorMonth)).length,
    [events, cursorMonth],
  );

  const pickDay = (d: Date) => {
    setSelectedDay(d);
    if (!isSameMonth(d, cursorMonth)) setCursorMonth(d);
  };

  if (!isHydrated || !userId) {
    return (
      <div className="min-h-screen bg-[#080914]">
        <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 md:py-10 lg:px-10">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            No host profile found. Please apply as a host first.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080914]">
      <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 md:py-10 lg:px-10">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-outfit text-[26px] leading-tight font-semibold tracking-[-0.01em] text-white sm:text-[32px]">
              Calendar
            </h1>
            <p className="mt-1 text-sm text-[#A5A8C3]">
              Your sessions by day. Pick a day to see who&apos;s coming.
            </p>
          </div>
          <Link
            href="/host-dashboard/experiences/new"
            className="flex shrink-0 items-center gap-2 rounded-lg bg-[#A020F0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8A1AD0]"
          >
            <FiPlus className="h-4 w-4" />
            <span className="hidden sm:inline">New event</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A020F0] border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* Month */}
            <section className="rounded-2xl border border-white/10 bg-[#121426] p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2 px-1">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    {format(cursorMonth, "MMMM yyyy")}
                  </h2>
                  <p className="text-xs text-[#777B98]">
                    {monthCount === 0
                      ? "No sessions this month"
                      : `${monthCount} session${monthCount === 1 ? "" : "s"}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const t = new Date();
                      setCursorMonth(t);
                      setSelectedDay(t);
                    }}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/[0.06]"
                  >
                    Today
                  </button>
                  <button
                    className="rounded-full p-2 text-[#A5A8C3] transition hover:bg-white/[0.06]"
                    onClick={() => setCursorMonth((d) => addMonths(d, -1))}
                    aria-label="Previous month"
                  >
                    <FiChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded-full p-2 text-[#A5A8C3] transition hover:bg-white/[0.06]"
                    onClick={() => setCursorMonth((d) => addMonths(d, 1))}
                    aria-label="Next month"
                  >
                    <FiChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 text-center text-[11px] font-medium text-[#777B98]">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} className="py-2">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {gridDays.map((day) => {
                  const inMonth = isSameMonth(day, cursorMonth);
                  const selected = isSameDay(day, selectedDay);
                  const list = eventsByDay.get(dayKeyOf(day)) ?? [];
                  return (
                    <button
                      key={dayKeyOf(day)}
                      onClick={() => pickDay(day)}
                      aria-pressed={selected}
                      aria-label={`${format(day, "EEEE d MMMM")}, ${list.length} session${list.length === 1 ? "" : "s"}`}
                      className={`flex min-h-12 flex-col rounded-xl p-1.5 text-left transition sm:min-h-20 sm:p-2 ${
                        selected
                          ? "bg-[#A020F0]/20 ring-1 ring-[#A020F0]"
                          : "hover:bg-white/[0.05]"
                      }`}
                    >
                      <span
                        className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium sm:mx-0 ${
                          isToday(day)
                            ? "bg-[#A020F0] text-white"
                            : inMonth
                              ? "text-white"
                              : "text-white/25"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      {/* Phone: dots. Wider: the first session title. */}
                      {list.length > 0 && (
                        <>
                          <span className="mt-1 flex justify-center gap-0.5 sm:hidden">
                            {list.slice(0, 3).map((ev) => (
                              <i
                                key={ev.id}
                                className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[ev.status] ?? "bg-white/40"}`}
                              />
                            ))}
                          </span>
                          <span className="mt-1 hidden min-w-0 sm:block">
                            <span
                              className={`block truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                                list[0]!.status === "paused"
                                  ? "bg-amber-500/10 text-amber-300"
                                  : "bg-[#A020F0]/15 text-[#E9D5FF]"
                              } ${inMonth ? "" : "opacity-50"}`}
                            >
                              {list[0]!.title}
                            </span>
                            {list.length > 1 && (
                              <span className="mt-0.5 block px-1 text-[10px] text-[#777B98]">
                                +{list.length - 1} more
                              </span>
                            )}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Selected day */}
            <section className="h-fit rounded-2xl border border-white/10 bg-[#121426] p-4">
              <p className="text-xs font-medium text-[#777B98]">
                {isToday(selectedDay) ? "Today" : format(selectedDay, "EEEE")}
              </p>
              <h2 className="text-lg font-semibold text-white">
                {format(selectedDay, "d MMMM")}
              </h2>

              {dayEvents.length === 0 ? (
                <div className="mt-4 rounded-xl bg-white/[0.03] p-4 text-center">
                  <FiCalendar
                    className="mx-auto h-5 w-5 text-[#777B98]"
                    aria-hidden
                  />
                  <p className="mt-2 text-sm text-[#A5A8C3]">
                    No sessions on this day.
                  </p>
                  {nextSession && (
                    <button
                      onClick={() => pickDay(new Date(nextSession.time))}
                      className="mt-3 text-xs font-semibold text-[#D8B4FE] hover:underline"
                    >
                      Next up: {nextSession.title},{" "}
                      {formatIST(nextSession.time, "d MMM")} →
                    </button>
                  )}
                </div>
              ) : (
                <ul className="mt-4 space-y-2">
                  {dayEvents.map((ev) => (
                    <SessionItem
                      key={ev.id}
                      event={ev}
                      open={openId === ev.id}
                      onToggle={() =>
                        setOpenId((id) => (id === ev.id ? null : ev.id))
                      }
                    />
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

/** One session on the selected day; opens to show who's coming. */
function SessionItem({
  event,
  open,
  onToggle,
}: {
  event: EventDTO;
  open: boolean;
  onToggle: () => void;
}) {
  const { data: attendees, isLoading } = useEventAttendees(
    open ? event.id : null,
    event.time,
  );
  const active = (attendees ?? []).filter(
    (b) => b.status === "confirmed" || b.status === "pending",
  );
  const guests = active.reduce((s, b) => s + b.quantity, 0);
  const capacity = event.capacity || 0;

  return (
    <li className="overflow-hidden rounded-xl border border-white/10">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-2.5 text-left transition hover:bg-white/[0.03]"
      >
        <EventCover
          src={event.cover_image_url}
          seed={event.id}
          mood={event.mood}
          iconSize="sm"
          blurFill
          className="aspect-[4/5] w-11 shrink-0 rounded-lg"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">
            {event.title}
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-xs text-[#A5A8C3]">
            <span className="inline-flex items-center gap-1">
              <FiClock className="h-3 w-3" aria-hidden />
              {formatIST(event.time, "h:mm a")}
            </span>
            {event.status === "paused" && (
              <span className="font-medium text-amber-300">Paused</span>
            )}
          </span>
        </span>
        <FiChevronRight
          className={`h-4 w-4 shrink-0 text-[#777B98] transition ${open ? "rotate-90" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="border-t border-white/10 bg-white/[0.02] p-3">
          {event.is_online ? (
            <p className="mb-2 flex items-center gap-1.5 text-xs text-[#A5A8C3]">
              <FiVideo className="h-3 w-3 shrink-0" aria-hidden />
              Online
            </p>
          ) : (
            event.location && (
              <p className="mb-2 flex items-start gap-1.5 text-xs text-[#A5A8C3]">
                <FiMapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                <span className="line-clamp-2">{event.location}</span>
              </p>
            )
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-white">
              <FiUsers className="h-3.5 w-3.5" aria-hidden />
              {isLoading ? "…" : guests} guest{guests === 1 ? "" : "s"}
            </span>
            {capacity > 0 && (
              <span className="text-[#777B98]">of {capacity} spots</span>
            )}
          </div>
          {capacity > 0 && (
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#A020F0]"
                style={{
                  width: `${Math.min(100, (guests / capacity) * 100)}%`,
                }}
              />
            </div>
          )}

          {active.length > 0 && (
            <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {active.map((b) => {
                const name = b.user_name ?? "Guest";
                return (
                  <li key={b.id} className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#A020F0]/15 text-[11px] font-semibold text-[#D8B4FE]">
                      {name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-white">
                      {name}
                    </span>
                    <span className="text-xs text-[#777B98]">
                      ×{b.quantity}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {!isLoading && active.length === 0 && (
            <p className="mt-3 text-xs text-[#777B98]">No bookings yet.</p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href={`/host-dashboard/experiences/${event.id}?tab=bookings`}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-xs font-medium text-white transition hover:bg-white/[0.06]"
            >
              <LuBookOpen className="h-3.5 w-3.5" aria-hidden />
              Bookings
            </Link>
            <Link
              href={`/host-dashboard/scan?event=${event.id}&date=${encodeURIComponent(event.time)}`}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#A020F0] py-2 text-xs font-semibold text-white transition hover:bg-[#8A1AD0]"
            >
              <LuScanLine className="h-3.5 w-3.5" aria-hidden />
              Check in
            </Link>
          </div>
        </div>
      )}
    </li>
  );
}
