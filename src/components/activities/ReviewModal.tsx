"use client";

import { useState } from "react";
import { FiX, FiStar } from "react-icons/fi";
import { toast } from "sonner";
import { createReview, type CreateReviewPayload } from "~/lib/api";
import { useContentModeration } from "~/hooks/useContentModeration";

interface ReviewModalProps {
  eventId: string;
  eventTitle: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ReviewModal({
  eventId,
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
        `Review violates community guidelines (Risk Level: ${moderationResult.score}/10). ${moderationResult.details}`
      );
      return;
    }

    if (moderationResult.score >= 3) {
      toast.warning(
        `⚠️ Warning: ${moderationResult.details} (Risk Level: ${moderationResult.score}/10)`
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-transparent bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Write a Review</h2>
            <p className="text-sm text-gray-600">{eventTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Star Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition"
                >
                  <FiStar
                    className={`h-8 w-8 ${
                      star <= (hoverRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Review
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share your experience with this event..."
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0094CA] text-sm resize-none"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.length}/500 characters
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#0094CA] text-white rounded-lg hover:bg-[#0076a3] disabled:opacity-50 transition font-medium text-sm flex items-center justify-center gap-2"
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
  );
}
