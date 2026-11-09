"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LuTicket } from "react-icons/lu";
import { FiChevronDown, FiDownload } from "react-icons/fi";
import { getMyPasses, type BookingDTO, type EventDTO } from "~/lib/api";
import { formatIST } from "~/lib/datetime";
import { useIdToken } from "~/hooks/useIdToken";

/**
 * Live monthly passes, shown above the booking list. One card per pass rather
 * than a booking row per reserved date — a pass is one purchase, and the dates
 * under it appear as ordinary bookings below.
 */
export default function MyPassesSection({
  events,
  bookings,
  onDownloadTicket,
  downloadingTicketId,
}: {
  events: EventDTO[];
  /** Every booking the guest has; the pass's own sessions are picked out of it. */
  bookings: BookingDTO[];
  onDownloadTicket: (booking: BookingDTO, event: EventDTO) => void;
  downloadingTicketId: string | null;
}) {
  const idToken = useIdToken();
  const [openPassId, setOpenPassId] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["my-passes", idToken],
    queryFn: () => getMyPasses(idToken!),
    enabled: !!idToken,
  });

  const active = (data?.data ?? []).filter(
    (p) => p.status === "active" && new Date(p.valid_until) > new Date(),
  );
  if (active.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="font-outfit mb-3 text-lg font-semibold text-white">
        My Passes
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {active.map((pass) => {
          const event = events.find((e) => e.id === pass.event_id);
          // == null covers an absent key as well as an explicit null, either of
          // which means the pass has no session cap.
          const used =
            pass.sessions_included == null
              ? pass.sessions_used === 1
                ? "1 session booked"
                : `${pass.sessions_used} sessions booked`
              : `${pass.sessions_used} of ${pass.sessions_included} sessions used`;
          const sessions = bookings
            .filter((b) => b.pass_id === pass.id && b.status !== "cancelled")
            .sort((a, b) => a.occurrence_date.localeCompare(b.occurrence_date));
          const isOpen = openPassId === pass.id;

          return (
            <div
              key={pass.id}
              className="rounded-2xl border border-[#9B30FF]/40 bg-[#9B30FF]/10 p-4"
            >
              <button
                type="button"
                onClick={() => setOpenPassId(isOpen ? null : pass.id)}
                className="w-full text-left"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[#D8B4FE] uppercase">
                    <LuTicket className="h-4 w-4" />
                    Monthly Pass
                  </span>
                  <FiChevronDown
                    className={`h-4 w-4 text-[#D8B4FE] transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
                <p className="text-base font-semibold text-white">
                  {event ? event.title : "Your experience"}
                </p>
                <p className="mt-1 text-sm text-white/60">
                  Active until {formatIST(pass.valid_until, "d MMM")} · {used}
                </p>
              </button>

              {isOpen && (
                <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                  {sessions.length === 0 ? (
                    <p className="text-sm text-white/50">
                      No sessions booked on this pass yet.
                    </p>
                  ) : (
                    sessions.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-[#131328] px-3 py-2"
                      >
                        <span className="text-sm text-white">
                          {formatIST(
                            booking.occurrence_date,
                            "EEE d MMM, h:mm a",
                          )}
                        </span>
                        {event && (
                          <button
                            type="button"
                            disabled={downloadingTicketId === booking.id}
                            onClick={() => onDownloadTicket(booking, event)}
                            className="flex items-center gap-1.5 rounded-lg border border-[#9B30FF]/50 px-2.5 py-1.5 text-xs font-medium text-[#E3CCFF] transition hover:bg-[#9B30FF]/15 disabled:opacity-50"
                          >
                            <FiDownload className="h-3.5 w-3.5" />
                            {downloadingTicketId === booking.id
                              ? "Preparing…"
                              : "Ticket"}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                  {event && (
                    <Link
                      href={`/experience/${event.slug}`}
                      className="block pt-1 text-xs text-[#D8B4FE] hover:underline"
                    >
                      View experience
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
