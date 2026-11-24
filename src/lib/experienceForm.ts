/*
 * experienceForm.ts: the ONE definition of the experience form's rules,
 * summaries and pricing/access payload, shared by every editor:
 *   - MySlotmate-Frontend: host "new" and "edit" pages
 *   - Myslotmate-admin:    the admin experience editor
 *
 * SHARED FILE. An identical copy lives at src/lib/experienceForm.ts in both
 * repos. Change both together; `npm run check:shared-form` in either repo
 * compares them when the other repo is checked out next to it.
 *
 * No imports and no framework code, so the same file works in Next.js and Vite.
 */

/* ------------------------------------------------------------------ */
/*  The fields the rules read                                          */
/* ------------------------------------------------------------------ */

export type ScheduleType = "one_time" | "recurring" | "custom_dates";
export type SessionType = "group" | "one_on_one";
export type PrivateAccessMode = "passkey" | "rsvp";
export type AccessMode = "shared" | "unique";

export interface PriceTierDraft {
  name: string;
  priceStr: string;
  seatsStr?: string;
}

/** The part of an editor's form state these rules need. Each editor's own
 *  form type has more fields; it is passed in as is. */
export interface ExperienceFormFields {
  title: string;
  hookLine: string;
  mood: string;
  description: string;

  sessionType: SessionType;
  scheduleType: ScheduleType;
  eventDate: string;
  eventTime: string;
  customDatesList: { date: string; time: string }[];

  isOnline: boolean;
  location: string;
  maxGroupSize: number;
  cancellationPolicy: string;

  isFree: boolean;
  priceCents: number;
  useTiers: boolean;
  priceTiers: PriceTierDraft[];
  monthlyPassEnabled: boolean;
  monthlyPassPriceStr: string;
  monthlyPassSessionsStr: string;
  monthlyPassCapacityStr: string;

  isPrivate: boolean;
  privateAccessMode: PrivateAccessMode;
  accessMode: AccessMode;
  accessPasskey: string;
  requiresAttendeeDetails: boolean;
  attendeeFields: string[];
}

/* ------------------------------------------------------------------ */
/*  Rules                                                              */
/* ------------------------------------------------------------------ */

/** Which part of the form a problem is in, so an editor can highlight it or
 *  scroll to it. */
export type FormProblemKey =
  | "title"
  | "category"
  | "about"
  | "when"
  | "where"
  | "group"
  | "refunds"
  | "price"
  | "pass"
  | "access";

export interface FormProblem {
  key: FormProblemKey;
  message: string;
}

/** Ticket types that will actually be saved: a name and a price above 0. */
export function validTiers(f: Pick<ExperienceFormFields, "priceTiers">) {
  return f.priceTiers.filter((t) => t.name.trim() && Number(t.priceStr) > 0);
}

/** The monthly pass is saved only on a paid event that repeats. */
export function passApplies(
  f: Pick<
    ExperienceFormFields,
    "monthlyPassEnabled" | "isFree" | "scheduleType"
  >,
): boolean {
  return f.monthlyPassEnabled && !f.isFree && f.scheduleType !== "one_time";
}

/**
 * Every problem with the form, in page order.
 *
 * - `publish: false` (saving changes or a draft) checks only what would save
 *   something broken: the pass, the access gate and 1:1 availability.
 * - `publish: true` also checks everything a guest needs to see and book.
 *
 * `sessionProblem` is the 1:1 availability error, if any. Each editor works it
 * out with its own session-slot code and passes it in.
 */
export function formProblems(
  f: ExperienceFormFields,
  opts: { publish: boolean; sessionProblem?: string | null },
): FormProblem[] {
  const out: FormProblem[] = [];
  const add = (key: FormProblemKey, message: string) =>
    out.push({ key, message });

  if (opts.publish) {
    if (!f.mood) add("category", "Pick a category");
    if (!f.title.trim()) add("title", "Add a name");
    if (!f.description.trim()) add("about", "Add what guests will do");
  }

  if (f.sessionType === "one_on_one") {
    if (opts.sessionProblem) add("when", opts.sessionProblem);
  } else if (opts.publish) {
    if (f.scheduleType === "custom_dates") {
      if (!f.customDatesList.some((d) => d.date && d.time))
        add("when", "Add at least one date and time");
    } else {
      if (!f.eventDate) add("when", "Pick a date");
      else if (!f.eventTime) add("when", "Pick a start time");
    }
  }

  if (opts.publish) {
    if (!f.isOnline && !f.location.trim())
      add("where", "Add a location, or make it online");
    if (f.sessionType === "group" && f.maxGroupSize < 1)
      add("group", "Set how many guests can come");
    if (!f.cancellationPolicy) add("refunds", "Pick a refund policy");
    if (!f.isFree) {
      if (!f.useTiers && f.priceCents <= 0)
        add("price", "Set a price, or make it free");
      if (f.useTiers && validTiers(f).length === 0)
        add("price", "Give at least one ticket a name and a price");
    }
  }

  if (passApplies(f)) {
    if (!(Number(f.monthlyPassPriceStr) > 0))
      add("pass", "Set a monthly pass price, or remove the pass");
    else if (!(Number(f.monthlyPassSessionsStr) >= 1))
      add("pass", "Set how many sessions the monthly pass includes");
  }

  if (f.isPrivate && f.privateAccessMode === "passkey") {
    if (f.accessMode === "shared" && !f.accessPasskey.trim())
      add("access", "Add the code guests will enter");
  }
  if (f.isPrivate && f.privateAccessMode === "rsvp") {
    if (!f.requiresAttendeeDetails || f.attendeeFields.length === 0)
      add(
        "access",
        "Request to join needs guest details: turn them on and pick at least one field",
      );
  }

  return out;
}

/** The first problem's message, or null when there is none. */
export function firstProblem(
  f: ExperienceFormFields,
  opts: { publish: boolean; sessionProblem?: string | null },
): string | null {
  return formProblems(f, opts)[0]?.message ?? null;
}

/* ------------------------------------------------------------------ */
/*  Summaries (collapsed rows, pills)                                  */
/* ------------------------------------------------------------------ */

export function whoCanBookLabel(
  isPrivate: boolean,
  mode: PrivateAccessMode,
): string {
  if (!isPrivate) return "Anyone";
  return mode === "rsvp" ? "People I approve" : "People with a code";
}

/** What a paid experience sells, in one line. */
export function guestPaymentSummary(
  f: Pick<
    ExperienceFormFields,
    | "isFree"
    | "priceCents"
    | "useTiers"
    | "priceTiers"
    | "monthlyPassEnabled"
    | "scheduleType"
  >,
): string {
  if (f.isFree) return "Free";
  const n = validTiers(f).length;
  const tickets = f.useTiers
    ? `${n} ticket type${n === 1 ? "" : "s"}`
    : `₹${(f.priceCents / 100).toLocaleString("en-IN")} per person`;
  return passApplies(f) ? `${tickets} · monthly pass` : tickets;
}

/* ------------------------------------------------------------------ */
/*  Payload: the pricing and access parts of the create/update body    */
/* ------------------------------------------------------------------ */

/** The tagline is optional: fall back to the start of the description, then
 *  the title. */
export function hookLineWithFallback(
  f: Pick<ExperienceFormFields, "hookLine" | "description" | "title">,
): string {
  return (
    f.hookLine.trim() ||
    f.description
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 140) ||
    f.title.trim()
  );
}

/** Price, ticket types and monthly pass, as the events API takes them. An
 *  empty `price_tiers` list removes the ticket types, so switching back to one
 *  price on an edit really drops them. */
export function pricingPayload(f: ExperienceFormFields) {
  const useTiers = !f.isFree && f.useTiers;
  return {
    is_free: f.isFree,
    price_cents: f.isFree || f.useTiers ? 0 : f.priceCents,
    price_tiers: useTiers
      ? validTiers(f).map((t) => ({
          name: t.name.trim(),
          price_cents: Math.round(Number(t.priceStr) * 100),
          // Blank = no limit of its own (the event's capacity still applies).
          ...(Number(t.seatsStr) > 0
            ? { capacity: Math.floor(Number(t.seatsStr)) }
            : {}),
        }))
      : [],
    monthly_pass: {
      // 0 switches the pass off.
      price_cents: passApplies(f)
        ? Math.round(Number(f.monthlyPassPriceStr) * 100)
        : 0,
      session_limit: f.monthlyPassSessionsStr
        ? Number(f.monthlyPassSessionsStr)
        : undefined,
      capacity: f.monthlyPassCapacityStr
        ? Number(f.monthlyPassCapacityStr)
        : undefined,
    },
  };
}

/** Who can book, as the events API takes it. The shared code is sent only for
 *  "People with a code" + "One code for everyone"; anything else clears it. */
export function accessPayload(f: ExperienceFormFields) {
  return {
    is_private: f.isPrivate,
    private_access_mode: f.privateAccessMode,
    access_passkey:
      f.isPrivate &&
      f.privateAccessMode === "passkey" &&
      f.accessMode === "shared"
        ? f.accessPasskey.trim()
        : "",
  };
}
