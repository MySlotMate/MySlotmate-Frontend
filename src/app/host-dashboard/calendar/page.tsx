"use client";

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
import { FiChevronLeft, FiChevronRight, FiRefreshCw, FiPlus, FiMapPin, FiClock, FiMessageCircle } from "react-icons/fi";
import { HostNavbar } from "~/components/host-dashboard";
import Breadcrumb from "~/components/Breadcrumb";
import { useCalendarEvents, useEventAttendees, useMyHost } from "~/hooks/useApi";
import type { EventDTO } from "~/lib/api";

export default function HostCalendarPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setUserId(localStorage.getItem("msm_user_id"));
    setIsHydrated(true);
  }, []);

  const { data: host } = useMyHost(userId);
  const { data: events, isLoading } = useCalendarEvents(host?.id ?? null);

  const [cursorMonth, setCursorMonth] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<EventDTO | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week" | "list">("month");

  // Fetch attendees for selected event
  const { data: attendees } = useEventAttendees(selectedEvent?.id ?? null);

  const eventsByDayKey = useMemo(() => {
    const map = new Map<string, NonNullable<typeof events>>();
    for (const ev of events ?? []) {
      const date = new Date(ev.time);
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      map.set(dayKey, [...(map.get(dayKey) ?? []), ev]);
    }
    for (const [k, arr] of map) {
      arr.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      map.set(k, arr);
    }
    return map;
  }, [events]);

  const monthStart = startOfMonth(cursorMonth);
  const monthEnd = endOfMonth(cursorMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Start with Sunday
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const selectedKey = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, '0')}-${String(selectedDay.getDate()).padStart(2, '0')}`;
  const selectedDayEvents = eventsByDayKey.get(selectedKey) ?? [];

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
      <div className="min-h-screen bg-gray-50">
        <HostNavbar />
        <main className="mx-auto max-w-7xl site-x py-8">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No host profile found. Please apply as a host first.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HostNavbar />

      <main className="mx-auto max-w-7xl site-x py-8">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Dashboard", href: "/host-dashboard" }, { label: "Calendar" }]} className="mb-6" />
        
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bookings & Calendar</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your schedule and upcoming sessions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              <FiRefreshCw className="h-4 w-4" />
              Sync Calendar
            </button>
            <Link
              href="/host-dashboard/experiences/new"
              className="flex items-center gap-2 rounded-lg bg-[#0094CA] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#007dab] transition"
            >
              <FiPlus className="h-4 w-4" />
              Add Session
            </Link>
          </div>
        </div>

        {isLoading && (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0094CA] border-t-transparent" />
          </div>
        )}

        {!isLoading && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Calendar grid - 3 columns */}
            <div className="rounded-xl border border-gray-200 bg-white lg:col-span-3">
              {/* Calendar header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <button
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition"
                    onClick={() => setCursorMonth((d) => addMonths(d, -1))}
                    aria-label="Previous month"
                  >
                    <FiChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-base font-semibold text-gray-900 min-w-35 text-center">
                    {format(cursorMonth, "MMMM yyyy")}
                  </span>
                  <button
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition"
                    onClick={() => setCursorMonth((d) => addMonths(d, 1))}
                    aria-label="Next month"
                  >
                    <FiChevronRight className="h-5 w-5" />
                  </button>
                </div>

                {/* View mode toggle */}
                <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1">
                  {(["month", "week", "list"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition ${
                        viewMode === mode
                          ? "bg-gray-900 text-white"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weekday header - Start with Sunday */}
              <div className="grid grid-cols-7 border-b border-gray-100">
                {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
                  <div key={d} className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {gridDays.map((day, idx) => {
                  const inMonth = isSameMonth(day, cursorMonth);
                  const isSelected = isSameDay(day, selectedDay);
                  const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
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
                      className={`relative min-h-25 border-b border-r border-gray-100 p-2 text-left transition hover:bg-gray-50 ${
                        isSelected ? "bg-[#e6f8ff]" : ""
                      } ${inMonth ? "" : "bg-gray-50/50"} ${isLastRow ? "border-b-0" : ""}`}
                    >
                      <span className={`text-sm font-medium ${inMonth ? "text-gray-900" : "text-gray-400"}`}>
                        {format(day, "d")}
                      </span>

                      {/* Event pills */}
                      <div className="mt-1 space-y-1">
                        {dayEvents.slice(0, 2).map((ev) => {
                          const time = format(new Date(ev.time), "h:mm a");
                          const bgColor =
                            ev.status === "live"
                              ? "bg-[#e6f8ff] text-[#0094CA]"
                              : ev.status === "paused"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-purple-50 text-purple-700";
                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(ev);
                                setSelectedDay(day);
                              }}
                              className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium cursor-pointer ${bgColor}`}
                            >
                              {time} {ev.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <div className="text-[10px] text-gray-400 px-1">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected event details - 1 column */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 h-fit">
              {selectedEvent ? (
                <>
                  {/* Status badge */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      selectedEvent.status === "live"
                        ? "bg-green-100 text-green-700"
                        : selectedEvent.status === "paused"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-700"
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {selectedEvent.status === "live" ? "Confirmed" : selectedEvent.status.toUpperCase()}
                    </span>
                    <button className="text-gray-400 hover:text-gray-600">×</button>
                  </div>

                  {/* Event info */}
                  <h3 className="mt-3 text-base font-semibold text-gray-900">{selectedEvent.title}</h3>
                  <div className="mt-2 space-y-1.5">
                    <p className="flex items-center gap-2 text-xs text-gray-500">
                      <FiClock className="h-3.5 w-3.5" />
                      {format(new Date(selectedEvent.time), "MMM d, h:mm a")}
                      {selectedEvent.end_time && ` - ${format(new Date(selectedEvent.end_time), "h:mm a")}`}
                    </p>
                    {selectedEvent.location && (
                      <p className="flex items-center gap-2 text-xs text-gray-500">
                        <FiMapPin className="h-3.5 w-3.5" />
                        {selectedEvent.location}
                      </p>
                    )}
                  </div>

                  {/* Attendee List */}
                  <div className="mt-5 border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900">Attendee List</h4>
                      <span className="text-xs text-gray-500">
                        {selectedEvent.total_bookings}/{selectedEvent.capacity} filled
                      </span>
                    </div>

                    <div className="mt-3 space-y-2 max-h-50 overflow-y-auto">
                      {attendees && attendees.length > 0 ? (
                        attendees.map((booking, idx) => (
                          <div key={booking.id} className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                              {String.fromCharCode(65 + idx)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                Guest #{idx + 1}
                              </p>
                              <p className="text-xs text-gray-500">
                                {booking.status === "confirmed" ? "Paid" : booking.status} • {booking.quantity} ticket{booking.quantity > 1 ? "s" : ""}
                              </p>
                            </div>
                            <button className="text-gray-400 hover:text-[#0094CA]">
                              <FiMessageCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500 py-2">No attendees yet</p>
                      )}
                    </div>

                    {attendees && attendees.length > 0 && (
                      <p className="mt-3 text-xs text-[#0094CA]">
                        +{selectedEvent.total_bookings} guests requesting details
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="mt-5 space-y-2">
                    <Link
                      href={`/host-dashboard/messages?event=${selectedEvent.id}`}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0094CA] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#007dab] transition"
                    >
                      <FiMessageCircle className="h-4 w-4" />
                      Message All
                    </Link>
                    <button className="w-full text-center text-sm font-medium text-red-600 hover:text-red-700 py-2">
                      Cancel Session
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <FiClock className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">Select an event to view details</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(selectedDay, "EEEE, MMM d")} - {selectedDayEvents.length} event{selectedDayEvents.length === 1 ? "" : "s"}
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
