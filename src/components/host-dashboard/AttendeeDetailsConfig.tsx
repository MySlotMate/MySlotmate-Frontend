"use client";

import { ATTENDEE_FIELDS } from "~/lib/attendeeFields";

/**
 * Host-facing config block: a "require attendee details" toggle + a checklist of
 * the fixed field catalog. Selected fields become required for guests at booking.
 * Shared by the host create and edit experience forms.
 */
export default function AttendeeDetailsConfig({
  enabled,
  fields,
  onToggle,
  onFieldsChange,
}: {
  enabled: boolean;
  fields: string[];
  onToggle: (next: boolean) => void;
  onFieldsChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-4 border-t border-gray-100 pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Require attendee details
          </h3>
          <p className="text-sm text-gray-500">
            Collect extra details from each guest at booking. Selected fields
            are required.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onToggle(!enabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            enabled ? "bg-[#0094CA]" : "bg-gray-200"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ATTENDEE_FIELDS.map((f) => {
            const checked = fields.includes(f.key);
            return (
              <label
                key={f.key}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    onFieldsChange(
                      e.target.checked
                        ? [...fields, f.key]
                        : fields.filter((k) => k !== f.key),
                    )
                  }
                  className="h-4 w-4 shrink-0 rounded border-gray-300 text-[#0094CA] focus:ring-[#0094CA]"
                />
                <span className="min-w-0 break-words">{f.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
