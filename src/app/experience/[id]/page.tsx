"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "~/components/Navbar";
import { Footer } from "~/components/home";
import {
  useEvent,
  usePublicHostProfile,
  useReviewsByEvent,
  useEventRating,
  useIsExperienceSaved,
  useSaveExperience,
  useUnsaveExperience,
} from "~/hooks/useApi";
import {
  FiBookmark,
  FiShare2,
  FiMapPin,
  FiClock,
  FiUsers,
  FiStar,
  FiCalendar,
  FiGrid,
} from "react-icons/fi";
import { LuLanguages, LuBadgeCheck, LuSparkles } from "react-icons/lu";
import { format } from "date-fns";
import { toast } from "sonner";

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
  const images = coverImage ? [coverImage, ...(gallery ?? [])] : (gallery ?? []);
  const displayImages = images.slice(0, 5);

  if (displayImages.length === 0) {
    return (
      <div className="bg-gray-200 h-80 rounded-xl flex items-center justify-center">
        <span className="text-gray-500">No photos available</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-4 grid-rows-2 gap-2 h-80 rounded-xl overflow-hidden">
        {/* Main large image */}
        <div className="col-span-2 row-span-2">
          <img
            src={displayImages[0]}
            alt="Experience cover"
            className="w-full h-full object-cover"
          />
        </div>
        {/* Secondary images */}
        {displayImages.slice(1, 5).map((img, i) => (
          <div key={i} className="col-span-1 row-span-1">
            <img src={img} alt={`Gallery ${i + 2}`} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
      {images.length > 5 && (
        <button
          onClick={onShowAll}
          className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transition"
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
  language,
  level,
}: {
  duration: number | null;
  groupSize: { min: number | null; max: number | null };
  language?: string;
  level?: string;
}) {
  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} mins`;
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours} Hours`;
  };

  return (
    <div className="flex flex-wrap gap-6 py-4 border-b border-gray-100">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
          <FiClock className="text-[#0094CA]" size={18} />
        </div>
        <div>
          <p className="text-xs text-gray-500">Duration</p>
          <p className="text-sm font-semibold">{duration ? formatDuration(duration) : "N/A"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
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
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
          <LuLanguages className="text-[#0094CA]" size={18} />
        </div>
        <div>
          <p className="text-xs text-gray-500">Language</p>
          <p className="text-sm font-semibold">{language ?? "English"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
          <LuSparkles className="text-[#0094CA]" size={18} />
        </div>
        <div>
          <p className="text-xs text-gray-500">Level</p>
          <p className="text-sm font-semibold">{level ?? "Beginner Friendly"}</p>
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
  onBook: (date: string, guests: number) => void;
}) {
  const [guests, setGuests] = useState(1);
  const spotsLeft = capacity - totalBookings;

  const formattedPrice = isFree ? "Free" : `₹${((price ?? 0) / 100).toFixed(0)}`;

  // Check if event date has passed
  const eventHasPassed = _eventDate ? new Date(_eventDate) < new Date() : false;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm sticky top-24">
      {/* Price and Rating */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-2xl font-bold">{formattedPrice}</span>
          {!isFree && <span className="text-gray-500 text-sm">/person</span>}
        </div>
        {rating && (
          <div className="flex items-center gap-1">
            <FiStar className="text-yellow-400 fill-yellow-400" size={16} />
            <span className="font-semibold">{rating.toFixed(1)}</span>
            <span className="text-gray-500 text-sm">({totalReviews})</span>
          </div>
        )}
      </div>

      {/* Date Display */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">DATE & TIME</label>
        <div className="relative">
          <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 flex items-center gap-2 text-gray-700">
            <FiCalendar size={18} className="text-[#0094CA]" />
            <span className="font-medium">
              {_eventDate 
                ? new Date(_eventDate).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : "Date TBD"}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">This event is scheduled on the date and time shown above</p>
      </div>

      {/* Guests Selector */}
      {!eventHasPassed && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">GUESTS</label>
          <select
            value={guests}
            onChange={(e) => setGuests(parseInt(e.target.value))}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0094CA] focus:border-transparent outline-none appearance-none bg-white"
          >
            {Array.from({ length: Math.min(spotsLeft, 10) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} Guest{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Event Status */}
      {eventHasPassed ? (
        <div className="p-3 bg-gray-100 text-gray-700 rounded-lg text-center font-medium">
          Event has passed
        </div>
      ) : (
        <>
          {/* Book Button */}
          <button
            onClick={() => onBook(_eventDate, guests)}
            disabled={!_eventDate || spotsLeft <= 0}
            className="w-full py-3 bg-[#0094CA] hover:bg-[#007ba8] text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>

          <p className="text-center text-sm text-gray-500 mt-2">You won&apos;t be charged yet</p>
        </>
      )}

      {/* Rare Find Badge */}
      {!eventHasPassed && spotsLeft <= 3 && spotsLeft > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
            <LuSparkles className="text-white" size={12} />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-600">Rare find</p>
            <p className="text-xs text-red-500">Only {spotsLeft} spot{spotsLeft > 1 ? "s" : ""} left!</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  The Plan Component                                                 */
/* ------------------------------------------------------------------ */
interface PlanItem {
  title: string;
  description: string;
  duration: string;
}

function ThePlan({ items }: { items: PlanItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="py-6 border-b border-gray-100">
      <h2 className="text-xl font-bold mb-4">The Plan</h2>
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 bg-[#0094CA] rounded-full" />
              {i < items.length - 1 && <div className="w-0.5 h-full bg-[#0094CA]/30 flex-1 mt-1" />}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{item.title}</h3>
                <span className="text-sm text-[#0094CA]">{item.duration}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
            </div>
          </div>
        ))}
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
    <div className="py-6 border-b border-gray-100">
      <h2 className="text-xl font-bold mb-4">Meet your host</h2>
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          {host.avatar_url ? (
            <img
              src={host.avatar_url}
              alt={host.first_name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#0094CA] flex items-center justify-center text-white text-xl font-bold">
              {host.first_name[0]}
            </div>
          )}
          <div className="text-center mt-1">
            <p className="font-semibold text-sm">{host.first_name} {host.last_name?.[0]}.</p>
            {host.is_identity_verified && (
              <p className="text-xs text-green-600 flex items-center justify-center gap-0.5">
                <LuBadgeCheck size={12} />
                Verified Host
              </p>
            )}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-3">
            {host.bio ?? `Hi, I'm ${host.first_name}! I'm excited to share this experience with you.`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onContact}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              Contact Host
            </button>
            <button
              onClick={onViewProfile}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
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
function WhereWellMeet({ location, isOnline, meetingLink, googleMapsUrl }: { location: string | null; isOnline: boolean; meetingLink?: string | null; googleMapsUrl?: string | null }) {
  if (isOnline) {
    return (
      <div className="py-6 border-b border-gray-100">
        <h2 className="text-xl font-bold mb-4">Where we&apos;ll meet</h2>
        <div className="bg-gray-100 rounded-xl p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">🌐</div>
            <p className="font-semibold">Online Experience</p>
            <p className="text-sm text-gray-500">Join from anywhere via video call</p>
            {meetingLink && (
              <a
                href={meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 px-4 py-2 bg-[#0094CA] text-white rounded-lg text-sm font-medium hover:bg-[#007ba8] transition"
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
    <div className="py-6 border-b border-gray-100">
      <h2 className="text-xl font-bold mb-4">Where we&apos;ll meet</h2>
      <div className="bg-gray-200 rounded-xl h-48 flex items-center justify-center relative overflow-hidden">
        {/* Placeholder map */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-8 h-8 bg-[#0094CA] rounded-full flex items-center justify-center">
            <FiMapPin className="text-white" size={16} />
          </div>
        </div>
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
            className="text-sm font-medium text-[#0094CA] hover:text-[#007ba8] transition flex items-center gap-1"
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
    <div className="py-6">
      <h2 className="text-xl font-bold mb-4">Guest Reviews</h2>

      {/* Rating Summary */}
      <div className="flex gap-8 mb-6">
        <div className="text-center">
          <p className="text-4xl font-bold">{rating?.toFixed(1) ?? "N/A"}</p>
          <div className="flex justify-center gap-0.5 my-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <FiStar
                key={star}
                size={14}
                className={star <= (rating ?? 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
              />
            ))}
          </div>
          <p className="text-sm text-gray-500">{totalReviews} reviews</p>
        </div>

        {/* Distribution Bars */}
        <div className="flex-1 space-y-1">
          {distribution.map(({ stars, percent }) => (
            <div key={stars} className="flex items-center gap-2">
              <span className="text-sm w-3">{stars}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0094CA] rounded-full"
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
          <div key={review.id} className="pb-4 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-semibold">
                {review.name?.[0] ?? "G"}
              </div>
              <div>
                <p className="font-semibold">{review.name ?? "Guest"}</p>
                <p className="text-xs text-gray-500">
                  {format(new Date(review.created_at), "MMMM yyyy")}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600">&quot;{review.description}&quot;</p>
          </div>
        ))}
      </div>

      {totalReviews > 3 && (
        <button
          onClick={onShowAll}
          className="text-[#0094CA] text-sm font-medium mt-4 hover:underline"
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
    <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto site-x py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-xl font-bold">All photos</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 text-2xl"
          >
            ×
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`Photo ${i + 1}`}
              className="w-full h-64 object-cover rounded-lg"
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
  const [userId, setUserId] = useState<string | null>(null);
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  useEffect(() => {
    setUserId(localStorage.getItem("msm_user_id"));
  }, []);

  const { data: event, isLoading: eventLoading } = useEvent(resolvedParams.id);
  const { data: host } = usePublicHostProfile(event?.host_id ?? null);
  const { data: reviews } = useReviewsByEvent(resolvedParams.id);
  const { data: ratingData } = useEventRating(resolvedParams.id);
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
        { onSuccess: () => toast.success("Removed from saved") }
      );
    } else {
      saveExperience.mutate(
        { user_id: userId, event_id: resolvedParams.id },
        { onSuccess: () => toast.success("Saved to your list") }
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
      toast.error("Please login to book this experience");
      return;
    }
    if (!date) {
      toast.error("Please select a date");
      return;
    }
    const encodedDate = encodeURIComponent(date);
    router.push(`/experience/${resolvedParams.id}/book?date=${encodedDate}&guests=${guests}`);
  };

  // Parse description for "The Plan" section (simple implementation)
  const planItems: PlanItem[] = event?.description
    ? [
        { title: "Introduction & Welcome", description: "Meet the host and fellow guests", duration: "15 mins" },
        { title: "Main Activity", description: event.description.slice(0, 150) + "...", duration: "1 hour 30 mins" },
        { title: "Wrap Up & Q&A", description: "Final thoughts and questions", duration: "15 mins" },
      ]
    : [];

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0094CA]" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <p className="text-xl text-gray-600 mb-4">Experience not found</p>
        <Link href="/" className="text-[#0094CA] hover:underline">
          Go back home
        </Link>
      </div>
    );
  }

  const allImages = event.cover_image_url
    ? [event.cover_image_url, ...(event.gallery_urls ?? [])]
    : (event.gallery_urls ?? []);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto site-x py-6">
          {/* Breadcrumb */}
          <nav className="text-sm mb-4">
            <Link href="/" className="text-gray-500 hover:text-gray-700">Home</Link>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-500">Experiences</span>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-900">{event.mood ?? "Experience"}</span>
          </nav>

          {/* Title and Actions */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{event.title}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="flex items-center gap-1 text-gray-600">
                  <FiMapPin size={14} />
                  {event.is_online ? (
                    "Online"
                  ) : event.google_maps_url ? (
                    <a
                      href={event.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0094CA] hover:text-[#007ba8] underline transition"
                    >
                      View on Maps
                    </a>
                  ) : (
                    event.location ?? "Location TBD"
                  )}
                </span>
                {ratingData && (
                  <span className="flex items-center gap-1">
                    <FiStar className="text-yellow-400 fill-yellow-400" size={14} />
                    <span className="font-semibold">{ratingData.avg_rating?.toFixed(1)}</span>
                    <span className="text-gray-500">({ratingData.total_reviews} reviews)</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                className={`p-2 rounded-lg border transition ${
                  isSaved ? "border-[#0094CA] text-[#0094CA] bg-[#0094CA]/5" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <FiBookmark size={20} className={isSaved ? "fill-current" : ""} />
              </button>
              <button
                onClick={handleShare}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
              >
                <FiShare2 size={20} />
              </button>
            </div>
          </div>

          {/* Photo Gallery */}
          <PhotoGallery
            coverImage={event.cover_image_url}
            gallery={event.gallery_urls}
            onShowAll={() => setShowAllPhotos(true)}
          />

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8 mt-8">
            {/* Left Column - Details */}
            <div className="lg:col-span-2">
              <InfoPills
                duration={event.duration_minutes}
                groupSize={{ min: event.min_group_size, max: event.max_group_size }}
              />

              {/* About the Experience */}
              <div className="py-6 border-b border-gray-100">
                <h2 className="text-xl font-bold mb-4">About the experience</h2>
                <p className="text-gray-600 whitespace-pre-line">
                  {event.description ?? "No description available."}
                </p>
                {event.hook_line && (
                  <p className="text-gray-600 mt-4 italic">{event.hook_line}</p>
                )}
              </div>

              {/* The Plan */}
              {/* <ThePlan items={planItems} /> */}

              {/* Meet Your Host */}
              <MeetYourHost
                host={host ?? null}
                onContact={() => toast.info("Contact feature coming soon!")}
                onViewProfile={() => router.push(`/host/${event.host_id}`)}
              />

              {/* Where We'll Meet */}
              <WhereWellMeet location={event.location} isOnline={event.is_online} meetingLink={event.meeting_link} googleMapsUrl={event.google_maps_url} />

              {/* Guest Reviews */}
              <GuestReviews
                reviews={reviews ?? []}
                rating={ratingData?.avg_rating ?? null}
                totalReviews={ratingData?.total_reviews ?? 0}
                onShowAll={() => toast.info("All reviews modal coming soon!")}
              />
            </div>

            {/* Right Column - Booking Widget */}
            <div className="lg:col-span-1">
              <BookingWidget
                price={event.price_cents}
                isFree={event.is_free}
                rating={ratingData?.avg_rating ?? null}
                totalReviews={ratingData?.total_reviews ?? 0}
                eventId={event.id}
                eventDate={event.time}
                capacity={event.capacity}
                totalBookings={event.total_bookings}
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
    </>
  );
}
