"use client";

import { useState } from "react";
import { type ReviewDTO } from "~/lib/api";
import { FaStar } from "react-icons/fa";
import { FiX } from "react-icons/fi";
import { useUserProfile, useAddReplyToReview } from "~/hooks/useApi";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <FaStar
          key={star}
          className={`h-4 w-4 ${star <= Math.round(rating) ? "text-[#F5A623]" : "text-white/30"}`}
        />
      ))}
    </div>
  );
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
}

function sentimentLabel(score: number | null): {
  text: string;
  color: string;
} {
  if (score === null) return { text: "", color: "#888" };
  if (score >= 0.9) return { text: "Comforting", color: "#A020F0" };
  if (score >= 0.85) return { text: "Inspiring", color: "#7B61FF" };
  return { text: "Genuine", color: "#A020F0" };
}

function ReviewCard({
  review,
  hostId,
  currentHostId,
}: {
  review: ReviewDTO;
  hostId?: string;
  currentHostId?: string;
}) {
  const [replyText, setReplyText] = useState("");
  const [showReplyInput, setShowReplyInput] = useState(false);
  const { mutate: addReply, isPending: isReplying } = useAddReplyToReview();

  const label = sentimentLabel(review.sentiment_score);
  const { data: reviewer } = useUserProfile(review.user_id);

  const reviewerName = reviewer?.name ?? review.name ?? "Anonymous Reviewer";
  const reviewerAvatar =
    reviewer?.avatar_url ?? "/assets/home/avatar-placeholder.svg";

  const isCurrentUserHost = hostId && currentHostId && hostId === currentHostId;

  const handleReplySubmit = () => {
    if (replyText.trim()) {
      addReply(
        { reviewId: review.id, reply: replyText, eventId: review.event_id },
        {
          onSuccess: () => {
            setReplyText("");
            setShowReplyInput(false);
          },
        },
      );
    }
  };

  return (
    <div className="border-b border-white/10 py-4 last:border-b-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={reviewerAvatar}
            alt={reviewerName}
            loading="lazy"
            className="h-8 w-8 rounded-full object-cover"
          />
          <div>
            <span className="block text-sm font-bold text-white">
              {reviewerName}
            </span>
          </div>
        </div>
        <span className="text-xs text-[#777B98]">
          {timeAgo(review.created_at)}
        </span>
      </div>
      <p className="mt-2 text-sm text-[#A5A8C3] italic">
        &ldquo;{review.description}&rdquo;
      </p>
      <div className="mt-2 flex items-center justify-between">
        {label.text && (
          <span
            className="text-xs font-semibold italic"
            style={{ color: label.color }}
          >
            {label.text}
          </span>
        )}
        {isCurrentUserHost && !showReplyInput && !review.reply?.length && (
          <button
            onClick={() => setShowReplyInput(true)}
            className="text-xs font-semibold text-[#D8B4FE] transition hover:text-[#007aa8]"
          >
            Add Reply
          </button>
        )}
      </div>
      {review.reply && review.reply.length > 0 && (
        <div className="mt-3 border-l-2 border-white/15 bg-white/[0.04] p-3">
          <p className="mb-1 text-xs font-semibold text-white/80">
            Host Reply:
          </p>
          {review.reply.map((replyText, idx) => (
            <p key={idx} className="text-sm text-[#A5A8C3]">
              {replyText}
            </p>
          ))}
        </div>
      )}
      {isCurrentUserHost && showReplyInput && (
        <div className="mt-3 border-l-2 border-[#A020F0] bg-[#241333] p-3">
          <div className="flex flex-col gap-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your reply..."
              className="w-full rounded border border-white/15 p-2 text-sm focus:border-[#A020F0] focus:outline-none"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={handleReplySubmit}
                disabled={!replyText.trim() || isReplying}
                className="rounded bg-[#A020F0] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#007aa8] disabled:bg-white/10"
              >
                {isReplying ? "Sending..." : "Send Reply"}
              </button>
              <button
                onClick={() => {
                  setShowReplyInput(false);
                  setReplyText("");
                }}
                className="rounded border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-white/15"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReviewsModal({
  isOpen,
  onClose,
  reviews,
  avg_rating,
  hostId,
  eventHostId,
}: {
  isOpen: boolean;
  onClose: () => void;
  reviews: ReviewDTO[];
  avg_rating: number;
  hostId?: string;
  eventHostId?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="msm-modal fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="animate-in fade-in zoom-in flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-[#121426] duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <div>
            <h2 className="text-2xl font-bold text-white">All Reviews</h2>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg font-bold text-[#D8B4FE]">
                {avg_rating}
              </span>
              <span className="text-sm text-[#A5A8C3]">/ 5.0</span>
              <StarRating rating={avg_rating} />
              <span className="ml-2 text-sm text-[#A5A8C3]">
                ({reviews.length} reviews)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition hover:bg-white/[0.06]"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Reviews list */}
        <div className="flex-1 overflow-y-auto p-6">
          {reviews.length > 0 ? (
            <div>
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  hostId={hostId}
                  currentHostId={eventHostId}
                />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-[#A5A8C3]">No reviews yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
