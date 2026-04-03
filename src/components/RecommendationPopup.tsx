/**
 * Event Recommendation Popup Component
 * Shows a recommended similar event to the user after booking
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiX, FiCalendar, FiUsers, FiClock, FiArrowRight } from "react-icons/fi";
import { format } from "date-fns";
import type { EventDTO } from "~/lib/api";

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
  const spotsLeft = event.capacity - event.total_bookings;
  const pricePerPerson = event.is_free ? 0 : (event.price_cents ?? 0) / 100;

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isAnimating ? "bg-black/40" : "bg-black/0 pointer-events-none"
      }`}
      onClick={handleClose}
    >
      {/* Modal */}
      <div
        className={`bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transition-all duration-300 transform ${
          isAnimating
            ? "scale-100 opacity-100"
            : "scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="relative">
          {/* Event Image */}
          <div className="w-full h-48 overflow-hidden bg-gray-200">
            {event.cover_image_url ? (
              <Image
                src={event.cover_image_url}
                alt={event.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No image
              </div>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition flex items-center justify-center"
          >
            <FiX size={20} className="text-gray-700" />
          </button>

          {/* Recommendation badge */}
          <div className="absolute top-3 left-3 bg-linear-to-r from-[#0094CA] to-[#007ba8] text-white px-3 py-1 rounded-full text-xs font-medium">
            ✨ Recommended for you
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Reason */}
          <p className="text-sm text-[#0094CA] font-medium mb-2">{reason}</p>

          {/* Mood tag */}
          {event.mood && (
            <div className="flex gap-2 mb-3">
              <span className="px-2 py-1 bg-[#0094CA]/10 text-[#0094CA] text-xs font-medium rounded-full">
                {event.mood.toUpperCase()}
              </span>
            </div>
          )}

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 mb-3">{event.title}</h3>

          {/* Quick info */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FiCalendar size={14} className="text-[#0094CA]" />
              <span>{format(eventDate, "EEE, MMM d")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FiClock size={14} className="text-[#0094CA]" />
              <span>{format(eventDate, "h:mm a")} • {event.duration_minutes ?? 60} min</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FiUsers size={14} className="text-[#0094CA]" />
              <span>{spotsLeft} spots left</span>
            </div>
          </div>

          {/* Description snippet */}
          {event.description && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {event.description}
            </p>
          )}

          {/* Price and CTA section */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div>
              <p className="text-xs text-gray-500">Price per person</p>
              <p className="text-xl font-bold text-[#0094CA]">
                {event.is_free ? "Free" : `₹${pricePerPerson.toFixed(0)}`}
              </p>
            </div>
            <Link
              href={`/experience/${event.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-[#0094CA] hover:bg-[#007ba8] text-white rounded-lg font-semibold transition"
            >
              View <FiArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
