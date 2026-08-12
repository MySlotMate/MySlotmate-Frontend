"use client";

import { useState } from "react";
import { toast } from "sonner";
import SupportFileDropzone from "~/components/support/SupportFileDropzone";
import { uploadFiles } from "~/lib/api";
import { ATTENDEE_FIELDS } from "~/lib/attendeeFields";

export type AttendeeValues = Record<string, string>;

/**
 * Renders the attendee-details form for the fields an event requires. Values are
 * held as plain strings by the parent (govt_id_url = uploaded URL, travel =
 * "yes"|"no", age = numeric string). All shown fields are required.
 */
export default function AttendeeDetailsForm({
  fields,
  values,
  onChange,
  showErrors,
}: {
  fields: string[];
  values: AttendeeValues;
  onChange: (key: string, value: string) => void;
  showErrors: boolean;
}) {
  const [uploadingId, setUploadingId] = useState(false);

  const enabled = ATTENDEE_FIELDS.filter((f) => fields.includes(f.key));
  if (enabled.length === 0) return null;

  const inputClass = (key: string) =>
    `w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#0094CA] focus:ring-2 focus:ring-[#0094CA]/20 ${
      showErrors && !values[key]
        ? "border-red-400 bg-red-50"
        : "border-gray-200"
    }`;

  const handleIdUpload = async (file: File) => {
    setUploadingId(true);
    try {
      const res = await uploadFiles([file], "attendees/id-proofs");
      const url = res.data?.[0]?.url;
      if (url) onChange("govt_id_url", url);
      else toast.error("Upload failed. Please try again.");
    } catch {
      toast.error("Could not upload the ID. Please try again.");
    } finally {
      setUploadingId(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-1 text-base font-semibold text-gray-900">
        Attendee details
      </h3>
      <p className="mb-4 text-xs text-gray-500">
        The host needs a few details to confirm your spot. We&apos;ll save these
        for next time.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {enabled.map((f) => (
          <div
            key={f.key}
            className={f.type === "file" ? "sm:col-span-2" : undefined}
          >
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
              {f.label} <span className="text-red-500">*</span>
            </label>

            {f.type === "select" && (
              <select
                value={values[f.key] ?? ""}
                onChange={(e) => onChange(f.key, e.target.value)}
                className={inputClass(f.key)}
              >
                <option value="" disabled>
                  Select {f.label.toLowerCase()}
                </option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}

            {f.type === "bool" && (
              <select
                value={values[f.key] ?? ""}
                onChange={(e) => onChange(f.key, e.target.value)}
                className={inputClass(f.key)}
              >
                <option value="" disabled>
                  Select
                </option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            )}

            {f.type === "file" && (
              <>
                <SupportFileDropzone
                  fileName={values[f.key] ? "ID uploaded ✓" : null}
                  onFileSelected={handleIdUpload}
                  helperText="PNG, JPG or PDF (max. 10MB)"
                />
                {uploadingId && (
                  <p className="mt-1 text-xs text-[#0094CA]">Uploading…</p>
                )}
                {showErrors && !values[f.key] && !uploadingId && (
                  <p className="mt-1 text-xs text-red-500">
                    Please upload your ID proof.
                  </p>
                )}
              </>
            )}

            {(f.type === "text" || f.type === "tel" || f.type === "number") && (
              <input
                type={f.type === "number" ? "number" : f.type}
                inputMode={
                  f.type === "tel"
                    ? "tel"
                    : f.type === "number"
                      ? "numeric"
                      : undefined
                }
                value={values[f.key] ?? ""}
                onChange={(e) => onChange(f.key, e.target.value)}
                placeholder={f.label}
                className={inputClass(f.key)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * True when every required field has a value. `age` must be a positive number.
 */
export function attendeeFormValid(
  fields: string[],
  values: AttendeeValues,
): boolean {
  return fields.every((key) => {
    const v = values[key];
    if (!v) return false;
    if (key === "age") return Number(v) > 0;
    return true;
  });
}
