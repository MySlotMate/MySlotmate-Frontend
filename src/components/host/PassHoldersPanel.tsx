"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listPassHolders } from "~/lib/api";
import { formatIST } from "~/lib/datetime";
import { useIdToken } from "~/hooks/useIdToken";

/**
 * Who currently holds a monthly pass on this experience. Pass holders only
 * appear on the attendee roster for dates they have actually reserved, so this
 * is the one place the host can see everyone who has paid for the month.
 */
export default function PassHoldersPanel({ eventId }: { eventId: string }) {
  const idToken = useIdToken();
  const [expanded, setExpanded] = useState(false);

  const { data } = useQuery({
    queryKey: ["pass-holders", eventId, idToken],
    queryFn: () => listPassHolders(eventId, idToken!),
    enabled: !!idToken,
  });

  const holders = (data?.data ?? []).filter((h) => h.status === "active");
  if (holders.length === 0) return null;

  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-sm font-medium text-[#0094CA] hover:underline"
      >
        Pass holders ({holders.length})
      </button>

      {expanded && (
        <ul className="mt-3 space-y-2">
          {holders.map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="text-gray-900">{h.user_name || h.user_email}</span>
              <span className="text-xs text-gray-500">
                {h.sessions_included === null
                  ? `${h.sessions_used} booked`
                  : `${h.sessions_used}/${h.sessions_included} used`}{" "}
                · until {formatIST(h.valid_until, "d MMM")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
