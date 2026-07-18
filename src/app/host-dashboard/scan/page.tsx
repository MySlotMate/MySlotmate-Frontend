"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { HostNavbar } from "~/components/host-dashboard";
import Breadcrumb from "~/components/Breadcrumb";
import { useEventsByHost, useMyHost } from "~/hooks/useApi";
import * as api from "~/lib/api";
import type { ScanResultDTO, ScanSession } from "~/lib/api";
import { formatIST } from "~/lib/datetime";
import { toast } from "sonner";
import {
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiUsers,
  FiRefreshCw,
} from "react-icons/fi";
import { LuLoader2, LuScanLine } from "react-icons/lu";

// The camera reader touches browser-only APIs — keep it out of the server bundle.
const QrScanner = dynamic(
  () => import("~/components/host-dashboard/QrScanner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-gray-100">
        <LuLoader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    ),
  },
);

/** A verdict is only "admit them" when it's `valid`. */
const isAdmit = (v: ScanResultDTO["verdict"]) => v === "valid";

/**
 * Door check-in. The host first picks which experience and date they're
 * manning; every scan is then judged against that session, so a ticket for
 * another event — or another date of the same event — is rejected rather than
 * silently accepted.
 *
 * A booking covers several guests who needn't arrive together, so scanning the
 * same ticket again admits the rest of the group.
 */
export default function HostScanPage() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    setUserId(localStorage.getItem("msm_user_id"));
  }, []);

  const { data: host } = useMyHost(userId);
  const { data: events, isLoading: eventsLoading } = useEventsByHost(
    host?.id ?? null,
  );

  const [eventId, setEventId] = useState("");
  const [occurrence, setOccurrence] = useState("");
  const [result, setResult] = useState<ScanResultDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(1);

  // Occurrence options come from the event's own bookings rather than being
  // recomputed from a recurrence rule: the backend matches the occurrence
  // timestamp exactly, so the value sent has to be the one actually stored.
  const { data: attendees, isLoading: attendeesLoading } = useQuery({
    queryKey: ["eventAttendees", eventId],
    queryFn: () => api.getEventAttendees(eventId),
    enabled: !!eventId,
    select: (res) => res.data ?? [],
  });

  const occurrences = useMemo(() => {
    const seen = new Set((attendees ?? []).map((b) => b.occurrence_date));
    return Array.from(seen).sort();
  }, [attendees]);

  // With a single date there's nothing to choose — select it automatically.
  useEffect(() => {
    setOccurrence(occurrences.length === 1 ? occurrences[0]! : "");
  }, [occurrences]);

  // Memoised so the scan handler keeps a stable identity between renders.
  const session: ScanSession | null = useMemo(
    () =>
      host?.id && eventId && occurrence
        ? { host_id: host.id, event_id: eventId, occurrence_date: occurrence }
        : null,
    [host?.id, eventId, occurrence],
  );

  const ready = !!session;

  const handleScan = useCallback(
    async (raw: string) => {
      if (!session || busy) return;

      const bookingId = api.parseTicketQr(raw);
      if (!bookingId) {
        // Venues are full of unrelated QR codes — say so instead of erroring.
        setResult({
          verdict: "not_found",
          message: "That's not a MySlotMate ticket.",
          checked_in_count: 0,
          remaining: 0,
          just_checked_in: 0,
        });
        return;
      }

      setBusy(true);
      try {
        const res = await api.verifyScannedTicket(session, bookingId);
        setResult(res.data);
        // Default to admitting everyone still outstanding — the common case.
        setCount(res.data.remaining > 0 ? res.data.remaining : 1);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not check that ticket.",
        );
      } finally {
        setBusy(false);
      }
    },
    [session, busy],
  );

  const handleCheckIn = async () => {
    if (!session || !result?.booking_id || busy) return;
    setBusy(true);
    try {
      const res = await api.checkInScannedTicket(
        session,
        result.booking_id,
        count,
      );
      setResult(res.data);
      if (res.data.just_checked_in > 0) toast.success(res.data.message);
      else toast.error(res.data.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const selectedEvent = events?.find((e) => e.id === eventId);

  return (
    <>
      <HostNavbar />
      <main className="site-x mx-auto min-h-screen w-full max-w-[900px] py-8 pt-24">
        <Breadcrumb
          items={[
            { label: "Host Dashboard", href: "/host-dashboard" },
            { label: "Check-in Scanner" },
          ]}
          className="mb-6"
        />

        <h1 className="text-3xl font-bold text-gray-900">Check-in Scanner</h1>
        <p className="mt-1 text-sm font-medium text-[#0094CA]">
          Scan guest tickets at the door
        </p>

        {/* Session picker — what this scanner is checking people in for. */}
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-bold text-gray-900">
            You&apos;re checking in for
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-600">
              Experience
              <select
                value={eventId}
                disabled={eventsLoading}
                onChange={(e) => {
                  setEventId(e.target.value);
                  setResult(null);
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#0094CA]"
              >
                <option value="">
                  {eventsLoading ? "Loading…" : "Select an experience"}
                </option>
                {(events ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-600">
              Date
              <select
                value={occurrence}
                disabled={!eventId || attendeesLoading}
                onChange={(e) => {
                  setOccurrence(e.target.value);
                  setResult(null);
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#0094CA] disabled:bg-gray-50"
              >
                <option value="">
                  {!eventId
                    ? "Pick an experience first"
                    : attendeesLoading
                      ? "Loading…"
                      : occurrences.length === 0
                        ? "No bookings yet"
                        : "Select a date"}
                </option>
                {occurrences.map((o) => (
                  <option key={o} value={o}>
                    {formatIST(o, "EEE, d MMM yyyy · hh:mm a")}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {ready && (
            <p className="mt-4 rounded-xl bg-[#f0faff] px-4 py-3 text-xs font-semibold text-[#0094CA]">
              Scanning for {selectedEvent?.title} ·{" "}
              {formatIST(occurrence, "EEE, d MMM yyyy · hh:mm a")}
            </p>
          )}
        </section>

        {/* Camera */}
        <section className="mt-6">
          {ready ? (
            <QrScanner
              onScan={(raw) => void handleScan(raw)}
              paused={busy || !!result}
            />
          ) : (
            <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
              <LuScanLine className="h-8 w-8 text-gray-300" />
              <p className="max-w-xs text-sm font-medium text-gray-500">
                Choose the experience and date above to start scanning.
              </p>
            </div>
          )}
        </section>

        {/* Verdict */}
        {result && (
          <ScanVerdictCard
            result={result}
            count={count}
            busy={busy}
            onCountChange={setCount}
            onCheckIn={() => void handleCheckIn()}
            onNext={() => setResult(null)}
          />
        )}
      </main>
    </>
  );
}

/* ------------------------------------------------------------------ */

function ScanVerdictCard({
  result,
  count,
  busy,
  onCountChange,
  onCheckIn,
  onNext,
}: {
  result: ScanResultDTO;
  count: number;
  busy: boolean;
  onCountChange: (n: number) => void;
  onCheckIn: () => void;
  onNext: () => void;
}) {
  const admit = isAdmit(result.verdict);
  // A ticket that's fully used isn't an error — it's just done. Colour it
  // amber so it reads differently from a forged or wrong-event ticket.
  const spent =
    result.verdict === "already_checked_in" || result.verdict === "too_many";

  const tone = admit
    ? {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-800",
        Icon: FiCheckCircle,
        iconColor: "text-green-500",
      }
    : spent
      ? {
          bg: "bg-amber-50",
          border: "border-amber-200",
          text: "text-amber-800",
          Icon: FiAlertTriangle,
          iconColor: "text-amber-500",
        }
      : {
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-800",
          Icon: FiXCircle,
          iconColor: "text-red-500",
        };

  const canCheckIn = admit && result.remaining > 0;

  return (
    <section
      className={`mt-6 rounded-2xl border p-5 ${tone.bg} ${tone.border}`}
    >
      <div className="flex items-start gap-3">
        <tone.Icon className={`mt-0.5 h-6 w-6 shrink-0 ${tone.iconColor}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${tone.text}`}>{result.message}</p>

          {result.guest_name && (
            <div className="mt-3 space-y-1 text-sm text-gray-700">
              <p className="font-bold text-gray-900">{result.guest_name}</p>
              {result.event_title && (
                <p className="text-xs font-medium text-gray-500">
                  {result.event_title}
                </p>
              )}
              {result.occurrence_date && (
                <p className="text-xs font-medium text-gray-500">
                  {formatIST(
                    result.occurrence_date,
                    "EEE, d MMM yyyy · hh:mm a",
                  )}
                </p>
              )}
              {result.quantity != null && (
                <p className="flex items-center gap-1.5 pt-1 text-xs font-bold text-gray-700">
                  <FiUsers className="h-3.5 w-3.5" />
                  {result.checked_in_count} of {result.quantity} checked in
                  {result.remaining > 0 && ` · ${result.remaining} to go`}
                </p>
              )}
            </div>
          )}

          {/* How many of the group are actually at the door right now. */}
          {canCheckIn && (
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
                Guests entering now
                <input
                  type="number"
                  min={1}
                  max={result.remaining}
                  value={count}
                  disabled={busy}
                  onChange={(e) =>
                    onCountChange(
                      Math.min(
                        result.remaining,
                        Math.max(1, parseInt(e.target.value) || 1),
                      ),
                    )
                  }
                  className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-[#0094CA]"
                />
              </label>
              <button
                type="button"
                onClick={onCheckIn}
                disabled={busy}
                className="rounded-full bg-[#0094CA] px-6 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#007dab] disabled:opacity-50"
              >
                {busy ? "Checking in…" : `Check in ${count}`}
              </button>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={busy}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
      >
        <FiRefreshCw className="h-4 w-4" />
        Scan next ticket
      </button>
    </section>
  );
}
