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
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { formatIST } from "~/lib/datetime";
import {
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiPlus,
  FiMapPin,
  FiClock,
  FiMessageCircle,
} from "react-icons/fi";
import {
  useCalendarEvents,
  useEventAttendees,
  useMyHost,
} from "~/hooks/useApi";
import type { EventDTO } from "~/lib/api";

export default function HostCalendarPage() {
  const { userId } = useStoredAuth();
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const { data: host } = useMyHost(userId);
  const { data: allEvents, isLoading } = useCalendarEvents(host?.id ?? null);

  // Drafts are work-in-progress — they shouldn't surface on the host calendar.
  const events = useMemo(
    () => (allEvents ?? []).filter((ev) => ev.status !== "draft"),
    [allEvents],
  );

  const [cursorMonth, setCursorMonth] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<EventDTO | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week" | "list">("month");

  // Fetch attendees for selected event occurrence
  const { data: attendees } = useEventAttendees(
    selectedEvent?.id ?? null,
    selectedEvent?.time,
  );

  const eventsByDayKey = useMemo(() => {
    const map = new Map<string, NonNullable<typeof events>>();
    for (const ev of events ?? []) {
      const date = new Date(ev.time);
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      map.set(dayKey, [...(map.get(dayKey) ?? []), ev]);
    }
    for (const [k, arr] of map) {
      arr.sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
      );
      map.set(k, arr);
    }
    return map;
  }, [events]);

  const monthStart = startOfMonth(cursorMonth);
  const monthEnd = endOfMonth(cursorMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Start with Sunday
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const selectedKey = useMemo(
    () =>
      `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${String(selectedDay.getDate()).padStart(2, "0")}`,
    [selectedDay],
  );

  const selectedDayEvents = useMemo(
    () => eventsByDayKey.get(selectedKey) ?? [],
    [eventsByDayKey, selectedKey],
  );

  // Auto-select first event of selected day
  useEffect(() => {
    if (selectedDayEvents.length > 0 && !selectedEvent) {
      setSelectedEvent(selectedDayEvents[0]!);
    } else if (selectedDayEvents.length === 0) {
      setSelectedEvent(null);
    }
  }, [selectedDayEvents, selectedEvent]);

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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-outfit text-[26px] leading-tight font-semibold tracking-[-0.01em] text-white sm:text-[32px]">
              Bookings & Calendar
            </h1>
            <p className="mt-1 text-sm text-[#A5A8C3]">
              Manage your schedule and upcoming sessions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#121426] px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/[0.04]">
              <FiRefreshCw className="h-4 w-4" />
              Sync Calendar
            </button>
            <Link
              href="/host-dashboard/experiences/new"
              className="flex items-center gap-2 rounded-lg bg-[#A020F0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8A1AD0]"
            >
              <FiPlus className="h-4 w-4" />
              Add Session
            </Link>
          </div>
        </div>

        {isLoading && (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A020F0] border-t-transparent" />
          </div>
        )}

        {!isLoading && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Calendar grid - 3 columns */}
            <div className="rounded-xl border border-white/10 bg-[#121426] lg:col-span-3">
              {/* Calendar header */}
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <button
                    className="rounded-lg p-2 text-[#A5A8C3] transition hover:bg-white/[0.06]"
                    onClick={() => setCursorMonth((d) => addMonths(d, -1))}
                    aria-label="Previous month"
                  >
                    <FiChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="min-w-35 text-center text-base font-semibold text-white">
                    {format(cursorMonth, "MMMM yyyy")}
                  </span>
                  <button
                    className="rounded-lg p-2 text-[#A5A8C3] transition hover:bg-white/[0.06]"
                    onClick={() => setCursorMonth((d) => addMonths(d, 1))}
                    aria-label="Next month"
                  >
                    <FiChevronRight className="h-5 w-5" />
                  </button>
                </div>

                {/* View mode toggle */}
                <div className="flex items-center gap-1 rounded-lg border border-white/10 p-1">
                  {(["month", "week", "list"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                        viewMode === mode
                          ? "bg-[#A020F0] text-white"
                          : "text-[#A5A8C3] hover:text-white/80"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="hide-scrollbar overflow-x-auto">
                <div className="min-w-[720px] md:min-w-0">
                  {/* Weekday header - Start with Sunday */}
                  <div className="grid grid-cols-7 border-b border-white/10">
                    {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(
                      (d) => (
                        <div
                          key={d}
                          className="px-2 py-3 text-center text-[11px] font-semibold tracking-wide text-[#777B98] uppercase"
                        >
                          {d}
                        </div>
                      ),
                    )}
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7">
                    {gridDays.map((day, idx) => {
                      const inMonth = isSameMonth(day, cursorMonth);
                      const isSelected = isSameDay(day, selectedDay);
                      const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                      const dayEvents = eventsByDayKey.get(dayKey) ?? [];
                      const isLastRow = idx >= gridDays.length - 7;

                      return (
                        <button
                          key={dayKey}
                          onClick={() => {
                            setSelectedDay(day);
                            if (dayEvents.length > 0) {
                              setSelectedEvent(dayEvents[0]!);
                            } else {
                              setSelectedEvent(null);
                            }
                          }}
                          className={`relative min-h-25 border-r border-b border-white/10 p-2 text-left transition hover:bg-white/[0.04] ${
                            isSelected ? "bg-[#241333]" : ""
                          } ${inMonth ? "" : "bg-white/[0.04]"} ${isLastRow ? "border-b-0" : ""}`}
                        >
                          <span
                            className={`text-sm font-medium ${inMonth ? "text-white" : "text-[#777B98]"}`}
                          >
                            {format(day, "d")}
                          </span>

                          {/* Event pills */}
                          <div className="mt-1 space-y-1">
                            {dayEvents.slice(0, 2).map((ev) => {
                              const time = formatIST(ev.time, "h:mm a");
                              const bgColor =
                                ev.status === "live"
                                  ? "bg-[#241333] text-[#D8B4FE]"
                                  : ev.status === "paused"
                                    ? "bg-amber-500/10 text-amber-300"
                                    : "bg-purple-500/10 text-purple-300";
                              return (
                                <div
                                  key={ev.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEvent(ev);
                                    setSelectedDay(day);
                                  }}
                                  className={`cursor-pointer truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${bgColor}`}
                                >
                                  {time} {ev.title}
                                </div>
                              );
                            })}
                            {dayEvents.length > 2 && (
                              <div className="px-1 text-[10px] text-[#777B98]">
                                +{dayEvents.length - 2} more
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Selected event details - 1 column */}
            <div className="h-fit rounded-xl border border-white/10 bg-[#121426] p-5">
              {selectedEvent ? (
                <>
                  {/* Status badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        selectedEvent.status === "live"
                          ? "bg-green-500/15 text-green-300"
                          : selectedEvent.status === "paused"
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-white/[0.06] text-white/80"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {selectedEvent.status === "live"
                        ? "Confirmed"
                        : selectedEvent.status.toUpperCase()}
                    </span>
                    <button className="text-[#777B98] hover:text-[#A5A8C3]">
                      ×
                    </button>
                  </div>

                  {/* Event info */}
                  <h3 className="mt-3 text-base font-semibold text-white">
                    {selectedEvent.title}
                  </h3>
                  <div className="mt-2 space-y-1.5">
                    <p className="flex items-center gap-2 text-xs text-[#A5A8C3]">
                      <FiClock className="h-3.5 w-3.5" />
                      {formatIST(selectedEvent.time, "MMM d, h:mm a")}
                      {selectedEvent.end_time &&
                        ` - ${formatIST(selectedEvent.end_time, "h:mm a")}`}
                    </p>
                    {selectedEvent.location && (
                      <p className="flex items-center gap-2 text-xs text-[#A5A8C3]">
                        <FiMapPin className="h-3.5 w-3.5" />
                        {selectedEvent.location}
                      </p>
                    )}
                  </div>

                  {/* Attendee List */}
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-white">
                        Attendee List
                      </h4>
                      <span className="text-xs text-[#A5A8C3]">
                        {selectedEvent.total_bookings}/{selectedEvent.capacity}{" "}
                        filled
                      </span>
                    </div>

                    <div className="mt-3 max-h-50 space-y-2 overflow-y-auto">
                      {attendees && attendees.length > 0 ? (
                        attendees.map((booking, idx) => (
                          <div
                            key={booking.id}
                            className="flex items-center gap-3"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-[#A5A8C3]">
                              {String.fromCharCode(65 + idx)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-white">
                                Guest #{idx + 1}
                              </p>
                              <p className="text-xs text-[#A5A8C3]">
                                {booking.status === "confirmed"
                                  ? "Paid"
                                  : booking.status}{" "}
                                • {booking.quantity} ticket
                                {booking.quantity > 1 ? "s" : ""}
                              </p>
                            </div>
                            <button className="text-[#777B98] hover:text-[#D8B4FE]">
                              <FiMessageCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="py-2 text-xs text-[#A5A8C3]">
                          No attendees yet
                        </p>
                      )}
                    </div>

                    {attendees && attendees.length > 0 && (
                      <p className="mt-3 text-xs text-[#D8B4FE]">
                        +{selectedEvent.total_bookings} guests requesting
                        details
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="mt-5 space-y-2">
                    <Link
                      href={`/host-dashboard/messages?event=${selectedEvent.id}`}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#A020F0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8A1AD0]"
                    >
                      <FiMessageCircle className="h-4 w-4" />
                      Message All
                    </Link>
                    <button className="w-full py-2 text-center text-sm font-medium text-red-300 hover:text-red-300">
                      Cancel Session
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06]">
                    <FiClock className="h-6 w-6 text-[#777B98]" />
                  </div>
                  <p className="text-sm text-[#A5A8C3]">
                    Select an event to view details
                  </p>
                  <p className="mt-1 text-xs text-[#777B98]">
                    {format(selectedDay, "EEEE, MMM d")} -{" "}
                    {selectedDayEvents.length} event
                    {selectedDayEvents.length === 1 ? "" : "s"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
