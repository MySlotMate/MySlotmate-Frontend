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

function ExperienceCard({ event }: { event: EventDTO }) {
  const moodColor = event.mood
    ? (moodColorMap[event.mood] ?? "#0094CA")
    : "#0094CA";

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
        />
        {/* Price badge */}
        <span className="absolute top-3 right-3 rounded-full bg-[#0094CA] px-3 py-1 text-xs font-semibold text-white">
          {formatPrice(event.price_cents, event.is_free)}
        </span>
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
          {formatEventDate(event.time)}
        </div>
        <h4 className="text-base font-bold text-gray-900">{event.title}</h4>
        <p className="line-clamp-2 text-sm text-gray-500">
          {event.description ?? event.hook_line ?? ""}
        </p>
        <Link
          href={`/experience/${event.id}`}
          className="mt-auto w-full rounded-full bg-[#0094CA] py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[#007aa8]"
        >
          Book Experience
        </Link>
      </div>
    </div>
  );
}

export default function ExperiencesList({ events }: { events: EventDTO[] }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          Live & Upcoming Experiences
        </h2>
      </div>
      <div className="mt-4 flex flex-col gap-4 overflow-x-scroll [scrollbar-width:none] sm:flex-row [&::-webkit-scrollbar]:hidden">
        {events.map((evt) => (
          <ExperienceCard key={evt.id} event={evt} />
        ))}
      </div>
    </div>
  );
}
