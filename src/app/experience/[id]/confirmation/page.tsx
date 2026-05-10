"use client";

import { use, Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "~/components/Navbar";
import Breadcrumb from "~/components/Breadcrumb";
import { RecommendationPopup } from "~/components/RecommendationPopup";
import {
  useEvent,
  usePublicHostProfile,
  useListPublicEvents,
} from "~/hooks/useApi";
import { FiCheck, FiCalendar, FiMessageCircle } from "react-icons/fi";
import { format } from "date-fns";
import { getRecommendedEventSync } from "~/lib/recommendations";
import type { EventDTO } from "~/lib/api";

export const runtime = "edge";

/* ------------------------------------------------------------------ */
/*  Confirmation Content Component                                     */
/* ------------------------------------------------------------------ */
function ConfirmationContent({ eventId }: { eventId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [recommendedEvent, setRecommendedEvent] = useState<EventDTO | null>(
    null,
  );
  const [reason, setReason] = useState("");

  // Can use booking ID for additional details if needed
  void searchParams.get("booking");

  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: host } = usePublicHostProfile(event?.host_id ?? null);
  const { data: allEvents } = useListPublicEvents();

  // Get recommendation when event data is loaded
  useEffect(() => {
    if (event && allEvents && allEvents.length > 0) {
      const result = getRecommendedEventSync(event, allEvents);
      if (result.recommendedEvent) {
        setRecommendedEvent(result.recommendedEvent);
        setReason(result.reason);
        // Show recommendation popup after a delay
        setTimeout(() => setShowRecommendation(true), 800);
      }
    }
  }, [event, allEvents]);

  if (eventLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0094CA]" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <p className="mb-4 text-xl text-gray-600">Experience not found</p>
        <Link href="/" className="text-[#0094CA] hover:underline">
          Go back home
        </Link>
      </div>
    );
  }

  const eventDate = new Date(event.time);

  return (
    <main className="min-h-screen bg-gray-50 py-16">
      <div className="site-x mx-auto max-w-lg text-center">
        {/* Success Checkmark */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500">
            <FiCheck className="text-white" size={32} />
          </div>
        </div>

        {/* Success Message */}
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Your Experience is confirmed
        </h1>
        <p className="mb-8 text-gray-500">
          We&apos;ve notified {host?.first_name ?? "the host"} about your
          booking. You&apos;re all set for the {event.title}.
        </p>

        {/* Booking Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm">
          <div className="flex gap-4">
            {/* Image */}
            <div className="h-24 w-28 shrink-0 overflow-hidden rounded-lg">
              {event.cover_image_url ? (
                <img
                  src={event.cover_image_url}
                  alt={event.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-200 text-sm text-gray-400">
                  No image
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1">
              <h3 className="mb-2 font-semibold text-gray-900">
                {event.title}
              </h3>
              <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
                <FiCalendar size={14} className="text-gray-400" />
                <span>{format(eventDate, "EEEE, MMM d")}</span>
              </div>
              <div className="mb-2 text-sm text-gray-500">
                {format(eventDate, "h:mm a")} - Duration:{" "}
                {event.duration_minutes ?? 60} min
              </div>

              {/* Host */}
              <div className="mt-3 flex items-center gap-2">
                {host?.avatar_url ? (
                  <img
                    src={host.avatar_url}
                    alt={host.first_name}
                    loading="lazy"
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0094CA] text-xs font-bold text-white">
                    {host?.first_name?.[0] ?? "H"}
                  </div>
                )}
                <span className="text-xs text-gray-500">
                  Hosted by{" "}
                  <span className="font-medium text-gray-700">
                    {host?.first_name ?? "Host"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Unlocked Notice */}
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-[#0094CA]/20 bg-[#0094CA]/5 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0094CA]">
            <FiMessageCircle className="text-white" size={16} />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900">Chat Unlocked</p>
            <p className="text-sm text-gray-600">
              The chat for this experience is now unlocked. You can reach out to{" "}
              {host?.first_name ?? "the host"} anytime to coordinate details.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => router.push("/activities")}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0094CA] py-3 font-semibold text-white transition hover:bg-[#007ba8]"
          >
            <FiCalendar size={18} />
            Go to My Bookings
          </button>
          {/* <button
            onClick={() => router.push("/calendar")}
            className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2"
          >
            <FiCalendar size={18} />
            View Calendar
          </button> */}
        </div>

        {/* Back to Browse */}
        <p className="mt-6 text-sm text-gray-500">
          <Link href="/" className="text-[#0094CA] hover:underline">
            Browse more experiences
          </Link>
        </p>
      </div>

      {/* Recommendation Popup */}
      <RecommendationPopup
        isOpen={showRecommendation}
        onClose={() => setShowRecommendation(false)}
        event={recommendedEvent}
        reason={reason}
      />
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
      <div className="site-x mx-auto max-w-xl py-6">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Experiences", href: "/experiences" },
            { label: "Confirmation" },
          ]}
          className="mb-6"
        />
      </div>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0094CA]" />
          </div>
        }
      >
        <ConfirmationContent eventId={resolvedParams.id} />
      </Suspense>
    </>
  );
}
