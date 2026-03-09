"use client";

import { use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "~/components/Navbar";
import { useEvent, usePublicHostProfile } from "~/hooks/useApi";
import { FiCheck, FiCalendar, FiMessageCircle } from "react-icons/fi";
import { format } from "date-fns";

/* ------------------------------------------------------------------ */
/*  Confirmation Content Component                                     */
/* ------------------------------------------------------------------ */
function ConfirmationContent({ eventId }: { eventId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Can use booking ID for additional details if needed
  void searchParams.get("booking");

  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: host } = usePublicHostProfile(event?.host_id ?? null);

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0094CA]" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-xl text-gray-600 mb-4">Experience not found</p>
        <Link href="/" className="text-[#0094CA] hover:underline">
          Go back home
        </Link>
      </div>
    );
  }

  const eventDate = new Date(event.time);

  return (
    <main className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-lg mx-auto px-4 text-center">
        {/* Success Checkmark */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center">
            <FiCheck className="text-white" size={32} />
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Your Experience is confirmed
        </h1>
        <p className="text-gray-500 mb-8">
          We&apos;ve notified {host?.first_name ?? "the host"} about your booking. You&apos;re all set for the {event.title}.
        </p>

        {/* Booking Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-left shadow-sm">
          <div className="flex gap-4">
            {/* Image */}
            <div className="w-28 h-24 rounded-lg overflow-hidden flex-shrink-0">
              {event.cover_image_url ? (
                <img
                  src={event.cover_image_url}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                  No image
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <FiCalendar size={14} className="text-gray-400" />
                <span>{format(eventDate, "EEEE, MMM d")}</span>
              </div>
              <div className="text-sm text-gray-500 mb-2">
                {format(eventDate, "h:mm a")} - Duration: {event.duration_minutes ?? 60} min
              </div>

              {/* Host */}
              <div className="flex items-center gap-2 mt-3">
                {host?.avatar_url ? (
                  <img
                    src={host.avatar_url}
                    alt={host.first_name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#0094CA] flex items-center justify-center text-white text-xs font-bold">
                    {host?.first_name?.[0] ?? "H"}
                  </div>
                )}
                <span className="text-xs text-gray-500">
                  Hosted by <span className="font-medium text-gray-700">{host?.first_name ?? "Host"}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Unlocked Notice */}
        <div className="mt-6 bg-[#0094CA]/5 border border-[#0094CA]/20 rounded-lg p-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-[#0094CA] rounded-lg flex items-center justify-center flex-shrink-0">
            <FiMessageCircle className="text-white" size={16} />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900">Chat Unlocked</p>
            <p className="text-sm text-gray-600">
              The chat for this experience is now unlocked. You can reach out to {host?.first_name ?? "the host"} anytime to coordinate details.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => router.push("/bookings")}
            className="flex-1 py-3 bg-[#0094CA] hover:bg-[#007ba8] text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
          >
            <FiCalendar size={18} />
            Go to My Bookings
          </button>
          <button
            onClick={() => router.push("/calendar")}
            className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2"
          >
            <FiCalendar size={18} />
            View Calendar
          </button>
        </div>

        {/* Back to Browse */}
        <p className="mt-6 text-sm text-gray-500">
          <Link href="/" className="text-[#0094CA] hover:underline">
            Browse more experiences
          </Link>
        </p>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */
export default function ConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);

  return (
    <>
      <Navbar />
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0094CA]" />
          </div>
        }
      >
        <ConfirmationContent eventId={resolvedParams.id} />
      </Suspense>
    </>
  );
}
