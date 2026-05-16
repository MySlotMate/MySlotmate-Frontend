"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { HostNavbar } from "~/components/host-dashboard";
import Breadcrumb from "~/components/Breadcrumb";
import { useEventsByHost, useMyHost } from "~/hooks/useApi";
import * as api from "~/lib/api";
import type { BookingDTO } from "~/lib/api";
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiUsers,
  FiChevronDown,
  FiChevronRight,
} from "react-icons/fi";
import { LuLoader2 } from "react-icons/lu";

/**
 * Host bookings page — every booking the host has received, grouped by event.
 * Events whose start time is in the past are surfaced under a separate
 * "History" section so the host can scan upcoming vs past work at a glance.
 */
export default function HostBookingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    setUserId(localStorage.getItem("msm_user_id"));
  }, []);

  const { data: host } = useMyHost(userId);
  const { data: events, isLoading: eventsLoading } = useEventsByHost(
    host?.id ?? null,
  );

  // Fetch attendees for every event in parallel. React Query handles caching.
  const attendeesQueries = useQueries({
    queries: (events ?? []).map((event) => ({
      queryKey: ["eventAttendees", event.id],
      queryFn: () => api.getEventAttendees(event.id),
      staleTime: 60 * 1000,
      select: (res: { data: BookingDTO[] }) => res.data ?? [],
    })),
  });

  const isLoading =
    eventsLoading ||
    attendeesQueries.some((q) => q.isLoading || q.isFetching === undefined);

  // Combine events + their attendees into a single shape, then split into
  // upcoming and history buckets.
  const { upcoming, history, totalBookings, totalGuests } = useMemo(() => {
    const now = Date.now();
    type Row = {
      event: NonNullable<typeof events>[number];
      bookings: BookingDTO[];
      isPast: boolean;
    };
    const rows: Row[] = (events ?? []).map((event, idx) => {
      const bookings = attendeesQueries[idx]?.data ?? [];
      return {
        event,
        bookings,
        isPast: new Date(event.time).getTime() < now,
      };
    });

    const u: Row[] = [];
    const h: Row[] = [];
    let totalB = 0;
    let totalG = 0;
    for (const row of rows) {
      totalB += row.bookings.length;
      totalG += row.bookings.reduce((s, b) => s + b.quantity, 0);
      (row.isPast ? h : u).push(row);
    }
    u.sort(
      (a, b) =>
        new Date(a.event.time).getTime() - new Date(b.event.time).getTime(),
    );
    h.sort(
      (a, b) =>
        new Date(b.event.time).getTime() - new Date(a.event.time).getTime(),
    );
    return { upcoming: u, history: h, totalBookings: totalB, totalGuests: totalG };
  }, [events, attendeesQueries]);

  return (
    <div className="min-h-screen bg-gray-50">
      <HostNavbar />

      <main className="site-x mx-auto max-w-7xl py-8">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Dashboard", href: "/host-dashboard" },
            { label: "Bookings" },
          ]}
          className="mb-6"
        />

        <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              All Bookings
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Bookings across every experience you host. Past events appear
              under History.
            </p>
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-xs text-gray-500">Total bookings</p>
              <p className="text-xl font-bold text-gray-900">{totalBookings}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total guests</p>
              <p className="text-xl font-bold text-gray-900">{totalGuests}</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <LuLoader2 className="h-8 w-8 animate-spin text-[#0094CA]" />
          </div>
        ) : (events?.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
            You haven&apos;t created any experiences yet.{" "}
            <Link
              href="/host-dashboard/experiences/new"
              className="font-semibold text-[#0094CA] hover:underline"
            >
              Create one
            </Link>
          </div>
        ) : (
          <>
            <Section
              title="Upcoming"
              empty="No upcoming events."
              groups={upcoming}
            />
            {history.length > 0 && (
              <div className="mt-10">
                <Section title="History" empty="No past events." groups={history} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Section({
  title,
  empty,
  groups,
}: {
  title: string;
  empty: string;
  groups: {
    event: { id: string; title: string; time: string; location: string | null; capacity: number };
    bookings: BookingDTO[];
    isPast: boolean;
  }[];
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-gray-900">{title}</h2>
      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
          {empty}
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <EventBookingsGroup key={g.event.id} {...g} />
          ))}
        </div>
      )}
    </section>
  );
}

function EventBookingsGroup({
  event,
  bookings,
  isPast,
}: {
  event: { id: string; title: string; time: string; location: string | null; capacity: number };
  bookings: BookingDTO[];
  isPast: boolean;
}) {
  const [open, setOpen] = useState(!isPast);

  const active = bookings.filter(
    (b) => b.status !== "cancelled" && b.status !== "refunded",
  );
  const guests = active.reduce((s, b) => s + b.quantity, 0);
  const revenue = active.reduce((s, b) => s + (b.amount_cents ?? 0), 0);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 bg-gray-50 px-4 py-3 text-left transition hover:bg-gray-100"
      >
        {open ? (
          <FiChevronDown className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
        ) : (
          <FiChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900">
              {event.title}
            </h3>
            {isPast && (
              <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                past
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <FiCalendar className="h-3 w-3" />
              {new Date(event.time).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1">
              <FiClock className="h-3 w-3" />
              {new Date(event.time).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            {event.location && (
              <span className="flex items-center gap-1">
                <FiMapPin className="h-3 w-3" />
                {event.location}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <FiUsers className="h-3.5 w-3.5" />
            {guests} / {event.capacity}
          </span>
          {revenue > 0 && (
            <span className="font-semibold text-gray-700">
              ₹{(revenue / 100).toFixed(2)}
            </span>
          )}
          <Link
            href={`/host-dashboard/experiences/${event.id}?tab=bookings`}
            onClick={(e) => e.stopPropagation()}
            className="rounded-md bg-[#0094CA] px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-[#007ba8]"
          >
            View
          </Link>
        </div>
      </button>

      {open && (
        <div className="divide-y divide-gray-100 bg-white">
          {bookings.length === 0 ? (
            <p className="px-4 py-4 text-center text-xs text-gray-400">
              No bookings yet.
            </p>
          ) : (
            bookings.map((b) => <BookingRow key={b.id} booking={b} />)
          )}
        </div>
      )}
    </div>
  );
}

function BookingRow({ booking }: { booking: BookingDTO }) {
  const name = booking.user_name ?? "Unknown user";
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {booking.user_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={booking.user_avatar_url}
            alt={name}
            className="h-8 w-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0094CA]/10 text-xs font-bold text-[#0094CA]">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
          {booking.user_email && (
            <p className="truncate text-xs text-gray-500">
              {booking.user_email}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-gray-500">Qty {booking.quantity}</span>
        {booking.amount_cents !== null && (
          <span className="text-gray-700">
            ₹{(booking.amount_cents / 100).toFixed(2)}
          </span>
        )}
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            booking.status === "pending"
              ? "bg-yellow-100 text-yellow-800"
              : booking.status === "confirmed"
                ? "bg-green-100 text-green-800"
                : booking.status === "cancelled"
                  ? "bg-red-100 text-red-800"
                  : "bg-orange-100 text-orange-800"
          }`}
        >
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </span>
      </div>
    </div>
  );
}
