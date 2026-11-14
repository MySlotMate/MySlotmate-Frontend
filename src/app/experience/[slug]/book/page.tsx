"use client";

import { useEffect, useState, use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "~/components/Navbar";
import Link from "next/link";
import {
  useEvent,
  usePublicHostProfile,
  useCreateBooking,
  useConfirmBooking,
  useWalletBalance,
  useCreateTopupOrder,
  useVerifyTopupPayment,
  useUserProfile,
  useAttendeeProfile,
  useUpdateAttendeeProfile,
  usePlatformSetting,
} from "~/hooks/useApi";
import AttendeeDetailsForm, {
  attendeeFormValid,
  type AttendeeValues,
} from "~/components/booking/AttendeeDetailsForm";
import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiLock,
  FiMapPin,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import { LuLoader2, LuTicket, LuWallet } from "react-icons/lu";
import { formatIST } from "~/lib/datetime";
import { unlockEvent, validateCoupon } from "~/lib/api";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import {
  useMyJoinRequest,
  useSubmitJoinRequest,
  useWithdrawJoinRequest,
} from "~/hooks/useApi";
import JoinRequestModal from "~/components/experience/JoinRequestModal";
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
/*  Summary pieces — sizes follow the Figma "Booking Summary" frames   */
/* ------------------------------------------------------------------ */
const CARD = "rounded-2xl border border-white/[0.06] bg-[#131328]";
const GRADIENT_BTN =
  "bg-gradient-to-r from-[#7038F5] to-[#B724EA] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100";
const INPUT =
  "min-w-0 flex-1 rounded-xl border border-white/10 bg-[#121426] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#9B30FF]";

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-[#131328] px-4 py-2.5 text-sm">
      <span className="flex shrink-0 items-center gap-2 text-white/55">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className="text-right font-semibold text-white">{value}</span>
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

  // RSVP-gated private events swap the passkey prompt for a join request: the
  // gate is an APPROVED request, checked server-side in CreateBooking too.
  const [authUser] = useAuthState(auth);
  const [idToken, setIdToken] = useState<string | null>(null);
  useEffect(() => {
    if (authUser) {
      void authUser.getIdToken().then(setIdToken);
    } else {
      setIdToken(localStorage.getItem("msm_auth_token"));
    }
  }, [authUser]);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Private-event access gate (listed but booking-locked).
  const [passkey, setPasskey] = useState("");
  const [passkeyValid, setPasskeyValid] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [passkeyError, setPasskeyError] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);

  // A code the guest applied (unlock code or public promo). couponComps is true
  // only for a free-booking code; an access code applies but doesn't waive price.
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponComps, setCouponComps] = useState(false);
  // Set when the applied code is a percentage-discount code (1–99).
  const [couponDiscountPct, setCouponDiscountPct] = useState<number | null>(
    null,
  );
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const date = decodeURIComponent(searchParams.get("date") ?? "");
  const guests = parseInt(searchParams.get("guests") ?? "1");
  const tierId = searchParams.get("tier") ?? undefined;

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

  // Attendee details (only when the event requires them).
  const requiresAttendee = !!event?.requires_attendee_details;
  const attendeeFields = event?.attendee_fields ?? [];
  const { data: userProfile } = useUserProfile(userId);
  const { data: savedAttendee } = useAttendeeProfile(userId);
  const updateAttendee = useUpdateAttendeeProfile();
  const [attendeeValues, setAttendeeValues] = useState<AttendeeValues>({});
  const [attendeePrefilled, setAttendeePrefilled] = useState(false);
  const [showAttendeeErrors, setShowAttendeeErrors] = useState(false);

  // Prefill the attendee form once from the saved profile, falling back to the
  // user's known name/phone. Runs when the underlying data first arrives.
  useEffect(() => {
    if (attendeePrefilled || !userId) return;
    if (savedAttendee === undefined) return; // query still loading
    const p = savedAttendee;
    setAttendeeValues({
      name: p?.name ?? userProfile?.name ?? userName ?? "",
      age: p?.age != null ? String(p.age) : "",
      gender: p?.gender ?? "",
      qualification: p?.qualification ?? "",
      occupation: p?.occupation ?? "",
      marital_status: p?.marital_status ?? "",
      contact_number:
        p?.contact_number ?? userProfile?.phn_number ?? userPhone ?? "",
      whatsapp_number: p?.whatsapp_number ?? "",
      registration_type: p?.registration_type ?? "",
      govt_id_url: p?.govt_id_url ?? "",
      travel: p?.travel == null ? "" : p.travel ? "yes" : "no",
      social_link: p?.social_link ?? "",
    });
    setAttendeePrefilled(true);
  }, [
    savedAttendee,
    userProfile,
    userId,
    userName,
    userPhone,
    attendeePrefilled,
  ]);

  const setAttendeeValue = (key: string, value: string) =>
    setAttendeeValues((prev) => ({ ...prev, [key]: value }));

  // When a tier is selected, price comes from that tier; otherwise the single price.
  const selectedTier = tierId
    ? event?.price_tiers?.find((t) => t.id === tierId)
    : undefined;
  const pricePerPerson = event?.is_free
    ? 0
    : selectedTier
      ? selectedTier.price_cents / 100
      : (event?.price_cents ?? 0) / 100;
  const grossPriceCents = Math.round(pricePerPerson * 100) * guests;
  // A booking is comped only when a free-booking code was applied. Access
  // (passkey) never comps — a private paid event is still paid. A free-priced
  // event is handled by the price itself (grossPriceCents = 0).
  const isComped = couponComps;
  // Guest-paid platform fee: admin-set, once per paid booking — flat, or a
  // percentage of the tickets floored like the server (0 = off). Must match
  // the server exactly, or the shortfall top-up below comes up short.
  const { data: bookingFee, isSuccess: feeReady } = usePlatformSetting<{
    type?: "flat" | "percentage";
    amount_cents?: number;
    percentage?: number;
  }>("booking_fee");
  const feeIsPercentage = bookingFee?.type === "percentage";
  const feePercentage = bookingFee?.percentage ?? 0;
  // A discount code comes off the tickets first (floored, like the server);
  // the platform fee is then charged on the discounted tickets.
  const discountCents =
    couponDiscountPct && grossPriceCents > 0
      ? Math.floor((grossPriceCents * couponDiscountPct) / 100)
      : 0;
  const ticketsCents = grossPriceCents - discountCents;
  const feeRawCents = feeIsPercentage
    ? Math.floor((ticketsCents * feePercentage) / 100)
    : (bookingFee?.amount_cents ?? 0);
  const platformFeeCents =
    isComped || grossPriceCents <= 0 || feeRawCents <= 0 ? 0 : feeRawCents;
  const totalPriceCents = isComped ? 0 : ticketsCents + platformFeeCents;
  const formatRupees = (cents: number) =>
    `₹${(cents / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  const walletBalance = wallet?.balance_cents ?? 0;
  const hasInsufficientBalance =
    !event?.is_free && totalPriceCents > 0 && walletBalance < totalPriceCents;
  const shortfall = totalPriceCents - walletBalance;
  // Which gate this private event uses. RSVP events have no passkey at all.
  const isRsvpGated =
    Boolean(event?.is_private) && event?.private_access_mode === "rsvp";
  // Approval is per session, so the request state is looked up for the exact
  // slot the guest picked on the detail page (?date=). Being approved for the
  // 23rd tells us nothing about the 30th.
  const { data: myJoinRequest } = useMyJoinRequest(
    isRsvpGated ? eventId : null,
    idToken,
    date || undefined,
  );
  const submitJoinRequest = useSubmitJoinRequest(idToken);
  const withdrawJoinRequest = useWithdrawJoinRequest(idToken);
  const joinApproved = myJoinRequest?.status === "approved";

  // An RSVP guest already filled these details in to request the session, and
  // the server saved them onto their attendee profile — so asking again at
  // checkout is pure repetition.
  //
  // The form is skipped only once the saved profile actually covers every field
  // this event requires. If it doesn't — say the host added a field after
  // approving someone — it reappears, rather than hiding a form the guest needs
  // to get past the server-side attendee gate. While the profile is still
  // loading we assume it's covered, so the form never flashes in and out.
  const attendeeCollectedAtRequest =
    isRsvpGated &&
    requiresAttendee &&
    attendeeFields.length > 0 &&
    (!attendeePrefilled || attendeeFormValid(attendeeFields, attendeeValues));

  // Private events are booking-locked until their gate opens: an approved join
  // request for RSVP events, a verified passkey for everything else.
  const needsUnlock = isRsvpGated
    ? !joinApproved
    : (Boolean(event?.is_private) || Boolean(event?.access_passkey)) &&
      !passkeyValid;

  const handleUnlock = async () => {
    const code = passkey.trim();
    if (!code || !event) return;
    setUnlocking(true);
    setPasskeyError(false);
    setUnlockMessage(null);
    try {
      // First try the shared access passkey — grants access only (guest pays).
      const res = await unlockEvent(eventId, code);
      if (res.data.valid) {
        setPasskeyValid(true);
        return;
      }
      // Otherwise it may be a per-guest code: an access code / passkey (unlocks,
      // guest pays) or a free-booking code (unlocks + comps). A passkey and a
      // coupon are DIFFERENT things: only apply this as a coupon when it actually
      // comps the booking — an access-only passkey just unlocks and is never
      // shown in the coupon UI. (A separate free coupon can then be added below.)
      if (userId) {
        try {
          const cres = await validateCoupon(eventId, userId, code);
          if (cres.data.valid) {
            setPasskeyValid(true);
            if (cres.data.comps_booking) {
              setAppliedCoupon(cres.data.code);
              setCouponComps(true);
            } else if (cres.data.discount_percent) {
              // The server applies a discount code used as the passkey, so
              // the price shown here must too.
              setAppliedCoupon(cres.data.code);
              setCouponDiscountPct(cres.data.discount_percent);
            }
            return;
          }
        } catch (err) {
          // A recognised-but-unusable code (e.g. already used) has a specific
          // message worth showing instead of the generic "wrong passkey".
          if (err instanceof Error && err.message) {
            setUnlockMessage(err.message);
          }
        }
      }
      setPasskeyError(true);
    } catch {
      setPasskeyError(true);
    } finally {
      setUnlocking(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim() || !event) return;
    if (!userId) {
      toast.error("Please login to apply a coupon");
      return;
    }
    setCouponChecking(true);
    setCouponError(null);
    try {
      const res = await validateCoupon(eventId, userId, couponInput.trim());
      if (res.data.valid && res.data.comps_booking) {
        setAppliedCoupon(res.data.code);
        setCouponComps(true);
      } else if (res.data.valid && res.data.discount_percent) {
        setAppliedCoupon(res.data.code);
        setCouponDiscountPct(res.data.discount_percent);
      } else {
        setCouponError("This coupon can't be applied");
      }
    } catch (err) {
      setCouponError(
        err instanceof Error ? err.message : "This coupon can't be applied",
      );
    } finally {
      setCouponChecking(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponComps(false);
    setCouponDiscountPct(null);
    setCouponInput("");
    setCouponError(null);
  };

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

    // Private-event gate: the passkey must be verified (or the join request
    // approved) before booking. The server re-checks either way.
    if (needsUnlock) {
      if (isRsvpGated) {
        toast.error(
          myJoinRequest?.status === "pending"
            ? "Your request is still awaiting the host's approval"
            : "Request to join this experience first",
        );
        return;
      }
      setPasskeyError(true);
      toast.error("Enter the passkey to book this private experience");
      return;
    }

    // Attendee-details gate: collect + save required details before booking.
    // Skipped for an RSVP guest whose profile already carries them — re-saving
    // identical values would just be a wasted round trip.
    if (
      requiresAttendee &&
      attendeeFields.length > 0 &&
      !attendeeCollectedAtRequest
    ) {
      if (!attendeeFormValid(attendeeFields, attendeeValues)) {
        setShowAttendeeErrors(true);
        toast.error("Please complete the attendee details");
        return;
      }
      try {
        await updateAttendee.mutateAsync({
          user_id: userId,
          ...(attendeeFields.includes("name") && { name: attendeeValues.name }),
          ...(attendeeFields.includes("age") && {
            age: Number(attendeeValues.age),
          }),
          ...(attendeeFields.includes("gender") && {
            gender: attendeeValues.gender,
          }),
          ...(attendeeFields.includes("qualification") && {
            qualification: attendeeValues.qualification,
          }),
          ...(attendeeFields.includes("occupation") && {
            occupation: attendeeValues.occupation,
          }),
          ...(attendeeFields.includes("marital_status") && {
            marital_status: attendeeValues.marital_status,
          }),
          ...(attendeeFields.includes("contact_number") && {
            contact_number: attendeeValues.contact_number,
          }),
          ...(attendeeFields.includes("whatsapp_number") && {
            whatsapp_number: attendeeValues.whatsapp_number,
          }),
          ...(attendeeFields.includes("registration_type") && {
            registration_type: attendeeValues.registration_type,
          }),
          ...(attendeeFields.includes("govt_id_url") && {
            govt_id_url: attendeeValues.govt_id_url,
          }),
          ...(attendeeFields.includes("social_link") && {
            social_link: attendeeValues.social_link,
          }),
          ...(attendeeFields.includes("travel") && {
            travel: attendeeValues.travel === "yes",
          }),
        });
      } catch {
        toast.error("Could not save attendee details. Please try again.");
        return;
      }
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
            price_tier_id: tierId,
            ...((Boolean(event.is_private) || Boolean(event.access_passkey)) &&
            passkey.trim()
              ? { passkey: passkey.trim() }
              : {}),
            ...(appliedCoupon ? { coupon_code: appliedCoupon } : {}),
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
      <div className="flex min-h-screen items-center justify-center bg-[#080914]">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#B57BFF]" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#080914] text-white">
        <p className="mb-4 text-xl text-white/70">Experience not found</p>
        <Link href="/explore" className="text-[#B57BFF] hover:underline">
          Back to Explore
        </Link>
      </div>
    );
  }

  const startDate = new Date(date || event.time);
  const hasStart = !isNaN(startDate.getTime());
  const endDate =
    hasStart && event.duration_minutes
      ? new Date(startDate.getTime() + event.duration_minutes * 60_000)
      : null;

  const cancellationCopy =
    event.cancellation_policy === "flexible"
      ? "Free cancellation up to 24 hours before the experience starts."
      : event.cancellation_policy === "moderate"
        ? "Free cancellation up to 5 days before the experience starts."
        : event.cancellation_policy === "strict"
          ? "50% refund up to 1 week before the experience starts."
          : event.cancellation_policy === "no_refund"
            ? "This experience is non-refundable once booked."
            : "Standard cancellation policy applies.";

  const payDisabled =
    isSubmitting ||
    isProcessingPayment ||
    needsUnlock ||
    // Until the fee is known the total (and any top-up) would be short.
    (grossPriceCents > 0 && !isComped && !feeReady);

  const payLabel =
    isSubmitting || isProcessingPayment ? (
      <>
        <LuLoader2 className="h-4 w-4 animate-spin" />
        Processing...
      </>
    ) : needsUnlock ? (
      // The label has to name the gate that's actually blocking. An RSVP
      // event has no passkey at all, so "enter passkey" would send the
      // guest looking for a code that doesn't exist.
      isRsvpGated ? (
        myJoinRequest?.status === "pending" ? (
          "Waiting for the host to approve"
        ) : myJoinRequest?.status === "rejected" ? (
          "Request declined"
        ) : (
          "Request to join first"
        )
      ) : (
        "Enter passkey to book"
      )
    ) : totalPriceCents === 0 ? (
      isComped ? (
        "Confirm free booking"
      ) : (
        "Confirm Booking"
      )
    ) : hasInsufficientBalance ? (
      `Pay ₹${(shortfall / 100).toFixed(0)} & Confirm (₹${(walletBalance / 100).toFixed(0)} from wallet)`
    ) : (
      `Confirm & Pay ${formatRupees(totalPriceCents)}`
    );

  const payButton = (
    <button
      type="button"
      onClick={handleConfirmBooking}
      disabled={payDisabled}
      className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold ${GRADIENT_BTN}`}
    >
      {payLabel}
    </button>
  );

  const totals = (
    <div className="flex flex-col gap-2 text-sm">
      {grossPriceCents > 0 && (
        <div className="flex justify-between text-white/60">
          <span>
            Subtotal
            {guests > 1 &&
              ` (${guests} × ${formatRupees(Math.round(pricePerPerson * 100))})`}
          </span>
          <span className="text-white">{formatRupees(grossPriceCents)}</span>
        </div>
      )}
      {discountCents > 0 && !isComped && (
        <div className="flex justify-between text-emerald-300">
          <span>Discount ({couponDiscountPct}%)</span>
          <span>−{formatRupees(discountCents)}</span>
        </div>
      )}
      {platformFeeCents > 0 && (
        <div className="flex justify-between text-white/60">
          <span>
            Service Fee{feeIsPercentage ? ` (${feePercentage}%)` : ""}
          </span>
          <span className="text-white">{formatRupees(platformFeeCents)}</span>
        </div>
      )}
      <div className="mt-1 flex items-baseline justify-between">
        <span className="font-outfit text-base font-semibold text-white">
          Total
        </span>
        {isComped ? (
          <span className="flex items-baseline gap-2">
            <span className="text-sm text-white/45 line-through">
              {formatRupees(grossPriceCents)}
            </span>
            <span className="font-outfit text-lg font-bold text-emerald-300">
              FREE
            </span>
          </span>
        ) : (
          <span className="font-outfit text-lg font-bold text-[#D8B4FE]">
            {totalPriceCents === 0 ? "Free" : formatRupees(totalPriceCents)}
          </span>
        )}
      </div>
    </div>
  );

  // Bookings are paid from the wallet; a shortfall is topped up by card/UPI
  // (Razorpay) first — so the "payment method" is the wallet.
  const paymentMethod =
    !event.is_free && totalPriceCents > 0 ? (
      <div className="mt-5 border-t border-white/10 pt-5">
        <h3 className="font-outfit text-[15px] font-semibold text-white">
          Payment Method
        </h3>
        <div className="mt-3 flex h-11 items-center justify-between gap-3 rounded-xl bg-[#121426] px-4 text-sm">
          <span className="flex items-center gap-2 text-white/80">
            <LuWallet className="h-4 w-4 text-white/55" />
            Wallet ·{" "}
            {walletLoading ? (
              <span className="inline-block h-4 w-12 animate-pulse rounded bg-white/10" />
            ) : (
              `₹${(walletBalance / 100).toLocaleString("en-IN")}`
            )}
          </span>
          <span
            className={`text-xs font-semibold ${hasInsufficientBalance ? "text-[#D8B4FE]" : "text-emerald-300"}`}
          >
            {hasInsufficientBalance ? "Low balance" : "Covers total"}
          </span>
        </div>
        {hasInsufficientBalance && (
          <p className="mt-2 text-xs leading-5 text-white/55">
            The remaining ₹{(shortfall / 100).toFixed(0)} is paid by card/UPI
            when you confirm, then your booking is completed.
          </p>
        )}
      </div>
    ) : null;

  const hostName = host ? `${host.first_name} ${host.last_name}`.trim() : null;

  return (
    <main className="min-h-screen bg-[#080914] font-[family-name:var(--font-inter)] text-white max-lg:pb-28 md:pl-20 min-[80rem]:pl-[230px]">
      <div className="mx-auto w-full max-w-[1160px] px-6 pt-6 pb-12 md:px-10 md:pt-10">
        <header className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Go back"
            onClick={() =>
              window.history.length > 1 ? router.back() : router.push("/")
            }
            className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
          >
            <FiArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-outfit text-[22px] leading-7 font-bold">
            Booking Summary
          </h1>
        </header>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-3">
            {/* Experience */}
            <div className={`flex items-center gap-3 p-3 ${CARD}`}>
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/5">
                {event.cover_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.cover_image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-outfit line-clamp-2 text-[15px] leading-5 font-semibold text-white">
                  {event.title}
                </p>
                {hostName && (
                  <p className="mt-0.5 truncate text-[13px] text-white/60">
                    Hosted by {hostName}
                  </p>
                )}
              </div>
            </div>

            <SummaryRow
              icon={FiCalendar}
              label="Date"
              value={
                hasStart ? formatIST(startDate, "EEEE, MMM d, yyyy") : "TBD"
              }
            />
            <SummaryRow
              icon={FiClock}
              label="Time"
              value={
                hasStart
                  ? `${formatIST(startDate, "h:mm a")}${endDate ? ` - ${formatIST(endDate, "h:mm a")}` : ""}`
                  : "TBD"
              }
            />
            <SummaryRow
              icon={FiMapPin}
              label="Location"
              value={event.is_online ? "Online" : (event.location ?? "TBA")}
            />
            <SummaryRow
              icon={FiUsers}
              label="Guests"
              value={`${guests} ${guests === 1 ? "Person" : "People"}`}
            />
            {selectedTier && (
              <SummaryRow
                icon={LuTicket}
                label="Ticket"
                value={selectedTier.name}
              />
            )}

            {/* Say so rather than silently omitting the form — a guest who
                filled these in to request the session should see that they
                carried over. */}
            {attendeeCollectedAtRequest && (
              <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                We&apos;ve used the details you sent with your request — nothing
                more to fill in.
              </div>
            )}

            {/* Attendee details — required by the event, and not already
                gathered with the guest's join request. */}
            {requiresAttendee &&
              attendeeFields.length > 0 &&
              !attendeeCollectedAtRequest && (
                <div className="mt-3">
                  <AttendeeDetailsForm
                    dark
                    fields={attendeeFields}
                    values={attendeeValues}
                    onChange={setAttendeeValue}
                    showErrors={showAttendeeErrors}
                  />
                </div>
              )}

            {/* Private-event gate — a join request for RSVP events, else a passkey */}
            {isRsvpGated ? (
              <div className="mt-3">
                {joinApproved ? (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-200">
                    <FiLock size={16} /> Approved
                    {date
                      ? ` for ${formatIST(date, "eee d MMM, h:mm a")}`
                      : ""}{" "}
                    — you can book
                  </div>
                ) : myJoinRequest?.status === "pending" ? (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-200">
                      <FiLock size={16} /> Request sent
                    </div>
                    <p className="text-sm text-amber-100/80">
                      The host is reviewing your request
                      {date
                        ? ` for ${formatIST(date, "eee d MMM, h:mm a")}`
                        : ""}
                      . We&apos;ll email you as soon as they decide.
                    </p>
                    {/* A live request blocks sending another one, so the guest
                        needs a way to take it back and start over. */}
                    <button
                      type="button"
                      disabled={withdrawJoinRequest.isPending}
                      onClick={() =>
                        withdrawJoinRequest.mutate(
                          {
                            requestId: myJoinRequest.id,
                            eventId,
                            occurrenceDate: date || undefined,
                          },
                          {
                            onSuccess: () => toast.success("Request withdrawn"),
                            onError: (err: Error) =>
                              toast.error(
                                err.message || "Could not withdraw the request",
                              ),
                          },
                        )
                      }
                      className="mt-3 text-sm font-semibold text-amber-200 underline underline-offset-2 transition hover:text-amber-100 disabled:opacity-50"
                    >
                      {withdrawJoinRequest.isPending
                        ? "Withdrawing…"
                        : "Withdraw my request"}
                    </button>
                  </div>
                ) : myJoinRequest?.status === "rejected" ? (
                  <div className={`p-4 ${CARD}`}>
                    <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
                      <FiLock size={16} /> Request declined
                    </div>
                    <p className="text-sm text-white/60">
                      The host wasn&apos;t able to accept your request for this
                      experience.
                    </p>
                    {myJoinRequest.review_note && (
                      <p className="mt-2 text-sm text-white/70 italic">
                        &ldquo;{myJoinRequest.review_note}&rdquo;
                      </p>
                    )}
                  </div>
                ) : (
                  <div className={`p-4 ${CARD}`}>
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                      <FiLock size={16} /> Private experience
                    </div>
                    <p className="mb-3 text-sm text-white/60">
                      This experience is by request. Send the host your details
                      and they&apos;ll get back to you.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowJoinModal(true)}
                      className={`rounded-full px-5 py-2.5 text-sm font-semibold ${GRADIENT_BTN}`}
                    >
                      Request to join
                    </button>
                  </div>
                )}
              </div>
            ) : Boolean(event.is_private) || Boolean(event.access_passkey) ? (
              <div className="mt-3">
                {passkeyValid ? (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-200">
                    <FiLock size={16} /> Unlocked
                    {couponComps && " — this booking is free"}
                    {couponDiscountPct && ` — ${couponDiscountPct}% off`}
                  </div>
                ) : (
                  <div className={`p-4 ${CARD}`}>
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                      <FiLock size={16} /> Private experience
                    </div>
                    <p className="mb-3 text-sm text-white/60">
                      Enter the passkey your host shared to book.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={passkey}
                        onChange={(e) => {
                          setPasskey(e.target.value);
                          setPasskeyError(false);
                          setUnlockMessage(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleUnlock();
                        }}
                        placeholder="Passkey"
                        className={`${INPUT} ${passkeyError ? "!border-red-400" : ""}`}
                      />
                      <button
                        type="button"
                        onClick={() => void handleUnlock()}
                        disabled={unlocking || !passkey.trim()}
                        className={`rounded-xl px-5 py-2.5 text-sm font-semibold ${GRADIENT_BTN}`}
                      >
                        {unlocking ? "…" : "Unlock"}
                      </button>
                    </div>
                    {passkeyError && (
                      <p className="mt-2 text-sm text-red-400">
                        {unlockMessage ??
                          "That passkey isn't right — try again."}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {/* Coupon field — passkey and coupon are independent. The coupon is
                always available on a paid booking; for a private event it
                appears once the passkey has unlocked it (needsUnlock is false). */}
            {!needsUnlock &&
              !event.is_free &&
              grossPriceCents > 0 &&
              !isComped && (
                <div className="mt-3">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                      <span className="text-sm font-medium text-emerald-200">
                        ✓ {appliedCoupon} applied
                        {couponComps
                          ? " — this booking is free"
                          : couponDiscountPct
                            ? ` — ${couponDiscountPct}% off`
                            : " — access unlocked, you’ll still pay"}
                      </span>
                      {/* A code that unlocked the event is sent as the passkey
                          and applied by the server anyway, so it can't be
                          removed. */}
                      {appliedCoupon.toLowerCase() !==
                        passkey.trim().toLowerCase() && (
                        <button
                          type="button"
                          onClick={removeCoupon}
                          className="text-sm font-medium text-white/60 hover:text-white"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor="coupon"
                        className="mb-2 block text-sm font-medium text-white/80"
                      >
                        Have a coupon?
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="coupon"
                          type="text"
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value.toUpperCase());
                            setCouponError(null);
                          }}
                          placeholder="Coupon code"
                          className={`${INPUT} uppercase`}
                        />
                        <button
                          type="button"
                          onClick={() => void handleApplyCoupon()}
                          disabled={couponChecking || !couponInput.trim()}
                          className="rounded-xl border border-[#9B30FF] px-5 py-2.5 text-sm font-semibold text-[#E3CCFF] transition hover:bg-[#9B30FF]/15 disabled:opacity-50"
                        >
                          {couponChecking ? "…" : "Apply"}
                        </button>
                      </div>
                      {couponError && (
                        <p className="mt-2 text-sm text-red-400">
                          {couponError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

            {/* Note for host */}
            <div className="mt-3">
              <label
                htmlFor="host-note"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                Add a note for the host
              </label>
              <textarea
                id="host-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Introduce yourself or share any special requests..."
                rows={3}
                className={`${INPUT} w-full resize-none`}
              />
            </div>

            {/* Tablet + mobile: totals and payment sit in the page flow */}
            <div className="mt-5 border-t border-white/10 pt-5 lg:hidden">
              {totals}
              {paymentMethod}
              <p className="mt-4 text-xs leading-5 text-white/50">
                {cancellationCopy}
              </p>
            </div>
          </div>

          {/* Desktop: price card */}
          <aside className="hidden lg:block">
            <div className={`sticky top-10 p-5 ${CARD}`}>
              {totals}
              {paymentMethod}
              <p className="mt-5 text-xs leading-5 text-white/50">
                {cancellationCopy}
              </p>
              <div className="mt-5">{payButton}</div>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-white/45">
                <FiShield className="h-3.5 w-3.5 shrink-0" />
                Chat with {host?.first_name ?? "the host"} unlocks once
                confirmed.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Tablet + mobile: pay button pinned to the bottom */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0E0F1F]/95 px-6 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] backdrop-blur-xl md:left-20 lg:hidden">
        <div className="mx-auto max-w-[608px]">{payButton}</div>
      </div>

      <JoinRequestModal
        open={showJoinModal}
        eventTitle={event.title}
        sessionLabel={date ? formatIST(date, "eee d MMM, h:mm a") : undefined}
        attendeeFields={attendeeFields}
        initialValues={attendeeValues}
        isSubmitting={submitJoinRequest.isPending}
        onClose={() => setShowJoinModal(false)}
        onSubmit={({ message, answers }) => {
          submitJoinRequest.mutate(
            { eventId, message, answers, occurrenceDate: date || undefined },
            {
              onSuccess: () => {
                setShowJoinModal(false);
                toast.success("Request sent — the host will be in touch");
              },
              onError: (err: Error) =>
                toast.error(err.message || "Could not send your request"),
            },
          );
        }}
      />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */
export default function BookingReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);

  return (
    <>
      <Navbar dark />
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#080914]">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#B57BFF]" />
          </div>
        }
      >
        <BookingContent eventId={resolvedParams.slug} />
      </Suspense>
    </>
  );
}
