"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FiX } from "react-icons/fi";
import AttendeeDetailsForm, {
  attendeeFormValid,
  type AttendeeValues,
} from "~/components/booking/AttendeeDetailsForm";
import type { JoinRequestAnswers } from "~/lib/api";

/**
 * "Request to join" form for an RSVP-gated private event.
 *
 * The fields are exactly the attendee details the host configured for this
 * experience — the same catalog the booking form uses — so the host reviews
 * requests against the information they already said they need. The note is
 * always offered, so a request is never a bare click even when the host
 * configured no fields at all.
 *
 * Submitting does NOT book anything. Approval unlocks booking; the guest comes
 * back and books, and pays, as normal.
 */
export default function JoinRequestModal({
  open,
  eventTitle,
  attendeeFields,
  initialValues,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  eventTitle: string;
  attendeeFields: string[];
  /** Prefill from the guest's saved attendee profile, as the booking form does. */
  initialValues?: AttendeeValues;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    message: string;
    answers?: JoinRequestAnswers;
  }) => void;
}) {
  const [values, setValues] = useState<AttendeeValues>(initialValues ?? {});
  const [message, setMessage] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  if (!open) return null;

  const handleSubmit = () => {
    if (attendeeFields.length > 0 && !attendeeFormValid(attendeeFields, values)) {
      setShowErrors(true);
      toast.error("Please complete all the requested details");
      return;
    }
    onSubmit({ message: message.trim(), answers: toAnswers(attendeeFields, values) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-[#16304c]">
              Request to join
            </h2>
            <p className="mt-0.5 text-xs text-[#6f8daa]">{eventTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="rounded-lg bg-[#0094CA]/5 px-3 py-2 text-xs text-[#16304c]">
            The host reviews every request. If they say yes, you&apos;ll be able
            to book — your spot isn&apos;t held until you do.
          </p>

          {attendeeFields.length > 0 && (
            <AttendeeDetailsForm
              fields={attendeeFields}
              values={values}
              onChange={(key, value) =>
                setValues((prev) => ({ ...prev, [key]: value }))
              }
              showErrors={showErrors}
            />
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Anything you&apos;d like the host to know?{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Why you'd like to join…"
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#0094CA] focus:ring-2 focus:ring-[#0094CA]/20"
            />
          </div>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-gray-100 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-[1.5] rounded-xl bg-gradient-to-r from-[#1fa7ff] to-[#0094CA] py-3 text-sm font-bold text-white shadow-md transition hover:shadow-lg disabled:opacity-50"
          >
            {isSubmitting ? "Sending…" : "Send request"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Map the form's plain-string values onto the typed answers the API expects,
 * including only the fields this event actually asked for. Mirrors the booking
 * page's conversion so both paths write the same profile shape.
 */
function toAnswers(
  fields: string[],
  values: AttendeeValues,
): JoinRequestAnswers | undefined {
  if (fields.length === 0) return undefined;
  const has = (key: string) => fields.includes(key);
  return {
    ...(has("name") && { name: values.name }),
    ...(has("age") && { age: Number(values.age) }),
    ...(has("gender") && { gender: values.gender }),
    ...(has("qualification") && { qualification: values.qualification }),
    ...(has("occupation") && { occupation: values.occupation }),
    ...(has("marital_status") && { marital_status: values.marital_status }),
    ...(has("contact_number") && { contact_number: values.contact_number }),
    ...(has("whatsapp_number") && { whatsapp_number: values.whatsapp_number }),
    ...(has("registration_type") && {
      registration_type: values.registration_type,
    }),
    ...(has("govt_id_url") && { govt_id_url: values.govt_id_url }),
    ...(has("travel") && { travel: values.travel === "yes" }),
    ...(has("social_link") && { social_link: values.social_link }),
  };
}
