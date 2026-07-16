"use client";

import Link from "next/link";
import { type EventDTO } from "~/lib/api";
import { HiOutlineCalendar } from "react-icons/hi";

/** Map mood → colour for badge */
const moodColorMap: Record<string, string> = {
  adventure: "#2ECC71",
  social: "#F5A623",
  wellness: "#7B61FF",
  creative: "#E85D3A",
  chill: "#0094CA",
  romantic: "#E8436D",
  intellectual: "#3A7BD5",
  foodie: "#FF6B35",
  nightlife: "#9B59B6",
};

/** Strip HTML tags from rich-text content for plain-text previews. */
function toPlainText(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Format cents → "₹45 / person" */
function formatPrice(cents: number | null, isFree: boolean): string {
  if (isFree || cents === null || cents === 0) return "Free";
  return `₹${(cents / 100).toFixed(0)} / person`;
}

/** Format ISO time → "Sat, Nov 18 • 2:00 PM" */
function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }) +
    " • " +
    d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  );
}

function ExperienceCard({
  event,
  isPast = false,
}: {
  event: EventDTO;
  isPast?: boolean;
}) {
  const moodColor = event.mood
    ? (moodColorMap[event.mood] ?? "#0094CA")
    : "#0094CA";

  const plainTextDescription = toPlainText(event.description);
  const displayDescription = plainTextDescription !== ""
    ? plainTextDescription
    : (event.hook_line ?? "");

  return (
    <div className="flex w-full min-w-65 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm sm:w-[48%]">
      {/* Image */}
      <div className="relative h-48 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.cover_image_url ?? "/assets/home/placeholder.png"}
          alt={event.title}
          loading="lazy"
          className="h-full w-full object-cover"
          width={400}
          height={300}
        />
        {/* Price badge */}
        <span className="absolute top-3 right-3 rounded-full bg-[#0094CA] px-3 py-1 text-xs font-semibold text-white">
          {formatPrice(event.price_cents, event.is_free)}
        </span>
        {isPast && (
          <span className="absolute top-3 left-3 rounded-full bg-gray-900/70 px-3 py-1 text-xs font-semibold text-white">
            Held
          </span>
        )}
        {/* Mood badge */}
        {event.mood && (
          <span
            className="absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs font-semibold text-white capitalize"
            style={{ backgroundColor: moodColor }}
          >
            ✦ {event.mood}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <HiOutlineCalendar className="h-4 w-4" />
          {event.next_available_date && event.next_available_date !== event.time ? (
            <span className="text-emerald-600 font-bold">
              Next: {formatEventDate(event.next_available_date)}
            </span>
          ) : (
            formatEventDate(event.time)
          )}
        </div>
        <h4 className="text-base font-bold text-gray-900">{event.title}</h4>
        <p className="line-clamp-2 text-sm text-gray-500">
          {displayDescription}
        </p>
        <Link
          href={`/experience/${event.id}`}
          className={`mt-auto w-full rounded-full py-2.5 text-center text-sm font-semibold transition ${
            isPast
              ? "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              : "bg-[#0094CA] text-white hover:bg-[#007aa8]"
          }`}
        >
          {isPast ? "View Experience" : "Book Experience"}
        </Link>
      </div>
    </div>
  );
}

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
  isPast = false,
}: {
  events: EventDTO[];
  title?: string;
  isPast?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="mt-4 flex flex-col gap-4 overflow-x-scroll [scrollbar-width:none] sm:flex-row [&::-webkit-scrollbar]:hidden">
        {events.map((evt) => (
          <ExperienceCard key={evt.id} event={evt} isPast={isPast} />
        ))}
      </div>
    </div>
  );
}
