"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "~/components/Navbar";
import Breadcrumb from "~/components/Breadcrumb";
import { RichTextView } from "~/components/RichTextEditor";
import { Footer } from "~/components/home";
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
import {
  FiBookmark,
  FiShare2,
  FiMapPin,
  FiClock,
  FiUsers,
  FiStar,
  FiCalendar,
  FiGrid,
  FiChevronDown,
  FiShield,
  FiUser,
  FiCheck,
  FiArrowRight,
  FiMessageCircle,
} from "react-icons/fi";
import { LuLanguages, LuBadgeCheck, LuSparkles, LuTicket } from "react-icons/lu";
import { format } from "date-fns";
import { toast } from "sonner";
import type { OccurrenceAvailability } from "~/lib/api";
import { GoogleLogin } from "~/components";

export const runtime = "edge";

/* ------------------------------------------------------------------ */
/*  Photo Gallery Component                                            */
/* ------------------------------------------------------------------ */
function PhotoGallery({
  coverImage,
  gallery = [],
  onShowAll,
}: {
  coverImage: string | null;
  gallery: string[] | null;
  onShowAll: () => void;
}) {
  const images = coverImage
    ? [coverImage, ...(gallery ?? [])]
    : (gallery ?? []);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex h-[200px] sm:h-[250px] md:h-[300px] w-full items-center justify-center rounded-xl bg-gray-200">
        <span className="text-gray-500">No photos available</span>
      </div>
    );
  }

  const handlePrev = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="group relative">
      <div className="relative h-[200px] sm:h-[250px] md:h-[300px] w-full overflow-hidden rounded-xl bg-gray-100">
        {/* Main Image */}
        <img
          src={images[currentImageIndex]}
          alt={`Experience gallery ${currentImageIndex + 1}`}
          loading="lazy"
          className="h-full w-full object-cover transition-opacity duration-300"
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            {/* Left Arrow */}
            <button
              onClick={handlePrev}
              className="absolute top-1/2 left-4 z-10 -translate-y-1/2 rounded-full bg-white/80 p-3 opacity-0 shadow-lg transition group-hover:opacity-100 hover:bg-white"
              aria-label="Previous image"
            >
              <svg
                className="h-5 w-5 text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Right Arrow */}
            <button
              onClick={handleNext}
              className="absolute top-1/2 right-4 z-10 -translate-y-1/2 rounded-full bg-white/80 p-3 opacity-0 shadow-lg transition group-hover:opacity-100 hover:bg-white"
              aria-label="Next image"
            >
              <svg
                className="h-5 w-5 text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-white opacity-0 transition group-hover:opacity-100">
              {currentImageIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Show All Photos Button */}
      {images.length > 1 && (
        <button
          onClick={onShowAll}
          className="absolute right-4 bottom-4 flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium shadow-lg transition hover:shadow-xl"
        >
          <FiGrid size={16} />
          Show all photos
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Info Pills Component                                               */
/* ------------------------------------------------------------------ */
function InfoPills({
  duration,
  groupSize,
  languages,
  level,
}: {
  duration: number | null;
  groupSize: { min: number | null; max: number | null };
  languages?: string[] | null;
  level?: string | null;
}) {
  const languageLabel =
    languages && languages.length > 0 ? languages.join(", ") : "English";
  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} mins`;
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours} Hours`;
  };

  return (
    <div className="mb-6 flex flex-wrap gap-6 rounded-lg border-b border-gray-100 bg-gradient-to-r from-blue-50/30 to-transparent px-4 py-6 md:px-6">
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <FiClock className="text-[#0094CA]" size={18} />
        </div>
        <div>
          <p className="text-xs text-gray-500">Duration</p>
          <p className="text-sm font-semibold">
            {duration ? formatDuration(duration) : "N/A"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <FiUsers className="text-[#0094CA]" size={18} />
        </div>
        <div>
          <p className="text-xs text-gray-500">Group Size</p>
          <p className="text-sm font-semibold">
            Max {groupSize.max ?? 10} People
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <LuLanguages className="text-[#0094CA]" size={18} />
        </div>
        <div>
          <p className="text-xs text-gray-500">
            {languages && languages.length > 1 ? "Languages" : "Language"}
          </p>
          <p className="text-sm font-semibold">{languageLabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <LuSparkles className="text-[#0094CA]" size={18} />
        </div>
        <div>
          <p className="text-xs text-gray-500">Level</p>
          <p className="text-sm font-semibold">
            {level ?? "Beginner Friendly"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Booking Widget Component                                           */
/* ------------------------------------------------------------------ */
function BookingWidget({
  price,
  isFree,
  rating,
  totalReviews,
  eventId: _eventId,
  eventDate: _eventDate,
  capacity,
  totalBookings,
  bookingsLastWeek,
  availability,
  isRecurring,
  cancellationPolicy,
  onBook,
}: {
  price: number | null;
  isFree: boolean;
  rating: number | null;
  totalReviews: number;
  eventId: string;
  eventDate: string;
  capacity: number;
  totalBookings: number;
  bookingsLastWeek: number;
  availability?: OccurrenceAvailability[];
  isRecurring: boolean;
  cancellationPolicy: string | null;
  onBook: (date: string, guests: number) => void;
}) {
  const [selectedDate, setSelectedDate] = useState(_eventDate);
  const [guests, setGuests] = useState(1);

  // Find the selected occurrence availability
  const currentOccurrence = availability?.find((a) => a.date === selectedDate);
  const spotsLeft = currentOccurrence
    ? currentOccurrence.remaining
    : capacity - totalBookings;

  const maxGuests = Math.max(0, Math.min(spotsLeft, 10));
  const guestOptions = Array.from({ length: maxGuests }, (_, i) => i + 1);

  // Check if selected date has passed
  const eventHasPassed = selectedDate
    ? new Date(selectedDate) < new Date()
    : false;

  useEffect(() => {
    if (guestOptions.length === 0) return;
    if (!guestOptions.includes(guests)) {
      setGuests(guestOptions[0] ?? 1);
    }
  }, [guestOptions, guests]);

  const sessionDates =
    isRecurring && availability && availability.length > 0
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

  const cancellationBadge =
    cancellationPolicy === "flexible"
      ? { label: "Flexible", sub: "cancellation" }
      : cancellationPolicy === "moderate"
        ? { label: "Moderate", sub: "cancellation" }
        : cancellationPolicy === "strict"
          ? { label: "Strict", sub: "cancellation" }
          : cancellationPolicy === "no_refund"
            ? { label: "No refunds", sub: "policy" }
            : { label: "Standard", sub: "policy" };

  return (
    <div className="sticky top-20 h-max w-full pl-4 max-w-[360px] mx-auto lg:ml-auto">
      <div className="relative overflow-hidden rounded-3xl border border-[#cfe8fa] bg-gradient-to-br from-white via-[#f4faff] to-[#e9f5ff] p-5 shadow-[0_24px_60px_rgba(58,119,172,0.12)]">
        {/* Header */}
        <div className="mb-3 flex items-start gap-2.5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#cfe8fa] bg-white shadow-[0_8px_20px_rgba(31,167,255,0.18)]">
            <LuTicket className="h-4 w-4 -rotate-12 text-[#0094CA]" />
          </div>
          <div className="flex-1">
            <h2 className="font-outfit text-xl font-extrabold leading-none tracking-tight text-[#16304c]">
              {isFree ? (
                "FREE EXPERIENCE"
              ) : (
                <>
                  ₹{((price ?? 0) / 100).toFixed(0)}
                  <span className="text-sm font-medium text-[#6f8daa]">
                    /person
                  </span>
                </>
              )}
            </h2>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#5f7e9a]">
              Hosted by verified host
              <LuBadgeCheck
                className="h-3.5 w-3.5 text-[#0094CA]"
                fill="#0094CA"
                stroke="#ffffff"
              />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mb-3 flex items-center justify-start gap-4 border-b border-[#dbeaf5] pb-3 text-xs">
          <div className="flex items-center gap-2">
            {rating !== null && rating > 0 && totalReviews > 0 ? (
              <>
                <FiStar className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-[#16304c]">
                  {rating.toFixed(1)}
                </span>
                <span className="text-[#6f8daa]">
                  ({totalReviews} reviews)
                </span>
              </>
            ) : (
              <span className="font-bold text-[#0094CA] uppercase">NEW</span>
            )}
          </div>
          <div className="h-4 w-px bg-[#dbeaf5]" />
          <div className="flex items-center gap-2">
            <FiUsers className="h-4 w-4 text-[#0094CA]" />
            <span className="font-bold text-[#16304c]">{totalBookings}</span>
            <span className="text-[#6f8daa]">people joined</span>
          </div>
        </div>

        {/* Choose Your Session */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5">
            <FiCalendar className="h-4 w-4 text-[#0094CA]" />
            <h3 className="text-sm font-bold text-[#16304c]">
              Choose your session
            </h3>
          </div>
          <p className="mb-4 ml-[22px] text-[11px] leading-tight text-[#6f8daa]">
            Pick a time 
          </p>

          {sessionDates.length > 0 ? (
            <div
              className={`${sessionDates.length === 1
                ? "flex"
                : "flex gap-3 overflow-x-auto hide-scrollbar -mx-1 px-1 pb-1"
                }`}
            >
              {sessionDates.map((occ) => {
                const isSelected = selectedDate === occ.date;
                const isDisabled = occ.is_fully_booked;
                const dateObj = new Date(occ.date);
                const isSingle = sessionDates.length === 1;

                if (isSingle) {
                  return (
                    <button
                      key={occ.date}
                      type="button"
                      onClick={() => !isDisabled && setSelectedDate(occ.date)}
                      disabled={isDisabled}
                      className={`relative flex w-full items-center gap-2.5 rounded-2xl border-2 px-3.5 py-2.5 text-left transition ${isSelected
                        ? "border-transparent bg-gradient-to-br from-[#1fa7ff] to-[#0094CA] text-white shadow-[0_14px_30px_rgba(31,167,255,0.35)]"
                        : "border-[#dbeaf5] bg-white text-[#16304c] hover:border-[#9fd1ee]"
                        } ${isDisabled ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <FiClock
                        className={`h-4 w-4 flex-shrink-0 ${isSelected ? "text-white/90" : "text-[#6f8daa]"
                          }`}
                      />
                      <div className="flex flex-1 items-baseline gap-2">
                        <span className="text-sm font-bold">
                          {format(dateObj, "eee d")},
                        </span>
                        <span
                          className={`text-sm ${isSelected ? "text-white/90" : "text-[#6f8daa]"
                            }`}
                        >
                          {format(dateObj, "h:mm a")}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white">
                          <FiCheck className="h-3 w-3 stroke-[3] text-[#0094CA]" />
                        </div>
                      )}
                    </button>
                  );
                }

                return (
                  <button
                    key={occ.date}
                    type="button"
                    onClick={() => !isDisabled && setSelectedDate(occ.date)}
                    disabled={isDisabled}
                    className={`relative flex min-w-[95px] flex-shrink-0 flex-col items-start gap-1 rounded-2xl border-2 p-3 text-left transition ${isSelected
                      ? "border-transparent bg-gradient-to-br from-[#1fa7ff] to-[#0094CA] text-white shadow-[0_14px_30px_rgba(31,167,255,0.35)]"
                      : "border-[#dbeaf5] bg-white text-[#16304c] hover:border-[#9fd1ee]"
                      } ${isDisabled ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <FiClock
                      className={`h-4 w-4 ${isSelected ? "text-white/90" : "text-[#6f8daa]"
                        }`}
                    />
                    <div className="text-sm font-bold leading-tight">
                      {format(dateObj, "eee d")}
                    </div>
                    <div
                      className={`text-sm leading-tight ${isSelected ? "text-white/90" : "text-[#6f8daa]"
                        }`}
                    >
                      {format(dateObj, "h:mm a")}
                    </div>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm">
                        <FiCheck className="h-2.5 w-2.5 stroke-[3] text-[#0094CA]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#dbeaf5] bg-white px-4 py-3 text-sm text-[#6f8daa]">
              No upcoming sessions
            </div>
          )}
        </div>

        {/* Guests */}
        {!eventHasPassed && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5">
              <FiUser className="h-4 w-4 text-[#0094CA]" />
              <h3 className="text-sm font-bold text-[#16304c]">Guests</h3>
            </div>
            <p className="mb-2 ml-[22px] text-[11px] leading-tight text-[#6f8daa]">
              How many are joining?
            </p>
            {guestOptions.length > 0 ? (
              <div className="relative">
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full appearance-none rounded-2xl border border-[#dbeaf5] bg-white px-3.5 py-2.5 pr-10 text-sm font-medium text-[#16304c] outline-none transition focus:border-[#0094CA] focus:ring-2 focus:ring-[#0094CA]/20"
                >
                  {guestOptions.map((n) => (
                    <option key={n} value={n}>
                      {n} Guest{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
                <FiChevronDown className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-[#6f8daa]" />
              </div>
            ) : (
              <div className="rounded-2xl border border-[#dbeaf5] bg-white px-4 py-3 text-sm font-medium text-[#6f8daa]">
                No guest slots available
              </div>
            )}
          </div>
        )}

        {/* Reserve Button or Event Passed */}
        {eventHasPassed ? (
          <div className="rounded-2xl bg-[#f0f6fb] p-3.5 text-center text-sm font-medium text-[#6f8daa]">
            Event has passed
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onBook(selectedDate, guests)}
            disabled={!selectedDate || spotsLeft <= 0}
            className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1fa7ff] to-[#0094CA] py-2.5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(31,167,255,0.32)] transition hover:shadow-[0_20px_40px_rgba(31,167,255,0.4)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            <span>
              {spotsLeft <= 0 ? "Fully Booked" : "Reserve My Spot"}
            </span>
            {spotsLeft > 0 && (
              <FiArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            )}
          </button>
        )}

        {/* Booking activity hint */}
        {!eventHasPassed && bookingsLastWeek > 0 && (
          <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-[#5f7e9a]">
            <span aria-hidden>🔥</span>
            <span>
              {bookingsLastWeek} {bookingsLastWeek === 1 ? "person" : "people"}{" "}
              booked this week
            </span>
          </div>
        )}

        {/* Trust Badges */}
        <div className="mt-3 grid grid-cols-3 gap-1 border-t border-[#dbeaf5] pt-3">
          <div className="flex flex-col items-center gap-1 px-1 text-center">
            <FiShield className="h-4 w-4 text-[#0094CA]" />
            <span className="text-[10px] leading-tight font-semibold text-[#16304c]">
              {cancellationBadge.label}
              <br />
              {cancellationBadge.sub}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 border-x border-[#dbeaf5] px-1 text-center">
            <FiStar className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-[10px] leading-tight font-semibold text-[#16304c]">
              Verified
              <br />
              host
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 px-1 text-center">
            <FiMessageCircle className="h-4 w-4 text-[#0094CA]" />
            <span className="text-[10px] leading-tight font-semibold text-[#16304c]">
              Instant
              <br />
              confirmation
            </span>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-[#5f7e9a]">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 flex-shrink-0 text-[#5fc781]"
          >
            <path
              fill="currentColor"
              d="M17 3c-4 0-9 3-11 9-1.4 4.2.4 7.4 3 9 2-5 5.5-8 10-9-3 2-5 5-6 9 5 0 9-4 9-9V3h-5Z"
            />
          </svg>
          <span>{cancellationCopy}</span>
        </div>

        {/* Rare find banner */}
        {!eventHasPassed && spotsLeft <= 3 && spotsLeft > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-500">
              <LuSparkles className="text-white" size={12} />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-600">Rare find</p>
              <p className="text-xs text-red-500">
                Only {spotsLeft} spot{spotsLeft > 1 ? "s" : ""} left!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/* ------------------------------------------------------------------ */
/*  Meet Your Host Component                                           */
/* ------------------------------------------------------------------ */
function MeetYourHost({
  host,
  onContact,
  onViewProfile,
}: {
  host: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    bio: string | null;
    is_identity_verified: boolean;
    is_super_host: boolean;
  } | null;
  onContact: () => void;
  onViewProfile: () => void;
}) {
  if (!host) return null;

  return (
    <div className="mb-8 rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-shrink-0 items-center gap-4 sm:flex-col sm:items-center">
          {host.avatar_url ? (
            <img
              src={host.avatar_url}
              alt={host.first_name}
              className="h-14 w-14 rounded-full object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0094CA] text-xl font-bold text-white shadow-sm">
              {host.first_name[0]}
            </div>
          )}
          <div className="text-left sm:text-center">
            <p className="text-sm font-semibold text-gray-900">
              {host.first_name} {host.last_name?.[0]}.
            </p>
            {host.is_identity_verified ? (
              <p className="flex items-center gap-1 text-xs font-medium text-green-600 sm:justify-center">
                <LuBadgeCheck size={14} />
                Verified
              </p>
            ) : (
              <p className="text-xs text-gray-500">Host</p>
            )}
          </div>
        </div>

        <div className="flex-1">
          <p className="text-sm leading-relaxed text-gray-600">
            {host.bio ??
              `Hi, I'm ${host.first_name}! I'm excited to share this experience with you.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={onContact}
              className="rounded-lg bg-[#f0f9ff] px-4 py-2 text-xs font-semibold text-[#0094CA] transition hover:bg-[#e6f6ff]"
            >
              Contact Host
            </button>
            <button
              onClick={onViewProfile}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              View Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Where We'll Meet Component                                         */
/* ------------------------------------------------------------------ */
function WhereWellMeet({
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
  if (isOnline) {
    return (
      <div className="mb-6 rounded-lg border-b border-gray-100 bg-gradient-to-r from-blue-50/20 to-transparent px-4 py-8 md:px-6">
        <h2 className="mb-6 text-2xl font-bold">Where we&apos;ll meet</h2>
        <div className="flex items-center justify-center rounded-xl bg-gray-100 p-6">
          <div className="text-center">
            <div className="mb-2 text-4xl">🌐</div>
            <p className="font-semibold">Online Experience</p>
            <p className="text-sm text-gray-500">
              Join from anywhere via video call
            </p>
            {meetingLink && (
              <a
                href={meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-lg bg-[#0094CA] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#007ba8]"
              >
                Join Meeting
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-lg border-b border-gray-100 bg-gradient-to-r from-transparent to-blue-50/20 px-4 py-8 md:px-6">
      <h2 className="mb-6 text-2xl font-bold">Where we&apos;ll meet</h2>
      <div className="relative h-64 w-full overflow-hidden rounded-xl bg-gray-100 shadow-inner">
        {location ? (
          <iframe
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(location)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
            title="Meeting Location Map"
            className="rounded-xl grayscale-[20%] transition-all hover:grayscale-0"
          ></iframe>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                <FiMapPin className="text-[#0094CA]" size={24} />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-400">
                Exact meeting point visible after booking
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {location ?? "Exact location provided after booking"}
        </p>
        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-medium text-[#0094CA] transition hover:text-[#007ba8]"
          >
            View on Maps
            <FiMapPin size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Guest Reviews Component                                            */
/* ------------------------------------------------------------------ */
function GuestReviews({
  reviews,
  rating,
  totalReviews,
  onShowAll,
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
  onShowAll: () => void;
}) {
  if (totalReviews === 0) return null;

  // Rating distribution (mock for now)
  const distribution = [
    { stars: 5, percent: 80 },
    { stars: 4, percent: 15 },
    { stars: 3, percent: 5 },
    { stars: 2, percent: 0 },
    { stars: 1, percent: 0 },
  ];

  return (
    <div className="rounded-lg bg-gradient-to-r from-blue-50/20 to-transparent px-4 py-8 md:px-6">
      <h2 className="mb-6 text-2xl font-bold">Guest Reviews</h2>

      {/* Rating Summary */}
      <div className="mb-6 flex gap-8">
        <div className="text-center">
          <p className="text-4xl font-bold">
            {rating && rating > 0 ? rating.toFixed(1) : "NEW"}
          </p>
          {rating && rating > 0 && (
            <div className="my-1 flex justify-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <FiStar
                  key={star}
                  size={14}
                  className={
                    star <= rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }
                />
              ))}
            </div>
          )}
          {totalReviews > 0 && (
            <p className="text-sm text-gray-500">{totalReviews} reviews</p>
          )}
        </div>

        {/* Distribution Bars */}
        <div className="flex-1 space-y-1">
          {distribution.map(({ stars, percent }) => (
            <div key={stars} className="flex items-center gap-2">
              <span className="w-3 text-sm">{stars}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[#0094CA]"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Reviews */}
      <div className="space-y-4">
        {reviews.slice(0, 3).map((review) => (
          <div
            key={review.id}
            className="border-b border-gray-100 pb-4 last:border-0"
          >
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold">
                {review.name?.[0] ?? "G"}
              </div>
              <div>
                <p className="font-semibold">{review.name ?? "Guest"}</p>
                <p className="text-xs text-gray-500">
                  {format(new Date(review.created_at), "MMMM yyyy")}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              &quot;{review.description}&quot;
            </p>
          </div>
        ))}
      </div>

      {totalReviews > 3 && (
        <button
          onClick={onShowAll}
          className="mt-4 text-sm font-medium text-[#0094CA] hover:underline"
        >
          Show all {totalReviews} reviews
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  All Photos Modal                                                   */
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
      <div className="site-x mx-auto w-full max-w-[1120px] py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">All photos</h2>
          <button
            onClick={onClose}
            className="text-2xl text-white hover:text-gray-300"
          >
            ×
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`Photo ${i + 1}`}
              className="h-64 w-full rounded-lg object-cover"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */
export default function ExperienceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { userId } = useStoredAuth();
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const { data: event, isLoading: eventLoading } = useEvent(resolvedParams.id);
  const { data: host } = usePublicHostProfile(event?.host_id ?? null);
  const { data: reviews } = useReviewsByEvent(resolvedParams.id);
  const { data: ratingData } = useEventRating(resolvedParams.id);
  const { data: availability } = useEventAvailability(resolvedParams.id);
  const { data: savedStatus } = useIsExperienceSaved(resolvedParams.id, userId);

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
        { eventId: resolvedParams.id, userId },
        { onSuccess: () => toast.success("Removed from saved") },
      );
    } else {
      saveExperience.mutate(
        { user_id: userId, event_id: resolvedParams.id },
        { onSuccess: () => toast.success("Saved to your list") },
      );
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleBook = (date: string, guests: number) => {
    if (!userId) {
      setShowLogin(true);
      return;
    }
    if (!date) {
      toast.error("Please select a date");
      return;
    }
    const encodedDate = encodeURIComponent(date);
    router.push(
      `/experience/${resolvedParams.id}/book?date=${encodedDate}&guests=${guests}`,
    );
  };


  if (eventLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0094CA]" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white">
        <p className="mb-4 text-xl text-gray-600">Experience not found</p>
        <Link href="/" className="text-[#0094CA] hover:underline">
          Go back home
        </Link>
      </div>
    );
  }

  const allImages = event.gallery_urls ?? [];

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-white">
        <div className="site-x mx-auto w-full max-w-[77rem] px-4 py-8 md:px-6 lg:px-8">
          {/* Breadcrumb */}
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Experiences", href: "/experiences" },
              { label: event.title ?? "Experience" },
            ]}
            className="mb-6"
          />

          {/* Title and Actions */}
          <div className="mt-6 mb-6 flex items-start justify-between">
            <div>
              <h1 className="mb-3 text-2xl font-bold text-gray-900 md:text-4xl">
                {event.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-gray-600">
                  <FiMapPin size={14} />
                  {event.is_online ? (
                    "Online"
                  ) : event.google_maps_url ? (
                    <a
                      href={event.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0094CA] underline transition hover:text-[#007ba8]"
                    >
                      View on Maps
                    </a>
                  ) : (
                    (event.location ?? "Location TBD")
                  )}
                </span>
                {ratingData && (
                  <span className="flex items-center gap-1">
                    <FiStar
                      className="fill-yellow-400 text-yellow-400"
                      size={14}
                    />
                    <span className="font-semibold">
                      {ratingData.average_rating && ratingData.average_rating > 0
                        ? ratingData.average_rating.toFixed(1)
                        : "NEW"}
                    </span>
                    {ratingData.total_reviews > 0 && (
                      <span className="text-gray-500">
                        ({ratingData.total_reviews} reviews)
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                className={`rounded-lg border p-2 transition ${isSaved
                  ? "border-[#0094CA] bg-[#0094CA]/5 text-[#0094CA]"
                  : "border-gray-200 hover:bg-gray-50"
                  }`}
              >
                <FiBookmark
                  size={20}
                  className={isSaved ? "fill-current" : ""}
                />
              </button>
              <button
                onClick={handleShare}
                className="rounded-lg border border-gray-200 p-2 transition hover:bg-gray-50"
              >
                <FiShare2 size={20} />
              </button>
            </div>
          </div>

          {/* Photo Gallery */}
          <PhotoGallery
            coverImage={null}
            gallery={event.gallery_urls}
            onShowAll={() => setShowAllPhotos(true)}
          />

          {/* Main Content Grid */}
          <div className="mt-10 grid gap-8 lg:grid-cols-12">
            {/* Left Column - Details */}
            <div className="lg:col-span-7">
              <InfoPills
                duration={event.duration_minutes}
                groupSize={{
                  min: event.min_group_size,
                  max: event.max_group_size,
                }}
                languages={event.languages}
                level={event.level}
              />

              {/* About the Experience */}
              <div className="mb-6 rounded-lg border-b border-gray-100 bg-gradient-to-r from-transparent to-blue-50/20 px-4 py-8 md:px-6">
                <h2 className="mb-4 text-2xl font-bold">
                  About the experience
                </h2>
                {event.description ? (
                  <RichTextView html={event.description} className="text-gray-600" />
                ) : (
                  <p className="text-gray-600">No description available.</p>
                )}
                {event.hook_line && (
                  <p className="mt-4 text-gray-600 italic">{event.hook_line}</p>
                )}
              </div>


              {/* Meet Your Host */}
              <MeetYourHost
                host={host ?? null}
                onContact={() => toast.info("Contact feature coming soon!")}
                onViewProfile={() => router.push(`/host/${event.host_id}`)}
              />

              {/* Where We'll Meet */}
              <WhereWellMeet
                location={event.location}
                isOnline={event.is_online}
                meetingLink={event.meeting_link}
                googleMapsUrl={event.google_maps_url}
              />

              {/* Guest Reviews */}
              <GuestReviews
                reviews={reviews ?? []}
                rating={ratingData?.average_rating ?? null}
                totalReviews={ratingData?.total_reviews ?? 0}
                onShowAll={() => toast.info("All reviews modal coming soon!")}
              />
            </div>

            {/* Right Column - Booking Widget */}
            <div className="lg:col-span-5">
              <BookingWidget
                price={event.price_cents}
                isFree={event.is_free}
                rating={ratingData?.average_rating ?? null}
                totalReviews={ratingData?.total_reviews ?? 0}
                eventId={event.id}
                eventDate={event.time}
                capacity={event.capacity}
                totalBookings={event.total_bookings}
                bookingsLastWeek={event.bookings_last_week ?? 0}
                availability={availability}
                isRecurring={event.is_recurring}
                cancellationPolicy={event.cancellation_policy}
                onBook={handleBook}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* All Photos Modal */}
      <AllPhotosModal
        isOpen={showAllPhotos}
        onClose={() => setShowAllPhotos(false)}
        images={allImages}
      />
      <GoogleLogin open={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
}
