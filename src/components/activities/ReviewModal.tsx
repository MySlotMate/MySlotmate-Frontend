"use client";

import { useState } from "react";
import { FiX, FiStar } from "react-icons/fi";
import { toast } from "sonner";
import { createReview, type CreateReviewPayload } from "~/lib/api";
import { useContentModeration } from "~/hooks/useContentModeration";
import { usePublicHostProfile } from "~/hooks/useApi";

interface ReviewModalProps {
  eventId: string;
  hostId: string;
  eventTitle: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ReviewModal({
  eventId,
  hostId,
  eventTitle,
  userId,
  isOpen,
  onClose,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { checkContentSync } = useContentModeration();
  const { data: host } = usePublicHostProfile(hostId);
  const hostName = host
    ? `${host.first_name} ${host.last_name}`.trim()
    : "your host";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!description.trim()) {
      setError("Please write a review description");
      return;
    }

    // Check content moderation
    const moderationResult = checkContentSync(description);

    if (moderationResult.score > 5) {
      setError(
        `Review violates community guidelines (Risk Level: ${moderationResult.score}/10). ${moderationResult.details}`,
      );
      return;
    }

    if (moderationResult.score >= 3) {
      toast.warning(
        `⚠️ Warning: ${moderationResult.details} (Risk Level: ${moderationResult.score}/10)`,
      );
    }

    setLoading(true);
    try {
      const payload: CreateReviewPayload = {
        user_id: userId,
        event_id: eventId,
        rating: rating,
        description: description,
      };

      await createReview(payload);
      setDescription("");
      setRating(5);
      onSuccess?.();
      onClose();
    } catch (err) {
      const error = err as Error & { status?: number };
      setError(error.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[320]">
      <button
        type="button"
        aria-label="Close review modal"
        className="absolute inset-0 bg-slate-950/18 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-[330] flex min-h-full items-center justify-center p-4">
        <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-white/70 bg-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.45)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Header */}
          <div className="relative overflow-hidden border-b border-[#d7e8f2] bg-gradient-to-br from-[#f7fbff] via-white to-[#e8f7ff] px-6 pt-6 pb-6 sm:px-8">
            <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[#0094CA]/12 blur-2xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-24 rounded-full bg-[#00c2a8]/10 blur-2xl" />

            <button
              type="button"
              onClick={onClose}
              aria-label="Close review modal"
              className="absolute top-4 right-4 z-20 rounded-full border border-white/80 bg-white/85 p-2 text-slate-600 shadow-sm backdrop-blur transition hover:bg-white hover:text-slate-900"
            >
              <FiX className="h-5 w-5" />
            </button>

            <div className="relative pr-14">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#bfe6f4] bg-white/80 px-3 py-1 text-[11px] font-semibold tracking-[0.24em] text-[#0076a3] uppercase shadow-sm backdrop-blur">
                <FiStar className="h-3.5 w-3.5" />
                Review Experience
              </div>

              <h2 className="text-2xl leading-tight font-bold text-slate-900 sm:text-3xl">
                Write a Review
              </h2>

              <p className="mt-3 text-base text-slate-700 italic">
                {eventTitle}
              </p>

              <p className="mt-1 text-sm text-slate-600 italic">
                ~ Hosted by {hostName}
              </p>

              <p className="mt-4 max-w-lg text-sm leading-6 text-slate-500">
                Share what stood out, what the experience felt like, and what
                future guests should know.
              </p>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-6 px-6 py-6 sm:px-8 sm:py-7"
          >
            {/* Star Rating */}
            <div className="rounded-2xl border border-[#dceef7] bg-[#f9fcff] p-5 shadow-[0_16px_50px_-40px_rgba(0,148,202,0.6)]">
              <label className="mb-2 block text-sm font-semibold tracking-[0.18em] text-slate-500 uppercase">
                Rating
              </label>
              <p className="mb-4 text-sm text-slate-600">
                Tap the stars to rate the experience.
              </p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="rounded-2xl p-1 transition hover:scale-105"
                  >
                    <FiStar
                      className={`h-8 w-8 ${
                        star <= (hoverRating || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <label className="mb-2 block text-sm font-semibold tracking-[0.18em] text-slate-500 uppercase">
                Your Review
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share your experience with this event..."
                rows={6}
                className="min-h-40 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition outline-none placeholder:text-slate-400 focus:border-[#0094CA] focus:ring-4 focus:ring-[#0094CA]/10"
                disabled={loading}
              />
              <p className="mt-2 text-xs font-medium text-slate-500">
                {description.length}/500 characters
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0094CA] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(0,148,202,0.8)] transition hover:bg-[#0076a3] disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : null}
                Submit Review
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
