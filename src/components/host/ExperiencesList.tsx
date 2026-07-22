"use client";

import { type EventDTO } from "~/lib/api";
import { eventPriceLabel } from "~/lib/price";
import { ExperienceCard } from "~/components/ExperienceCard";

/**
 * True when an experience has already happened. Uses next_available_date when
 * present (a recurring series still running has a future one) and falls back to
 * the event's own time.
 */
export function isPastEvent(event: EventDTO): boolean {
  const when = new Date(event.next_available_date ?? event.time).getTime();
  if (Number.isNaN(when)) return false;
  return when < Date.now();
}

/** Split a host's events into still-bookable and already-held, newest first. */
export function splitEventsByTime(events: EventDTO[]): {
  upcoming: EventDTO[];
  past: EventDTO[];
} {
  const upcoming: EventDTO[] = [];
  const past: EventDTO[] = [];
  for (const e of events) (isPastEvent(e) ? past : upcoming).push(e);
  past.sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
  );
  return { upcoming, past };
}

export default function ExperiencesList({
  events,
  title = "Live & Upcoming Experiences",
}: {
  events: EventDTO[];
  title?: string;
  // Accepted for call-site compatibility; the shared ExperienceCard renders the
  // same for past and upcoming, so it is not used here.
  isPast?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="mt-4 flex flex-col gap-4 overflow-x-scroll [scrollbar-width:none] sm:flex-row [&::-webkit-scrollbar]:hidden">
        {events.map((event) => (
          <ExperienceCard
            key={event.id}
            className="w-full shrink-0 sm:w-[340px]"
            id={event.id}
            headline={event.mood ?? event.location ?? "Experience"}
            title={event.title}
            description={
              event.hook_line ??
              event.description ??
              "Discover a hosted experience near you."
            }
            imageUrl={event.cover_image_url ?? "/assets/home/hiking.webp"}
            rating={
              event.avg_rating !== null &&
              event.avg_rating !== undefined &&
              event.avg_rating !== 0
                ? event.avg_rating.toFixed(1)
                : "New"
            }
            price={eventPriceLabel(event)}
            time={event.time}
            location={event.location}
            isRecurring={event.is_recurring}
            capacity={event.capacity}
            totalBookings={event.total_bookings}
            recurrenceRule={event.recurrence_rule}
            nextAvailableDate={event.next_available_date}
          />
        ))}
      </div>
    </div>
  );
}
