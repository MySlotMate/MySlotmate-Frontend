"use client";

import { useState } from "react";
import { FiFileText } from "react-icons/fi";
import { toast } from "sonner";
import { downloadFeeDocument, type FeeDocumentDTO } from "~/lib/api";

/** What a guest calls each document. */
export function feeDocumentLabel(doc: Pick<FeeDocumentDTO, "kind">) {
  return doc.kind === "credit_note" ? "Refund note" : "Fee receipt";
}

/**
 * Downloads a platform fee receipt (invoice) or refund note (credit note) as a
 * PDF. The ticket price is the host's and is not on it.
 */
export default function FeeReceiptButton({
  doc,
  label,
  className,
}: {
  doc: FeeDocumentDTO;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const text = label ?? `Download ${feeDocumentLabel(doc).toLowerCase()}`;
  return (
    <button
      type="button"
      disabled={busy}
      title={`${feeDocumentLabel(doc)} ${doc.number}`}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadFeeDocument(doc);
        } catch {
          toast.error("Couldn't download it. Please try again.");
        } finally {
          setBusy(false);
        }
      }}
      className={
        className ??
        "flex items-center gap-1.5 text-sm font-semibold text-[#D8B4FE] transition hover:text-white disabled:opacity-50"
      }
    >
      <FiFileText className="h-4 w-4 shrink-0" />
      {busy ? "Preparing…" : text}
    </button>
  );
}
