"use client";

import { useEffect, useState, use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "~/components/Navbar";
import Breadcrumb from "~/components/Breadcrumb";
import {
  useEvent,
  usePublicHostProfile,
  useCreateBooking,
  useConfirmBooking,
  useWalletBalance,
  useCreateTopupOrder,
  useVerifyTopupPayment,
} from "~/hooks/useApi";
import { FiCalendar, FiUsers, FiClock, FiShield } from "react-icons/fi";
import { LuWallet, LuLoader2 } from "react-icons/lu";
import { format } from "date-fns";
import { toast } from "sonner";

export const runtime = "edge";

// Razorpay types
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

interface BookingRequestDetails {
  quantity: number;
  totalPriceCents: number;
  paymentSource: "wallet" | "topup";
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });

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
  const dateToUse = date || event.time;
  const eventDate = new Date(dateToUse);
  const isValidDate = eventDate instanceof Date && !isNaN(eventDate.getTime());
  const spotsLeft = event.capacity - event.total_bookings;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-2 text-lg font-semibold text-gray-900">
        {event.title}
      </h2>

      {/* Mood Tags */}
      {event.mood && (
        <div className="mb-4 flex gap-2">
          <span className="rounded-full bg-[#0094CA]/10 px-2 py-1 text-xs font-medium text-[#0094CA]">
            {event.mood.toUpperCase()}
          </span>
        </div>
      )}

      <div className="flex gap-4">
        {/* Image */}
        <div className="h-28 w-32 shrink-0 overflow-hidden rounded-lg">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-400">
              No image
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <FiCalendar className="text-gray-400" size={14} />
            <span className="font-medium">
              {isValidDate ? format(eventDate, "EEEE, MMM d") : "Date TBD"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FiClock className="text-gray-400" size={14} />
            <span>
              {isValidDate ? format(eventDate, "h:mm a") : "Time TBD"} (
              {event.duration_minutes ?? 60} min)
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
                  loading="lazy"
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0094CA] text-xs font-bold text-white">
                  {host?.first_name?.[0] ?? "H"}
                </div>
              )}
              <div className="text-xs text-gray-500">
                <span className="block">Hosted by</span>
                <span className="font-medium text-gray-900">
                  {host?.first_name ?? "Host"}
                </span>
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
  const [userPhone, setUserPhone] = useState<string | undefined>();
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const date = decodeURIComponent(searchParams.get("date") ?? "");
  const guests = parseInt(searchParams.get("guests") ?? "1");

  useEffect(() => {
    setUserId(localStorage.getItem("msm_user_id"));
    setUserName(localStorage.getItem("msm_user_name") ?? undefined);
    setUserEmail(localStorage.getItem("msm_user_email") ?? undefined);
    setUserPhone(localStorage.getItem("msm_user_phone") ?? undefined);
  }, []);

  // Load Razorpay script
  useEffect(() => {
    if (!document.getElementById("razorpay-script")) {
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: host } = usePublicHostProfile(event?.host_id ?? null);
  const {
    data: wallet,
    isLoading: walletLoading,
    refetch: refetchWallet,
  } = useWalletBalance(userId);

  const createBooking = useCreateBooking();
  const confirmBooking = useConfirmBooking();
  const createOrder = useCreateTopupOrder();
  const verifyPayment = useVerifyTopupPayment();

  const pricePerPerson = event?.is_free ? 0 : (event?.price_cents ?? 0) / 100;
  const totalPrice = pricePerPerson * guests;
  const totalPriceCents = totalPrice * 100;
  const walletBalance = wallet?.balance_cents ?? 0;
  const hasInsufficientBalance =
    !event?.is_free && totalPriceCents > 0 && walletBalance < totalPriceCents;
  const shortfall = totalPriceCents - walletBalance;

  const waitForWalletBalance = async (
    requiredBalanceCents: number,
    currentBalanceCents: number,
  ) => {
    if (currentBalanceCents >= requiredBalanceCents) {
      return currentBalanceCents;
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await wait(800);
      const refreshedWallet = await refetchWallet();
      const refreshedBalance = refreshedWallet.data?.balance_cents ?? 0;

      if (refreshedBalance >= requiredBalanceCents) {
        return refreshedBalance;
      }
    }

    throw new Error("Wallet balance did not refresh in time");
  };

  const handleConfirmBooking = async () => {
    if (!userId) {
      toast.error("Please login to complete booking");
      return;
    }

    if (!event) {
      toast.error("Event not found");
      return;
    }

    const bookingDetails: BookingRequestDetails = {
      quantity: guests,
      totalPriceCents,
      paymentSource: "wallet",
    };

    // Check wallet balance for paid events
    if (!event.is_free && totalPriceCents > 0) {
      if (walletBalance < totalPriceCents) {
        // Insufficient balance - initiate direct payment for the shortfall
        const shortfallCents = totalPriceCents - walletBalance;
        await handleDirectPayment({
          paymentAmountCents: shortfallCents,
          bookingDetails: {
            ...bookingDetails,
            paymentSource: "topup",
          },
        });
        return;
      }
    }

    // Sufficient balance - proceed with booking debit from wallet
    await completeBooking(bookingDetails);
  };

  const handleDirectPayment = async ({
    paymentAmountCents,
    bookingDetails,
  }: {
    paymentAmountCents: number;
    bookingDetails: BookingRequestDetails;
  }) => {
    if (!userId) return;

    setIsProcessingPayment(true);

    try {
      // Create Razorpay order for the exact booking amount
      const orderRes = await createOrder.mutateAsync({
        user_id: userId,
        amount_cents: paymentAmountCents,
        idempotency_key: crypto.randomUUID(),
      });

      const orderData = orderRes.data;
      let paymentCompleted = false;

      // Open Razorpay Checkout
      const options: RazorpayOptions = {
        key: orderData.key_id,
        amount: orderData.amount_cents,
        currency: orderData.currency ?? "INR",
        name: "MySlotMate",
        description: `Booking: ${event?.title}`,
        order_id: orderData.order_id,
        handler: (response: RazorpayResponse) => {
          paymentCompleted = true;

          // Verify payment, wait for the wallet credit to sync, then auto-book.
          void (async () => {
            let verifiedBalance = 0;

            try {
              const verifyRes = await verifyPayment.mutateAsync({
                user_id: userId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              verifiedBalance = verifyRes.data.balance_cents;
            } catch (err) {
              console.error("Payment verification failed:", err);
              toast.error(
                "Payment verification failed. Please contact support.",
              );
              setIsProcessingPayment(false);
              return;
            }

            try {
              await waitForWalletBalance(
                bookingDetails.totalPriceCents,
                verifiedBalance,
              );
              await completeBooking(bookingDetails);
            } catch (err) {
              console.error("Wallet sync failed after top-up:", err);
              toast.error(
                "Payment was successful, but your wallet is still syncing. Please wait a moment and try again.",
              );
            }
            setIsProcessingPayment(false);
          })();
        },
        prefill: {
          name: userName,
          email: userEmail,
          contact: userPhone,
        },
        theme: {
          color: "#0094CA",
        },
        modal: {
          ondismiss: () => {
            if (paymentCompleted) return;
            setIsProcessingPayment(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      console.error("Failed to create payment order:", err);
      toast.error("Failed to initiate payment. Please try again.");
      setIsProcessingPayment(false);
    }
  };

  const completeBooking = async ({
    quantity,
    totalPriceCents: totalCents,
    paymentSource,
  }: BookingRequestDetails) => {
    if (!userId || !event) return;

    setIsSubmitting(true);

    try {
      const idempotencyKey = `${userId}-${eventId}-${Date.now()}`;
      const maxAttempts = paymentSource === "topup" ? 3 : 1;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const bookingRes = await createBooking.mutateAsync({
            user_id: userId,
            event_id: eventId,
            quantity: quantity,
            occurrence_date: new Date(date || event.time).toISOString(),
            idempotency_key: idempotencyKey,
          });

          await confirmBooking.mutateAsync(bookingRes.data.id);

          toast.success(
            event.is_free || totalCents === 0
              ? "Booking confirmed!"
              : "Payment successful! Booking confirmed.",
          );

          router.push(
            `/experience/${eventId}/confirmation?booking=${bookingRes.data.id}`,
          );
          return;
        } catch (err) {
          const shouldRetryTopupBooking =
            paymentSource === "topup" && attempt < maxAttempts;

          if (!shouldRetryTopupBooking) {
            throw err;
          }

          console.error(`Booking attempt ${attempt} failed after top-up:`, err);
          await wait(800 * attempt);
          await refetchWallet();
        }
      }
    } catch (err) {
      console.error("Booking failed:", err);
      toast.error(
        paymentSource === "topup"
          ? "Payment reached your wallet, but booking could not be completed. Please try again."
          : "Failed to complete booking. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (eventLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0094CA]" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <p className="mb-4 text-xl text-gray-600">Experience not found</p>
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
      <div className="site-x mx-auto max-w-xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Review your booking
          </h1>
          <p className="mt-1 text-gray-500">
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
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Add a note for the host
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Introduce yourself or share any special requests..."
            rows={4}
            className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA]"
          />
        </div>

        {/* Wallet Balance Section (for paid events) */}
        {!event.is_free && totalPriceCents > 0 && (
          <div className="mt-6">
            <div
              className={`rounded-xl border-2 p-4 ${hasInsufficientBalance ? "border-blue-300 bg-blue-50" : "border-green-200 bg-green-50"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${hasInsufficientBalance ? "bg-blue-100" : "bg-green-100"}`}
                  >
                    <LuWallet
                      className={`h-5 w-5 ${hasInsufficientBalance ? "text-blue-600" : "text-green-600"}`}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Wallet Balance</p>
                    {walletLoading ? (
                      <div className="h-5 w-16 animate-pulse rounded bg-gray-200" />
                    ) : (
                      <p
                        className={`text-lg font-bold ${hasInsufficientBalance ? "text-blue-700" : "text-green-700"}`}
                      >
                        ₹{(walletBalance / 100).toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Insufficient balance info */}
              {hasInsufficientBalance && (
                <div className="mt-3 border-t border-blue-200 pt-3">
                  <div className="text-sm">
                    <p className="font-medium text-blue-800">
                      You can pay the remaining ₹{(shortfall / 100).toFixed(0)}{" "}
                      directly Click &quot;Pay & Confirm&quot; below to pay via
                      card/UPI and complete your booking.
                    </p>
                    <p className="mt-1 text-xs text-blue-700">
                      Click Pay and Confirm below to pay via card/UPI and
                      complete your booking.
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
          disabled={isSubmitting || isProcessingPayment}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0094CA] py-4 font-semibold text-white transition hover:bg-[#007ba8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting || isProcessingPayment ? (
            <>
              <LuLoader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : totalPrice === 0 ? (
            "Confirm Booking"
          ) : hasInsufficientBalance ? (
            `Pay ₹${(shortfall / 100).toFixed(0)} & Confirm (₹${(walletBalance / 100).toFixed(0)} from wallet)`
          ) : (
            `Pay ₹${totalPrice.toFixed(0)} & Confirm`
          )}
        </button>

        {/* Chat Unlock Info */}
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
          <FiShield size={14} />
          <span>
            Your chat with {host?.first_name ?? "the host"} will unlock once the
            booking is confirmed.
          </span>
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
      <div className="site-x mx-auto max-w-xl py-6">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Experiences", href: "/experiences" },
            { label: "Book Experience" },
          ]}
          className="mb-6"
        />
      </div>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0094CA]" />
          </div>
        }
      >
        <BookingContent eventId={resolvedParams.id} />
      </Suspense>
    </>
  );
}
