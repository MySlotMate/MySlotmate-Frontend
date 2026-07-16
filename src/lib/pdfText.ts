// jsPDF's built-in fonts (helvetica et al) only support Latin-1 / WinAnsi.
// Anything outside that — emoji above all — is written byte-by-byte and comes
// out as mojibake (e.g. "🌴" renders as "Ø<ß4"). Embedding a full Unicode font
// would bloat every ticket, so instead we downgrade the common typographic
// characters to Latin-1 equivalents and drop whatever is left.
export function pdfSafe(text: string | null | undefined): string {
  return (text ?? "")
    .replace(/[‘’‛]/g, "'") // smart single quotes
    .replace(/[“”]/g, '"') // smart double quotes
    .replace(/[–—]/g, "-") // en / em dash
    .replace(/[•·●▪]/g, "-") // bullets
    .replace(/…/g, "...") // ellipsis
    .replace(/₹/g, "Rs.") // rupee sign is NOT Latin-1
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "") // drop emoji + any other non-Latin-1
    .replace(/[ \t]{2,}/g, " ") // tidy gaps left by removed glyphs
    .trim();
}
