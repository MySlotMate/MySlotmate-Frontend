"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LuX, LuCheck, LuDownload, LuLoader2 } from "react-icons/lu";
import { toast } from "sonner";
import * as api from "~/lib/api";
import type { EventDTO, OccurrenceAvailability } from "~/lib/api";
import { downloadTicketPdf } from "~/lib/ticket";
import AttendeeDetailsForm, {
  attendeeFormValid,
  type AttendeeValues,
} from "~/components/booking/AttendeeDetailsForm";

// Razorpay types (mirrors TopUpModal — no shared loader in this repo). Window
// augmentation is declared in TopUpModal already; we read it via a cast here to
// avoid a duplicate/conflicting global declaration.
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: { name?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
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

// Reads the Razorpay constructor injected by the checkout script, without
// re-declaring the Window global (declared elsewhere in the app).
function getRazorpay():
  | (new (options: RazorpayOptions) => RazorpayInstance)
  | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Razorpay?: new (o: RazorpayOptions) => RazorpayInstance })
    .Razorpay;
}

// Formats an RFC3339 instant in IST for the occurrence dropdown.
const istFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});
function formatOccurrence(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : istFormatter.format(d);
}

// Builds the typed attendee-details payload from the string form values,
// including only the fields the event requires (mirrors the customer book page).
function buildAttendeeDetails(
  fields: string[],
  values: AttendeeValues,
): api.WalkInAttendeeDetails {
  return {
    ...(fields.includes("name") && { name: values.name }),
    ...(fields.includes("age") && { age: Number(values.age) }),
    ...(fields.includes("gender") && { gender: values.gender }),
    ...(fields.includes("qualification") && {
      qualification: values.qualification,
    }),
    ...(fields.includes("occupation") && { occupation: values.occupation }),
    ...(fields.includes("marital_status") && {
      marital_status: values.marital_status,
    }),
    ...(fields.includes("contact_number") && {
      contact_number: values.contact_number,
    }),
    ...(fields.includes("whatsapp_number") && {
      whatsapp_number: values.whatsapp_number,
    }),
    ...(fields.includes("registration_type") && {
      registration_type: values.registration_type,
    }),
    ...(fields.includes("govt_id_url") && { govt_id_url: values.govt_id_url }),
    ...(fields.includes("social_link") && { social_link: values.social_link }),
    ...(fields.includes("travel") && { travel: values.travel === "yes" }),
  };
}

interface HostOnSpotBookingModalProps {
  eventId: string;
  eventTitle: string;
  hostId: string;
  isOpen: boolean;
  onClose: () => void;
  onBooked?: () => void;
}

export default function HostOnSpotBookingModal({
  eventId,
  eventTitle,
  hostId,
  isOpen,
  onClose,
  onBooked,
}: HostOnSpotBookingModalProps) {
  const [mounted, setMounted] = useState(false);
  const [event, setEvent] = useState<EventDTO | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [occurrences, setOccurrences] = useState<OccurrenceAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [occLoading, setOccLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [booking, setBooking] = useState<
    Record<string, unknown> | null
  >(null);
  const [downloading, setDownloading] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [verifiedCoupon, setVerifiedCoupon] = useState<string | null>(null);
  const [verifyingCoupon, setVerifyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [attendeeValues, setAttendeeValues] = useState<AttendeeValues>({});
  const [showAttendeeErrors, setShowAttendeeErrors] = useState(false);

  const attendeeFields = event?.requires_attendee_details
    ? (event.attendee_fields ?? [])
    : [];
  const requiresAttendee = attendeeFields.length > 0;

  useEffect(() => setMounted(true), []);

  // Load the Razorpay checkout script once.
  useEffect(() => {
    if (!document.getElementById("razorpay-script")) {
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // On open: fetch the full event (price + attendee config + cover) and the next
  // 3 upcoming occurrences.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setOccLoading(true);
    setError(null);

    api
      .getEvent(eventId)
      .then((res) => {
        if (!cancelled) setEvent(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load the experience details.");
      });

    api
      .getEventAvailability(eventId)
      .then((res) => {
        if (cancelled) return;
        // Only future, unpaused slots. The backend returns a non-recurring
        // event's single occurrence even after it has passed, so filter expired
        // slots here — an expired event ends up with no bookable dates.
        const now = Date.now();
        const upcoming = (res.data || [])
          .filter((o) => !o.is_paused && new Date(o.date).getTime() > now)
          .slice(0, 3);
        setOccurrences(upcoming);
        const firstOpen =
          upcoming.find((o) => !o.is_fully_booked) ?? upcoming[0];
        setSelectedDate(firstOpen ? firstOpen.date : "");
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load available dates.");
      })
      .finally(() => {
        if (!cancelled) setOccLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, eventId]);

  const reset = () => {
    setEvent(null);
    setName("");
    setPhone("");
    setQuantity(1);
    setOccurrences([]);
    setSelectedDate("");
    setLoading(false);
    setError(null);
    setDone(false);
    setBooking(null);
    setDownloading(false);
    setAttendeeValues({});
    setShowAttendeeErrors(false);
  };

  const setAttendeeValue = (key: string, value: string) =>
    setAttendeeValues((prev) => ({ ...prev, [key]: value }));

  const isFree = !!event?.is_free;
  const priceRupees =
    event?.price_cents != null ? event.price_cents / 100 : 0;

  // Capacity gating for the chosen slot.
  const selectedOcc =
    occurrences.find((o) => o.date === selectedDate) ?? null;
  const noSlots = !occLoading && occurrences.length === 0;
  const allSlotsFull =
    occurrences.length > 0 && occurrences.every((o) => o.is_fully_booked);
  const notEnoughRoom =
    selectedOcc != null &&
    !selectedOcc.is_fully_booked &&
    selectedOcc.remaining < quantity;
  const slotBlocked =
    noSlots ||
    allSlotsFull ||
    (selectedOcc?.is_fully_booked ?? false) ||
    notEnoughRoom;

  const handleClose = () => {
    if (loading) return; // don't close mid-payment
    reset();
    onClose();
  };

  const finish = (created?: unknown) => {
    if (created && typeof created === "object") {
      setBooking(created as Record<string, unknown>);
    }
    setLoading(false);
    setDone(true);
    onBooked?.();
  };

  const handleDownloadTicket = async () => {
    if (!booking || !event) return;
    setDownloading(true);
    try {
      await downloadTicketPdf(
        booking,
        event,
        { name: name.trim() },
        (l) => setDownloading(l),
      );
    } catch {
      toast.error("Could not generate the ticket. Please try again.");
      setDownloading(false);
    }
  };

  const handleVerifyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;
    setVerifyingCoupon(true);
    setCouponError(null);
    try {
      const res = (await api.verifyCoupon(eventId, code)).data;
      if (res.valid && res.comps_booking) {
        setVerifiedCoupon(res.code);
      } else if (res.valid) {
        setCouponError("That code only grants access, not a free booking.");
      } else {
        setCouponError("Invalid coupon.");
      }
    } catch (err) {
      setCouponError(
        err instanceof Error ? err.message : "Could not verify coupon.",
      );
    } finally {
      setVerifyingCoupon(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Guest name is required.");
      return;
    }
    // A typed-but-unverified coupon must be checked first (so we don't try to
    // book free on an unverified code).
    if (couponCode.trim() && !verifiedCoupon) {
      setError("Verify the coupon before booking, or clear it.");
      return;
    }
    if (phone.length !== 10) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }
    if (quantity < 1) {
      setError("Quantity must be at least 1.");
      return;
    }
    if (!selectedDate) {
      setError("Please select a date for the booking.");
      return;
    }
    if (allSlotsFull) {
      setError("All upcoming slots are fully booked.");
      return;
    }
    if (selectedOcc?.is_fully_booked) {
      setError("This slot is fully booked. Pick another date.");
      return;
    }
    if (notEnoughRoom) {
      setError(
        `Only ${selectedOcc?.remaining} spot(s) left for this slot. Reduce the quantity.`,
      );
      return;
    }
    if (requiresAttendee && !attendeeFormValid(attendeeFields, attendeeValues)) {
      setShowAttendeeErrors(true);
      setError("Please complete the attendee details.");
      return;
    }

    // The backend stores numbers with the country code; the field takes 10 digits.
    const fullPhone = `+91${phone}`;
    const occurrence_date = selectedDate || undefined;
    const attendee_details = requiresAttendee
      ? buildAttendeeDetails(attendeeFields, attendeeValues)
      : undefined;

    setLoading(true);
    try {
      const res = (
        await api.hostInitiateWalkIn({
          host_id: hostId,
          event_id: eventId,
          guest_name: name.trim(),
          guest_phone: fullPhone,
          quantity,
          occurrence_date,
          attendee_details,
          coupon_code: verifiedCoupon ?? undefined,
        })
      ).data;

      // Free event → already booked + confirmed.
      if (!res.paid) {
        finish(res.booking);
        return;
      }

      // Paid event → open Razorpay checkout on this screen.
      const Razorpay = getRazorpay();
      if (!Razorpay) {
        setLoading(false);
        setError(
          "Could not load the payment gateway. Check your connection and retry.",
        );
        return;
      }

      const rzp = new Razorpay({
        key: res.key_id ?? "",
        amount: res.amount_cents ?? 0,
        currency: res.currency ?? "INR",
        order_id: res.order_id ?? "",
        name: "MySlotMate",
        description: `On-spot booking — ${eventTitle}`,
        prefill: { name: name.trim(), contact: fullPhone },
        theme: { color: "#0094CA" },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setError("Payment was cancelled.");
          },
        },
        handler: (response: RazorpayResponse) => {
          void (async () => {
            try {
              const created = (
                await api.hostCompleteWalkIn({
                  host_id: hostId,
                  event_id: eventId,
                  guest_user_id: res.guest_user_id,
                  quantity,
                  occurrence_date,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                })
              ).data;
              finish(created);
            } catch (err) {
              setLoading(false);
              const msg =
                err instanceof Error ? err.message : "booking failed";
              setError(
                `Payment captured but booking failed: ${msg}. The amount is in the guest's wallet — contact support.`,
              );
            }
          })();
        },
      });
      rzp.open();
    } catch (err) {
      setLoading(false);
      setError(
        err instanceof Error ? err.message : "Failed to start the booking.",
      );
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div className="flex min-h-full items-start justify-center p-4 pt-10 sm:pt-16">
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative z-50 w-full max-w-lg overflow-hidden rounded-2xl bg-white p-5 text-left shadow-2xl sm:p-6"
        >
          {/* Header */}
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                On-spot booking
              </h2>
              <p className="text-sm text-gray-500">{eventTitle}</p>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
            >
              <LuX className="h-5 w-5" />
            </button>
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <LuCheck className="h-7 w-7 text-emerald-600" />
              </div>
              <p className="text-lg font-semibold text-gray-900">
                Booking confirmed
              </p>
              <p className="text-sm text-gray-500">
                The guest&apos;s booking has been created and confirmed.
              </p>
              {error && (
                <div className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">
                  {error}
                </div>
              )}
              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={() => void handleDownloadTicket()}
                  disabled={downloading || !booking}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  <LuDownload className="h-4 w-4" />
                  {downloading ? "Preparing…" : "Download ticket"}
                </button>
                <button
                  onClick={handleClose}
                  className="rounded-xl bg-[#0094CA] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#007dab]"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Price banner */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                {isFree ? (
                  <span className="font-semibold text-emerald-600">
                    Free experience
                  </span>
                ) : verifiedCoupon ? (
                  <span className="font-semibold text-emerald-600">
                    Free with coupon{" "}
                    <span className="text-gray-400 line-through">
                      ₹{priceRupees.toLocaleString("en-IN")}
                    </span>
                  </span>
                ) : (
                  <span className="font-semibold text-gray-900">
                    ₹{priceRupees.toLocaleString("en-IN")}{" "}
                    <span className="font-normal text-gray-500">/ guest</span>
                  </span>
                )}
              </div>

              {/* Coupon — a verified free-booking code comps this walk-in to ₹0. */}
              {!isFree && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Coupon (optional)
                  </label>
                  {verifiedCoupon ? (
                    <div className="flex items-center justify-between rounded-lg border-2 border-emerald-200 bg-emerald-50 px-3 py-2.5">
                      <span className="text-sm font-medium text-emerald-700">
                        ✓ {verifiedCoupon} — this booking is free
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setVerifiedCoupon(null);
                          setCouponCode("");
                          setCouponError(null);
                        }}
                        className="text-sm font-medium text-gray-500 hover:text-gray-700"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase());
                          setCouponError(null);
                        }}
                        placeholder="Free-booking code"
                        className="w-full flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm uppercase outline-none transition focus:border-[#0094CA]"
                        disabled={loading || verifyingCoupon}
                      />
                      <button
                        type="button"
                        onClick={() => void handleVerifyCoupon()}
                        disabled={verifyingCoupon || !couponCode.trim()}
                        className="shrink-0 rounded-lg border border-[#0094CA] px-4 py-2.5 text-sm font-semibold text-[#0094CA] transition hover:bg-[#0094CA]/5 disabled:opacity-50"
                      >
                        {verifyingCoupon ? "…" : "Verify"}
                      </button>
                    </div>
                  )}
                  {couponError ? (
                    <p className="mt-1 text-[11px] text-red-500">{couponError}</p>
                  ) : (
                    !verifiedCoupon && (
                      <p className="mt-1 text-[11px] text-gray-400">
                        Enter a free-booking code and verify to comp this guest.
                      </p>
                    )
                  )}
                </div>
              )}

              {/* Phone */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Phone number
                </label>
                <div className="flex items-center rounded-lg border border-gray-200 bg-white transition focus-within:border-[#0094CA]">
                  <span className="select-none border-r border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-500">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    className="w-full bg-transparent px-3 py-2.5 text-sm outline-none"
                    placeholder="10-digit number"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Guest name
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#0094CA]"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Quantity + Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#0094CA]"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(
                        Math.max(1, parseInt(e.target.value || "1", 10)),
                      )
                    }
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Date &amp; time
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#0094CA] disabled:opacity-60"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    disabled={loading || occLoading || occurrences.length === 0}
                  >
                    {occLoading && <option value="">Loading dates…</option>}
                    {!occLoading && occurrences.length === 0 && (
                      <option value="">No upcoming dates</option>
                    )}
                    {!occLoading &&
                      occurrences.map((o) => (
                        <option
                          key={o.date}
                          value={o.date}
                          disabled={o.is_fully_booked}
                        >
                          {formatOccurrence(o.date)}
                          {o.is_fully_booked
                            ? " — Full"
                            : ` — ${o.remaining} left`}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Showing the next {occurrences.length || 3} upcoming slot
                {occurrences.length === 1 ? "" : "s"} (times in IST).
              </p>

              {/* Attendee details */}
              {requiresAttendee && (
                <AttendeeDetailsForm
                  fields={attendeeFields}
                  values={attendeeValues}
                  onChange={setAttendeeValue}
                  showErrors={showAttendeeErrors}
                />
              )}

              {!occLoading && slotBlocked && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  {noSlots
                    ? "No upcoming slots available."
                    : allSlotsFull
                      ? "All upcoming slots are fully booked."
                      : selectedOcc?.is_fully_booked
                        ? "This slot is fully booked. Pick another date."
                        : `Only ${selectedOcc?.remaining} spot(s) left for this slot.`}
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || occLoading || slotBlocked}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0094CA] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#007dab] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading && <LuLoader2 className="h-4 w-4 animate-spin" />}
                  {loading
                    ? "Processing…"
                    : isFree || verifiedCoupon
                      ? "Create booking"
                      : "Collect payment"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
