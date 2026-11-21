"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  useSavedExperiences,
  useListPublicEvents,
  useUnsaveExperience,
} from "~/hooks/useApi";
import { type EventDTO } from "~/lib/api";
import { eventPriceLabel } from "~/lib/price";
import * as components from "~/components";
import { FiBookmark, FiTrash2, FiMapPin, FiVideo } from "react-icons/fi";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/hooks/useApi";
import Breadcrumb from "~/components/Breadcrumb";
import EventCover from "~/components/EventCover";

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
    <main className="min-h-screen bg-gradient-to-br from-[#241333] to-[#121426]">
      <components.Navbar />

      <div className="site-x mx-auto w-full max-w-[1120px] py-12 pt-28">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Saved Experiences" }]}
          className="mb-8"
        />
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white">Saved Experiences</h1>
          <p className="mt-3 text-lg text-[#A5A8C3]">
            {savedWithEvents.length}{" "}
            {savedWithEvents.length === 1 ? "experience" : "experiences"} saved
          </p>
        </div>

        {/* Loading State */}
        {savedLoading && isHydrated ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#A020F0] border-t-transparent" />
              <p className="text-[#A5A8C3]">
                Loading your saved experiences...
              </p>
            </div>
          </div>
        ) : savedWithEvents.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {savedWithEvents.map(({ saved, event }) => (
              <div
                key={saved.id}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121426] transition-all duration-300 hover:shadow-xl"
              >
                {/* Image Container */}
                <div className="relative aspect-[4/5] overflow-hidden bg-white/10">
                  <EventCover
                    src={event.cover_image_url}
                    alt={event.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {/* Badge */}
                  {event.mood && (
                    <div className="absolute top-2 left-2 max-w-[calc(100%-56px)] truncate rounded-full bg-[#A020F0] px-2 py-0.5 text-[10px] font-semibold text-white sm:top-3 sm:left-3 sm:px-3 sm:py-1.5 sm:text-xs">
                      {event.mood}
                    </div>
                  )}

                  {/* Delete Button Overlay */}
                  <button
                    onClick={() => handleUnsave(event.id)}
                    disabled={removingId === event.id}
                    className="absolute top-2 right-2 rounded-full bg-[#121426] p-2 text-[#D8B4FE] shadow-md transition-all hover:bg-red-500/10 hover:text-red-400 hover:shadow-lg disabled:opacity-60 sm:top-3 sm:right-3 sm:p-2.5"
                    title="Remove from saved"
                  >
                    {removingId === event.id ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <FiTrash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </button>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col justify-between p-3 sm:p-5">
                  {/* Title and Description */}
                  <div>
                    <Link href={`/experience/${event.slug}`}>
                      <h3 className="line-clamp-2 text-[13px] leading-snug font-bold text-white transition hover:text-[#D8B4FE] sm:text-base">
                        {event.title}
                      </h3>
                    </Link>
                    <p className="mt-2 line-clamp-2 hidden text-sm text-[#A5A8C3] sm:block">
                      {event.hook_line ?? event.description?.substring(0, 60)}
                    </p>

                    {/* Info */}
                    <div className="mt-2 flex flex-col gap-1 border-t border-white/10 pt-2 text-sm sm:mt-4 sm:flex-row sm:items-center sm:gap-4 sm:pt-3">
                      {(event.is_online || event.location) && (
                        <div className="flex flex-1 items-center gap-1.5 text-[#A5A8C3]">
                          {event.is_online ? (
                            <FiVideo className="h-4 w-4 flex-shrink-0 text-[#D8B4FE]" />
                          ) : (
                            <FiMapPin className="h-4 w-4 flex-shrink-0 text-[#D8B4FE]" />
                          )}
                          <span className="truncate text-xs">
                            {event.is_online ? "Online" : event.location}
                          </span>
                        </div>
                      )}
                      <div className="font-bold text-[#D8B4FE]">
                        {eventPriceLabel(event)}
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Link
                    href={`/experience/${event.slug}`}
                    className="mt-5 hidden w-full rounded-lg bg-[#A020F0] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-110 sm:block"
                  >
                    View Experience
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : isHydrated ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-[#241333]">
              <FiBookmark className="h-10 w-10 text-[#D8B4FE]" />
            </div>
            <p className="mb-2 text-2xl font-bold text-white">
              No saved experiences
            </p>
            <p className="mb-8 max-w-md text-[#A5A8C3]">
              Start exploring and save your favorite experiences to view them
              later.
            </p>
            <Link
              href="/experiences"
              className="rounded-lg bg-[#A020F0] px-6 py-3 font-semibold text-white shadow-md transition hover:shadow-lg hover:brightness-110"
            >
              Explore Experiences
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
