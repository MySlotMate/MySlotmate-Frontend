/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import type { BookingDTO } from "./api";
import { formatIST } from "./datetime";
import { ATTENDEE_FIELDS } from "./attendeeFields";
import { toast } from "sonner";

// Load XLSX (SheetJS) dynamically from CDN to avoid adding heavy build dependencies
function loadXlsx(): Promise<any> {
  const w = window as any;
  if (w.XLSX) return Promise.resolve(w.XLSX);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => {
      if (w.XLSX) resolve(w.XLSX);
      else reject(new Error("XLSX script loaded but window.XLSX is missing"));
    };
    script.onerror = () =>
      reject(new Error("Failed to load XLSX script from CDN"));
    document.body.appendChild(script);
  });
}

/**
 * Export all bookings for an experience to an Excel (.xlsx) file.
 * Formats dates into IST, formats currency, and includes attendee details if present.
 */
export async function exportBookingsToExcel(
  eventTitle: string,
  bookings: BookingDTO[],
  onProgress?: (loading: boolean) => void,
) {
  if (!bookings || bookings.length === 0) {
    toast.error("No bookings available to export for this experience.");
    return;
  }

  onProgress?.(true);
  try {
    const XLSX = await loadXlsx();

    const rows = bookings.map((b, idx) => {
      const occurrenceFormatted = b.occurrence_date
        ? formatIST(new Date(b.occurrence_date), "EEE, d MMM yyyy, hh:mm a")
        : "N/A";
      const createdFormatted = b.created_at
        ? formatIST(new Date(b.created_at), "EEE, d MMM yyyy, hh:mm a")
        : "N/A";

      const row: Record<string, string | number> = {
        "S.No": idx + 1,
        "Booking ID": b.id ? `XXXX${b.id.slice(-6).toUpperCase()}` : "N/A",
        "Guest Name": b.user_name ?? "N/A",
        "Guest Email": b.user_email ?? "N/A",
        "Occurrence Date & Time": occurrenceFormatted,
        "Quantity (Seats)": b.quantity,
        "Amount Paid (₹)":
          b.amount_cents !== null && b.amount_cents !== undefined
            ? (b.amount_cents / 100).toFixed(2)
            : "0.00",
        Status: (b.status ?? "").toUpperCase(),
        "Booking Date": createdFormatted,
      };

      // Extract attendee details if guest submitted attendee profile form
      if (b.attendee_profile) {
        const profile = b.attendee_profile as unknown as Record<
          string,
          string | number | boolean | null | undefined
        >;
        for (const field of ATTENDEE_FIELDS) {
          const val = profile[field.key];
          if (val !== undefined && val !== null && val !== "") {
            if (field.key === "travel") {
              row[field.label] = val ? "Yes" : "No";
            } else {
              row[field.label] = String(val);
            }
          }
        }
      }

      return row;
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-fit column widths (minimum width 12, max 45)
    if (rows.length > 0) {
      const colKeys = Object.keys(rows[0]!);
      const colWidths = colKeys.map((key) => {
        let maxLen = key.length;
        for (const r of rows) {
          const valStr = r[key] !== undefined ? String(r[key]) : "";
          if (valStr.length > maxLen) maxLen = valStr.length;
        }
        return { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
      });
      worksheet["!cols"] = colWidths;
    }

    // Create workbook and append sheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bookings");

    // Clean title for filename
    const cleanTitle = (eventTitle || "event")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const fileName = `${cleanTitle}_bookings.xlsx`;

    // Download file
    XLSX.writeFile(workbook, fileName);
    toast.success(
      `Exported ${bookings.length} booking${bookings.length === 1 ? "" : "s"} to Excel!`,
    );
  } catch (err) {
    console.error("Failed to export Excel sheet:", err);
    toast.error("Failed to generate Excel file. Please try again.");
  } finally {
    onProgress?.(false);
  }
}
