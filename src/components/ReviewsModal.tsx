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
          className={`h-4 w-4 ${star <= Math.round(rating) ? "text-[#F5A623]" : "text-gray-200"}`}
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
  if (score >= 0.9) return { text: "Comforting", color: "#0094CA" };
  if (score >= 0.85) return { text: "Inspiring", color: "#7B61FF" };
  return { text: "Genuine", color: "#0094CA" };
}

function ReviewCard({ review, hostId, currentHostId }: { review: ReviewDTO; hostId?: string; currentHostId?: string }) {
  const [replyText, setReplyText] = useState("");
  const [showReplyInput, setShowReplyInput] = useState(false);
  const { mutate: addReply, isPending: isReplying } = useAddReplyToReview();
  
  const label = sentimentLabel(review.sentiment_score);
  const { data: reviewer } = useUserProfile(review.user_id);
  
  const reviewerName = reviewer?.name ?? review.name ?? "Anonymous Reviewer";
  const reviewerAvatar = reviewer?.avatar_url ?? "/assets/home/avatar-placeholder.png";

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
        }
      );
    }
  };

  return (
    <div className="border-b border-gray-100 py-4 last:border-b-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={reviewerAvatar}
            alt={reviewerName}
            className="h-8 w-8 rounded-full object-cover"
          />
          <div>
            <span className="block text-sm font-bold text-gray-900">
              {reviewerName}
            </span>
          </div>
        </div>
        <span className="text-xs text-gray-400">
          {timeAgo(review.created_at)}
        </span>
      </div>
      <p className="mt-2 text-sm italic text-gray-600">
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
            className="text-xs font-semibold text-[#0094CA] hover:text-[#007aa8] transition"
          >
            Add Reply
          </button>
        )}
      </div>
      {review.reply && review.reply.length > 0 && (
        <div className="mt-3 border-l-2 border-gray-300 bg-gray-50 p-3">
          <p className="text-xs font-semibold text-gray-700 mb-1">Host Reply:</p>
          {review.reply.map((replyText, idx) => (
            <p key={idx} className="text-sm text-gray-600">
              {replyText}
            </p>
          ))}
        </div>
      )}
      {isCurrentUserHost && showReplyInput && (
        <div className="mt-3 border-l-2 border-[#0094CA] bg-blue-50 p-3">
          <div className="flex flex-col gap-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your reply..."
              className="w-full rounded border border-gray-300 p-2 text-sm focus:border-[#0094CA] focus:outline-none"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={handleReplySubmit}
                disabled={!replyText.trim() || isReplying}
                className="rounded bg-[#0094CA] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#007aa8] disabled:bg-gray-300 transition"
              >
                {isReplying ? "Sending..." : "Send Reply"}
              </button>
              <button
                onClick={() => {
                  setShowReplyInput(false);
                  setReplyText("");
                }}
                className="rounded border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400 transition"
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">All Reviews</h2>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg font-bold text-[#0094CA]">{avg_rating}</span>
              <span className="text-sm text-gray-500">/ 5.0</span>
              <StarRating rating={avg_rating} />
              <span className="text-sm text-gray-500 ml-2">({reviews.length} reviews)</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
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
            <p className="text-center text-gray-500 py-8">No reviews yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
