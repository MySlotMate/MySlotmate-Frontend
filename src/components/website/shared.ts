import type { EventDTO } from "~/lib/api";

/** Shared styling + data helpers for the public (logged-out) website. */

export const GRADIENT =
  "bg-gradient-to-r from-[#7B2FFF] via-[#A020F0] to-[#BF00FF]";
export const SURFACE = "border border-white/[0.06] bg-[#121426]";

/** Shown when an event has no cover image. Order matters: it is cycled. */
export const FALLBACK_PHOTOS = [
  "/assets/home/heropic1.webp",
  "/assets/home/heropic2.webp",
  "/assets/home/heropic3.webp",
  "/assets/home/hiking.webp",
  "/assets/home/cover.webp",
  "/assets/home/people1.webp",
];

// Recurring events keep their first `time`, so prefer the next open date.
export const whenOf = (e: EventDTO) =>
  new Date(e.next_available_date ?? e.time);

export const coverOf = (e: EventDTO, i = 0) =>
  e.cover_image_url ?? FALLBACK_PHOTOS[i % FALLBACK_PHOTOS.length]!;

/** Upcoming, bookable events, soonest first. */
export function upcomingEvents(events: EventDTO[] | undefined) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return (events ?? [])
    .filter((e) => !e.is_private && whenOf(e) >= startOfToday)
    .sort((a, b) => whenOf(a).getTime() - whenOf(b).getTime());
}

export const isOneOnOne = (e: EventDTO) => e.session_type === "one_on_one";
