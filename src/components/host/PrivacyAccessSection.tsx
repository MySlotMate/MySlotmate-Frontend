"use client";

export type AccessMode = "shared" | "unique";

/** Which gate a private event uses. Mirrors the API's private_access_mode. */
export type PrivateAccessMode = "passkey" | "rsvp";

interface Props {
  isPrivate: boolean;
  /** "passkey" = guests type a code; "rsvp" = guests ask and the host approves. */
  privateAccessMode: PrivateAccessMode;
  /** "shared" = one passkey for everyone; "unique" = a code per guest.
   *  Only meaningful when privateAccessMode is "passkey". */
  accessMode: AccessMode;
  accessPasskey: string;
  showError?: boolean;
  /** True on the edit form (event saved) — enables generating per-guest codes. */
  canGenerateCodes?: boolean;
  onChange: (
    patch: Partial<{
      isPrivate: boolean;
      privateAccessMode: PrivateAccessMode;
      accessMode: AccessMode;
      accessPasskey: string;
    }>,
  ) => void;
}

/** The three answers to "Who can book?". */
export type WhoCanBook = "anyone" | "code" | "approve";

export function whoCanBookOf(
  isPrivate: boolean,
  mode: PrivateAccessMode,
): WhoCanBook {
  if (!isPrivate) return "anyone";
  return mode === "rsvp" ? "approve" : "code";
}

/** One-line summary for a collapsed "Who can book?" row or a pill. */
export function whoCanBookLabel(
  isPrivate: boolean,
  mode: PrivateAccessMode,
): string {
  const w = whoCanBookOf(isPrivate, mode);
  if (w === "anyone") return "Anyone";
  if (w === "code") return "People with a code";
  return "People I approve";
}

const CHOICES: { key: WhoCanBook; title: string; desc: string }[] = [
  {
    key: "anyone",
    title: "Anyone",
    desc: "Anyone on MySlotMate can find and book it.",
  },
  {
    key: "code",
    title: "People with a code",
    desc: "Listed with a lock. Guests enter a code you share.",
  },
  {
    key: "approve",
    title: "People I approve",
    desc: "Guests request to join with their details; you approve each one.",
  },
];

// PrivacyAccessSection answers "Who can book?" with one of three choices. It
// controls ACCESS ONLY. Whether a booking is free is decided separately (event
// price, or free-booking codes): no choice here ever makes a booking free, and
// approving a request unlocks booking without booking or charging anything.
// Maps onto the API as: anyone = public; code = private + passkey gate;
// approve = private + rsvp gate.
export default function PrivacyAccessSection({
  isPrivate,
  privateAccessMode,
  accessMode,
  accessPasskey,
  showError,
  canGenerateCodes,
  onChange,
}: Props) {
  const choice = whoCanBookOf(isPrivate, privateAccessMode);
  const pick = (key: WhoCanBook) => {
    if (key === "anyone") onChange({ isPrivate: false });
    else
      onChange({
        isPrivate: true,
        privateAccessMode: key === "approve" ? "rsvp" : "passkey",
      });
  };

  return (
    <div className="space-y-4">
      <div
        className="grid gap-2 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Who can book?"
      >
        {CHOICES.map((opt) => (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={choice === opt.key}
            onClick={() => pick(opt.key)}
            className={`rounded-lg border p-3 text-left transition ${
              choice === opt.key
                ? "border-[#A020F0] bg-[#A020F0]/10 ring-1 ring-[#A020F0]"
                : "border-white/10 bg-[#121426] hover:border-white/15"
            }`}
          >
            <span className="block text-sm font-medium text-white">
              {opt.title}
            </span>
            <span className="mt-0.5 block text-xs text-[#A5A8C3]">
              {opt.desc}
            </span>
          </button>
        ))}
      </div>

      {choice === "approve" && (
        <div className="space-y-2 rounded-lg border border-white/10 bg-[#121426] p-3">
          <p className="text-sm text-[#A5A8C3]">
            Guests see a <strong>Request to join</strong> button. They fill in
            the details you ask for in Attendee details, plus an optional note,
            and the request lands in your dashboard.
          </p>
          <p className="text-xs text-[#A5A8C3]">
            Approving unlocks booking; the guest still books and pays as normal,
            and their seat isn&apos;t held until they do.
          </p>
          <p className="text-xs font-medium text-amber-300">
            Needs attendee details: turn them on and pick at least one field.
          </p>
        </div>
      )}

      {choice === "code" && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-[#121426] p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              {
                key: "shared" as const,
                title: "One code for everyone",
                desc: "Share the same code with all your guests.",
              },
              {
                key: "unique" as const,
                title: "A code per guest",
                desc: "Single-use codes, one for each guest.",
              },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => onChange({ accessMode: opt.key })}
                className={`rounded-lg border p-3 text-left transition ${
                  accessMode === opt.key
                    ? "border-[#A020F0] bg-[#A020F0]/10 ring-1 ring-[#A020F0]"
                    : "border-white/10 bg-[#0e1020] hover:border-white/15"
                }`}
              >
                <span className="block text-sm font-medium text-white">
                  {opt.title}
                </span>
                <span className="mt-0.5 block text-xs text-[#A5A8C3]">
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>

          {accessMode === "shared" ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/80">
                Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={accessPasskey}
                  onChange={(e) => onChange({ accessPasskey: e.target.value })}
                  placeholder="e.g. SUMMER24"
                  className="flex-1 rounded-lg border border-white/15 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#A020F0]"
                />
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      accessPasskey: Math.random()
                        .toString(36)
                        .slice(2, 8)
                        .toUpperCase(),
                    })
                  }
                  className="rounded-lg border border-white/15 bg-[#0e1020] px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/[0.04]"
                >
                  Generate
                </button>
              </div>
              {showError && !accessPasskey.trim() && (
                <p className="mt-1 text-xs text-red-400">
                  Add the code guests will enter.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#A5A8C3]">
              {canGenerateCodes
                ? "Generate the codes in the access codes list below."
                : "Save the experience first, then generate the codes here."}
            </p>
          )}
          <p className="text-xs text-[#A5A8C3]">
            A code only unlocks booking; guests pay the normal price.
          </p>
        </div>
      )}
    </div>
  );
}
