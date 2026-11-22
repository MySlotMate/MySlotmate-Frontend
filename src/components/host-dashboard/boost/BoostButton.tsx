"use client";

import Link from "next/link";
import { FiTrendingUp } from "react-icons/fi";
import type { BoostStatus } from "~/lib/api";
import { BOOST_ENABLED, BOOST_STATUS_LABEL, isOpenBoost } from "~/lib/boost";

/** Where a "Boost this event" tap lands: the event's Boost card, form open. */
export const boostHref = (eventId: string) =>
  `/host-dashboard/experiences/${eventId}?boost=1#boost`;

/**
 * Small "Boost this event" pill. With an open Boost it shows the status
 * instead ("Boosted", "Quote ready") and still leads to the Boost card.
 */
export default function BoostButton({
  eventId,
  status,
  size = "sm",
  className = "",
}: {
  eventId: string;
  status?: BoostStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  if (!BOOST_ENABLED) return null;
  const open = !!status && isOpenBoost(status);
  const label =
    status && open ? BOOST_STATUS_LABEL[status] : "Boost this event";
  const pad = size === "md" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs";
  return (
    <Link
      href={boostHref(eventId)}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition ${pad} ${
        open
          ? "border border-[#B724EA]/50 bg-[#B724EA]/15 text-[#E9D5FF] hover:bg-[#B724EA]/25"
          : "bg-gradient-to-r from-[#7038F5] to-[#B724EA] text-white hover:opacity-90"
      } ${className}`}
    >
      <FiTrendingUp className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} />
      {label}
    </Link>
  );
}
