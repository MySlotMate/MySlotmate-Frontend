"use client";

import { useState } from "react";
import { Images } from "lucide-react";
import type { EventDTO } from "~/lib/api";
import { Lightbox } from "./PhotoKit";

/**
 * Photos a host added to an experience, shown to everyone who went: on
 * their profile and in their journey, so the memory stays with them too.
 *
 * - "chip": a small "6 photos" button, for cards.
 * - "strip": a row of thumbnails, for the journey timeline.
 */
export default function EventPhotos({
  event,
  variant = "chip",
}: {
  event: Pick<EventDTO, "title" | "gallery_urls">;
  variant?: "chip" | "strip";
}) {
  const photos = (event.gallery_urls ?? []).filter(Boolean);
  const [open, setOpen] = useState<number | null>(null);
  if (!photos.length) return null;

  const viewer = open !== null && (
    <Lightbox
      title={event.title}
      photos={photos}
      start={open}
      removable={new Set()}
      onClose={() => setOpen(null)}
    />
  );

  if (variant === "chip") {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            // Cards are often links; open the photos instead.
            e.preventDefault();
            e.stopPropagation();
            setOpen(0);
          }}
          className="flex items-center gap-1.5 rounded-full bg-[#A020F0]/15 px-2.5 py-1 text-[11px] font-semibold text-[#E9D5FF] transition hover:bg-[#A020F0]/25"
        >
          <Images className="h-3.5 w-3.5" />
          {photos.length} photo{photos.length === 1 ? "" : "s"}
        </button>
        {viewer}
      </>
    );
  }

  // Five across the card's full width; the last shows "+N" for the rest.
  const shown = photos.slice(0, 5);
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-white/50">
        <Images className="h-3.5 w-3.5 text-[#D8B4FE]" /> Photos from the host
      </p>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {shown.map((url, i) => {
          const more = i === shown.length - 1 && photos.length > shown.length;
          return (
            <button
              key={url}
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Open photo ${i + 1} from ${event.title}`}
              className="relative aspect-square w-full min-w-0 overflow-hidden rounded-lg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition hover:scale-105"
              />
              {more && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-bold text-white">
                  +{photos.length - shown.length + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {viewer}
    </div>
  );
}
