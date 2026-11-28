"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
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
  FiList,
  FiSearch,
} from "react-icons/fi";
import { nextEventDate } from "~/lib/boost";
import { LuLoader2, LuScanLine } from "react-icons/lu";

// The camera reader touches browser-only APIs — keep it out of the server bundle.
const QrScanner = dynamic(
  () => import("~/components/host-dashboard/QrScanner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-white/[0.06]">
        <LuLoader2 className="h-6 w-6 animate-spin text-[#777B98]" />
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
  // Deep link from the calendar: ?event=<id>&date=<iso>
  const [wanted, setWanted] = useState<{ event: string; date: string } | null>(
    null,
  );
  useEffect(() => {
    setUserId(localStorage.getItem("msm_user_id"));
    const q = new URLSearchParams(window.location.search);
    const ev = q.get("event");
    if (ev) {
      setEventId(ev);
      setWanted({ event: ev, date: q.get("date") ?? "" });
    }
  }, []);

  const { data: host } = useMyHost(userId);
  const { data: allEvents, isLoading: eventsLoading } = useEventsByHost(
    host?.id ?? null,
  );
  // Drafts can't have guests. Soonest first.
  const events = useMemo(
    () =>
      (allEvents ?? [])
        .filter((e) => e.status !== "draft")
        .sort(
          (a, b) =>
            (nextEventDate(a)?.getTime() ?? Infinity) -
            (nextEventDate(b)?.getTime() ?? Infinity),
        ),
    [allEvents],
  );

  const [eventId, setEventId] = useState("");
  const [occurrence, setOccurrence] = useState("");
  const [mode, setMode] = useState<"scan" | "list">("scan");
  const [result, setResult] = useState<ScanResultDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(1);
  const [search, setSearch] = useState("");

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

  // Pick the date the calendar asked for, or the only date there is.
  useEffect(() => {
    const target =
      wanted?.event === eventId && wanted.date
        ? new Date(wanted.date).getTime()
        : null;
    const match =
      target !== null
        ? occurrences.find((o) => new Date(o).getTime() === target)
        : undefined;
    setOccurrence(match ?? (occurrences.length === 1 ? occurrences[0]! : ""));
  }, [occurrences, wanted, eventId]);

  // Memoised so the scan handler keeps a stable identity between renders.
  const session: ScanSession | null = useMemo(
    () =>
      host?.id && eventId && occurrence
        ? { host_id: host.id, event_id: eventId, occurrence_date: occurrence }
        : null,
    [host?.id, eventId, occurrence],
  );

  const ready = !!session;

  // Who's booked for the chosen date.
  const guestsForDate = useMemo(
    () =>
      (attendees ?? []).filter(
        (b) =>
          b.occurrence_date === occurrence &&
          (b.status === "confirmed" || b.status === "pending"),
      ),
    [attendees, occurrence],
  );
  const guestCount = guestsForDate.reduce((s, b) => s + b.quantity, 0);
  const filteredGuests = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...guestsForDate].sort((a, b) =>
      (a.user_name ?? "").localeCompare(b.user_name ?? ""),
    );
    if (!q) return list;
    return list.filter((b) =>
      [b.user_name, b.user_email, b.user_phone].some((v) =>
        v?.toLowerCase().includes(q),
      ),
    );
  }, [guestsForDate, search]);

  /** Look a booking up, from a scanned QR or a tap on the guest list. */
  const verify = useCallback(
    async (bookingId: string) => {
      if (!session || busy) return;
      setBusy(true);
      try {
        const res = await api.verifyScannedTicket(session, bookingId);
        setResult(res.data);
        // Default to admitting everyone still outstanding: the common case.
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

  const handleScan = useCallback(
    async (raw: string) => {
      if (!session || busy) return;
      const bookingId = api.parseTicketQr(raw);
      if (!bookingId) {
        // Venues are full of unrelated QR codes: say so instead of erroring.
        setResult({
          verdict: "not_found",
          message: "That's not a Myslotmate ticket.",
          checked_in_count: 0,
          remaining: 0,
          just_checked_in: 0,
        });
        return;
      }
      await verify(bookingId);
    },
    [session, busy, verify],
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

  const selectedEvent = events.find((e) => e.id === eventId);
  const selectCls =
    "w-full rounded-xl border border-white/10 bg-[#0D0F1E] px-3 py-2.5 text-sm text-white outline-none focus:border-[#A020F0] disabled:opacity-50";

  return (
    <main className="mx-auto w-full max-w-[640px] px-4 py-6 sm:px-6 md:py-10">
      <h1 className="font-outfit text-[26px] leading-tight font-semibold tracking-[-0.01em] text-white sm:text-[32px]">
        Check-in
      </h1>
      <p className="mt-1 text-sm text-[#A5A8C3]">
        Let guests in at the door: scan their ticket or find them by name.
      </p>

      {/* 1. Which session */}
      <section className="mt-5 rounded-2xl border border-white/10 bg-[#121426] p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[#A5A8C3]">
            Event
            <select
              value={eventId}
              disabled={eventsLoading}
              onChange={(e) => {
                setEventId(e.target.value);
                setResult(null);
                setSearch("");
              }}
              className={selectCls}
            >
              <option value="">
                {eventsLoading ? "Loading…" : "Choose an event"}
              </option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[#A5A8C3]">
            Date
            <select
              value={occurrence}
              disabled={!eventId || attendeesLoading}
              onChange={(e) => {
                setOccurrence(e.target.value);
                setResult(null);
              }}
              className={selectCls}
            >
              <option value="">
                {!eventId
                  ? "Choose an event first"
                  : attendeesLoading
                    ? "Loading…"
                    : occurrences.length === 0
                      ? "No bookings yet"
                      : "Choose a date"}
              </option>
              {occurrences.map((o) => (
                <option key={o} value={o}>
                  {formatIST(o, "EEE, d MMM · h:mm a")}
                </option>
              ))}
            </select>
          </label>
        </div>

        {ready && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#A020F0]/10 px-3 py-2.5 text-xs text-[#E9D5FF]">
            <FiUsers className="h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0 truncate">
              <b className="font-semibold">{guestCount} guests</b> booked for{" "}
              {selectedEvent?.title}
            </span>
          </div>
        )}
      </section>

      {/* 2. Scan or pick from the list */}
      {ready ? (
        <>
          <div className="mt-4 flex rounded-full border border-white/10 bg-[#121426] p-1">
            {(
              [
                ["scan", "Scan ticket", LuScanLine],
                ["list", "Guest list", FiList],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => {
                  setMode(key);
                  setResult(null);
                }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-sm font-medium transition ${
                  mode === key
                    ? "bg-[#A020F0] text-white"
                    : "text-[#A5A8C3] hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          {/* Verdict sits right under the switch so it's seen at once */}
          {result && (
            <ScanVerdictCard
              result={result}
              count={count}
              busy={busy}
              nextLabel={mode === "scan" ? "Scan next ticket" : "Done"}
              onCountChange={setCount}
              onCheckIn={() => void handleCheckIn()}
              onNext={() => setResult(null)}
            />
          )}

          {mode === "scan" ? (
            <section className="mx-auto mt-4 w-full max-w-sm">
              <QrScanner
                onScan={(raw) => void handleScan(raw)}
                paused={busy || !!result}
              />
              <p className="mt-2 text-center text-xs text-[#777B98]">
                Point the camera at the QR code on the guest&apos;s ticket.
              </p>
            </section>
          ) : (
            <section className="mt-4">
              <div className="relative">
                <FiSearch className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#777B98]" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email or phone"
                  className="w-full rounded-full border border-white/10 bg-[#121426] py-2.5 pr-4 pl-10 text-sm text-white placeholder-[#777B98] focus:border-[#A020F0] focus:outline-none"
                />
              </div>
              {filteredGuests.length === 0 ? (
                <p className="mt-4 text-center text-sm text-[#777B98]">
                  {search
                    ? "No guest matches that."
                    : "No guests for this date."}
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/10 bg-[#121426]">
                  {filteredGuests.map((b) => {
                    const name = b.user_name ?? "Guest";
                    return (
                      <li
                        key={b.id}
                        className="flex items-center gap-3 px-3 py-2.5"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#A020F0]/15 text-xs font-semibold text-[#D8B4FE]">
                          {name.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-white">
                            {name}
                          </span>
                          <span className="block truncate text-xs text-[#777B98]">
                            {b.quantity} ticket{b.quantity === 1 ? "" : "s"}
                            {b.user_phone ? ` · ${b.user_phone}` : ""}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => void verify(b.id)}
                          disabled={busy}
                          className="shrink-0 rounded-full bg-[#A020F0] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#8A1AD0] disabled:opacity-50"
                        >
                          Check in
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </>
      ) : (
        <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-10 text-center">
          <LuScanLine className="h-7 w-7 text-white/30" aria-hidden />
          <p className="max-w-xs text-sm text-[#A5A8C3]">
            Choose the event and date you&apos;re letting people in for.
          </p>
        </div>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */

function ScanVerdictCard({
  result,
  count,
  busy,
  nextLabel,
  onCountChange,
  onCheckIn,
  onNext,
}: {
  result: ScanResultDTO;
  count: number;
  busy: boolean;
  nextLabel: string;
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
        bg: "bg-green-500/10",
        border: "border-green-500/30",
        text: "text-green-300",
        Icon: FiCheckCircle,
        iconColor: "text-green-400",
      }
    : spent
      ? {
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          text: "text-amber-300",
          Icon: FiAlertTriangle,
          iconColor: "text-amber-400",
        }
      : {
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          text: "text-red-300",
          Icon: FiXCircle,
          iconColor: "text-red-400",
        };

  const canCheckIn = admit && result.remaining > 0;

  return (
    <section
      className={`mt-4 rounded-2xl border p-4 ${tone.bg} ${tone.border}`}
    >
      <div className="flex items-start gap-3">
        <tone.Icon className={`mt-0.5 h-6 w-6 shrink-0 ${tone.iconColor}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${tone.text}`}>{result.message}</p>

          {result.guest_name && (
            <div className="mt-3 space-y-1 text-sm text-white/80">
              <p className="font-bold text-white">{result.guest_name}</p>
              {result.event_title && (
                <p className="text-xs font-medium text-[#A5A8C3]">
                  {result.event_title}
                </p>
              )}
              {result.occurrence_date && (
                <p className="text-xs font-medium text-[#A5A8C3]">
                  {formatIST(
                    result.occurrence_date,
                    "EEE, d MMM yyyy · hh:mm a",
                  )}
                </p>
              )}
              {result.quantity != null && (
                <p className="flex items-center gap-1.5 pt-1 text-xs font-bold text-white/80">
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
              <label className="flex flex-col gap-1 text-xs font-semibold text-[#A5A8C3]">
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
                  className="w-24 rounded-lg border border-white/15 bg-[#0D0F1E] px-3 py-2 text-sm font-bold text-white outline-none focus:border-[#A020F0]"
                />
              </label>
              <button
                type="button"
                onClick={onCheckIn}
                disabled={busy}
                className="rounded-full bg-[#A020F0] px-6 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#8A1AD0] disabled:opacity-50"
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
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-[#121426] py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.04] disabled:opacity-50"
      >
        <FiRefreshCw className="h-4 w-4" />
        {nextLabel}
      </button>
    </section>
  );
}
