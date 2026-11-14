"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "~/components/Navbar";
import { RichTextView } from "~/components/RichTextView";
import ExperienceSkeleton from "./loading";
import Footer from "~/components/home/Footer";
import {
  useEvent,
  usePublicHostProfile,
  useReviewsByEvent,
  useEventRating,
  useIsExperienceSaved,
  useSaveExperience,
  useUnsaveExperience,
  useEventAvailability,
} from "~/hooks/useApi";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import MonthlyPassCard from "~/components/experience/MonthlyPassCard";
import {
  FiArrowLeft,
  FiCalendar,
  FiChevronDown,
  FiClock,
  FiGrid,
  FiHeart,
  FiMapPin,
  FiMinus,
  FiPlus,
  FiShare,
  FiStar,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { LuBadgeCheck, LuLock } from "react-icons/lu";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatIST, sameInstant } from "~/lib/datetime";
import { getMoodDisplayLabel } from "~/lib/moods";
import SessionSlotPicker from "~/components/experience/SessionSlotPicker";
import type {
  EventDTO,
  OccurrenceAvailability,
  PriceTierDTO,
  PublicHostProfileDTO,
} from "~/lib/api";
import GoogleLogin from "~/components/GoogleLogin";

export const runtime = "edge";

// Sizes follow the Figma "Experience detail" frames (Desktop 1440 → Mobile 390).
const CARD = "rounded-[20px] border border-white/[0.06] bg-[#131328]";
const GRADIENT_BTN =
  "bg-gradient-to-r from-[#7038F5] to-[#B724EA] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100";
const DIVIDER = "border-t border-[#9B30FF]/25";
const SELECT =
  "w-full appearance-none rounded-xl border border-white/10 bg-[#121426] px-3.5 py-2.5 pr-10 text-sm font-medium text-white outline-none focus:border-[#9B30FF]";

const rupees = (cents: number) => `₹${(cents / 100).toFixed(0)}`;

const formatDuration = (mins: number) => {
  if (mins < 60) return `${mins} mins`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest > 0
    ? `${hours}h ${rest}m`
    : `${hours} Hour${hours > 1 ? "s" : ""}`;
};

/* ------------------------------------------------------------------ */
/*  Hero gallery                                                       */
/* ------------------------------------------------------------------ */
function Hero({
  images,
  title,
  saved,
  onSave,
  onShare,
  onBack,
  onShowAll,
}: {
  images: string[];
  title: string;
  saved: boolean;
  onSave: () => void;
  onShare: () => void;
  onBack: () => void;
  onShowAll: () => void;
}) {
  const [index, setIndex] = useState(0);
  const src = images[index];
  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60";

  return (
    <div className="group relative h-[260px] w-full overflow-hidden bg-[#131328] md:h-[300px] md:rounded-[20px] lg:h-[380px]">
      {src ? (
        <>
          {/* Uploaded flyers vary in ratio, so a blurred copy fills the frame
              and the foreground is uncropped. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={title}
            fetchPriority="high"
            className="relative block h-full w-full object-contain"
          />
        </>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-white/40">
          No photos available
        </div>
      )}

      <button
        type="button"
        onClick={onBack}
        aria-label="Go back"
        className={`absolute top-4 left-4 md:hidden ${iconBtn}`}
      >
        <FiArrowLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onSave}
        aria-label={saved ? "Remove from saved" : "Save experience"}
        className={`absolute top-4 right-4 ${iconBtn}`}
      >
        <FiHeart
          className={`h-4 w-4 ${saved ? "fill-[#E040FB] text-[#E040FB]" : ""}`}
        />
      </button>
      <button
        type="button"
        onClick={onShare}
        aria-label="Copy link"
        className={`absolute right-4 bottom-4 ${iconBtn}`}
      >
        <FiShare className="h-4 w-4" />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() =>
              setIndex((i) => (i === 0 ? images.length - 1 : i - 1))
            }
            aria-label="Previous image"
            className={`absolute top-1/2 left-4 -translate-y-1/2 opacity-0 transition group-hover:opacity-100 max-md:hidden ${iconBtn}`}
          >
            <FiArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setIndex((i) => (i === images.length - 1 ? 0 : i + 1))
            }
            aria-label="Next image"
            className={`absolute top-1/2 right-4 -translate-y-1/2 opacity-0 transition group-hover:opacity-100 max-md:hidden ${iconBtn}`}
          >
            <FiArrowLeft className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            onClick={onShowAll}
            className="absolute bottom-4 left-4 flex h-9 items-center gap-2 rounded-full bg-black/40 px-3.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-black/60"
          >
            <FiGrid className="h-3.5 w-3.5" />
            {index + 1} / {images.length}
          </button>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Details rows (date, time, place, spots)                            */
/* ------------------------------------------------------------------ */
function DetailRows({
  date,
  durationMinutes,
  place,
  spotsLeft,
  capacity,
}: {
  date: string | null;
  durationMinutes: number | null;
  place: string;
  spotsLeft: number;
  capacity: number;
}) {
  const end =
    date && durationMinutes
      ? new Date(new Date(date).getTime() + durationMinutes * 60_000)
      : null;
  const row = "flex items-start gap-2.5 text-[13px] leading-5 text-white/70";
  const icon = "mt-0.5 h-4 w-4 shrink-0 text-white/50";

  return (
    <ul className="flex flex-col gap-2.5">
      {date && (
        <li className={row}>
          <FiCalendar className={icon} />
          {formatIST(date, "EEEE, MMM d, yyyy")}
        </li>
      )}
      {date && (
        <li className={row}>
          <FiClock className={icon} />
          {formatIST(date, "h:mm a")}
          {end && ` - ${formatIST(end, "h:mm a")}`}
          {durationMinutes ? ` (${formatDuration(durationMinutes)})` : ""}
        </li>
      )}
      <li className={row}>
        <FiMapPin className={icon} />
        {place}
      </li>
      {capacity > 1 && (
        <li className={row}>
          <FiUsers className={icon} />
          {spotsLeft > 0
            ? `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left of ${capacity} total`
            : "Fully booked"}
        </li>
      )}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/*  Booking widget                                                     */
/* ------------------------------------------------------------------ */
function BookingWidget({
  price,
  isFree,
  priceTiers,
  eventDate,
  capacity,
  totalBookings,
  durationMinutes,
  place,
  availability,
  isRecurring,
  isOneOnOne,
  cancellationPolicy,
  onBook,
  passSlot,
}: {
  price: number | null;
  isFree: boolean;
  priceTiers: PriceTierDTO[];
  eventDate: string;
  capacity: number;
  totalBookings: number;
  durationMinutes: number | null;
  place: string;
  availability?: OccurrenceAvailability[];
  isRecurring: boolean;
  /** One-on-one events get the day/time picker instead of the flat slot row. */
  isOneOnOne: boolean;
  cancellationPolicy: string | null;
  onBook: (date: string, guests: number, tierId?: string) => void;
  /** Monthly pass card — under the desktop card, at the top of the drawer. */
  passSlot?: React.ReactNode;
}) {
  const [selectedDate, setSelectedDate] = useState(eventDate);
  const [guests, setGuests] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Ticket tiers: when present, the guest must pick one and its price drives the
  // total. Falls back to the single `price` when the event has no tiers.
  const hasTiers = priceTiers.length > 0;
  const [selectedTierId, setSelectedTierId] = useState(priceTiers[0]?.id ?? "");
  const selectedTier = priceTiers.find((t) => t.id === selectedTierId);
  const effectivePrice = hasTiers
    ? (selectedTier?.price_cents ?? 0)
    : (price ?? 0);
  // For tiered events the headline price is a "From ₹<cheapest>" — a single
  // "/person" figure would misrepresent a multi-tier event.
  const minTierCents = hasTiers
    ? Math.min(...priceTiers.map((t) => t.price_cents))
    : 0;

  // Find the selected occurrence availability. The event's own `time` and the
  // availability dates are serialised independently, so match on the instant —
  // string equality misses slots that are in fact the same moment.
  const currentOccurrence = availability?.find((a) =>
    sameInstant(a.date, selectedDate),
  );
  const spotsLeft = currentOccurrence
    ? currentOccurrence.remaining
    : capacity - totalBookings;

  const maxGuests = Math.max(0, Math.min(spotsLeft, 10));
  const guestOptions = Array.from({ length: maxGuests }, (_, i) => i + 1);

  const eventHasPassed = selectedDate
    ? new Date(selectedDate) < new Date()
    : false;

  // `selectedDate` starts as the event's own time, which for a multi-slot event
  // is just the first slot and may not be bookable (or may be spelled
  // differently to the availability rows). Snap it onto a real, open occurrence
  // as soon as we have one — otherwise spotsLeft falls back to a whole-event
  // count and the guest can end up with no bookable quantity at all.
  useEffect(() => {
    if (!availability || availability.length === 0) return;
    if (availability.some((a) => sameInstant(a.date, selectedDate))) return;
    const firstOpen = availability.find((a) => !a.is_fully_booked);
    setSelectedDate((firstOpen ?? availability[0]!).date);
  }, [availability, selectedDate]);

  useEffect(() => {
    if (guestOptions.length === 0) return;
    if (!guestOptions.includes(guests)) {
      setGuests(guestOptions[0] ?? 1);
    }
  }, [guestOptions, guests]);

  const sessionDates =
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
  const showSessions =
    isRecurring || (availability ? availability.length > 1 : false);

  const cancellationCopy =
    cancellationPolicy === "flexible"
      ? "Free cancellation up to 24 hours before the experience."
      : cancellationPolicy === "moderate"
        ? "Free cancellation up to 5 days before the experience."
        : cancellationPolicy === "strict"
          ? "50% refund up to 1 week before the experience."
          : cancellationPolicy === "no_refund"
            ? "This experience is non-refundable once booked."
            : "Standard cancellation policy applies.";

  const book = () => {
    setDrawerOpen(false);
    onBook(selectedDate, guests, hasTiers ? selectedTierId : undefined);
  };
  const bookDisabled = !selectedDate || spotsLeft <= 0;
  const bookLabel = spotsLeft <= 0 ? "Fully Booked" : "Book Now";

  const priceBlock = (
    <div>
      <p className="text-[10px] font-medium tracking-wider text-white/50 uppercase">
        Total price
      </p>
      <p className="font-outfit mt-0.5 text-2xl leading-7 font-bold text-white">
        {isFree ? (
          "Free"
        ) : hasTiers && !selectedTier ? (
          <>
            <span className="text-xs font-medium text-white/60">From </span>
            {rupees(minTierCents)}
          </>
        ) : (
          <>
            {rupees(effectivePrice * guests)}
            <span className="ml-1 text-xs font-normal text-white/60">
              {guests > 1 ? `for ${guests}` : "/ person"}
            </span>
          </>
        )}
      </p>
    </div>
  );

  const sessionPicker = showSessions ? (
    <div>
      <h3 className="mb-2 text-[13px] font-semibold text-white">
        Choose your session
      </h3>
      {isOneOnOne ? (
        <SessionSlotPicker
          sessions={sessionDates}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
        />
      ) : sessionDates.length > 0 ? (
        <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {sessionDates.map((occ) => {
            const isSelected = sameInstant(selectedDate, occ.date);
            return (
              <button
                key={occ.date}
                type="button"
                onClick={() => setSelectedDate(occ.date)}
                disabled={occ.is_fully_booked}
                className={`flex min-w-[92px] shrink-0 flex-col items-start rounded-xl border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                  isSelected
                    ? "border-transparent bg-gradient-to-br from-[#7038F5] to-[#B724EA] text-white"
                    : "border-white/10 bg-[#121426] text-white hover:border-[#9B30FF]/60"
                }`}
              >
                <span className="text-[13px] font-semibold">
                  {formatIST(occ.date, "eee d MMM")}
                </span>
                <span
                  className={`text-xs ${isSelected ? "text-white/85" : "text-white/55"}`}
                >
                  {formatIST(occ.date, "h:mm a")}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-white/10 bg-[#121426] px-4 py-3 text-sm text-white/60">
          No upcoming sessions
        </p>
      )}
    </div>
  ) : null;

  const tierSelect =
    !eventHasPassed && hasTiers && !isFree ? (
      <label className="block">
        <span className="mb-2 block text-[13px] font-semibold text-white">
          Ticket type
        </span>
        <span className="relative block">
          <select
            value={selectedTierId}
            onChange={(e) => setSelectedTierId(e.target.value)}
            className={SELECT}
          >
            {priceTiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {rupees(t.price_cents)}
              </option>
            ))}
          </select>
          <FiChevronDown className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-white/50" />
        </span>
      </label>
    ) : null;

  const guestStepper = !eventHasPassed ? (
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-semibold text-white">Guests</span>
      {maxGuests > 0 ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Fewer guests"
            onClick={() => setGuests((g) => Math.max(1, g - 1))}
            disabled={guests <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white transition hover:bg-white/10 disabled:opacity-30"
          >
            <FiMinus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-5 text-center text-sm font-semibold">
            {guests}
          </span>
          <button
            type="button"
            aria-label="More guests"
            onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))}
            disabled={guests >= maxGuests}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white transition hover:bg-white/10 disabled:opacity-30"
          >
            <FiPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <span className="text-xs font-semibold text-red-400">Fully booked</span>
      )}
    </div>
  ) : null;

  return (
    <>
      {/* Desktop: sticky "Details" card in the right column */}
      <aside className="hidden lg:block">
        <div className="sticky top-10 flex flex-col gap-4">
          <div className={`flex flex-col gap-5 p-5 ${CARD}`}>
            <h2 className="font-outfit text-[15px] font-semibold text-white">
              Details
            </h2>
            <DetailRows
              date={selectedDate}
              durationMinutes={durationMinutes}
              place={place}
              spotsLeft={spotsLeft}
              capacity={capacity}
            />
            {sessionPicker}
            {tierSelect}
            {guestStepper}
            <div className={`pt-4 ${DIVIDER}`}>{priceBlock}</div>
            {eventHasPassed ? (
              <p className="rounded-full bg-white/5 py-3 text-center text-sm font-medium text-white/50">
                Event has passed
              </p>
            ) : (
              <button
                type="button"
                onClick={book}
                disabled={bookDisabled}
                className={`h-11 rounded-full text-sm font-semibold ${GRADIENT_BTN}`}
              >
                {bookLabel}
              </button>
            )}
            <p className="-mt-2 text-center text-[11px] leading-4 text-white/45">
              {cancellationCopy}
            </p>
          </div>
          {passSlot}
        </div>
      </aside>

      {/* Tablet + mobile: price bar pinned to the bottom, opens the drawer */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0E0F1F]/95 px-6 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] backdrop-blur-xl md:left-20 lg:hidden">
        <div className="mx-auto flex max-w-[608px] items-center justify-between gap-4">
          {priceBlock}
          {eventHasPassed ? (
            <span className="rounded-full bg-white/5 px-6 py-3 text-sm font-medium text-white/50">
              Passed
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              disabled={spotsLeft <= 0}
              className={`h-11 w-40 rounded-full text-sm font-semibold md:w-56 ${GRADIENT_BTN}`}
            >
              {bookLabel}
            </button>
          )}
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[260] flex items-end justify-center lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="animate-slide-up relative flex max-h-[85vh] w-full max-w-[608px] flex-col gap-5 overflow-y-auto rounded-t-[28px] border-t border-white/10 bg-[#0E0F1F] p-6 pb-8 text-white">
            <div className="flex items-center justify-between">
              <h3 className="font-outfit text-lg font-semibold">
                Booking details
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/15"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
            {passSlot}
            {sessionPicker}
            {tierSelect}
            {guestStepper}
            <div
              className={`flex items-center justify-between gap-4 pt-4 ${DIVIDER}`}
            >
              {priceBlock}
              <button
                type="button"
                onClick={book}
                disabled={bookDisabled}
                className={`h-11 w-40 rounded-full text-sm font-semibold ${GRADIENT_BTN}`}
              >
                {spotsLeft <= 0 ? "Fully Booked" : "Continue"}
              </button>
            </div>
            <p className="text-center text-[11px] text-white/45">
              {cancellationCopy}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Host row                                                           */
/* ------------------------------------------------------------------ */
function HostRow({ host }: { host: PublicHostProfileDTO }) {
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        // Some hosts have avatar_url = "" — `??` would keep the empty string.
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        src={host.avatar_url || "/assets/home/profile1.png"}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
          <span className="truncate">
            {host.first_name} {host.last_name}
          </span>
          {host.is_identity_verified && (
            <LuBadgeCheck
              className="h-4 w-4 shrink-0 text-[#B57BFF]"
              aria-label="Verified host"
            />
          )}
        </p>
        <p className="truncate text-xs text-white/55">
          {host.tagline ?? (host.city ? `Host in ${host.city}` : "Host")}
        </p>
      </div>
      <Link
        href={`/host/${host.slug}`}
        className="shrink-0 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15"
      >
        View Profile
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Location                                                           */
/* ------------------------------------------------------------------ */
function LocationSection({
  location,
  isOnline,
  meetingLink,
  googleMapsUrl,
}: {
  location: string | null;
  isOnline: boolean;
  meetingLink?: string | null;
  googleMapsUrl?: string | null;
}) {
  const directions =
    googleMapsUrl ??
    (location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
      : null);

  return (
    <section>
      <h2 className="font-outfit mb-3 text-[15px] font-semibold text-white">
        Location
      </h2>
      {isOnline ? (
        <div className={`p-5 text-sm text-white/70 ${CARD}`}>
          <p className="font-semibold text-white">Online experience</p>
          <p className="mt-1">Join from anywhere via video call.</p>
          {meetingLink && (
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-semibold text-[#B57BFF] hover:text-[#D4ABFF]"
            >
              Join meeting
            </a>
          )}
        </div>
      ) : (
        <>
          <div className="h-[180px] overflow-hidden rounded-2xl bg-[#131328]">
            {location ? (
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(location)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                title="Meeting location map"
                // Google's embed has no dark style; invert it to sit on the dark page.
                className="[filter:invert(90%)_hue-rotate(180deg)_saturate(0.6)]"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-white/45">
                Exact meeting point shared after booking
              </div>
            )}
          </div>
          <p className="mt-3 text-sm font-semibold text-white">
            {location ?? "Location shared after booking"}
          </p>
          {directions && (
            <a
              href={directions}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-[13px] font-semibold text-[#B57BFF] hover:text-[#D4ABFF]"
            >
              Get Directions
            </a>
          )}
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Reviews                                                            */
/* ------------------------------------------------------------------ */
function GuestReviews({
  reviews,
  rating,
  totalReviews,
}: {
  reviews: Array<{
    id: string;
    name: string | null;
    rating: number;
    description: string;
    created_at: string;
  }>;
  rating: number | null;
  totalReviews: number;
}) {
  if (totalReviews === 0) return null;

  return (
    <section>
      <h2 className="font-outfit mb-3 flex items-center gap-2 text-[15px] font-semibold text-white">
        Guest Reviews
        {rating ? (
          <span className="flex items-center gap-1 text-sm font-semibold text-amber-400">
            <FiStar className="h-3.5 w-3.5 fill-amber-400" />
            {rating.toFixed(1)}
            <span className="font-normal text-white/50">({totalReviews})</span>
          </span>
        ) : null}
      </h2>
      <div className="flex flex-col gap-3">
        {reviews.slice(0, 3).map((review) => (
          <div key={review.id} className={`p-4 ${CARD}`}>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#9B30FF]/20 text-sm font-semibold text-[#D8B4FE]">
                {review.name?.[0] ?? "G"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {review.name ?? "Guest"}
                </p>
                <p className="text-xs text-white/45">
                  {format(new Date(review.created_at), "MMMM yyyy")}
                </p>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
                <FiStar className="h-3 w-3 fill-amber-400" />
                {review.rating}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/70">
              {review.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  All photos modal                                                   */
/* ------------------------------------------------------------------ */
function AllPhotosModal({
  isOpen,
  onClose,
  images,
}: {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] overflow-y-auto bg-black/90">
      <div className="mx-auto w-full max-w-[1120px] px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">All photos</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={img}
              alt={`Photo ${i + 1}`}
              className="h-64 w-full rounded-xl object-cover"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ExperienceDetailClient({
  params,
  initialEvent,
}: {
  params: Promise<{ slug: string }>;
  initialEvent: EventDTO | null;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { userId } = useStoredAuth();
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Server-rendered event keeps the page content in the initial HTML; the
  // client query takes over once it resolves. The route param is a slug (or a
  // legacy UUID) — the /events endpoint resolves either form.
  const { data: fetchedEvent, isLoading: eventQueryLoading } = useEvent(
    resolvedParams.slug,
    initialEvent ? { success: true, data: initialEvent } : undefined,
  );
  const event = fetchedEvent ?? initialEvent ?? undefined;
  const eventLoading = eventQueryLoading && !event;
  // Secondary lookups (reviews, ratings, availability, save) key off the real
  // event UUID, not the slug — resolve it from the loaded event.
  const eventId = event?.id ?? "";
  const { data: host } = usePublicHostProfile(event?.host_id ?? null);
  const { data: reviews } = useReviewsByEvent(eventId);
  const { data: ratingData } = useEventRating(eventId);
  const { data: availability } = useEventAvailability(eventId);
  const { data: savedStatus } = useIsExperienceSaved(eventId, userId);

  const saveExperience = useSaveExperience();
  const unsaveExperience = useUnsaveExperience();

  const isSaved = savedStatus?.saved ?? false;

  const handleSave = () => {
    if (!userId) {
      toast.error("Please login to save experiences");
      return;
    }
    if (isSaved) {
      unsaveExperience.mutate(
        { eventId, userId },
        { onSuccess: () => toast.success("Removed from saved") },
      );
    } else {
      saveExperience.mutate(
        { user_id: userId, event_id: eventId },
        { onSuccess: () => toast.success("Saved to your list") },
      );
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/explore");
  };

  const handleBook = (date: string, guests: number, tierId?: string) => {
    if (!userId) {
      setShowLogin(true);
      return;
    }
    if (!date) {
      toast.error("Please select a date");
      return;
    }
    const encodedDate = encodeURIComponent(date);
    const tierParam = tierId ? `&tier=${encodeURIComponent(tierId)}` : "";
    // Booking operates on the real event UUID (needed to create the booking),
    // so carry that in the URL rather than the slug.
    router.push(
      `/experience/${eventId}/book?date=${encodedDate}&guests=${guests}${tierParam}`,
    );
  };

  // Same skeleton the route's `loading.tsx` shows, so the server boundary and
  // this client-side branch look identical.
  if (eventLoading) {
    return <ExperienceSkeleton />;
  }

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

  const images = event.gallery_urls?.length
    ? event.gallery_urls
    : event.cover_image_url
      ? [event.cover_image_url]
      : [];
  const place = event.is_online
    ? "Online"
    : (event.location ?? "Location shared after booking");
  const rating = ratingData?.average_rating ?? null;
  const totalReviews = ratingData?.total_reviews ?? 0;
  const baseDate = event.next_available_date ?? event.time;

  const passCard = event.monthly_pass_price_cents ? (
    <MonthlyPassCard
      eventId={event.id}
      priceCents={event.monthly_pass_price_cents}
      sessionLimit={event.monthly_pass_session_limit ?? null}
      singleSessionPriceCents={event.price_cents}
      availability={availability}
      onRequireLogin={() => setShowLogin(true)}
    />
  ) : null;

  return (
    <>
      <Navbar dark />

      <main className="min-h-screen bg-[#080914] font-[family-name:var(--font-inter)] text-white max-lg:pb-24 md:pl-20 min-[80rem]:pl-[230px]">
        <div className="mx-auto w-full max-w-[1216px] pb-12 md:px-10 md:pt-10">
          <button
            type="button"
            onClick={handleBack}
            className="mb-5 hidden items-center gap-2 text-sm text-white/70 transition hover:text-white md:inline-flex"
          >
            <FiArrowLeft className="h-4 w-4" /> Explore
          </button>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-w-0 flex-col">
              <Hero
                images={images}
                title={event.title}
                saved={isSaved}
                onSave={handleSave}
                onShare={handleShare}
                onBack={handleBack}
                onShowAll={() => setShowAllPhotos(true)}
              />

              <div className="flex flex-col gap-6 px-6 pt-5 md:px-0">
                <header>
                  {event.mood && (
                    <span className="inline-block rounded-full bg-[#9333EA] px-3 py-1 text-[11px] leading-none font-bold tracking-wider text-white uppercase">
                      {getMoodDisplayLabel(event.mood)}
                    </span>
                  )}
                  <h1 className="font-outfit mt-3 flex items-center gap-2 text-[22px] leading-7 font-bold text-white">
                    {event.is_private && (
                      <LuLock className="h-5 w-5 shrink-0 text-white/60" />
                    )}
                    {event.title}
                  </h1>
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-white/60">
                    {rating && totalReviews > 0 ? (
                      <span className="flex items-center gap-1">
                        <FiStar className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-amber-400">
                          {rating.toFixed(2)}
                        </span>
                        ({totalReviews} reviews)
                      </span>
                    ) : (
                      <span className="font-semibold text-[#B57BFF]">NEW</span>
                    )}
                    {event.duration_minutes ? (
                      <>
                        <span aria-hidden>•</span>
                        {formatDuration(event.duration_minutes)}
                      </>
                    ) : null}
                    <span aria-hidden>•</span>
                    <span className="truncate">{place}</span>
                  </p>
                </header>

                <div className={DIVIDER} />

                {host && (
                  <>
                    <HostRow host={host} />
                    <div className={DIVIDER} />
                  </>
                )}

                <section>
                  <h2 className="font-outfit mb-2 text-[15px] font-semibold text-white">
                    About the Experience
                  </h2>
                  {event.hook_line && (
                    <p className="mb-2 text-sm leading-6 font-medium text-white/85">
                      {event.hook_line}
                    </p>
                  )}
                  {event.description ? (
                    <RichTextView
                      html={event.description}
                      className="text-sm leading-6 !text-white/70 [&_*]:![background-color:transparent] [&_*]:![color:inherit] [&_a]:![color:#B57BFF] [&_h1]:mt-4 [&_h1]:font-semibold [&_h1]:![color:#fff] [&_h2]:mt-4 [&_h2]:font-semibold [&_h2]:![color:#fff] [&_h3]:mt-3 [&_h3]:font-semibold [&_h3]:![color:#fff] [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-2 [&_strong]:![color:#fff] [&_ul]:list-disc [&_ul]:pl-5"
                    />
                  ) : (
                    <p className="text-sm text-white/55">
                      No description available.
                    </p>
                  )}
                </section>

                {/* Desktop shows these in the sticky card instead */}
                <section className="lg:hidden">
                  <div className={`mb-6 ${DIVIDER}`} />
                  <h2 className="font-outfit mb-3 text-[15px] font-semibold text-white">
                    Details
                  </h2>
                  <DetailRows
                    date={baseDate}
                    durationMinutes={event.duration_minutes}
                    place={place}
                    spotsLeft={event.capacity - event.total_bookings}
                    capacity={event.capacity}
                  />
                </section>

                <div className={DIVIDER} />

                <LocationSection
                  location={event.location}
                  isOnline={event.is_online}
                  meetingLink={event.meeting_link}
                  googleMapsUrl={event.google_maps_url}
                />

                <GuestReviews
                  reviews={reviews ?? []}
                  rating={rating}
                  totalReviews={totalReviews}
                />
              </div>
            </div>

            <BookingWidget
              passSlot={passCard ?? undefined}
              price={event.price_cents}
              isFree={event.is_free}
              priceTiers={event.price_tiers ?? []}
              eventDate={event.time}
              capacity={event.capacity}
              totalBookings={event.total_bookings}
              durationMinutes={event.duration_minutes}
              place={place}
              availability={availability}
              isRecurring={
                event.is_recurring ||
                event.schedule_type === "custom_dates" ||
                (!!event.custom_dates && event.custom_dates.length > 0)
              }
              isOneOnOne={event.session_type === "one_on_one"}
              cancellationPolicy={event.cancellation_policy}
              onBook={handleBook}
            />
          </div>
        </div>

        <Footer dark />
      </main>

      <AllPhotosModal
        isOpen={showAllPhotos}
        onClose={() => setShowAllPhotos(false)}
        images={images}
      />
      <GoogleLogin open={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
}
