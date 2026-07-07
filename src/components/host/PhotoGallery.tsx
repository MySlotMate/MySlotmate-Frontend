"use client";

import { useState } from "react";
import { FaInstagram } from "react-icons/fa";

const INITIAL_VISIBLE = 4;

export default function PhotoGallery({
  images,
  instagramUrls = [],
}: {
  images: string[];
  /** Subset of `images` sourced from the host's Instagram — badged with an IG icon */
  instagramUrls?: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const instagramSet = new Set(instagramUrls);

  const hasOverflow = images.length > INITIAL_VISIBLE;
  const visible =
    hasOverflow && !expanded ? images.slice(0, INITIAL_VISIBLE) : images;
  const hiddenCount = images.length - INITIAL_VISIBLE;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {visible.map((img, i) => (
          <div
            key={i}
            className="relative aspect-4/3 overflow-hidden rounded-xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img}
              alt={`Gallery ${i + 1}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
            {instagramSet.has(img) && (
              <span
                title="From Instagram"
                className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#E1306C] shadow ring-1 ring-black/5 backdrop-blur"
              >
                <FaInstagram className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        ))}
      </div>

      {hasOverflow && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full border border-[#bdddf480] bg-white px-5 py-2 text-xs font-extrabold tracking-[0.06em] text-[#0e8ae0] uppercase shadow-sm transition hover:bg-[#0e8ae0] hover:text-white"
          >
            {expanded ? "Show less" : `Show ${hiddenCount} more`}
          </button>
        </div>
      )}
    </div>
  );
}
