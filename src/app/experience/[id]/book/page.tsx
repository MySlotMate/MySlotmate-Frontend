"use client";

import { useEffect, useState, use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "~/components/Navbar";
import { TopUpModal } from "~/components/wallet";
import {
  useEvent,
  usePublicHostProfile,
  useCreateBooking,
  useConfirmBooking,
  useWalletBalance,
} from "~/hooks/useApi";
import { FiCalendar, FiUsers, FiClock, FiShield, FiAlertCircle } from "react-icons/fi";
import { LuWallet, LuPlus } from "react-icons/lu";
import { format } from "date-fns";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Experience Summary Card                                            */
/* ------------------------------------------------------------------ */
function ExperienceSummaryCard({
  event,
  host,
  date,
  guests: _guests,
  totalPrice,
}: {
  event: {
    title: string;
    cover_image_url: string | null;
    mood: string | null;
    time: string;
    duration_minutes: number | null;
    capacity: number;
    total_bookings: number;
  };
  host: { first_name: string; avatar_url: string | null } | null;
  date: string;
  guests: number;
  totalPrice: number;
}) {
  const eventDate = new Date(date || event.time);
  const spotsLeft = event.capacity - event.total_bookings;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">{event.title}</h2>
      
      {/* Mood Tags */}
      {event.mood && (
        <div className="flex gap-2 mb-4">
          <span className="px-2 py-1 bg-[#0094CA]/10 text-[#0094CA] text-xs font-medium rounded-full">
            {event.mood.toUpperCase()}
          </span>
        </div>
      )}

      <div className="flex gap-4">
        {/* Image */}
        <div className="w-32 h-28 rounded-lg overflow-hidden flex-shrink-0">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
              No image
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <FiCalendar className="text-gray-400" size={14} />
            <span className="font-medium">
              {format(eventDate, "EEEE, MMM d")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FiClock className="text-gray-400" size={14} />
            <span>
              {format(eventDate, "h:mm a")} ({event.duration_minutes ?? 60} min)
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FiUsers className="text-gray-400" size={14} />
            <span>Group Experience • {spotsLeft} spots filled</span>
          </div>

          {/* Host Info */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              {host?.avatar_url ? (
                <img
                  src={host.avatar_url}
                  alt={host.first_name}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#0094CA] flex items-center justify-center text-white text-xs font-bold">
                  {host?.first_name?.[0] ?? "H"}
                </div>
              )}
              <div className="text-xs text-gray-500">
                <span className="block">Hosted by</span>
                <span className="font-medium text-gray-900">{host?.first_name ?? "Host"}</span>
              </div>
            </div>

            {/* Price */}
            <div className="text-right">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold text-[#0094CA]">
                {totalPrice === 0 ? "Free" : `₹${totalPrice.toFixed(2)}`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Booking Form Content                                               */
/* ------------------------------------------------------------------ */
function BookingContent({ eventId }: { eventId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | undefined>();
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);

  const date = searchParams.get("date") ?? "";
  const guests = parseInt(searchParams.get("guests") ?? "1");

  useEffect(() => {
    setUserId(localStorage.getItem("msm_user_id"));
    setUserName(localStorage.getItem("msm_user_name") ?? undefined);
    setUserEmail(localStorage.getItem("msm_user_email") ?? undefined);
  }, []);

  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: host } = usePublicHostProfile(event?.host_id ?? null);
  const { data: wallet, isLoading: walletLoading } = useWalletBalance(userId);

  const createBooking = useCreateBooking();
  const confirmBooking = useConfirmBooking();

  const pricePerPerson = event?.is_free ? 0 : (event?.price_cents ?? 0) / 100;
  const totalPrice = pricePerPerson * guests;
  const totalPriceCents = totalPrice * 100;
  const walletBalance = wallet?.balance_cents ?? 0;
  const hasInsufficientBalance = !event?.is_free && totalPriceCents > 0 && walletBalance < totalPriceCents;
  const shortfall = totalPriceCents - walletBalance;

  const handleConfirmBooking = async () => {
    if (!userId) {
      toast.error("Please login to complete booking");
      return;
    }

    if (!event) {
      toast.error("Event not found");
      return;
    }

    // Check wallet balance for paid events
    if (!event.is_free && totalPriceCents > 0) {
      if (walletBalance < totalPriceCents) {
        toast.error("Insufficient wallet balance. Please top up.");
        setShowTopUp(true);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Generate idempotency key
      const idempotencyKey = `${userId}-${eventId}-${Date.now()}`;

      // Create booking (this will auto-debit wallet for paid events)
      const bookingRes = await createBooking.mutateAsync({
        user_id: userId,
        event_id: eventId,
        quantity: guests,
        idempotency_key: idempotencyKey,
      });

      // Confirm the booking
      await confirmBooking.mutateAsync(bookingRes.data.id);
      
      toast.success(event.is_free || totalPrice === 0 
        ? "Booking confirmed!" 
        : "Payment successful! Booking confirmed.");
      
      router.push(`/experience/${eventId}/confirmation?booking=${bookingRes.data.id}`);
    } catch (err) {
      console.error("Booking failed:", err);
      toast.error("Failed to complete booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0094CA]" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-xl text-gray-600 mb-4">Experience not found</p>
        <Link href="/" className="text-[#0094CA] hover:underline">
          Go back home
        </Link>
      </div>
    );
  }

  const eventDate = new Date(date || event.time);
  const cancellationDate = new Date(eventDate);
  cancellationDate.setDate(cancellationDate.getDate() - 1);

  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Review your booking</h1>
          <p className="text-gray-500 mt-1">
            You&apos;re just one step away from a great experience.
          </p>
        </div>

        {/* Experience Summary */}
        <ExperienceSummaryCard
          event={event}
          host={host ?? null}
          date={date}
          guests={guests}
          totalPrice={totalPrice}
        />

        {/* Note for Host */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add a note for the host
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Introduce yourself or share any special requests..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0094CA] focus:border-transparent outline-none resize-none"
          />
        </div>

        {/* Wallet Balance Section (for paid events) */}
        {!event.is_free && totalPriceCents > 0 && (
          <div className="mt-6">
            <div className={`rounded-xl border-2 p-4 ${hasInsufficientBalance ? 'border-amber-300 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${hasInsufficientBalance ? 'bg-amber-100' : 'bg-green-100'}`}>
                    <LuWallet className={`h-5 w-5 ${hasInsufficientBalance ? 'text-amber-600' : 'text-green-600'}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Wallet Balance</p>
                    {walletLoading ? (
                      <div className="h-5 w-16 bg-gray-200 animate-pulse rounded" />
                    ) : (
                      <p className={`text-lg font-bold ${hasInsufficientBalance ? 'text-amber-700' : 'text-green-700'}`}>
                        ₹{(walletBalance / 100).toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowTopUp(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#0094CA] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#007dab]"
                >
                  <LuPlus className="h-4 w-4" />
                  Add Money
                </button>
              </div>

              {/* Insufficient balance warning */}
              {hasInsufficientBalance && (
                <div className="mt-3 flex items-start gap-2 border-t border-amber-200 pt-3">
                  <FiAlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">
                      Insufficient balance
                    </p>
                    <p className="text-amber-700">
                      You need ₹{(shortfall / 100).toFixed(0)} more to complete this booking.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Confirm Button */}
        <button
          onClick={handleConfirmBooking}
          disabled={isSubmitting || hasInsufficientBalance}
          className="w-full mt-6 py-4 bg-[#0094CA] hover:bg-[#007ba8] text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Processing...
            </span>
          ) : hasInsufficientBalance ? (
            "Add Money to Continue"
          ) : totalPrice === 0 ? (
            "Confirm Booking"
          ) : (
            `Pay ₹${totalPrice.toFixed(0)} & Confirm`
          )}
        </button>

        {/* Chat Unlock Info */}
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
          <FiShield size={14} />
          <span>Your chat with {host?.first_name ?? "the host"} will unlock once the booking is confirmed.</span>
        </div>

        {/* Policies */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <FiCalendar size={12} />
            Free cancellation until {format(cancellationDate, "MMM d")}
          </span>
          <span className="flex items-center gap-1">
            <FiShield size={12} />
            Secure Payment
          </span>
        </div>
      </div>

      {/* Top-Up Modal */}
      {userId && (
        <TopUpModal
          isOpen={showTopUp}
          onClose={() => setShowTopUp(false)}
          userId={userId}
          currentBalance={walletBalance}
          userName={userName}
          userEmail={userEmail}
        />
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */
export default function BookingReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);

  return (
    <>
      <Navbar />
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0094CA]" />
          </div>
        }
      >
        <BookingContent eventId={resolvedParams.id} />
      </Suspense>
    </>
  );
}
