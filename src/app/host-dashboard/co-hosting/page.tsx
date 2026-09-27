"use client";

import { useEffect, useState } from "react";
import {
  CoHostManager,
  HostNavbar,
  SharedEventsCard,
} from "~/components/host-dashboard";
import { useEventsByHost } from "~/hooks/useApi";

/**
 * Co-hosting — both sides of sharing an experience, in one place.
 *
 * Top: experiences other hosts shared with YOU (accept, and withdraw when the
 * owner allows it). Bottom: pick one of your own experiences and manage who
 * co-hosts it. The same panels also live inline on the event edit page and the
 * earnings page; this page is the direct route to them.
 */
export default function CoHostingPage() {
  const [hostId, setHostId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState("");

  useEffect(() => {
    setHostId(localStorage.getItem("msm_host_id"));
  }, []);

  const { data: events, isLoading } = useEventsByHost(hostId);

  // Default to the newest experience so the panel is never empty on arrival.
  useEffect(() => {
    if (!selectedEventId && events && events.length > 0) {
      setSelectedEventId(events[0]!.id);
    }
  }, [events, selectedEventId]);

  return (
    <>
      <HostNavbar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Co-hosting</h1>
        <p className="mb-6 text-sm text-gray-500">
          Run an experience together with another host. A co-host helps manage
          the experience, and — if you allow it — can withdraw that
          experience&apos;s earnings to their own bank account.
        </p>

        <div className="mb-6">
          <SharedEventsCard showWhenEmpty />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">
            Your experiences
          </h2>
          <p className="mb-4 text-xs text-gray-500">
            Pick an experience to invite or manage its co-hosts.
          </p>

          {isLoading ? (
            <p className="text-xs text-gray-400">Loading your experiences…</p>
          ) : !events || events.length === 0 ? (
            <p className="text-xs text-gray-400">
              You have no experiences yet.
            </p>
          ) : (
            <>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                aria-label="Experience"
                className="mb-5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>

              {selectedEventId && (
                <div className="border-t border-gray-100 pt-5">
                  {/* Remount per event so the roster reloads on switch. */}
                  <CoHostManager
                    key={selectedEventId}
                    eventId={selectedEventId}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
