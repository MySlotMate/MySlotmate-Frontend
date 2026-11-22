"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { useEventsByHost, useMyHost } from "~/hooks/useApi";
import { useIdToken } from "~/hooks/useIdToken";
import * as api from "~/lib/api";
import type { BookingDTO, AttendeeProfileDTO, EventDTO } from "~/lib/api";
import { ATTENDEE_FIELDS } from "~/lib/attendeeFields";
import { formatIST } from "~/lib/datetime";
import { nextEventDate } from "~/lib/boost";
import { isToday } from "date-fns";
import {
  FiChevronDown,
  FiDownload,
  FiExternalLink,
  FiSearch,
} from "react-icons/fi";
import { LuLoader2 } from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";
import { downloadTicketPdf, sendTicketPdfNotification } from "~/lib/ticket";
import { exportBookingsToExcel } from "~/lib/excelExport";
import EventCover from "~/components/EventCover";

// A guest who cancelled after the refund cutoff keeps a `confirmed` row with
// cancelled_at set: the seat is released (not a guest any more) but the money
// stays with the host (still a sale).
const keepsMoney = (b: BookingDTO) =>
  b.status === "confirmed" || b.status === "pending";
const isActive = (b: BookingDTO) => keepsMoney(b) && !b.cancelled_at;
const guestsOf = (list: BookingDTO[]) =>
  list.filter(isActive).reduce((s, b) => s + b.quantity, 0);
const salesOf = (list: BookingDTO[]) =>
  list.filter(keepsMoney).reduce((s, b) => s + (b.amount_cents ?? 0), 0);
const rupees = (cents: number) =>
  `₹${(cents / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

interface Group {
  event: EventDTO;
  bookings: BookingDTO[];
  /** Monthly passes sold on this event (not refunded), and what they took. */
  passCount: number;
  passSalesCents: number;
  /** Next upcoming date, or null once every date has passed. */
  next: Date | null;
}

/**
 * Host bookings, one row per event. A row shows the headline numbers (guests,
 * spots, sales); open it to see each guest. Upcoming and past events sit on
 * separate tabs so the page stays short.
 */
export default function HostBookingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    setUserId(localStorage.getItem("msm_user_id"));
  }, []);

  const { data: host } = useMyHost(userId);
  const { data: allEvents, isLoading: eventsLoading } = useEventsByHost(
    host?.id ?? null,
  );
  const events = useMemo(
    () => (allEvents ?? []).filter((e) => e.status !== "draft"),
    [allEvents],
  );

  // Attendees for every event, in parallel. React Query caches each list.
  const attendeesQueries = useQueries({
    queries: events.map((event) => ({
      queryKey: ["eventAttendees", event.id],
      queryFn: () => api.getEventAttendees(event.id),
      staleTime: 60 * 1000,
      select: (res: { data: BookingDTO[] }) => res.data ?? [],
    })),
  });

  // Monthly passes are paid once, up front, so their money never shows on a
  // booking row; read them separately so Sales tells the whole story.
  const idToken = useIdToken();
  const passQueries = useQueries({
    queries: events.map((event) => ({
      queryKey: ["passHolders", event.id, idToken],
      queryFn: () => api.listPassHolders(event.id, idToken!),
      enabled: !!idToken,
      staleTime: 60 * 1000,
      select: (res: { data: api.PassHolderDTO[] | null }) => res.data ?? [],
    })),
  });

  const isLoading = eventsLoading || attendeesQueries.some((q) => q.isLoading);

  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [search, setSearch] = useState("");

  const { upcoming, past } = useMemo(() => {
    const groups: Group[] = events.map((event, idx) => ({
      event,
      bookings: attendeesQueries[idx]?.data ?? [],
      passCount: passQueries[idx]?.data?.length ?? 0,
      passSalesCents: (passQueries[idx]?.data ?? []).reduce(
        (s, p) => s + p.price_cents,
        0,
      ),
      // Today's session stays under Upcoming until the day is over.
      next:
        nextEventDate(event) ??
        (isToday(new Date(event.time)) ? new Date(event.time) : null),
    }));
    const up = groups
      .filter((g) => g.next)
      .sort((a, b) => a.next!.getTime() - b.next!.getTime());
    const done = groups
      .filter((g) => !g.next)
      .sort(
        (a, b) =>
          new Date(b.event.time).getTime() - new Date(a.event.time).getTime(),
      );
    return { upcoming: up, past: done };
  }, [events, attendeesQueries, passQueries]);

  const stats = useMemo(() => {
    const all = [...upcoming, ...past].flatMap((g) => g.bookings);
    return {
      upcomingGuests: upcoming.reduce((s, g) => s + guestsOf(g.bookings), 0),
      bookings: all.filter(isActive).length,
      sales:
        salesOf(all) +
        [...upcoming, ...past].reduce((s, g) => s + g.passSalesCents, 0),
    };
  }, [upcoming, past]);

  const shown = useMemo(() => {
    const list = tab === "upcoming" ? upcoming : past;
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (g) =>
        g.event.title.toLowerCase().includes(q) ||
        g.bookings.some((b) =>
          [b.user_name, b.user_email, b.user_phone].some((v) =>
            v?.toLowerCase().includes(q),
          ),
        ),
    );
  }, [tab, upcoming, past, search]);

  return (
    <div className="min-h-screen bg-[#080914]">
      <main className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:px-6 md:py-10">
        <h1 className="font-outfit text-[26px] leading-tight font-semibold tracking-[-0.01em] text-white sm:text-[32px]">
          Bookings
        </h1>
        <p className="mt-1 text-sm text-[#A5A8C3]">
          Who&apos;s booked each of your events. Open an event to see its
          guests.
        </p>

        {/* Three numbers, no more */}
        <dl className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: "Upcoming guests", value: stats.upcomingGuests },
            { label: "Bookings", value: stats.bookings },
            { label: "Sales", value: rupees(stats.sales) },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/10 bg-[#121426] px-3 py-3 sm:px-4"
            >
              <dt className="text-[11px] text-[#777B98] sm:text-xs">
                {s.label}
              </dt>
              <dd className="mt-0.5 text-lg font-semibold text-white sm:text-xl">
                {isLoading ? "…" : s.value}
              </dd>
            </div>
          ))}
        </dl>

        {/* Tabs + search */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-full border border-white/10 bg-[#121426] p-1">
            {(
              [
                ["upcoming", "Upcoming", upcoming.length],
                ["past", "Past", past.length],
              ] as const
            ).map(([key, label, n]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition sm:flex-none ${
                  tab === key
                    ? "bg-[#A020F0] text-white"
                    : "text-[#A5A8C3] hover:text-white"
                }`}
              >
                {label}
                <span className="ml-1.5 text-xs opacity-70">{n}</span>
              </button>
            ))}
          </div>
          <div className="relative sm:w-72">
            <FiSearch className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#777B98]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search event or guest"
              className="w-full rounded-full border border-white/10 bg-[#121426] py-2 pr-4 pl-10 text-sm text-white placeholder-[#777B98] focus:border-[#A020F0] focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <LuLoader2 className="h-7 w-7 animate-spin text-[#D8B4FE]" />
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#121426] p-10 text-center text-sm text-[#A5A8C3]">
              No published events yet.{" "}
              <Link
                href="/host-dashboard/experiences/new"
                className="font-semibold text-[#D8B4FE] hover:underline"
              >
                Create one
              </Link>
            </div>
          ) : shown.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 bg-[#121426] p-8 text-center text-sm text-[#777B98]">
              {search
                ? "Nothing matches that search."
                : tab === "upcoming"
                  ? "No upcoming events."
                  : "No past events yet."}
            </p>
          ) : (
            <ul className="space-y-2">
              {shown.map((g, i) => (
                <EventGroup
                  key={g.event.id}
                  group={g}
                  defaultOpen={i === 0 && tab === "upcoming" && !search}
                  forceOpen={!!search}
                />
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function EventGroup({
  group: { event, bookings, next, passCount, passSalesCents },
  defaultOpen,
  forceOpen,
}: {
  group: Group;
  defaultOpen: boolean;
  forceOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [showCancelled, setShowCancelled] = useState(false);
  const [exporting, setExporting] = useState(false);
  const expanded = open || forceOpen;

  const active = bookings.filter(isActive);
  const cancelled = bookings.filter((b) => !isActive(b));
  const guests = guestsOf(bookings);
  const sales = salesOf(bookings) + passSalesCents;
  const capacity = event.capacity || 0;
  // Several dates: show each guest's date on their row.
  const multiDate = new Set(bookings.map((b) => b.occurrence_date)).size > 1;
  const when = next ?? new Date(event.time);

  return (
    <li className="overflow-hidden rounded-2xl border border-white/10 bg-[#121426]">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-white/[0.03]"
      >
        <EventCover
          src={event.cover_image_url}
          seed={event.id}
          mood={event.mood}
          iconSize="sm"
          blurFill
          className="aspect-[4/5] w-11 shrink-0 rounded-lg"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">
            {event.title}
          </span>
          <span className="mt-0.5 block text-xs text-[#A5A8C3]">
            {next ? "Next: " : ""}
            {formatIST(when.toISOString(), "EEE, d MMM · h:mm a")}
          </span>
        </span>
        <span className="hidden w-32 shrink-0 sm:block">
          <span className="flex justify-between text-xs">
            <span className="font-semibold text-white">{guests} guests</span>
            {capacity > 0 && (
              <span className="text-[#777B98]">/{capacity}</span>
            )}
          </span>
          {capacity > 0 && (
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full rounded-full bg-[#A020F0]"
                style={{
                  width: `${Math.min(100, (guests / capacity) * 100)}%`,
                }}
              />
            </span>
          )}
        </span>
        <span className="w-16 shrink-0 text-right">
          <span className="block text-sm font-semibold text-white">
            {rupees(sales)}
          </span>
          <span className="block text-[11px] text-[#777B98] sm:hidden">
            {guests} guests
          </span>
        </span>
        <FiChevronDown
          className={`h-4 w-4 shrink-0 text-[#777B98] transition ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {expanded && (
        <div className="border-t border-white/10">
          <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
            <span className="mr-auto text-xs text-[#777B98]">
              {active.length} booking{active.length === 1 ? "" : "s"}
              {passCount > 0 &&
                ` · ${passCount} monthly pass${passCount === 1 ? "" : "es"} sold (${rupees(passSalesCents)})`}
            </span>
            <button
              type="button"
              onClick={() =>
                void exportBookingsToExcel(event.title, bookings, setExporting)
              }
              disabled={exporting || bookings.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/[0.06] disabled:opacity-40"
            >
              {exporting ? (
                <LuLoader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FiDownload className="h-3.5 w-3.5" />
              )}
              Excel
            </button>
            <Link
              href={`/host-dashboard/experiences/${event.id}?tab=bookings`}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/[0.06]"
            >
              <FiExternalLink className="h-3.5 w-3.5" />
              Open event
            </Link>
          </div>

          {active.length === 0 ? (
            <p className="px-3 pb-4 text-center text-xs text-[#777B98]">
              No bookings yet.
            </p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {active.map((b) => (
                <BookingRow
                  key={b.id}
                  booking={b}
                  event={event}
                  showDate={multiDate}
                />
              ))}
            </ul>
          )}

          {cancelled.length > 0 && (
            <div className="border-t border-white/[0.06]">
              <button
                onClick={() => setShowCancelled((s) => !s)}
                className="w-full px-3 py-2.5 text-left text-xs font-medium text-[#777B98] hover:text-white"
              >
                {showCancelled ? "Hide" : "Show"} {cancelled.length} cancelled
                or refunded
              </button>
              {showCancelled && (
                <ul className="divide-y divide-white/[0.06] opacity-70">
                  {cancelled.map((b) => (
                    <BookingRow
                      key={b.id}
                      booking={b}
                      event={event}
                      showDate={multiDate}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/** Renders the guest's submitted attendee details, if any. */
function AttendeeDetails({ profile }: { profile: AttendeeProfileDTO }) {
  const rows: { key: string; label: string; value: string }[] = [];
  const values = profile as unknown as Record<
    string,
    string | number | boolean | null
  >;
  for (const f of ATTENDEE_FIELDS) {
    const raw = values[f.key];
    if (raw === null || raw === undefined || raw === "") continue;
    const display = f.key === "travel" ? (raw ? "Yes" : "No") : String(raw);
    rows.push({ key: f.key, label: f.label, value: display });
  }

  if (rows.length === 0) {
    return (
      <p className="px-4 pb-3 text-xs text-[#777B98]">
        No attendee details submitted.
      </p>
    );
  }

  return (
    <div className="grid gap-x-6 gap-y-2 px-4 pb-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.key} className="flex items-start justify-between gap-3">
          <span className="text-xs text-[#A5A8C3]">{row.label}</span>
          {row.key === "govt_id_url" ? (
            <a
              href={row.value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-[#D8B4FE] hover:underline"
            >
              View ID
            </a>
          ) : (
            <span className="text-right text-xs font-medium text-white">
              {row.value}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

const STATUS_PILL: Record<BookingDTO["status"], string> = {
  confirmed: "bg-green-500/15 text-green-300",
  pending: "bg-yellow-500/15 text-yellow-300",
  cancelled: "bg-red-500/15 text-red-300",
  refunded: "bg-orange-500/15 text-orange-300",
};

function BookingRow({
  booking,
  event,
  showDate,
}: {
  booking: BookingDTO;
  event: EventDTO;
  showDate: boolean;
}) {
  const name = booking.user_name ?? "Guest";
  const [showDetails, setShowDetails] = useState(false);
  const [downloadingTicket, setDownloadingTicket] = useState(false);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  // The list isn't refetched after a send, so remember it locally too.
  const [whatsappSent, setWhatsappSent] = useState<boolean>(
    booking.notification_sent_whatsapp === true,
  );
  const guestPhone = booking.user_phone ?? "";
  const contact = booking.user_email ?? booking.user_phone;

  const handleSendWhatsapp = async () => {
    if (!guestPhone) return;
    setSendingWhatsapp(true);
    try {
      const res = await sendTicketPdfNotification(
        booking,
        event,
        { name: booking.user_name, email: booking.user_email },
        guestPhone,
      );
      if (res.ok) {
        setWhatsappSent(true);
        toast.success(`Ticket sent to ${booking.user_name ?? "the guest"}.`);
      } else {
        toast.error(res.reason ?? "Could not send the ticket.");
      }
    } finally {
      setSendingWhatsapp(false);
    }
  };

  const iconBtn =
    "flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-[#A5A8C3] transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40";

  return (
    <li>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setShowDetails((s) => !s)}
          aria-expanded={showDetails}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {booking.user_avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={booking.user_avatar_url}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#A020F0]/15 text-xs font-semibold text-[#D8B4FE]">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-white">
              {name}
              <span className="ml-1.5 text-xs font-normal text-[#777B98]">
                ×{booking.quantity}
              </span>
            </span>
            <span className="block truncate text-xs text-[#777B98]">
              {showDate
                ? formatIST(booking.occurrence_date, "d MMM, h:mm a")
                : (contact ?? "No contact details")}
            </span>
          </span>
        </button>
        <span
          className={`hidden rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize sm:inline ${STATUS_PILL[booking.cancelled_at ? "cancelled" : booking.status]}`}
        >
          {booking.cancelled_at && booking.status === "confirmed"
            ? "cancelled late"
            : booking.status}
        </span>
        {booking.pass_id ? (
          // A pass seat; with a pricier ticket the guest also paid the
          // difference, which is shown so the host's totals add up.
          <span className="min-w-14 text-right text-xs font-semibold whitespace-nowrap text-[#D8B4FE]">
            {booking.amount_cents
              ? `Pass +${rupees(booking.amount_cents)}`
              : "Pass"}
          </span>
        ) : booking.amount_cents !== null ? (
          <span className="w-14 text-right text-xs text-white/80">
            {rupees(booking.amount_cents)}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => void handleSendWhatsapp()}
          disabled={sendingWhatsapp || !guestPhone}
          className={iconBtn}
          aria-label={
            guestPhone
              ? `Send ticket to ${name} on WhatsApp`
              : "No phone number on this booking"
          }
          title={
            guestPhone
              ? whatsappSent
                ? "Ticket sent on WhatsApp. Send again"
                : "Send ticket on WhatsApp"
              : "No phone number on this booking"
          }
        >
          {sendingWhatsapp ? (
            <LuLoader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FaWhatsapp
              className={`h-3.5 w-3.5 ${whatsappSent ? "text-emerald-300" : ""}`}
            />
          )}
        </button>
        <button
          type="button"
          onClick={() =>
            void downloadTicketPdf(
              booking,
              event,
              { name: booking.user_name, email: booking.user_email },
              setDownloadingTicket,
            )
          }
          disabled={downloadingTicket}
          className={iconBtn}
          aria-label={`Download ${name}'s ticket`}
          title="Download ticket PDF"
        >
          {downloadingTicket ? (
            <LuLoader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FiDownload className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      {showDetails && (
        <div className="mx-3 mb-3 rounded-xl bg-white/[0.03] pt-3">
          <dl className="grid gap-x-6 gap-y-2 px-4 pb-3 sm:grid-cols-2">
            {[
              [
                "Status",
                booking.cancelled_at && booking.status === "confirmed"
                  ? "Cancelled after the refund cutoff (no refund)"
                  : booking.status,
              ],
              ["Email", booking.user_email],
              ["Phone", booking.user_phone],
              [
                "Date",
                formatIST(booking.occurrence_date, "EEE, d MMM · h:mm a"),
              ],
              ["Booked on", formatIST(booking.created_at, "d MMM yyyy")],
              [
                "How",
                booking.pass_id
                  ? "Monthly pass"
                  : booking.source === "walk_in"
                    ? "On the spot"
                    : booking.source === "bulk_import"
                      ? "Excel import"
                      : "Online",
              ],
            ]
              .filter(([, v]) => !!v)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-xs text-[#A5A8C3]">{k}</dt>
                  <dd className="text-right text-xs font-medium text-white capitalize">
                    {v}
                  </dd>
                </div>
              ))}
          </dl>
          {booking.attendee_profile && (
            <div className="border-t border-white/10 pt-3">
              <AttendeeDetails profile={booking.attendee_profile} />
            </div>
          )}
        </div>
      )}
    </li>
  );
}
