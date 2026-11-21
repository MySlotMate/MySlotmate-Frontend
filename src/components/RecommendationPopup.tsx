/**
 * Event Recommendation Popup Component
 * Shows a recommended similar event to the user after booking
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  FiX,
  FiCalendar,
  FiUsers,
  FiClock,
  FiArrowRight,
} from "react-icons/fi";
import { formatIST } from "~/lib/datetime";
import type { EventDTO } from "~/lib/api";
import { eventPriceLabel } from "~/lib/price";

interface RecommendationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventDTO | null;
  reason?: string;
}

export function RecommendationPopup({
  isOpen,
  onClose,
  event,
  reason = "We think you'll love this experience too!",
}: RecommendationPopupProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  if (!isOpen || !event) return null;

  const eventDate = new Date(event.time);
  // Descriptions are saved rich-text HTML; show it as plain text here.
  const blurb =
    event.hook_line ??
    (event.description ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const spotsLeft = event.capacity - event.total_bookings;

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 300);
  };

  return createPortal(
    <div
      className={`msm-modal fixed inset-0 z-[300] flex items-center justify-center p-4 transition-opacity duration-300 ${
        isAnimating ? "bg-black/40" : "pointer-events-none bg-black/0"
      }`}
      onClick={handleClose}
    >
      {/* Modal */}
      <div
        className={`w-full max-w-md transform overflow-hidden rounded-[20px] border border-white/10 bg-[#131328] text-white shadow-2xl transition-all duration-300 ${
          isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="relative">
          {/* Event Image */}
          {/* 4:5 poster centred over a blurred fill of itself */}
          <div className="relative flex h-60 w-full items-center justify-center overflow-hidden bg-[#1B1C33] py-4">
            {event.cover_image_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.cover_image_url}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-xl"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.cover_image_url}
                  alt={event.title}
                  className="relative aspect-[4/5] h-full rounded-xl object-cover shadow-lg"
                />
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/40">
                No image
              </div>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 flex items-center justify-center rounded-full bg-black/50 p-2 text-white backdrop-blur-md transition hover:bg-black/70"
          >
            <FiX size={20} />
          </button>

          {/* Recommendation badge */}
          <div className="absolute top-3 left-3 rounded-full bg-gradient-to-r from-[#7038F5] to-[#B724EA] px-3 py-1 text-xs font-medium text-white">
            ✨ Recommended for you
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Reason */}
          <p className="mb-2 text-sm font-medium text-[#D8B4FE]">{reason}</p>

          {/* Mood tag */}
          {event.mood && (
            <div className="mb-3 flex gap-2">
              <span className="rounded-md bg-[#9333EA] px-2 py-1 text-[11px] font-bold tracking-wider text-white">
                {event.mood.toUpperCase()}
              </span>
            </div>
          )}

          {/* Title */}
          <h3 className="font-outfit mb-3 text-lg font-bold text-white">
            {event.title}
          </h3>

          {/* Quick info */}
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-white/65">
              <FiCalendar size={14} className="text-[#D8B4FE]" />
              <span>{formatIST(eventDate, "EEE, MMM d")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/65">
              <FiClock size={14} className="text-[#D8B4FE]" />
              <span>
                {formatIST(eventDate, "h:mm a")} •{" "}
                {event.duration_minutes ?? 60} min
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/65">
              <FiUsers size={14} className="text-[#D8B4FE]" />
              <span>{spotsLeft} slots left</span>
            </div>
          </div>

          {/* Description snippet */}
          {blurb && (
            <p className="mb-4 line-clamp-2 text-sm text-white/60">{blurb}</p>
          )}

          {/* Price and CTA section */}
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <div>
              <p className="text-xs text-white/50">Price per person</p>
              <p className="text-xl font-bold text-[#D8B4FE]">
                {eventPriceLabel(event)}
              </p>
            </div>
            <Link
              href={`/experience/${event.slug}`}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7038F5] to-[#B724EA] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              View <FiArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
