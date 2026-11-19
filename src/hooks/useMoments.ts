"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import * as api from "~/lib/api";
import type { BookingDTO, EventDTO } from "~/lib/api";
import {
  queryKeys,
  useBookingsByUser,
  useListPublicEvents,
} from "~/hooks/useApi";
import type { Moment } from "~/lib/badges";

/**
 * A user's bookings joined to their events, including past events that have
 * dropped out of the public list (fetched one by one), plus the completed
 * "moments" that badges are worked out from.
 */
export function useMoments(userId: string | null) {
  const { data: bookings, isLoading } = useBookingsByUser(userId);
  const { data: allEvents } = useListPublicEvents();

  const missingIds = useMemo(() => {
    if (!allEvents) return [];
    const known = new Set(allEvents.map((e) => e.id));
    return [
      ...new Set(
        (bookings ?? []).map((b) => b.event_id).filter((id) => !known.has(id)),
      ),
    ];
  }, [allEvents, bookings]);

  const extra = useQueries({
    queries: missingIds.map((id) => ({
      queryKey: queryKeys.event(id),
      queryFn: () => api.getEvent(id),
      staleTime: 10 * 60 * 1000,
      retry: false,
      select: (res: api.Envelope<EventDTO>) => res.data,
    })),
  });
  const extraKey = extra.map((q) => q.data?.id ?? "").join(",");

  const eventById = useMemo(() => {
    const m = new Map<string, EventDTO>();
    for (const e of allEvents ?? []) m.set(e.id, e);
    for (const q of extra) if (q.data) m.set(q.data.id, q.data);
    return m;
    // `extra` is a new array every render; key on what it resolved to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEvents, extraKey]);

  const withEvents = useMemo(
    () =>
      (bookings ?? []).flatMap((booking: BookingDTO) => {
        const event = eventById.get(booking.event_id);
        return event ? [{ booking, event }] : [];
      }),
    [bookings, eventById],
  );

  const moments: Moment[] = useMemo(
    () =>
      withEvents
        .filter(
          ({ booking }) =>
            booking.status === "confirmed" &&
            new Date(booking.occurrence_date).getTime() <= Date.now(),
        )
        .map(({ booking, event }) => ({
          booking,
          event,
          at: new Date(booking.occurrence_date),
        }))
        .sort((a, b) => b.at.getTime() - a.at.getTime()),
    [withEvents],
  );

  // Bookings and the events list both in, so empty means empty.
  const ready = bookings !== undefined && allEvents !== undefined;
  return { bookings, withEvents, moments, eventById, isLoading, ready };
}
