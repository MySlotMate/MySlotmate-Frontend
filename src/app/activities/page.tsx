"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useBookingsByUser, useListPublicEvents } from "~/hooks/useApi";
import { type BookingDTO, type EventDTO } from "~/lib/api";
import * as components from "~/components";
import { InboxSidebar, ReviewModal } from "~/components/activities";
import { FiCalendar, FiUsers, FiXCircle, FiCheck, FiMessageCircle, FiStar } from "react-icons/fi";
import Breadcrumb from "~/components/Breadcrumb";

interface BookingWithEvent {
  booking: BookingDTO;
  event: EventDTO;
}

export default function ActivitiesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeInboxEventId, setActiveInboxEventId] = useState<string | null>(
    null,
  );
  const [activeReviewEventId, setActiveReviewEventId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const storedUserId = localStorage.getItem("msm_user_id");
    setUserId(
      storedUserId && storedUserId !== "existing" ? storedUserId : null,
    );
    setIsHydrated(true);
  }, []);

  // Fetch user's bookings
  const { data: bookings, isLoading: bookingsLoading } =
    useBookingsByUser(userId);

  // Fetch all public events to get event details
  const { data: allEvents } = useListPublicEvents();

  // Merge bookings with event details
  const bookingsWithEvents: BookingWithEvent[] = (bookings ?? [])
    .map((booking) => {
      const event = allEvents?.find((e: EventDTO) => e.id === booking.event_id);
      return { booking, event: event! };
    })
    .filter(({ event }) => event); // Only show if event exists

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (priceCents: number | null | undefined) => {
    if (!priceCents) return "Free";
    return `₹${(priceCents / 100).toFixed(0)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
      case "refunded":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <FiCheck className="h-4 w-4" />;
      case "pending":
        return <FiCalendar className="h-4 w-4" />;
      case "cancelled":
      case "refunded":
        return <FiXCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <components.Navbar />

      <div className="site-x mx-auto w-full max-w-[1120px] py-8">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "My Bookings" }]}
          className="mb-6"
        />
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="mt-2 text-gray-600">
            {bookingsWithEvents.length}{" "}
            {bookingsWithEvents.length === 1 ? "booking" : "bookings"}
          </p>
        </div>

        {/* Loading State */}
        {bookingsLoading && isHydrated ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0094CA] border-t-transparent" />
          </div>
        ) : bookingsWithEvents.length > 0 ? (
          <div className="space-y-4">
            {bookingsWithEvents.map(({ booking, event }) => (
              <div
                key={booking.id}
                className="overflow-hidden rounded-lg border border-gray-200 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col gap-6 p-6 md:flex-row">
                  {/* Event Image */}
                  <div className="shrink-0 md:w-48">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        event.cover_image_url ?? "/assets/home/placeholder.jpg"
                      }
                      alt={event.title}
                      loading="lazy"
                      className="h-40 w-full rounded-lg object-cover"
                    />
                  </div>

                  {/* Booking Details */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="mb-3 flex items-start justify-between">
                        <Link href={`/experience/${event.id}`}>
                          <h3 className="text-lg font-semibold text-gray-900 transition hover:text-[#0094CA]">
                            {event.title}
                          </h3>
                        </Link>
                        <span
                          className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(booking.status)}`}
                        >
                          {getStatusIcon(booking.status)}
                          {booking.status.charAt(0).toUpperCase() +
                            booking.status.slice(1)}
                        </span>
                      </div>

                      <p className="mb-4 text-gray-600">
                        {event.hook_line ??
                          event.description?.substring(0, 100)}
                      </p>

                      {/* Info Grid */}
                      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <FiCalendar className="h-4 w-4 text-[#0094CA]" />
                          <div>
                            <p className="text-xs text-gray-500">Date</p>
                            <p className="text-sm font-medium">
                              {formatDate(event.time)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-gray-700">
                          <FiUsers className="h-4 w-4 text-[#0094CA]" />
                          <div>
                            <p className="text-xs text-gray-500">Guests</p>
                            <p className="text-sm font-medium">
                              {booking.quantity}{" "}
                              {booking.quantity === 1 ? "person" : "people"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-gray-700">
                          <span className="inline-flex h-4 w-4 items-center justify-center text-sm font-bold leading-none text-[#0094CA]">
                            ₹
                          </span>
                          <div>
                            <p className="text-xs text-gray-500">Amount</p>
                            <p className="text-sm font-medium">
                              {formatPrice(booking.amount_cents)}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">Location</p>
                          {event.is_online ? (
                            event.meeting_link ? (
                              <a
                                href={event.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-[#0094CA] underline transition hover:text-[#007ba8]"
                              >
                                Join Meeting
                              </a>
                            ) : (
                              <p className="text-sm font-medium">Online</p>
                            )
                          ) : event.google_maps_url ? (
                            <a
                              href={event.google_maps_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-[#0094CA] underline transition hover:text-[#007ba8]"
                            >
                              View on Maps
                            </a>
                          ) : (
                            <p className="text-sm font-medium">
                              {event.location ?? "Location TBD"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setActiveInboxEventId(event.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#0094CA] px-4 py-2 text-sm font-medium text-[#0094CA] transition hover:bg-[#f0faff]"
                      >
                        <FiMessageCircle className="h-4 w-4" />
                        View Inbox
                      </button>
                      <button
                        onClick={() => setActiveReviewEventId(event.id)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#0094CA] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0076a3]"
                      >
                        <FiStar className="h-4 w-4" />
                        Add Review
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isHydrated ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4">
              <FiCalendar className="mx-auto h-12 w-12 text-gray-300" />
            </div>
            <p className="mb-4 text-lg text-gray-600">No bookings yet</p>
            <p className="mb-6 max-w-sm text-gray-500">
              You haven`&apos;t made any bookings. Explore experiences and book
              your first adventure!
            </p>
            <Link
              href="/experiences"
              className="rounded-lg bg-[#0094CA] px-6 py-2 font-medium text-white transition hover:bg-[#0076a3]"
            >
              Browse Experiences
            </Link>
          </div>
        ) : null}
      </div>

      {/* Inbox Sidebar */}
      {activeInboxEventId && userId && (
        <InboxSidebar
          eventId={activeInboxEventId}
          hostId={
            bookingsWithEvents.find((b) => b.event.id === activeInboxEventId)
              ?.event.host_id ?? ""
          }
          eventTitle={
            bookingsWithEvents.find((b) => b.event.id === activeInboxEventId)?.event.title ?? "Event"
          }
          participantCount={
            bookingsWithEvents.find((b) => b.event.id === activeInboxEventId)?.event.total_bookings ?? 0
          }
          userId={userId}
          isOpen={!!activeInboxEventId}
          onClose={() => setActiveInboxEventId(null)}
        />
      )}

      {/* Review Modal */}
      {activeReviewEventId && userId && (
        <ReviewModal
          eventId={activeReviewEventId}
          hostId={
            bookingsWithEvents.find((b) => b.event.id === activeReviewEventId)?.event.host_id ?? ""
          }
          eventTitle={
            bookingsWithEvents.find((b) => b.event.id === activeReviewEventId)
              ?.event.title ?? "Event"
          }
          userId={userId}
          isOpen={!!activeReviewEventId}
          onClose={() => setActiveReviewEventId(null)}
          onSuccess={() => {
            // Optional: show success message or refresh reviews
          }}
        />
      )}
    </main>
  );
}
