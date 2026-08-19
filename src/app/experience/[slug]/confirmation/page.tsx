"use client";

import { use, Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "~/components/Navbar";
import Link from "next/link";
import Breadcrumb from "~/components/Breadcrumb";
import { RecommendationPopup } from "~/components/RecommendationPopup";
import {
  useEvent,
  usePublicHostProfile,
  useListPublicEvents,
  useBooking,
  useUserProfile,
} from "~/hooks/useApi";
import {
  FiCheck,
  FiCalendar,
  FiMessageCircle,
  FiDownload,
} from "react-icons/fi";
import { formatIST } from "~/lib/datetime";
import { pdfSafe } from "~/lib/pdfText";
import { getRecommendedEventSync } from "~/lib/recommendations";
import type { EventDTO } from "~/lib/api";
import { toast } from "sonner";
import { env } from "~/env";

export const runtime = "edge";

/* ------------------------------------------------------------------ */
/*  PDF Document Generator Helper                                      */
/* ------------------------------------------------------------------ */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
function buildPdfDocument(
  doc: any,
  event: any,
  booking: any,
  bookingUser: any,
  coverBase64: string,
  qrBase64: string,
  bookingId: string | null,
) {
  const eventDate = new Date(booking?.occurrence_date ?? event?.time ?? "");

  // Outer Card Dimensions
  const startX = 55;
  const startY = 30;
  const width = 100;
  // Sized so the gold footer sits just below the Total row. Content ends at
  // startY+124 (the Total baseline) and the footer is pinned to
  // startY+height-12, so height=142 leaves a ~6mm gap instead of ~29mm.
  const height = 142; // ends at 172

  // Draw outer card background
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(243, 244, 246); // border gray-100
  doc.roundedRect(startX, startY, width, height, 6, 6, "FD");

  // Subtle outer shadow line
  doc.setDrawColor(229, 231, 235); // gray-200
  doc.setLineWidth(0.3);
  doc.roundedRect(
    startX - 0.2,
    startY - 0.2,
    width + 0.4,
    height + 0.4,
    6.2,
    6.2,
    "D",
  );
  doc.setLineWidth(0.2); // reset

  // 1. Top Brand Stripe
  doc.setFillColor(22, 48, 76); // #16304c deep slate
  doc.roundedRect(startX + 0.1, startY + 0.1, width - 0.2, 8, 5.8, 5.8, "F");
  doc.rect(startX + 0.1, startY + 5, width - 0.2, 3.2, "F"); // keep bottom edge straight

  // Top Brand Stripe Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("M Y S L O T M A T E", startX + width / 2, startY + 5.5, {
    align: "center",
  });

  // 2. Header Content (Image & Text details)
  // Draw Event Cover Image on Left
  const imgX = startX + 5;
  const imgY = startY + 12;
  const imgW = 20;
  const imgH = 26;

  if (coverBase64) {
    // Draw at the image's own aspect ratio, scaled to sit inside the reserved
    // slot — don't stretch it to imgW x imgH. Covers are cropped wide (4:1), so
    // forcing them into the tall box squashed them.
    let drawX = imgX;
    let drawY = imgY;
    let drawW = imgW;
    let drawH = imgH;
    try {
      const props = doc.getImageProperties(coverBase64);
      if (props?.width && props?.height) {
        const scale = Math.min(imgW / props.width, imgH / props.height);
        drawW = props.width * scale;
        drawH = props.height * scale;
        drawX = imgX + (imgW - drawW) / 2;
        drawY = imgY + (imgH - drawH) / 2;
      }
    } catch {
      /* couldn't read dimensions — fall back to the reserved box */
    }
    doc.addImage(coverBase64, "PNG", drawX, drawY, drawW, drawH);
  } else {
    // Beautiful dark placeholder card
    doc.setFillColor(22, 48, 76); // slate blue
    doc.roundedRect(imgX, imgY, imgW, imgH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text("MYSLOT", imgX + imgW / 2, imgY + 11, { align: "center" });
    doc.text("MATE", imgX + imgW / 2, imgY + 16, { align: "center" });
  }

  // Draw Event Details on Right
  const textX = startX + 28;
  let textY = startY + 16;

  // Event Title (Uppercase, Bold, Black)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(17, 24, 39); // gray-900
  const titleText = pdfSafe(event?.title ?? "EXPERIENCE TICKET").toUpperCase();
  const titleLines = doc.splitTextToSize(titleText, 52); // fits within right block width
  doc.text(titleLines, textX, textY);

  const titleHeight = titleLines.length * 4.2;
  textY += titleHeight + 0.5;

  // Subtitle (Mood & Language)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(107, 114, 128); // gray-500
  const subtitleText = pdfSafe(
    `${event?.mood ?? "Experience"} | ${event?.languages?.join("/") ?? "English"}`,
  );
  doc.text(subtitleText, textX, textY);
  textY += 4.5;

  // Date and Time
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39); // gray-900
  const dateText = formatIST(eventDate, "EEE, d MMM | hh:mm a");
  doc.text(dateText, textX, textY);
  textY += 4;

  // Venue Location (Truncated)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(107, 114, 128); // gray-500
  const venueText = pdfSafe(
    event?.is_online ? "Online Meet Link" : (event?.location ?? "TBD"),
  ).toUpperCase();
  const venueLines = doc.splitTextToSize(venueText, 52);
  doc.text(venueLines, textX, textY);

  // Draw Vertical "M-Ticket" on the far right
  const verticalX = startX + width - 6;
  // Border left of M-Ticket
  doc.setDrawColor(243, 244, 246); // gray-100
  doc.line(verticalX - 3.5, startY + 12, verticalX - 3.5, startY + 38);

  // M-Ticket Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(156, 163, 175); // slate-400
  const mTicketLetters = ["M", "-", "T", "I", "C", "K", "E", "T"];
  let letterY = startY + 14.5;
  for (const letter of mTicketLetters) {
    doc.text(letter, verticalX, letterY, { align: "center" });
    letterY += 3.2;
  }

  // 3. Notch Divider
  const dividerY = startY + 43;

  // Circular cuts on left and right border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235); // matches card outer border

  // Left notch
  doc.circle(startX, dividerY, 3.5, "FD");
  doc.setFillColor(255, 255, 255);
  doc.rect(startX - 5, dividerY - 5, 5, 10, "F"); // Mask left outer half

  // Right notch
  doc.circle(startX + width, dividerY, 3.5, "FD");
  doc.setFillColor(255, 255, 255);
  doc.rect(startX + width, dividerY - 5, 5, 10, "F"); // Mask right outer half

  // Dashed Divider line
  doc.setLineDashPattern([2, 2], 0);
  doc.setDrawColor(229, 231, 235); // gray-200
  doc.line(startX + 4, dividerY, startX + width - 4, dividerY);
  doc.setLineDashPattern([], 0); // Reset to solid

  // 4. Instruction Pill
  const pillY = dividerY + 5;
  doc.setFillColor(249, 250, 251); // gray-50
  doc.roundedRect(startX + 5, pillY, width - 10, 7, 3.5, 3.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(75, 85, 99); // gray-600
  doc.text(
    "SHOW THIS MOBILE TICKET AT CHECK-IN",
    startX + width / 2,
    pillY + 4.8,
    { align: "center" },
  );

  // 5. Nested Inner Card (QR Code & Info)
  const innerY = pillY + 11;
  const innerH = 38;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235); // gray-200
  doc.roundedRect(startX + 5, innerY, width - 10, innerH, 4, 4, "FD");

  // Inner Left: QR Code
  const qrX = startX + 9;
  const qrY = innerY + 4;
  const qrSize = 22;
  if (qrBase64) {
    doc.addImage(qrBase64, "PNG", qrX, qrY, qrSize, qrSize);
  } else {
    // fallback placeholder box
    doc.setFillColor(243, 244, 246);
    doc.rect(qrX, qrY, qrSize, qrSize, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(156, 163, 175);
    doc.text("[QR CODE]", qrX + qrSize / 2, qrY + qrSize / 2 + 2, {
      align: "center",
    });
  }

  // Red Line Decoration under QR Code
  doc.setFillColor(239, 68, 68); // bg-red-500
  doc.rect(qrX, qrY + qrSize + 1.5, qrSize, 0.8, "F");

  // Inner Right: Metadata
  const infoX = startX + 37;
  const infoCenter = infoX + (width - 10 - 32) / 2; // centered in right area

  // Guest count
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175); // gray-400
  const guestText = `${booking?.quantity ?? 1} Guest${(booking?.quantity ?? 1) > 1 ? "s" : ""} · Myslotmate Pass`;
  doc.text(guestText, infoCenter, innerY + 9, { align: "center" });

  // Booking Person Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(17, 24, 39); // gray-900
  const guestName = pdfSafe(bookingUser?.name ?? "Guest").toUpperCase();
  doc.text(guestName, infoCenter, innerY + 13.5, { align: "center" });

  // Booking ID
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39); // gray-900
  const displayBookingId = bookingId
    ? `XXXX${bookingId.slice(-6).toUpperCase()}`
    : "N/A";
  doc.text(`BOOKING ID: ${displayBookingId}`, infoCenter, innerY + 18.5, {
    align: "center",
  });

  // Confirmed Badge (Green Pill shape)
  const badgeW = 20;
  const badgeH = 5;
  const badgeX = infoCenter - badgeW / 2;
  const badgeY = innerY + 23.5;

  doc.setFillColor(240, 253, 250); // green-50
  doc.setDrawColor(187, 247, 208); // green-200
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.0);
  doc.setTextColor(21, 128, 61); // green-700
  doc.text("CONFIRMED", infoCenter, badgeY + 3.6, { align: "center" });

  // 6. Realistic Barcode Decoration
  const barcodeY = innerY + innerH + 4;
  doc.setDrawColor(22, 48, 76);
  let barX = startX + 39.5;
  const barWidths = [
    0.3, 0.6, 0.2, 0.8, 0.3, 0.5, 0.2, 0.7, 0.3, 0.4, 0.8, 0.2, 0.5, 0.3, 0.7,
    0.2, 0.6, 0.4, 0.3, 0.8,
  ];
  for (const w of barWidths) {
    doc.setLineWidth(w);
    doc.line(barX, barcodeY, barX, barcodeY + 4);
    barX += w + 0.6;
  }
  doc.setLineWidth(0.2); // reset

  // 7. Cancellation Banner
  const cancelY = barcodeY + 8;
  doc.setFillColor(249, 250, 251); // gray-50
  doc.rect(startX + 0.1, cancelY, width - 0.2, 8, "F");

  // top & bottom border for banner
  doc.setDrawColor(243, 244, 246); // gray-100
  doc.line(startX + 0.1, cancelY, startX + width - 0.1, cancelY);
  doc.line(startX + 0.1, cancelY + 8, startX + width - 0.1, cancelY + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(107, 114, 128); // gray-500
  doc.text(
    "CANCELLATION POLICY RULES APPLY FOR BOOKINGS",
    startX + width / 2,
    cancelY + 5.2,
    { align: "center" },
  );

  // 8. Total Amount Paid Row
  const amountY = cancelY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128); // gray-500
  doc.text("Total Amount", startX + 5, amountY + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(17, 24, 39); // gray-900
  const priceText = `Rs. ${booking?.amount_cents ? (booking.amount_cents / 100).toFixed(2) : "0.00"}`;
  doc.text(priceText, startX + width - 5, amountY + 7, { align: "right" });

  // 9. Gold Footer
  const footerY = startY + height - 12;
  doc.setFillColor(254, 243, 199); // amber-100/60
  doc.roundedRect(startX + 0.1, footerY, width - 0.2, 11.9, 5.8, 5.8, "F");
  doc.rect(startX + 0.1, footerY, width - 0.2, 5, "F"); // keep top flat

  // border top line for gold footer
  doc.setDrawColor(253, 230, 138); // amber-200
  doc.line(startX + 0.1, footerY, startX + width - 0.1, footerY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(146, 64, 14); // amber-800
  doc.text(
    "Scan QR code at the entrance to gain entry.",
    startX + width / 2,
    footerY + 7,
    { align: "center" },
  );

  // 10. Per-experience Terms & Conditions, printed below the ticket card.
  // The card is fixed-height, so terms flow underneath and onto extra pages
  // when long.
  const terms = pdfSafe(event?.terms_and_conditions);
  if (terms) {
    const pageHeight = doc.internal.pageSize.getHeight();
    const bottomMargin = 15;
    let y = startY + height + 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(22, 48, 76); // #16304c
    doc.text("TERMS & CONDITIONS", startX, y);
    y += 4;

    doc.setDrawColor(229, 231, 235); // gray-200
    doc.line(startX, y, startX + width, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(75, 85, 99); // gray-600
    const lines: string[] = doc.splitTextToSize(terms, width);
    for (const line of lines) {
      if (y > pageHeight - bottomMargin) {
        doc.addPage();
        y = 20;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(75, 85, 99);
      }
      doc.text(line, startX, y);
      y += 3.2;
    }
  }
}
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */

/* ------------------------------------------------------------------ */
/*  Confirmation Content Component                                     */
/* ------------------------------------------------------------------ */
function ConfirmationContent({ eventId }: { eventId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [recommendedEvent, setRecommendedEvent] = useState<EventDTO | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const sentNotificationRef = useRef<Record<string, boolean>>({});

  // Can use booking ID for additional details if needed
  const bookingId = searchParams.get("booking");
  const origin = "https://myslotmate.com";
  const verifyUrl = `${origin}/experience/${eventId}/confirmation?booking=${bookingId ?? ""}`;

  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: booking, isLoading: bookingLoading } = useBooking(bookingId);
  const { data: host } = usePublicHostProfile(event?.host_id ?? null);
  const { data: allEvents } = useListPublicEvents();
  const { data: bookingUser } = useUserProfile(booking?.user_id ?? null);

  const bookedTierName = booking?.price_tier_id
    ? (event?.price_tiers?.find((t) => t.id === booking.price_tier_id)?.name ??
      null)
    : null;

  // Get recommendation when event data is loaded
  useEffect(() => {
    if (event && allEvents && allEvents.length > 0) {
      const result = getRecommendedEventSync(event, allEvents);
      if (result.recommendedEvent) {
        setRecommendedEvent(result.recommendedEvent);
        setReason(result.reason);
        // Show recommendation popup after a delay
        setTimeout(() => setShowRecommendation(true), 800);
      }
    }
  }, [event, allEvents]);

  const downloadPDF = () => {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
    setIsDownloading(true);

    const runJsPdf = async () => {
      try {
        const { jsPDF } = (window as any).jspdf;
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        // Fetch image as blob and convert to base64 to avoid canvas tainting
        const getBase64FromUrl = async (url: string): Promise<string> => {
          try {
            const res = await fetch(url);
            const blob = await res.blob();
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = () => resolve("");
              reader.readAsDataURL(blob);
            });
          } catch (err) {
            console.warn("Failed to fetch image base64 from URL:", url, err);
            return "";
          }
        };

        const coverUrl = event?.cover_image_url ?? "/assets/home/cover.webp";
        const proxiedCoverUrl = coverUrl.startsWith("http")
          ? `/api/proxy-image?url=${encodeURIComponent(coverUrl)}`
          : coverUrl;
        const coverBase64 = await getBase64FromUrl(proxiedCoverUrl);

        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=16304c&data=${encodeURIComponent(verifyUrl)}`;
        const qrBase64 = await getBase64FromUrl(qrUrl);

        // Generate the PDF contents using the helper function
        buildPdfDocument(
          doc,
          event,
          booking,
          bookingUser,
          coverBase64,
          qrBase64,
          bookingId,
        );

        // Save PDF
        const ticketSuffix = bookingId
          ? bookingId.slice(-6).toUpperCase()
          : "booking";
        doc.save(`slotmate-ticket-${ticketSuffix}.pdf`);
        setIsDownloading(false);
      } catch (err) {
        console.error("PDF generation failed:", err);
        setIsDownloading(false);
        toast.error("Failed to generate PDF. Please try printing the page.");
      }
    };

    if ((window as any).jspdf) {
      void runJsPdf();
    } else {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = () => {
        void runJsPdf();
      };
      script.onerror = () => {
        setIsDownloading(false);
        toast.error(
          "Could not load PDF library. Please check your internet connection.",
        );
      };
      document.body.appendChild(script);
    }
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
  };

  // Auto-send booking confirmation via WhatsApp using Kapso AI
  useEffect(() => {
    if (!booking || !event || !bookingUser?.phn_number) return;

    const sentKey = `sent_wa_${booking.id}`;
    if (localStorage.getItem(sentKey)) return;
    if (sentNotificationRef.current[booking.id]) return;
    sentNotificationRef.current[booking.id] = true;

    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
    const runSendNotification = async () => {
      try {
        const loadJsPdf = async (): Promise<any> => {
          if ((window as any).jspdf) {
            return (window as any).jspdf.jsPDF;
          }
          return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src =
              "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
            script.onload = () => {
              if ((window as any).jspdf) {
                resolve((window as any).jspdf.jsPDF);
              } else {
                reject(new Error("jsPDF loaded but not found on window"));
              }
            };
            script.onerror = () =>
              reject(new Error("Failed to load jsPDF script"));
            document.body.appendChild(script);
          });
        };

        const jsPDFClass = await loadJsPdf();
        const doc = new jsPDFClass({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        const getBase64FromUrl = async (url: string): Promise<string> => {
          try {
            const res = await fetch(url);
            const blob = await res.blob();
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = () => resolve("");
              reader.readAsDataURL(blob);
            });
          } catch (err) {
            console.warn("Failed to fetch image base64 from URL:", url, err);
            return "";
          }
        };

        const coverUrl = event?.cover_image_url ?? "/assets/home/cover.webp";
        const proxiedCoverUrl = coverUrl.startsWith("http")
          ? `/api/proxy-image?url=${encodeURIComponent(coverUrl)}`
          : coverUrl;
        const coverBase64 = await getBase64FromUrl(proxiedCoverUrl);

        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=16304c&data=${encodeURIComponent(verifyUrl)}`;
        const qrBase64 = await getBase64FromUrl(qrUrl);

        // Draw PDF layout
        buildPdfDocument(
          doc,
          event,
          booking,
          bookingUser,
          coverBase64,
          qrBase64,
          booking.id,
        );

        // Convert doc to a blob and create file
        const pdfBlob = doc.output("blob") as Blob;
        const ticketSuffix = booking.id.slice(-6).toUpperCase();
        const pdfFile = new File(
          [pdfBlob],
          `slotmate-ticket-${ticketSuffix}.pdf`,
          {
            type: "application/pdf",
          },
        );

        const sendFormData = new FormData();
        sendFormData.append("file", pdfFile);
        sendFormData.append("phone", bookingUser.phn_number);
        sendFormData.append("eventName", event.title);
        sendFormData.append("bookingId", booking.id);

        const response = await fetch(
          `${env.NEXT_PUBLIC_API_URL}/bookings/${booking.id}/ticket-notification`,
          {
            method: "POST",
            body: sendFormData,
          },
        );

        if (response.ok) {
          console.log("[WhatsApp Notification] Successfully sent!");
          localStorage.setItem(sentKey, "true");
        } else {
          const errData = (await response.json()) as { error?: string };
          console.error("[WhatsApp Notification] Send failed:", errData?.error);
        }
      } catch (err) {
        console.error(
          "[WhatsApp Notification] Error generating/sending PDF:",
          err,
        );
      }
    };

    void runSendNotification();
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
  }, [booking, event, bookingUser, verifyUrl]);

  if (eventLoading || bookingLoading) {
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

  const eventDate = new Date(booking?.occurrence_date ?? event.time);

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="site-x mx-auto max-w-md text-center">
        {/* Success Header Block */}
        <div className="mb-5 text-center">
          <div className="mb-1.5 inline-flex items-center justify-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
              <FiCheck size={14} className="stroke-[3]" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-gray-900">
              Booking Confirmed!
            </h1>
          </div>
          <p className="mx-auto max-w-sm px-4 text-xs text-gray-500">
            Host {host?.first_name ?? "the host"} is notified. You&apos;re all
            set for {event.title}.
          </p>
        </div>

        {/* BookMyShow Style Ticket Card */}
        <div
          id="booking-ticket"
          className="relative mx-auto mb-5 max-w-md overflow-hidden rounded-[24px] border border-gray-100 bg-white text-left shadow-2xl transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
        >
          {/* Top Brand Bar */}
          <div className="bg-[#16304c] px-5 py-2 text-center text-[10px] font-extrabold tracking-[0.2em] text-white uppercase">
            My Slotmate
          </div>

          {/* Main Header (Upper Section) */}
          <div className="relative flex items-start gap-4 bg-white p-4">
            {/* Event Cover Image (Left) */}
            <div className="relative h-26 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 shadow-sm">
              <img
                src={event.cover_image_url ?? "/assets/home/cover.webp"}
                alt="Event Cover"
                className="h-full w-full object-cover"
              />
            </div>

            {/* Event Info (Middle) */}
            <div className="min-w-0 flex-1">
              <h2 className="line-clamp-2 text-[15px] leading-snug font-black tracking-tight text-gray-900 uppercase">
                {event.title}
              </h2>
              <p className="mt-1 text-[10px] font-semibold text-gray-500">
                {event.mood ?? "Experience"} |{" "}
                {event.languages?.join("/") ?? "English"}
              </p>
              <p className="mt-1.5 flex items-center gap-1 text-[11px] font-extrabold text-gray-900">
                {formatIST(eventDate, "EEE, d MMM | hh:mm a")}
              </p>
              <p className="mt-1 truncate text-[10px] font-semibold text-gray-500 uppercase">
                {event.is_online
                  ? "Online Meet Link"
                  : (event.location ?? "TBD")}
              </p>
            </div>

            {/* Vertical M-Ticket Label (Right) */}
            <div className="flex rotate-180 items-center justify-center self-stretch border-l border-gray-100 pl-3 text-[9px] font-black tracking-[0.2em] text-slate-400 uppercase [writing-mode:vertical-lr]">
              M-Ticket
            </div>
          </div>

          {/* Notch Divider */}
          <div className="relative flex items-center">
            <div className="absolute -left-2 h-4 w-4 rounded-full border border-gray-100/50 bg-gray-50 shadow-inner"></div>
            <div className="absolute -right-2 h-4 w-4 rounded-full border border-gray-100/50 bg-gray-50 shadow-inner"></div>
            <div className="mx-2 w-full border-t border-dashed border-gray-200/80"></div>
          </div>

          {/* Instruction Pill */}
          <div className="mt-3 px-5">
            <div className="w-full rounded-xl bg-gray-50 py-2 text-center text-[10px] font-bold tracking-wide text-gray-600 uppercase">
              Show this mobile ticket at check-in
            </div>
          </div>

          {/* QR Code & Booking details container */}
          <div className="mt-3 px-5">
            <div className="flex items-center gap-4 rounded-2xl border border-gray-200/80 bg-white p-3.5 shadow-xs">
              {/* QR Image with red line decoration */}
              <div className="flex shrink-0 flex-col items-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=16304c&data=${encodeURIComponent(verifyUrl)}`}
                  alt="Booking QR Code"
                  className="h-18 w-18"
                  crossOrigin="anonymous"
                />
                <div className="mt-1 h-0.5 w-18 rounded-full bg-red-500" />
              </div>

              {/* Booking metadata */}
              <div className="flex flex-1 flex-col items-center justify-center gap-0.5 pr-2 text-center">
                <span className="block text-[10px] font-semibold text-gray-400">
                  {booking?.quantity ?? 1} Guest
                  {(booking?.quantity ?? 1) > 1 ? "s" : ""}
                  {bookedTierName ? ` · ${bookedTierName}` : ""} · Myslotmate
                  Pass
                </span>
                <span className="block text-xs font-extrabold tracking-wide text-gray-950 uppercase">
                  {bookingUser?.name ?? "Guest"}
                </span>
                <span className="block text-[11px] font-black tracking-tight text-gray-900 select-all">
                  BOOKING ID:{" "}
                  {bookingId
                    ? `XXXX${bookingId.slice(-6).toUpperCase()}`
                    : "N/A"}
                </span>
                <span className="mt-0.5 inline-block rounded-full border border-green-200/50 bg-green-50 px-2 py-0.5 text-[8px] font-extrabold text-green-700">
                  CONFIRMED
                </span>
              </div>
            </div>
          </div>

          {/* Cancellation Info Banner */}
          <div className="mt-3 border-t border-b border-gray-100 bg-gray-50/80 px-5 py-2 text-center text-[9px] font-black tracking-widest text-gray-500 uppercase">
            Cancellation policy rules apply for bookings
          </div>

          {/* Total Amount paid */}
          <div className="flex items-center justify-between bg-white px-5 py-2.5">
            <span className="text-xs font-bold tracking-wide text-gray-500 uppercase">
              Total Amount
            </span>
            <span className="text-[15px] font-black text-gray-900">
              ₹{" "}
              {booking?.amount_cents
                ? (booking.amount_cents / 100).toFixed(2)
                : "0.00"}
            </span>
          </div>

          {/* Gold footer decoration */}
          <div className="border-t border-amber-200/50 bg-amber-100/60 px-5 py-2.5 text-center text-[10px] font-bold tracking-wide text-amber-800">
            Scan QR code at the entrance to gain entry.
          </div>
        </div>

        {/* Per-experience Terms & Conditions (mirrors the ticket PDF) */}
        {event.terms_and_conditions?.trim() && (
          <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="text-xs font-black tracking-wide text-[#16304c] uppercase">
              Terms &amp; Conditions
            </h3>
            <p className="mt-2 text-xs leading-relaxed whitespace-pre-wrap text-gray-600">
              {event.terms_and_conditions.trim()}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={downloadPDF}
            disabled={isDownloading}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#1fa7ff] to-[#0094CA] py-3 text-xs font-black text-white shadow-[0_4px_12px_rgba(0,148,202,0.15)] transition duration-100 hover:shadow-[0_6px_16px_rgba(0,148,202,0.22)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiDownload
              size={14}
              className={isDownloading ? "animate-bounce" : ""}
            />
            {isDownloading ? "PDF..." : "Download PDF"}
          </button>

          <button
            onClick={() => router.push("/activities")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#0094CA] py-3 text-xs font-black text-white shadow-[0_4px_12px_rgba(0,148,202,0.05)] transition hover:bg-[#007ba8] active:scale-95"
          >
            <FiCalendar size={14} />
            My Bookings
          </button>
        </div>

        {/* Chat Unlocked Notice */}
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#0094CA]/15 bg-[#0094CA]/5 px-3 py-2.5 text-left text-[11px] leading-normal text-gray-600">
          <FiMessageCircle className="shrink-0 text-[#0094CA]" size={15} />
          <span>
            <strong className="text-gray-900">Chat Unlocked:</strong> Reach out
            to {host?.first_name ?? "the host"} anytime to coordinate details.
          </span>
        </div>

        {/* Back to Browse */}
        <p className="mt-4 text-xs text-gray-500">
          <Link href="/" className="text-[#0094CA] hover:underline">
            Browse more experiences
          </Link>
        </p>
      </div>

      {/* Recommendation Popup */}
      <RecommendationPopup
        isOpen={showRecommendation}
        onClose={() => setShowRecommendation(false)}
        event={recommendedEvent}
        reason={reason}
      />
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
      <Navbar />
      <div className="site-x mx-auto max-w-xl py-6">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Experiences", href: "/experiences" },
            { label: "Confirmation" },
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
        <ConfirmationContent eventId={resolvedParams.slug} />
      </Suspense>
    </>
  );
}
