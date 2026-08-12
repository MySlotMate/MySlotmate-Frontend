"use client";

import { useState, useEffect, useCallback } from "react";
import { FaInstagram } from "react-icons/fa";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";

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
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const instagramSet = new Set(instagramUrls);
  const totalImages = images.length;

  const hasOverflow = totalImages > INITIAL_VISIBLE;
  const visible =
    hasOverflow && !expanded ? images.slice(0, INITIAL_VISIBLE) : images;
  const hiddenCount = totalImages - INITIAL_VISIBLE;

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
  }, [totalImages]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
  }, [totalImages]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openModal = (index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "Escape") {
        closeModal();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handlePrev, handleNext, closeModal]);

  if (!images || totalImages === 0) {
    return null;
  }

  const currentImage = images[currentIndex] ?? images[0] ?? "";

  return (
    <>
      <div className="space-y-3">
        {/* Previous Grid Formation */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {visible.map((img, i) => (
            <div
              key={i}
              onClick={() => openModal(i)}
              className="group relative aspect-4/3 cursor-pointer overflow-hidden rounded-xl bg-gray-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={`Gallery ${i + 1}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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

      {/* Lightbox Preview Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-md sm:p-6"
          onClick={closeModal}
        >
          {/* Top Bar: Counter (Left) and Prominent Cross/Close Button (Right) */}
          <div className="pointer-events-none absolute top-4 right-4 left-4 z-[10000] flex items-center justify-between">
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/10 bg-black/50 px-3.5 py-1.5 text-white shadow-md backdrop-blur">
              <span className="text-xs font-semibold text-white/90">
                {currentIndex + 1} / {totalImages}
              </span>
              {currentImage && instagramSet.has(currentImage) && (
                <span className="flex items-center gap-1 text-[11px] text-[#E1306C]">
                  <FaInstagram className="h-3 w-3" />
                  <span>Instagram</span>
                </span>
              )}
            </div>

            {/* Cross / Close Button */}
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close preview"
              className="pointer-events-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/20 text-white shadow-xl backdrop-blur transition hover:scale-110 hover:bg-white/30 active:scale-95"
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>

          {/* Main Preview Image — Compact Sizing */}
          <div
            className="relative z-[9999] flex max-h-[70vh] max-w-[85vw] items-center justify-center overflow-hidden rounded-2xl bg-black/40 p-1 shadow-2xl sm:max-w-[75vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentImage}
              alt={`Gallery preview ${currentIndex + 1}`}
              className="max-h-[70vh] max-w-[85vw] rounded-xl object-contain shadow-2xl transition-all duration-200 sm:max-w-[75vw]"
            />
          </div>

          {/* Left Arrow Button */}
          {totalImages > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label="Previous image"
              className="absolute top-1/2 left-4 z-[10000] flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-xl backdrop-blur-md transition hover:scale-110 hover:bg-black/90 active:scale-95 sm:left-8 sm:h-12 sm:w-12"
            >
              <FiChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>
          )}

          {/* Right Arrow Button */}
          {totalImages > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="Next image"
              className="absolute top-1/2 right-4 z-[10000] flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-xl backdrop-blur-md transition hover:scale-110 hover:bg-black/90 active:scale-95 sm:right-8 sm:h-12 sm:w-12"
            >
              <FiChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
