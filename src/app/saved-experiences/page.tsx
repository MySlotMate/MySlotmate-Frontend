"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  useSavedExperiences,
  useListPublicEvents,
  useUnsaveExperience,
} from "~/hooks/useApi";
import { type EventDTO } from "~/lib/api";
import * as components from "~/components";
import { FiBookmark, FiTrash2, FiMapPin } from "react-icons/fi";
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
    setUserId(
      storedUserId && storedUserId !== "existing" ? storedUserId : null,
    );
    setIsHydrated(true);
  }, []);

  // Fetch user's saved experiences
  const { data: savedExperiences, isLoading: savedLoading } =
    useSavedExperiences(userId);

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

  const handleUnsave = (eventId: string) => {
    if (!userId) return;
    setRemovingId(eventId);
    unsave(
      { eventId, userId },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.savedExperiences(userId),
          });
          setRemovingId(null);
        },
        onError: () => {
          setRemovingId(null);
        },
      },
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <components.Navbar />

      <div className="site-x mx-auto w-full max-w-[1120px] py-12 pt-28">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Saved Experiences" }]}
          className="mb-8"
        />
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900">
            Saved Experiences
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            {savedWithEvents.length}{" "}
            {savedWithEvents.length === 1 ? "experience" : "experiences"} saved
          </p>
        </div>

        {/* Loading State */}
        {savedLoading && isHydrated ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#0094CA] border-t-transparent" />
              <p className="text-gray-600">Loading your saved experiences...</p>
            </div>
          </div>
        ) : savedWithEvents.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {savedWithEvents.map(({ saved, event }) => (
              <div
                key={saved.id}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-300 hover:shadow-xl"
              >
                {/* Image Container */}
                <div className="relative aspect-video overflow-hidden bg-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      event.cover_image_url ?? "/assets/home/placeholder.jpg"
                    }
                    alt={event.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {/* Badge */}
                  {event.mood && (
                    <div className="absolute top-3 left-3 rounded-full bg-[#0094CA] px-3 py-1.5 text-xs font-semibold text-white">
                      {event.mood}
                    </div>
                  )}

                  {/* Delete Button Overlay */}
                  <button
                    onClick={() => handleUnsave(event.id)}
                    disabled={removingId === event.id}
                    className="absolute top-3 right-3 rounded-full bg-white p-2.5 text-[#0094CA] shadow-md transition-all hover:bg-red-50 hover:text-red-500 hover:shadow-lg disabled:opacity-60"
                    title="Remove from saved"
                  >
                    {removingId === event.id ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <FiTrash2 className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col justify-between p-5">
                  {/* Title and Description */}
                  <div>
                    <Link href={`/experience/${event.id}`}>
                      <h3 className="line-clamp-2 text-base font-bold text-gray-900 transition hover:text-[#0094CA]">
                        {event.title}
                      </h3>
                    </Link>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                      {event.hook_line ?? event.description?.substring(0, 60)}
                    </p>

                    {/* Info */}
                    <div className="mt-4 flex items-center gap-4 border-t border-gray-100 pt-3 text-sm">
                      {event.location && (
                        <div className="flex flex-1 items-center gap-1.5 text-gray-600">
                          <FiMapPin className="h-4 w-4 flex-shrink-0 text-[#0094CA]" />
                          <span className="truncate text-xs">
                            {event.location}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 font-bold text-[#0094CA]">
                        <span className="inline-flex h-4 w-4 items-center justify-center text-sm leading-none font-bold">
                          ₹
                        </span>
                        {formatPrice(event.price_cents)}
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Link
                    href={`/experience/${event.id}`}
                    className="mt-5 w-full rounded-lg bg-[#0094CA] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-[#0076a3] hover:shadow-md"
                  >
                    View Experience
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : isHydrated ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
              <FiBookmark className="h-10 w-10 text-[#0094CA]" />
            </div>
            <p className="mb-2 text-2xl font-bold text-gray-900">
              No saved experiences
            </p>
            <p className="mb-8 max-w-md text-gray-600">
              Start exploring and save your favorite experiences to view them
              later.
            </p>
            <Link
              href="/experiences"
              className="rounded-lg bg-[#0094CA] px-6 py-3 font-semibold text-white shadow-md transition hover:bg-[#0076a3] hover:shadow-lg"
            >
              Explore Experiences
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
