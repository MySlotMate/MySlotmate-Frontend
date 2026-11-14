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
      className="group flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-white/[0.05] bg-[#121426] transition hover:border-white/15"
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
          <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-[#080914]/75 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
            <i className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 px-4 pt-3.5 pb-4">
        {host && (
          <p className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-white/60">
            {host.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={host.avatar_url}
                alt=""
                className="h-[18px] w-[18px] shrink-0 rounded-full object-cover"
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
        <h3 className="font-outfit line-clamp-2 text-[17px] leading-tight font-semibold text-white">
          {event.title}
        </h3>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-[#777B98] tabular-nums">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatIST(when, "h:mm a")}
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatIST(when, "EEE, d MMM")}
          </span>
          <span className="font-outfit ml-auto text-[15px] font-bold text-[#D8B4FE]">
            {price}
          </span>
        </div>
      </div>
    </Link>
  );
}
