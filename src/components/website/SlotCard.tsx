import Link from "next/link";
import { BadgeCheck, CalendarDays, Clock } from "lucide-react";
import { eventPriceLabel } from "~/lib/price";
import { formatIST } from "~/lib/datetime";
import { getMoodDisplayLabel } from "~/lib/moods";
import type { EventDTO, PublicHostProfileDTO } from "~/lib/api";
import { coverOf, isOneOnOne, whenOf } from "./shared";

/** Grid card for the website's Discover section: 4:5 poster, then details. */
export default function SlotCard({
  event,
  host,
  index = 0,
}: {
  event: EventDTO;
  host?: PublicHostProfileDTO;
  index?: number;
}) {
  const when = whenOf(event);
  const price = eventPriceLabel(event);
  const badge = isOneOnOne(event)
    ? "1:1 session"
    : event.mood
      ? getMoodDisplayLabel(event.mood)
      : null;

  return (
    <Link
      href={`/experience/${event.slug}`}
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.05] bg-[#121426] transition hover:border-white/15 sm:rounded-[20px]"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverOf(event, index)}
          alt={event.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        {badge && (
          <span className="absolute top-2 left-2 flex max-w-[calc(100%-16px)] items-center gap-1.5 truncate rounded-full bg-[#080914]/75 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur sm:top-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-[11px]">
            <i className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-3 pt-2.5 pb-3 sm:gap-2 sm:px-4 sm:pt-3.5 sm:pb-4">
        {host && (
          <p className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-white/60 sm:text-xs">
            {host.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={host.avatar_url}
                alt=""
                className="h-4 w-4 shrink-0 rounded-full object-cover sm:h-[18px] sm:w-[18px]"
              />
            ) : null}
            <span className="truncate">
              {host.first_name} {host.last_name}
            </span>
            {host.is_identity_verified && (
              <BadgeCheck
                aria-label="Verified host"
                className="h-3.5 w-3.5 shrink-0 text-[#A020F0]"
              />
            )}
          </p>
        )}
        {/* Always two lines tall (1.25 line height x 2), so one-line titles
            don't leave the meta row higher than on neighbouring cards. */}
        <h3 className="font-outfit line-clamp-2 min-h-[2.5em] text-[14px] leading-tight font-semibold text-white sm:text-[17px]">
          {event.title}
        </h3>
        {/* Phones: date and price stacked, so a half-width card never wraps. */}
        <div className="mt-auto flex flex-col gap-1 pt-0.5 text-[11px] text-[#777B98] tabular-nums sm:hidden">
          <span className="flex items-center gap-1 truncate">
            <CalendarDays className="h-3 w-3 shrink-0" />
            {formatIST(when, "d MMM · h:mm a")}
          </span>
          <span className="font-outfit text-[14px] font-bold text-[#D8B4FE]">
            {price}
          </span>
        </div>
        <div className="mt-auto hidden items-center gap-3 pt-0.5 text-xs text-[#777B98] tabular-nums sm:flex">
          <span className="flex items-center gap-1 whitespace-nowrap">
            <Clock className="h-3.5 w-3.5" />
            {formatIST(when, "h:mm a")}
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatIST(when, "EEE, d MMM")}
          </span>
          <span className="font-outfit ml-auto text-[15px] font-bold whitespace-nowrap text-[#D8B4FE]">
            {price}
          </span>
        </div>
      </div>
    </Link>
  );
}
