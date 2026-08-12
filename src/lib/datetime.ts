import { format } from "date-fns";

/**
 * MySlotMate is a single-market (India) product, so every event scheduling time
 * is meant to be read and written in India Standard Time, regardless of the
 * viewer's or host's device timezone.
 *
 * The DB stores each time as a UTC instant (TIMESTAMPTZ). Without anchoring the
 * display/input to a fixed zone, `new Date(...)` + date-fns `format` silently
 * render in whatever timezone the runtime is in — so a host's "9:30 AM" could
 * show up as "4:00 AM" to anyone outside IST (or in a UTC server/edge render).
 *
 * India observes no DST, so IST is a fixed +05:30 offset — these helpers exploit
 * that to stay dependency-free (no date-fns-tz needed).
 */
export const IST_TIMEZONE = "Asia/Kolkata";
const IST_OFFSET = "+05:30";

/**
 * Convert a UTC instant (Date or ISO string) into a timezone-naive Date whose
 * *local* fields equal the Asia/Kolkata wall-clock time. date-fns `format` reads
 * local fields, so formatting this value renders IST on any machine.
 */
function toISTWallClock(input: string | Date): Date | null {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "0";
  const hour = get("hour") === "24" ? 0 : Number(get("hour"));

  return new Date(
    Number(get("year")),
    Number(get("month")) - 1,
    Number(get("day")),
    hour,
    Number(get("minute")),
    Number(get("second")),
  );
}

/**
 * Format an event time in IST using the same tokens as date-fns `format`.
 * Returns "" for missing/invalid input so callers can guard cheaply.
 */
export function formatIST(
  input: string | Date | null | undefined,
  pattern: string,
): string {
  if (!input) return "";
  const wall = toISTWallClock(input);
  return wall ? format(wall, pattern) : "";
}

/**
 * Combine a host-entered date ("YYYY-MM-DD") and time ("HH:mm"), interpreted as
 * IST, into a UTC ISO string for storage. Anchoring to +05:30 makes the result
 * independent of the host's browser timezone.
 */
export function istInputToUTCISO(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00${IST_OFFSET}`).toISOString();
}

/**
 * Do two timestamps refer to the same moment?
 *
 * Occurrence times reach the client from more than one place — an event's own
 * `time` field, the availability endpoint, a slot in `custom_dates` — and the
 * same instant can arrive spelled differently ("…T04:30:00Z" vs
 * "…T10:00:00+05:30", with or without fractional seconds). Comparing the
 * strings makes matching slots look like different ones, so compare instants.
 */
export function sameInstant(
  a: string | Date | null | undefined,
  b: string | Date | null | undefined,
): boolean {
  if (!a || !b) return false;
  const ta = (typeof a === "string" ? new Date(a) : a).getTime();
  const tb = (typeof b === "string" ? new Date(b) : b).getTime();
  return !Number.isNaN(ta) && ta === tb;
}

/**
 * Split a stored UTC instant into the IST `date` ("YYYY-MM-DD") and `time`
 * ("HH:mm") strings used to pre-fill <input type="date"> / <input type="time">
 * fields. Inverse of {@link istInputToUTCISO}.
 */
export function utcToISTInputs(input: string | Date | null | undefined): {
  date: string;
  time: string;
} {
  if (!input) return { date: "", time: "" };
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${hour}:${get("minute")}`,
  };
}
