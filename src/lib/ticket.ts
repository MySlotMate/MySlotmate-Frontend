/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { formatIST } from "./datetime";
import { pdfSafe } from "./pdfText";
import { toast } from "sonner";
import { env } from "~/env";

// Load jsPDF dynamically from CDN to keep initial bundle size small
function loadJsPdf(): Promise<any> {
  const w = window as any;
  if (w.jspdf) return Promise.resolve(w.jspdf.jsPDF);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => {
      if (w.jspdf) resolve(w.jspdf.jsPDF);
      else reject(new Error("jsPDF loaded but not found on window"));
    };
    script.onerror = () => reject(new Error("Failed to load jsPDF"));
    document.body.appendChild(script);
  });
}

// Convert image url to base64 via FileReader to prevent canvas tainting in PDF generation
async function getBase64FromUrl(url: string): Promise<string> {
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
}

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

  // 10. Per-experience Terms & Conditions, printed below the ticket card. The
  // card is fixed-height, so terms flow underneath and onto extra pages when
  // long. Mirrors the confirmation-page and admin ticket PDFs.
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

// renderTicketDoc builds the finished jsPDF document for a booking. Shared by
// the download and the WhatsApp-send paths so both produce the same ticket.
async function renderTicketDoc(booking: any, event: any, bookingUser: any) {
  const jsPDFClass = await loadJsPdf();
  const doc = new jsPDFClass({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const verifyUrl = `https://myslotmate.com/experience/${event.id}/confirmation?booking=${booking.id}`;

  // Cover image proxying
  const coverUrl = event?.cover_image_url ?? "/assets/home/cover.webp";
  const proxiedCoverUrl = coverUrl.startsWith("http")
    ? `/api/proxy-image?url=${encodeURIComponent(coverUrl)}`
    : coverUrl;
  const coverBase64 = await getBase64FromUrl(proxiedCoverUrl);

  // QR code proxying
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=16304c&data=${encodeURIComponent(verifyUrl)}`;
  const qrBase64 = await getBase64FromUrl(qrUrl);

  buildPdfDocument(
    doc,
    event,
    booking,
    bookingUser,
    coverBase64,
    qrBase64,
    booking.id,
  );
  return doc;
}

function ticketFileName(bookingId: string | null | undefined): string {
  const suffix = bookingId ? bookingId.slice(-6).toUpperCase() : "booking";
  return `slotmate-ticket-${suffix}.pdf`;
}

export async function downloadTicketPdf(
  booking: any,
  event: any,
  bookingUser: any,
  onProgress?: (loading: boolean) => void,
) {
  onProgress?.(true);
  try {
    const doc = await renderTicketDoc(booking, event, bookingUser);
    doc.save(ticketFileName(booking.id));
  } catch (err) {
    console.error("PDF generation failed:", err);
    toast.error("Failed to generate PDF. Please try again.");
  } finally {
    onProgress?.(false);
  }
}

// sendTicketPdfNotification renders the ticket and uploads it to the backend,
// which pushes it to the guest over WhatsApp. Best-effort: the booking already
// succeeded, so a failure here is logged and surfaced as a toast rather than
// thrown. Mirrors the admin panel's sendTicketNotificationPdf.
export async function sendTicketPdfNotification(
  booking: any,
  event: any,
  bookingUser: any,
  phone: string,
): Promise<boolean> {
  try {
    const bookingId = String(booking?.id ?? "");
    if (!bookingId || !phone) return false;

    const doc = await renderTicketDoc(booking, event, bookingUser);
    const pdfBlob = doc.output("blob") as Blob;
    const fileName = ticketFileName(bookingId);
    const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

    const form = new FormData();
    form.append("file", pdfFile);
    form.append("phone", phone);
    form.append("eventName", event?.title ?? "");
    form.append("bookingId", bookingId);

    const res = await fetch(
      `${env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/ticket-notification`,
      { method: "POST", body: form },
    );
    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      console.error("[WhatsApp Ticket] Send failed:", errData?.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[WhatsApp Ticket] Error generating/sending PDF:", err);
    return false;
  }
}
