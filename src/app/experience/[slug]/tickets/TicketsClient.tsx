"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "~/components/Navbar";
import WebsiteNav from "~/components/website/WebsiteNav";
import GoogleLogin from "~/components/GoogleLogin";
import MonthlyPassCard from "~/components/experience/MonthlyPassCard";
import BookingShell, {
  StickyAction,
  WHITE_PILL,
} from "~/components/experience/BookingShell";
import ExperienceSkeleton from "../loading";
import {
  useEvent,
  useEventAvailability,
  usePublicHostProfile,
} from "~/hooks/useApi";
import { isUnverifiedHost } from "~/lib/hostTier";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { formatIST, sameInstant } from "~/lib/datetime";
import type { EventDTO, OccurrenceAvailability } from "~/lib/api";
import { FiAlertTriangle, FiCalendar, FiMinus, FiPlus } from "react-icons/fi";

const rupees = (cents: number) =>
  `₹${(cents / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const SECTION_H = "font-outfit mb-4 text-lg font-semibold text-white";

const CANCELLATION: Record<string, string> = {
  flexible: "Free cancellation up to 24 hours before the experience.",
  moderate: "Free cancellation up to 5 days before the experience.",
  strict: "50% refund up to 1 week before the experience.",
  no_refund: "This experience is non-refundable once booked.",
};

/** White pill stepper with violet controls. */
function Stepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-full text-[#7B2FFF] transition hover:bg-[#7B2FFF]/10 disabled:text-[#080914]/25 disabled:hover:bg-transparent";
  return (
    <div className="flex h-11 shrink-0 items-center gap-1 rounded-full bg-white px-1">
      <button
        type="button"
        aria-label="Fewer tickets"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        className={btn}
      >
        <FiMinus className="h-4 w-4 stroke-[3]" />
      </button>
      <span className="min-w-6 text-center text-base font-semibold text-[#080914]">
        {value}
      </span>
      <button
        type="button"
        aria-label="More tickets"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={btn}
      >
        <FiPlus className="h-4 w-4 stroke-[3]" />
      </button>
    </div>
  );
}

/** Step one of checkout: session, ticket type and quantity. */
export default function TicketsClient({
  slug,
  initialEvent,
  initialDate,
}: {
  slug: string;
  initialEvent: EventDTO | null;
  /** Session picked on the event page, if any. */
  initialDate?: string;
}) {
  const router = useRouter();
  const { userId } = useStoredAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [showLogin, setShowLogin] = useState(false);

  const { data: fetchedEvent, isLoading } = useEvent(
    slug,
    initialEvent ? { success: true, data: initialEvent } : undefined,
  );
  const event = fetchedEvent ?? initialEvent ?? undefined;
  const { data: availability } = useEventAvailability(event?.id ?? null);
  const { data: host } = usePublicHostProfile(event?.host_id ?? null);

  const [selectedDate, setSelectedDate] = useState(
    initialDate ?? event?.time ?? "",
  );
  const [guests, setGuests] = useState(1);
  const priceTiers = event?.price_tiers ?? [];
  const hasTiers = priceTiers.length > 0;
  const [selectedTierId, setSelectedTierId] = useState(priceTiers[0]?.id ?? "");

  useEffect(() => {
    if (!selectedDate && event?.time) setSelectedDate(event.time);
    if (!selectedTierId && event?.price_tiers?.[0])
      setSelectedTierId(event.price_tiers[0].id);
  }, [event, selectedDate, selectedTierId]);

  // Snap onto a real, open occurrence once availability arrives.
  useEffect(() => {
    if (!availability || availability.length === 0) return;
    if (availability.some((a) => sameInstant(a.date, selectedDate))) return;
    const firstOpen = availability.find((a) => !a.is_fully_booked);
    setSelectedDate((firstOpen ?? availability[0]!).date);
  }, [availability, selectedDate]);

  const occurrence = availability?.find((a) =>
    sameInstant(a.date, selectedDate),
  );
  const spotsLeft = occurrence
    ? occurrence.remaining
    : (event?.capacity ?? 0) - (event?.total_bookings ?? 0);
  const maxGuests = Math.max(0, Math.min(spotsLeft, 10));

  useEffect(() => {
    if (maxGuests > 0 && guests > maxGuests) setGuests(maxGuests);
  }, [maxGuests, guests]);

  if (isLoading && !event) return <ExperienceSkeleton />;
  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#080914] text-white">
        <p className="mb-4 text-xl text-white/70">Experience not found</p>
        <Link href="/explore" className="text-[#B57BFF] hover:underline">
          Back to Explore
        </Link>
      </div>
    );
  }

  const appChrome = mounted && Boolean(userId);
  const isFree = event.is_free;
  const selectedTier = priceTiers.find((t) => t.id === selectedTierId);
  const unitPrice = hasTiers
    ? (selectedTier?.price_cents ?? 0)
    : (event.price_cents ?? 0);
  const eventHasPassed = selectedDate
    ? new Date(selectedDate) < new Date()
    : false;
  const sessions: OccurrenceAvailability[] =
    availability && availability.length > 0
      ? availability
      : selectedDate
        ? [
            {
              date: selectedDate,
              remaining: spotsLeft,
              is_fully_booked: spotsLeft <= 0,
            } as OccurrenceAvailability,
          ]
        : [];
  // The day is chosen on the event page; only a day with several slots
  // (one-on-one hosts) still needs a time picked here.
  const sameDaySlots = selectedDate
    ? sessions.filter(
        (o) =>
          formatIST(o.date, "yyyy-MM-dd") ===
          formatIST(selectedDate, "yyyy-MM-dd"),
      )
    : [];
  const canContinue = !!selectedDate && spotsLeft > 0 && !eventHasPassed;
  const endDate =
    selectedDate && event.duration_minutes
      ? new Date(
          new Date(selectedDate).getTime() + event.duration_minutes * 60_000,
        )
      : null;

  const proceed = () => {
    if (!userId) {
      setShowLogin(true);
      return;
    }
    const tierParam =
      hasTiers && selectedTierId
        ? `&tier=${encodeURIComponent(selectedTierId)}`
        : "";
    // Booking runs on the real event UUID, so carry that rather than the slug.
    router.push(
      `/experience/${event.id}/book?date=${encodeURIComponent(selectedDate)}&guests=${guests}${tierParam}`,
    );
  };

  const ticketRows = hasTiers
    ? priceTiers.map((t) => ({ id: t.id, name: t.name, cents: t.price_cents }))
    : [
        {
          id: "",
          name: isFree ? "Free entry" : "General admission",
          cents: event.price_cents ?? 0,
        },
      ];
  const soldOut = eventHasPassed || maxGuests === 0;

  return (
    <>
      {appChrome && <Navbar dark />}

      <main
        className={`min-h-screen bg-[#080914] font-[family-name:var(--font-inter)] text-white ${appChrome ? "" : ""}`}
      >
        {!appChrome && <WebsiteNav />}
        <BookingShell
          poster={event.cover_image_url ?? event.gallery_urls?.[0]}
          title={event.title}
          backHref={`/experience/${slug}`}
          step={1}
        >
          {/* Chosen session (picked on the event page) */}
          {selectedDate && (
            <section className="flex items-center gap-3 rounded-2xl bg-white/[0.06] px-4 py-3.5">
              <FiCalendar className="h-5 w-5 shrink-0 text-[#D8B4FE]" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-white">
                  {formatIST(selectedDate, "EEEE, d MMMM")}
                </p>
                <p className="text-sm text-white/55">
                  {formatIST(selectedDate, "h:mm a")}
                  {endDate && ` – ${formatIST(endDate, "h:mm a")}`}
                </p>
              </div>
              <Link
                href={`/experience/${slug}`}
                className="shrink-0 text-sm font-semibold text-[#D8B4FE] transition hover:text-white"
              >
                Change
              </Link>
            </section>
          )}
          {sameDaySlots.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {sameDaySlots.map((occ) => {
                const on = sameInstant(selectedDate, occ.date);
                return (
                  <button
                    key={occ.date}
                    type="button"
                    onClick={() => setSelectedDate(occ.date)}
                    disabled={occ.is_fully_booked}
                    className={`h-10 rounded-full px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${
                      on
                        ? "bg-white text-[#080914]"
                        : "bg-white/[0.07] text-white hover:bg-white/[0.12]"
                    }`}
                  >
                    {formatIST(occ.date, "h:mm a")}
                  </button>
                );
              })}
            </div>
          )}

          {/* Tickets */}
          <section className="mt-10">
            <h2 className={SECTION_H}>Tickets</h2>
            <div className="divide-y divide-white/10 border-y border-white/10">
              {ticketRows.map((row) => {
                const on = !hasTiers || row.id === selectedTierId;
                return (
                  <div
                    key={row.id || "single"}
                    className={`flex items-center justify-between gap-4 py-6 ${soldOut ? "opacity-45" : ""}`}
                  >
                    <div className="min-w-0">
                      <p className="font-outfit text-lg font-semibold text-white">
                        {row.name}
                      </p>
                      <p className="mt-1 text-[15px] text-white/65">
                        {isFree || row.cents === 0 ? "Free" : rupees(row.cents)}
                      </p>
                    </div>
                    {soldOut ? (
                      <span className="text-sm font-semibold text-white/70">
                        {eventHasPassed ? "Closed" : "Sold out"}
                      </span>
                    ) : on ? (
                      <Stepper
                        value={guests}
                        max={maxGuests}
                        onChange={setGuests}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTierId(row.id);
                          setGuests(1);
                        }}
                        className="h-11 shrink-0 rounded-full border border-white/40 px-6 text-[15px] font-semibold text-white transition hover:bg-white/10"
                      >
                        Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {event.capacity > 1 && !soldOut && spotsLeft <= 10 && (
              <p className="mt-3 text-sm text-[#D8B4FE]">
                Only {spotsLeft} slot{spotsLeft === 1 ? "" : "s"} left
              </p>
            )}
          </section>

          {event.monthly_pass_price_cents ? (
            <section className="mt-10">
              <h2 className={SECTION_H}>Coming every week?</h2>
              <MonthlyPassCard
                eventId={event.id}
                priceCents={event.monthly_pass_price_cents}
                sessionLimit={event.monthly_pass_session_limit ?? null}
                singleSessionPriceCents={event.price_cents}
                availability={availability}
                onRequireLogin={() => setShowLogin(true)}
              />
            </section>
          ) : null}

          {isUnverifiedHost(host) && (
            <section className="mt-8 flex gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.08] p-4">
              <FiAlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div className="text-sm leading-6 text-amber-100/85">
                <p className="font-semibold text-amber-200">
                  This is a community event
                </p>
                <p>
                  The host hasn&apos;t been verified by MySlotMate, so we
                  can&apos;t vouch for it. Never pay or share bank details
                  outside the app, and report the event if anything feels off.
                </p>
              </div>
            </section>
          )}

          <p className="mt-8 text-[13px] leading-5 text-white/50">
            {CANCELLATION[event.cancellation_policy ?? ""] ??
              "Standard cancellation policy applies."}
          </p>

          <StickyAction>
            <button
              type="button"
              onClick={proceed}
              disabled={!canContinue}
              className={WHITE_PILL}
            >
              {eventHasPassed
                ? "This event has passed"
                : spotsLeft <= 0
                  ? "Fully booked"
                  : isFree || unitPrice === 0
                    ? `Continue · ${guests} ticket${guests === 1 ? "" : "s"}`
                    : `Continue · ${rupees(unitPrice * guests)}`}
            </button>
          </StickyAction>
        </BookingShell>
      </main>

      <GoogleLogin open={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
}
