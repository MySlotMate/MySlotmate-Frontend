"use client";

import Breadcrumbs from "~/components/Breadcrumbs";
import { use, Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "~/components/Navbar";
import Link from "next/link";
import {
  useEvent,
  usePublicHostProfile,
  useBooking,
  useFeeDocuments,
  useUserProfile,
} from "~/hooks/useApi";
import {
  FiCheck,
  FiCalendar,
  FiClock,
  FiDownload,
  FiHome,
  FiMapPin,
  FiMessageCircle,
  FiUsers,
} from "react-icons/fi";
import { formatIST } from "~/lib/datetime";
import { downloadTicketPdf, sendTicketPdfNotification } from "~/lib/ticket";
import FeeReceiptButton from "~/components/billing/FeeReceiptButton";

export const runtime = "edge";

/* ------------------------------------------------------------------ */
/*  Celebration particles (CSS only; off with prefers-reduced-motion)  */
/* ------------------------------------------------------------------ */
const CONFETTI_COLORS = [
  "#B57BFF",
  "#E040FB",
  "#D8B4FE",
  "#4ADE80",
  "#FBBF24",
  "#FFFFFF",
];

/** One burst out of the success mark; positions are fixed, not random. */
function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {Array.from({ length: 36 }, (_, i) => {
        const angle = ((i * 360) / 36 + ((i * 47) % 20)) * (Math.PI / 180);
        const dist = 90 + ((i * 53) % 110);
        const style = {
          "--dx": `${Math.round(Math.cos(angle) * dist)}px`,
          // Pieces drift down after the burst.
          "--dy": `${Math.round(Math.sin(angle) * dist + 140)}px`,
          "--rot": `${(i * 97) % 540}deg`,
          backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          animationDelay: `${(i % 6) * 40}ms`,
        } as React.CSSProperties;
        return (
          <span
            key={i}
            style={style}
            className={`msm-confetti absolute top-1/2 left-1/2 ${
              i % 3 === 0 ? "h-2 w-2 rounded-full" : "h-3 w-1.5 rounded-[2px]"
            }`}
          />
        );
      })}
    </div>
  );
}

/** Soft twinkling dots across the top of the page. */
function Sparkles() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]"
    >
      {Array.from({ length: 22 }, (_, i) => (
        <span
          key={i}
          className="msm-star absolute rounded-full bg-white"
          style={{
            left: `${(i * 37 + 7) % 100}%`,
            top: `${(i * 23 + 11) % 100}%`,
            width: i % 4 === 0 ? 3 : 2,
            height: i % 4 === 0 ? 3 : 2,
            animationDelay: `${(i % 7) * -0.6}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Confirmation Content Component                                     */
/* ------------------------------------------------------------------ */
function ConfirmationContent({ eventId }: { eventId: string }) {
  const searchParams = useSearchParams();
  const [isDownloading, setIsDownloading] = useState(false);
  const sentNotificationRef = useRef<Record<string, boolean>>({});

  // Can use booking ID for additional details if needed
  const bookingId = searchParams.get("booking");
  const origin = "https://myslotmate.com";
  const verifyUrl = `${origin}/experience/${eventId}/confirmation?booking=${bookingId ?? ""}`;

  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: booking, isLoading: bookingLoading } = useBooking(bookingId);
  // The platform fee receipt, when this booking has one (paid, billing on).
  const { data: feeDocs } = useFeeDocuments("booking", bookingId);
  const feeReceipt = feeDocs?.find((d) => d.kind === "invoice");
  const refundNote = feeDocs?.find((d) => d.kind === "credit_note");
  const { data: host } = usePublicHostProfile(event?.host_id ?? null);
  const { data: bookingUser } = useUserProfile(booking?.user_id ?? null);

  const bookedTierName = booking?.price_tier_id
    ? (event?.price_tiers?.find((t) => t.id === booking.price_tier_id)?.name ??
      null)
    : null;

  const downloadPDF = () => {
    if (!booking || !event) return;
    void downloadTicketPdf(booking, event, bookingUser, setIsDownloading);
  };

  // Auto-send booking confirmation via WhatsApp using Kapso AI
  useEffect(() => {
    if (!booking || !event || !bookingUser?.phn_number) return;

    const sentKey = `sent_wa_${booking.id}`;
    if (localStorage.getItem(sentKey)) return;
    if (sentNotificationRef.current[booking.id]) return;
    sentNotificationRef.current[booking.id] = true;

    const phone = bookingUser.phn_number;
    void sendTicketPdfNotification(booking, event, bookingUser, phone).then(
      (res) => {
        if (res.ok) localStorage.setItem(sentKey, "true");
        else console.error("[WhatsApp Notification] Send failed:", res.reason);
      },
    );
  }, [booking, event, bookingUser]);

  if (eventLoading || bookingLoading) {
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

  const eventDate = new Date(booking?.occurrence_date ?? event.time);
  const guestCount = booking?.quantity ?? 1;
  const hostName = host ? `${host.first_name} ${host.last_name}`.trim() : null;
  const place = event.is_online ? "Online" : (event.location ?? "TBA");
  const refCode = bookingId
    ? `#MSM-${bookingId.slice(-6).toUpperCase()}`
    : null;

  const timeLabel = `${formatIST(eventDate, "h:mm a")}${
    event.duration_minutes
      ? ` – ${formatIST(
          new Date(eventDate.getTime() + event.duration_minutes * 60_000),
          "h:mm a",
        )}`
      : ""
  }`;
  const paidLabel = booking?.pass_id
    ? booking.amount_cents
      ? `Monthly pass + ₹${(booking.amount_cents / 100).toLocaleString("en-IN")}`
      : "Monthly pass"
    : booking?.amount_cents
      ? `Paid ₹${(booking.amount_cents / 100).toLocaleString("en-IN")}`
      : "Free";
  const infoRow = "flex items-start gap-2.5 text-[14px] text-white/75";
  const infoIcon = "mt-0.5 h-4 w-4 shrink-0 text-[#D8B4FE]";

  return (
    <main className="relative isolate min-h-screen overflow-x-clip bg-[#080914] font-[family-name:var(--font-inter)] text-white max-md:pb-28">
      {/* Ambient glow from the poster, as on the event page. */}
      {event.cover_image_url && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.cover_image_url}
            alt=""
            className="h-full w-full scale-125 object-cover opacity-30 blur-[100px] saturate-150"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#080914]/10 via-[#080914]/70 to-[#080914]" />
        </div>
      )}
      <Sparkles />

      <div className="mx-auto flex w-full max-w-[720px] flex-col items-center px-5 pt-5 pb-16 text-center md:px-8 md:pt-8">
        <Breadcrumbs className="self-start text-left" />

        {/* Success mark with a confetti burst behind it */}
        <div className="relative mt-6 flex h-20 w-20 items-center justify-center md:mt-8">
          <Confetti />
          <span className="msm-ring absolute inset-0 rounded-full bg-[#22C55E]/40" />
          <span className="msm-pop relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#4ADE80] to-[#16A34A] shadow-[0_0_60px_-6px_rgb(34_197_94/0.7)]">
            <FiCheck className="h-9 w-9 stroke-[3] text-white" />
          </span>
        </div>
        <h1
          className="msm-rise font-outfit mt-6 text-[clamp(26px,6vw,36px)] leading-tight font-semibold tracking-[-0.02em] text-balance"
          style={{ animationDelay: "150ms" }}
        >
          Thank you
          {bookingUser?.name ? `, ${bookingUser.name.split(" ")[0]}` : ""}!
        </h1>
        <p
          className="msm-rise mt-2 text-[15px] text-white/65"
          style={{ animationDelay: "250ms" }}
        >
          Your booking is confirmed. See you there!
        </p>

        {/* Ticket */}
        <div
          id="booking-ticket"
          className="msm-rise relative mt-8 flex w-full flex-col overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#131328]/90 text-left shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)] backdrop-blur md:flex-row"
          style={{ animationDelay: "350ms" }}
        >
          <div className="flex min-w-0 flex-1 flex-col p-5 md:p-7">
            <div className="flex items-start gap-4">
              {event.cover_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.cover_image_url}
                  alt=""
                  className="h-[84px] w-[68px] shrink-0 rounded-xl object-cover ring-1 ring-white/10"
                />
              )}
              <div className="min-w-0">
                <span className="inline-block rounded-md bg-[#9B30FF]/20 px-2 py-1 text-[10px] font-bold tracking-wider text-[#D8B4FE] uppercase">
                  {bookedTierName ?? "Experience Pass"}
                </span>
                <h2 className="font-outfit mt-2 text-lg leading-6 font-semibold text-white">
                  {event.title}
                </h2>
                {hostName && (
                  <p className="mt-1 truncate text-[13px] text-white/55">
                    Hosted by {hostName}
                  </p>
                )}
              </div>
            </div>

            <ul className="mt-5 flex flex-col gap-2.5">
              <li className={infoRow}>
                <FiCalendar className={infoIcon} />
                {formatIST(eventDate, "EEE, d MMM yyyy")}
              </li>
              <li className={infoRow}>
                <FiClock className={infoIcon} />
                {timeLabel}
              </li>
              <li className={infoRow}>
                <FiMapPin className={infoIcon} />
                <span className="min-w-0 break-words">{place}</span>
              </li>
              <li className={infoRow}>
                <FiUsers className={infoIcon} />
                {guestCount} guest{guestCount > 1 ? "s" : ""}
              </li>
            </ul>

            <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/[0.08] pt-4 text-[13px]">
              <span className="truncate text-white/60">
                {bookingUser?.name ?? "Guest"}
                {refCode && (
                  <span className="font-mono text-white/45 md:hidden">
                    {" "}
                    · {refCode}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-semibold text-white">
                {paidLabel}
              </span>
            </div>
          </div>

          {/* Tear line with notches: horizontal on mobile, vertical on desktop */}
          {/* The QR stub is desktop-only: on a phone the guest is holding the
              ticket already, and the PDF / WhatsApp ticket carries the QR. */}
          <div className="relative hidden border-dashed border-white/15 md:block md:border-l">
            <span className="absolute -top-3 -left-3 h-6 w-6 rounded-full bg-[#080914]" />
            <span className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-[#080914] md:top-auto md:right-auto md:-bottom-3 md:-left-3" />
          </div>

          <div className="hidden flex-col items-center justify-center p-6 md:flex md:w-[240px]">
            <div className="rounded-2xl bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=16304c&data=${encodeURIComponent(verifyUrl)}`}
                alt="Booking QR code"
                className="h-[140px] w-[140px] md:h-[120px] md:w-[120px]"
                crossOrigin="anonymous"
              />
            </div>
            <p className="mt-3 text-xs text-white/55">Show this at entry</p>
            {refCode && (
              <p className="mt-1 font-mono text-[13px] font-semibold text-white select-all">
                {refCode}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div
          className="msm-rise mt-6 grid w-full gap-3 sm:grid-cols-2"
          style={{ animationDelay: "450ms" }}
        >
          <button
            type="button"
            onClick={downloadPDF}
            disabled={isDownloading}
            className="font-outfit flex h-13 items-center justify-center gap-2 rounded-full bg-white text-[15px] font-semibold text-[#080914] transition hover:bg-white/90 active:scale-[0.99] disabled:opacity-60"
          >
            <FiDownload
              className={`h-4 w-4 ${isDownloading ? "animate-bounce" : ""}`}
            />
            {isDownloading ? "Preparing…" : "Download ticket"}
          </button>
          <Link
            href="/"
            className="font-outfit flex h-13 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] text-[15px] font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.08] active:scale-[0.99]"
          >
            <FiHome className="h-4 w-4" />
            Go to home
          </Link>
        </div>
        {(feeReceipt ?? refundNote) && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {feeReceipt && <FeeReceiptButton doc={feeReceipt} />}
            {refundNote && <FeeReceiptButton doc={refundNote} />}
          </div>
        )}

        <p className="mt-6 flex items-center gap-2 text-xs text-white/50">
          <FiMessageCircle className="h-3.5 w-3.5 shrink-0" />
          Chat with {host?.first_name ?? "the host"} is now unlocked to
          coordinate details.
        </p>

        {/* Per-experience Terms & Conditions (mirrors the ticket PDF) */}
        {event.terms_and_conditions?.trim() && (
          <details className="mt-6 w-full rounded-2xl border border-white/[0.06] bg-[#131328] p-5 text-left">
            <summary className="cursor-pointer text-xs font-semibold tracking-wide text-white/80 uppercase">
              Terms &amp; Conditions
            </summary>
            <p className="mt-3 text-xs leading-relaxed whitespace-pre-wrap text-white/60">
              {event.terms_and_conditions.trim()}
            </p>
          </details>
        )}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */
export default function ConfirmationPage({
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
        <ConfirmationContent eventId={resolvedParams.slug} />
      </Suspense>
    </>
  );
}
