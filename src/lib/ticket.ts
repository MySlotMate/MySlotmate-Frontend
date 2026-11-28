/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { formatIST } from "./datetime";
import { currentAuthHeader } from "~/lib/api";
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

// Convert image url to base64 via FileReader to prevent canvas tainting in PDF generation.
//
// The res.ok / MIME checks are load-bearing: fetch resolves on 404 too, so
// without them a missing image yields a data: URI of the error page's HTML,
// which jsPDF then rejects at addImage with "Incomplete or corrupt PNG file" —
// aborting the whole ticket over a decorative cover.
async function getBase64FromUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Image fetch failed (${res.status}):`, url);
      return "";
    }
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) {
      console.warn(`Not an image (${blob.type}):`, url);
      return "";
    }
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

// jsPDF only decodes PNG and JPEG. Covers are routinely WEBP (and the local
// fallback is an SVG), so normalise everything through a canvas to PNG. Returns
// "" if the image can't be decoded — callers treat that as "no cover" and draw
// the placeholder instead of failing the ticket.
async function toPngDataUrl(dataUrl: string): Promise<string> {
  if (!dataUrl) return "";
  if (dataUrl.startsWith("data:image/png")) return dataUrl;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("image decode failed"));
      el.src = dataUrl;
    });
    // SVGs without intrinsic dimensions decode to 0x0 — nothing to draw.
    if (!img.naturalWidth || !img.naturalHeight) return "";
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch (err) {
    console.warn("Could not convert image to PNG for the ticket:", err);
    return "";
  }
}

// ---------------------------------------------------------------------------
// Ticket design ("light"): a white card with the brand-gradient header, the
// event, a details grid, a tear line, the entry QR and the total. Everything is
// in mm on an A4 page. jsPDF has no gradients, rounded image clipping or
// transparency we can rely on, so the header and the rounded cover are painted
// on a canvas first and placed as PNGs.
// ---------------------------------------------------------------------------

const BRAND_FROM = "#7038F5";
const BRAND_TO = "#B724EA";
const INK: [number, number, number] = [20, 18, 43]; // #14122B
const MUTED: [number, number, number] = [107, 104, 136]; // #6B6888
const LINE: [number, number, number] = [231, 224, 245]; // #E7E0F5
const LILAC: [number, number, number] = [243, 232, 255]; // #F3E8FF
const PURPLE: [number, number, number] = [126, 34, 206]; // #7E22CE

const CARD_X = 50;
const CARD_Y = 16;
const CARD_W = 110;
const CARD_R = 8;
const PAD = 7;
const HEADER_H = 48;
const PX_PER_MM = 10; // canvas resolution for the painted pieces

// The four-point sparkle from the brand mark, on a 100x100 box.
function sparklePath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  const s = size / 100;
  const p = (px: number, py: number): [number, number] => [
    x + px * s,
    y + py * s,
  ];
  ctx.beginPath();
  ctx.moveTo(...p(50, 0));
  ctx.bezierCurveTo(...p(54, 32), ...p(68, 46), ...p(100, 50));
  ctx.bezierCurveTo(...p(68, 54), ...p(54, 68), ...p(50, 100));
  ctx.bezierCurveTo(...p(46, 68), ...p(32, 54), ...p(0, 50));
  ctx.bezierCurveTo(...p(32, 46), ...p(46, 32), ...p(50, 0));
  ctx.closePath();
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: { tl: number; tr: number; br: number; bl: number },
) {
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
  ctx.lineTo(x + r.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
}

// Paints the gradient header (rounded top corners, sparkles and the translucent
// chip behind "M-TICKET"). chip is in mm, relative to the header's top-left.
function paintHeader(chip: {
  x: number;
  y: number;
  w: number;
  h: number;
}): string {
  try {
    const k = PX_PER_MM;
    const w = CARD_W * k;
    const h = HEADER_H * k;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    const r = CARD_R * k;
    roundedRectPath(ctx, 0, 0, w, h, { tl: r, tr: r, br: 0, bl: 0 });
    ctx.save();
    ctx.clip();
    // 135deg: top-left to bottom-right.
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, BRAND_FROM);
    grad.addColorStop(1, BRAND_TO);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.18;
    sparklePath(ctx, w - 47 * k, -6.4 * k, 55 * k);
    ctx.fill();
    ctx.globalAlpha = 0.55;
    sparklePath(ctx, w - 51 * k, 27 * k, 7.5 * k);
    ctx.fill();
    ctx.globalAlpha = 0.2;
    const cr = (chip.h / 2) * k;
    roundedRectPath(ctx, chip.x * k, chip.y * k, chip.w * k, chip.h * k, {
      tl: cr,
      tr: cr,
      br: cr,
      bl: cr,
    });
    ctx.fill();
    ctx.restore();
    return canvas.toDataURL("image/png");
  } catch (err) {
    console.warn("Could not paint the ticket header:", err);
    return "";
  }
}

// Centre-crops an image to a square with rounded corners.
async function roundedSquarePng(
  dataUrl: string,
  sizeMm: number,
  radiusMm: number,
) {
  if (!dataUrl) return "";
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("image decode failed"));
      el.src = dataUrl;
    });
    if (!img.naturalWidth || !img.naturalHeight) return "";
    const side = Math.round(sizeMm * PX_PER_MM);
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    const r = radiusMm * PX_PER_MM;
    roundedRectPath(ctx, 0, 0, side, side, { tl: r, tr: r, br: r, bl: r });
    ctx.clip();
    const crop = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - crop) / 2;
    const sy = (img.naturalHeight - crop) / 2;
    ctx.drawImage(img, sx, sy, crop, crop, 0, 0, side, side);
    return canvas.toDataURL("image/png");
  } catch (err) {
    console.warn("Could not crop the cover for the ticket:", err);
    return "";
  }
}

export interface TicketImages {
  cover: string; // rounded square PNG, or "" for the placeholder
  qr: string;
  logoWhite: string;
  logoMark: string;
}

export interface TicketData {
  title: string;
  category: string;
  start: Date;
  venue: string;
  guests: number;
  guestName: string;
  bookingId: string | null;
  amountCents: number;
  terms: string;
}

const COVER = 24;

function buildPdfDocument(doc: any, t: TicketData, img: TicketImages) {
  const x0 = CARD_X;
  const y0 = CARD_Y;
  const inner = CARD_W - PAD * 2;
  const cx = x0 + CARD_W / 2;

  // ---- measure first, so the card is drawn at the height its content needs
  const textX = x0 + PAD + COVER + 4.5;
  const textW = x0 + CARD_W - PAD - textX;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  let titleLines: string[] = doc.splitTextToSize(
    t.title || "Experience",
    textW,
  );
  if (titleLines.length > 3) {
    titleLines = titleLines.slice(0, 3);
    titleLines[2] = `${titleLines[2]!.replace(/\s+\S*$/, "")}...`;
  }
  doc.setFontSize(10.5);
  let venueLines: string[] = doc.splitTextToSize(t.venue, inner);
  if (venueLines.length > 2) {
    venueLines = venueLines.slice(0, 2);
    venueLines[1] = `${venueLines[1]!.replace(/\s+\S*$/, "")}...`;
  }

  const rowY = y0 + HEADER_H + 6.5;
  const chipH = t.category ? 6 : 0;
  const titleTop = rowY + (chipH ? chipH + 2.5 : 0);
  const rowH = Math.max(COVER, titleTop - rowY + titleLines.length * 5.8);
  const gridY = rowY + rowH + 6;
  const ITEM = 13.5; // label + value + gap
  const venueY = gridY + ITEM;
  const guestsY = venueY + ITEM + (venueLines.length - 1) * 4.6;
  const tearY = guestsY + ITEM + 2;
  const QR = 38;
  const TILE = QR + 8;
  const RING = 1.8;
  const tileY = tearY + 8;
  const idY = tileY + TILE + RING + 6;
  const nameY = idY + 15;
  const totalY = nameY + 7;
  const noteY = totalY + 12 + 7;
  const cardH = noteY + 4.5 + 6 - y0;

  // ---- card
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.roundedRect(x0, y0, CARD_W, cardH, CARD_R, CARD_R, "FD");

  // ---- header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setCharSpace(0.45);
  const chipLabel = "M-TICKET";
  const chipTextW = doc.getTextWidth(chipLabel) + chipLabel.length * 0.45;
  const chip = { w: chipTextW + 6, h: 6.2, x: 0, y: 6.4 };
  chip.x = CARD_W - PAD - chip.w;
  const header = paintHeader(chip);
  if (header) {
    doc.addImage(header, "PNG", x0, y0, CARD_W, HEADER_H);
  } else {
    doc.setFillColor(112, 56, 245);
    doc.roundedRect(x0, y0, CARD_W, HEADER_H, CARD_R, CARD_R, "F");
    doc.rect(x0, y0 + HEADER_H - CARD_R, CARD_W, CARD_R, "F");
  }
  doc.setTextColor(255, 255, 255);
  doc.text(chipLabel, x0 + chip.x + 3, y0 + chip.y + 4.25);
  doc.setCharSpace(0);

  if (img.logoWhite) {
    const lh = 6.8;
    doc.addImage(
      img.logoWhite,
      "PNG",
      x0 + PAD,
      y0 + 6.1,
      lh * (1048 / 209),
      lh,
    );
  } else {
    doc.setFontSize(11);
    doc.text("Myslotmate", x0 + PAD, y0 + 11);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("You're in.", x0 + PAD, y0 + HEADER_H - 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Life happens when you show up.", x0 + PAD, y0 + HEADER_H - 6.5);

  // ---- event row
  const coverX = x0 + PAD;
  if (img.cover) {
    doc.addImage(img.cover, "PNG", coverX, rowY, COVER, COVER);
  } else {
    doc.setFillColor(243, 238, 252);
    doc.setDrawColor(...LINE);
    doc.roundedRect(coverX, rowY, COVER, COVER, 5, 5, "FD");
    if (img.logoMark) {
      doc.addImage(img.logoMark, "PNG", coverX + 6, rowY + 6, 12, 12);
    }
  }

  if (t.category) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const cw = doc.getTextWidth(t.category) + 6;
    doc.setFillColor(...LILAC);
    doc.roundedRect(textX, rowY, cw, chipH, 3, 3, "F");
    doc.setTextColor(...PURPLE);
    doc.text(t.category, textX + 3, rowY + 4.1);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  doc.text(titleLines, textX, titleTop + 4.6, { lineHeightFactor: 1.18 });

  // ---- details grid
  const label = (text: string, x: number, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setCharSpace(0.35);
    doc.setTextColor(...MUTED);
    doc.text(text, x, y + 2.6);
    doc.setCharSpace(0);
  };
  const value = (text: string | string[], x: number, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text(text, x, y + 8.2, { lineHeightFactor: 1.25 });
  };
  const col2 = x0 + PAD + inner / 2 + 2;
  label("DATE", x0 + PAD, gridY);
  value(formatIST(t.start, "EEE, d MMM yyyy"), x0 + PAD, gridY);
  label("TIME", col2, gridY);
  value(formatIST(t.start, "hh:mm a"), col2, gridY);
  label("VENUE", x0 + PAD, venueY);
  value(venueLines, x0 + PAD, venueY);
  label("GUESTS", x0 + PAD, guestsY);
  value(
    `${t.guests} guest${t.guests === 1 ? "" : "s"} - Myslotmate Pass`,
    x0 + PAD,
    guestsY,
  );

  // ---- tear line with notches cut into the card edge
  doc.setLineDashPattern([1.6, 1.4], 0);
  doc.setDrawColor(220, 211, 238); // #DCD3EE
  doc.setLineWidth(0.5);
  doc.line(x0 + PAD + 1, tearY, x0 + CARD_W - PAD - 1, tearY);
  doc.setLineDashPattern([], 0);
  doc.setLineWidth(0.3);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...LINE);
  for (const nx of [x0, x0 + CARD_W]) {
    doc.circle(nx, tearY, 4.4, "FD");
  }
  doc.rect(x0 - 5, tearY - 5, 4.85, 10, "F");
  doc.rect(x0 + CARD_W + 0.15, tearY - 5, 5, 10, "F");

  // ---- QR in a white tile with a lilac ring
  const tileX = cx - TILE / 2;
  doc.setFillColor(...LILAC);
  doc.roundedRect(
    tileX - RING,
    tileY - RING,
    TILE + RING * 2,
    TILE + RING * 2,
    7.5,
    7.5,
    "F",
  );
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...LINE);
  doc.roundedRect(tileX, tileY, TILE, TILE, 6, 6, "FD");
  if (img.qr) {
    doc.addImage(img.qr, "PNG", cx - QR / 2, tileY + 4, QR, QR);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("QR unavailable", cx, tileY + TILE / 2, { align: "center" });
  }

  // ---- booking ID
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setCharSpace(0.5);
  doc.setTextColor(...MUTED);
  const idLabel = "BOOKING ID";
  doc.text(
    idLabel,
    cx - (doc.getTextWidth(idLabel) + idLabel.length * 0.5) / 2,
    idY,
  );
  const idText = t.bookingId
    ? `XXXX${t.bookingId.slice(-6).toUpperCase()}`
    : "N/A";
  doc.setFontSize(16);
  doc.setCharSpace(1.1);
  doc.setTextColor(...INK);
  doc.text(
    idText,
    cx - (doc.getTextWidth(idText) + (idText.length - 1) * 1.1) / 2,
    idY + 7.5,
  );
  doc.setCharSpace(0);

  // ---- name + confirmed pill, centred together
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  const nameW = doc.getTextWidth(t.guestName);
  doc.setFontSize(8);
  const pillText = "Confirmed";
  const pillW = doc.getTextWidth(pillText) + 8.5;
  const pillH = 6;
  const rowW = nameW + 3 + pillW;
  let px = cx - rowW / 2;
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text(t.guestName, px, nameY);
  px += nameW + 3;
  doc.setFillColor(220, 252, 231); // #DCFCE7
  doc.roundedRect(px, nameY - 4.3, pillW, pillH, 3, 3, "F");
  doc.setFillColor(22, 163, 74); // #16A34A
  doc.circle(px + 3.3, nameY - 1.3, 0.95, "F");
  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52); // #166534
  doc.text(pillText, px + 5.6, nameY - 0.2);

  // ---- total paid
  doc.setFillColor(250, 247, 255); // #FAF7FF
  doc.setDrawColor(239, 232, 250); // #EFE8FA
  doc.roundedRect(x0 + PAD, totalY, inner, 12, 4.5, 4.5, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text("Total paid", x0 + PAD + 4.5, totalY + 7.4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(
    `Rs. ${(t.amountCents / 100).toFixed(2)}`,
    x0 + CARD_W - PAD - 4.5,
    totalY + 7.8,
    {
      align: "right",
    },
  );

  // ---- note + support link
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(
    "Show this QR at the entrance. Cancellation policy applies.",
    cx,
    noteY,
    {
      align: "center",
    },
  );
  const link = "myslotmate.com/support";
  doc.setTextColor(...PURPLE);
  doc.textWithLink(link, cx - doc.getTextWidth(link) / 2, noteY + 4.5, {
    url: "https://myslotmate.com/support",
  });

  // ---- per-experience Terms & Conditions below the card, flowing onto extra
  // pages when long.
  if (t.terms) {
    const pageHeight = doc.internal.pageSize.getHeight();
    const bottomMargin = 15;
    let y = y0 + cardH + 11;
    if (y > pageHeight - bottomMargin - 10) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setCharSpace(0.3);
    doc.setTextColor(...INK);
    doc.text("TERMS & CONDITIONS", x0, y);
    doc.setCharSpace(0);
    y += 3.5;
    doc.setDrawColor(...LINE);
    doc.line(x0, y, x0 + CARD_W, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    const lines: string[] = doc.splitTextToSize(t.terms, CARD_W);
    for (const line of lines) {
      if (y > pageHeight - bottomMargin) {
        doc.addPage();
        y = 20;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
      }
      doc.text(line, x0, y);
      y += 3.3;
    }
  }
}

function titleCase(s: string): string {
  return s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

// renderTicketDoc builds the finished jsPDF document for a booking. Shared by
// every download and WhatsApp-send path so all of them produce the same ticket.
export async function renderTicketDoc(
  booking: any,
  event: any,
  bookingUser: any,
  verifyOrigin = "https://myslotmate.com",
) {
  const jsPDFClass = await loadJsPdf();
  const doc = new jsPDFClass({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const verifyUrl = `${verifyOrigin}/experience/${event.id}/confirmation?booking=${booking.id}`;

  // Images are fetched as data URIs (no canvas tainting) and normalised to PNG,
  // since jsPDF is told PNG at addImage time.
  const coverUrl: string | undefined = event?.cover_image_url;
  const proxiedCoverUrl = coverUrl?.startsWith("http")
    ? `/api/proxy-image?url=${encodeURIComponent(coverUrl)}`
    : coverUrl;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=0&color=16113a&data=${encodeURIComponent(verifyUrl)}`;
  const [coverRaw, qr, logoWhite, logoMark] = await Promise.all([
    proxiedCoverUrl ? getBase64FromUrl(proxiedCoverUrl) : Promise.resolve(""),
    getBase64FromUrl(qrUrl).then(toPngDataUrl),
    getBase64FromUrl("/assets/brand/logo-horizontal-white.png").then(
      toPngDataUrl,
    ),
    getBase64FromUrl("/assets/brand/logo-mark.png").then(toPngDataUrl),
  ]);
  const cover = await roundedSquarePng(coverRaw, COVER, 5);

  const isOnline = Boolean(event?.is_online);
  const venue = pdfSafe(
    isOnline ? "Online" : (event?.location ?? "To be announced"),
  );
  const guestName = pdfSafe(bookingUser?.name ?? "Guest") || "Guest";
  const category = pdfSafe(event?.mood ?? "");

  buildPdfDocument(
    doc,
    {
      title: pdfSafe(event?.title ?? "Experience"),
      category: category ? titleCase(category) : "",
      start: new Date(booking?.occurrence_date ?? event?.time ?? ""),
      venue: venue || "To be announced",
      guests: Number(booking?.quantity ?? 1) || 1,
      guestName,
      bookingId: booking?.id ? String(booking.id) : null,
      amountCents: Number(booking?.amount_cents ?? 0) || 0,
      terms: pdfSafe(event?.terms_and_conditions),
    },
    { cover, qr, logoWhite, logoMark },
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

// TicketSendResult carries why a send failed, so the caller can show the actual
// server error instead of a generic "could not be sent" that hides whether the
// problem is the booking, the network, or the WhatsApp provider's config.
export interface TicketSendResult {
  ok: boolean;
  reason?: string;
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
): Promise<TicketSendResult> {
  try {
    const bookingId = String(booking?.id ?? "");
    if (!bookingId)
      return { ok: false, reason: "no booking id on the booking" };
    if (!phone) return { ok: false, reason: "no guest phone number" };

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
      // eslint-disable-next-line no-restricted-syntax -- reviewed: public endpoint or sends the auth header itself
      `${env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/ticket-notification`,
      // The route is host/guest-scoped now, so this raw fetch has to carry the
      // token too — apiFetch is not in the path here.
      { method: "POST", body: form, headers: await currentAuthHeader() },
    );
    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      const reason = errData?.error ?? `HTTP ${res.status}`;
      console.error("[WhatsApp Ticket] Send failed:", reason);
      return { ok: false, reason };
    }
    return { ok: true };
  } catch (err) {
    console.error("[WhatsApp Ticket] Error generating/sending PDF:", err);
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "unexpected error",
    };
  }
}
