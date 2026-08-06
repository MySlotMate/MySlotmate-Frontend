"use client";

import { useState, useEffect, useCallback } from "react";
import { FaInstagram } from "react-icons/fa";
import { FiChevronLeft, FiChevronRight, FiX, FiMaximize2 } from "react-icons/fi";

export default function PhotoGallery({
  images,
  instagramUrls = [],
}: {
  images: string[];
  /** Subset of `images` sourced from the host's Instagram — badged with an IG icon */
  instagramUrls?: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const instagramSet = new Set(instagramUrls);

  const totalImages = images.length;
  const coverImage = images[0];

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
  }, [totalImages]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
  }, [totalImages]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openModal = (index = 0) => {
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

  if (!images || totalImages === 0 || !coverImage) {
    return null;
  }

  const currentImage = images[currentIndex] ?? coverImage;

  return (
    <>
      {/* Cover Image Container */}
      <div className="group relative aspect-[16/9] md:aspect-[21/9] max-h-[450px] w-full cursor-pointer overflow-hidden rounded-2xl bg-gray-900 shadow-md">
        {/* Blurred background fill */}
        <img
          src={coverImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-40"
        />

        {/* Main Cover Image */}
        <img
          src={coverImage}
          alt="Host profile cover"
          onClick={() => openModal(0)}
          className="relative z-10 h-full w-full object-cover transition-transform duration-500 group-hover:scale-102"
        />

        {/* Dark gradient overlay on hover */}
        <div
          onClick={() => openModal(0)}
          className="absolute inset-0 z-20 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-80"
        />

        {/* Instagram Badge */}
        {instagramSet.has(coverImage) && (
          <span
            title="From Instagram"
            className="absolute top-4 right-4 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#E1306C] shadow-lg ring-1 ring-black/5 backdrop-blur"
          >
            <FaInstagram className="h-4 w-4" />
          </span>
        )}

        {/* View Gallery Badge / Action Button */}
        <div
          onClick={() => openModal(0)}
          className="absolute bottom-4 right-4 z-30 flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-black/80"
        >
          <FiMaximize2 className="h-3.5 w-3.5" />
          <span>
            {totalImages > 1 ? `View Gallery (${totalImages})` : "View Photo"}
          </span>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
          onClick={closeModal}
        >
          {/* Header Bar */}
          <div
            className="absolute inset-x-0 top-0 z-50 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-white">
              <span className="text-sm font-medium text-white/80">
                {currentIndex + 1} / {totalImages}
              </span>
              {instagramSet.has(currentImage) && (
                <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-[#E1306C] backdrop-blur">
                  <FaInstagram className="h-3 w-3" />
                  <span>Instagram</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={closeModal}
              aria-label="Close modal"
              className="rounded-full bg-white/10 p-2.5 text-white transition hover:scale-110 hover:bg-white/20 active:scale-95"
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>

          {/* Main Preview Image */}
          <div
            className="relative flex max-h-[85vh] max-w-[90vw] items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentImage}
              alt={`Gallery preview ${currentIndex + 1}`}
              className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl transition-all duration-200"
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
              className="absolute left-3 top-1/2 z-50 -translate-y-1/2 rounded-full border border-white/10 bg-black/60 p-3 text-white shadow-xl backdrop-blur-md transition hover:scale-110 hover:bg-black/90 active:scale-95 sm:left-8"
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
              className="absolute right-3 top-1/2 z-50 -translate-y-1/2 rounded-full border border-white/10 bg-black/60 p-3 text-white shadow-xl backdrop-blur-md transition hover:scale-110 hover:bg-black/90 active:scale-95 sm:right-8"
            >
              <FiChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
