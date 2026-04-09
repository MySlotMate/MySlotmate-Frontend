"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSavedExperiences, useListPublicEvents, useUnsaveExperience } from "~/hooks/useApi";
import { type EventDTO } from "~/lib/api";
import * as components from "~/components";
import { FiBookmark, FiTrash2, FiMapPin, FiDollarSign } from "react-icons/fi";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/hooks/useApi";
import Breadcrumb from "~/components/Breadcrumb";

interface SavedExperienceWithEvent {
  saved: {
    id: string;
    user_id: string;
    event_id: string;
    saved_at: string;
  };
  event: EventDTO;
}

export default function SavedExperiencesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const storedUserId = localStorage.getItem("msm_user_id");
    setUserId(storedUserId && storedUserId !== "existing" ? storedUserId : null);
    setIsHydrated(true);
  }, []);

  // Fetch user's saved experiences
  const { data: savedExperiences, isLoading: savedLoading } = useSavedExperiences(userId);

  // Fetch all public events to get event details
  const { data: allEvents } = useListPublicEvents();

  // Mutation for unsaving
  const { mutate: unsave } = useUnsaveExperience();

  // Merge saved experiences with event details
  const savedWithEvents: SavedExperienceWithEvent[] = (savedExperiences ?? [])
    .map((saved) => {
      const event = allEvents?.find((e: EventDTO) => e.id === saved.event_id);
      return { saved, event: event! };
    })
    .filter(({ event }) => event);

  const formatPrice = (priceCents: number | null | undefined) => {
    if (!priceCents) return "Free";
    return `₹${(priceCents / 100).toFixed(0)}`;
  };

  const handleUnsave = async (eventId: string) => {
    if (!userId) return;
    setRemovingId(eventId);
    try {
      unsave(
        { eventId, userId },
        {
          onSuccess: () => {
            // Invalidate the saved experiences query to refresh
            void queryClient.invalidateQueries({
              queryKey: queryKeys.savedExperiences(userId),
            });
            setRemovingId(null);
          },
          onError: () => {
            setRemovingId(null);
          },
        }
      );
    } catch {
      setRemovingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <components.Navbar />

      <div className="mx-auto w-full max-w-[1120px] site-x py-8 pt-24">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Saved Experiences" }]} className="mb-6" />
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Saved Experiences</h1>
          <p className="text-gray-600 mt-2">
            {savedWithEvents.length} {savedWithEvents.length === 1 ? "experience" : "experiences"} saved
          </p>
        </div>

        {/* Loading State */}
        {savedLoading && isHydrated ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0094CA] border-t-transparent" />
          </div>
        ) : savedWithEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedWithEvents.map(({ saved, event }) => (
              <div
                key={saved.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow group"
              >
                {/* Image Container */}
                <div className="relative overflow-hidden bg-gray-200 aspect-video">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={event.cover_image_url ?? "/assets/home/placeholder.jpg"}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Unsave Button Overlay */}
                  <button
                    onClick={() => handleUnsave(event.id)}
                    disabled={removingId === event.id}
                    className="absolute top-3 right-3 bg-white text-red-600 p-2.5 rounded-full shadow-md hover:bg-red-50 transition disabled:opacity-50"
                    title="Remove from saved"
                  >
                    {removingId === event.id ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                    ) : (
                      <FiTrash2 className="h-5 w-5" />
                    )}
                  </button>
                  {/* Badge */}
                  {event.mood && (
                    <div className="absolute top-3 left-3 bg-[#0094CA] text-white px-2 py-1 rounded-full text-xs font-medium">
                      {event.mood}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col justify-between h-48">
                  {/* Title and Description */}
                  <div>
                    <Link href={`/experience/${event.id}`}>
                      <h3 className="font-semibold text-gray-900 hover:text-[#0094CA] transition line-clamp-2">
                        {event.title}
                      </h3>
                    </Link>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {event.hook_line ?? event.description?.substring(0, 60)}
                    </p>

                    {/* Info */}
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      {event.location && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <FiMapPin className="h-4 w-4 text-[#0094CA]" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 font-semibold text-[#0094CA]">
                        <FiDollarSign className="h-4 w-4" />
                        {formatPrice(event.price_cents)}
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Link
                    href={`/experience/${event.id}`}
                    className="mt-4 w-full px-4 py-2 bg-[#0094CA] text-white rounded-lg hover:bg-[#0076a3] transition font-medium text-center text-sm"
                  >
                    View Experience
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : isHydrated ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4">
              <FiBookmark className="h-12 w-12 text-gray-300 mx-auto" />
            </div>
            <p className="text-lg text-gray-600 mb-4">No saved experiences</p>
            <p className="text-gray-500 mb-6 max-w-sm">
              Start exploring and save your favorite experiences to view them later.
            </p>
            <Link
              href="/experiences"
              className="px-6 py-2 bg-[#0094CA] text-white rounded-lg hover:bg-[#0076a3] transition font-medium"
            >
              Explore Experiences
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
