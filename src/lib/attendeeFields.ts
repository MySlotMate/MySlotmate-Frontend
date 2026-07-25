// Canonical attendee-details field catalog. Admins pick which of these an event
// requires; the booking form renders only the enabled ones. Keys must match the
// backend attendee_profiles columns and models.AttendeeProfile.HasField.

export type AttendeeFieldType = "text" | "number" | "tel" | "select" | "bool" | "file";

export interface AttendeeFieldDef {
  key: string;
  label: string;
  type: AttendeeFieldType;
  options?: { value: string; label: string }[]; // for select
}

export const ATTENDEE_FIELDS: AttendeeFieldDef[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "age", label: "Age", type: "number" },
  {
    key: "gender",
    label: "Gender",
    type: "select",
    options: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
      { value: "other", label: "Other" },
      { value: "prefer_not", label: "Prefer not to say" },
    ],
  },
  { key: "qualification", label: "Highest Qualification", type: "text" },
  { key: "occupation", label: "Occupation", type: "text" },
  {
    key: "marital_status",
    label: "Marital Status",
    type: "select",
    options: [
      { value: "single", label: "Single" },
      { value: "married", label: "Married" },
      { value: "other", label: "Other" },
    ],
  },
  { key: "contact_number", label: "Contact Number", type: "tel" },
  { key: "whatsapp_number", label: "WhatsApp Number", type: "tel" },
  {
    key: "registration_type",
    label: "Registering Solo or Group",
    type: "select",
    options: [
      { value: "solo", label: "Solo" },
      { value: "group", label: "Group" },
    ],
  },
  { key: "govt_id_url", label: "Govt. ID proof", type: "file" },
  { key: "travel", label: "Travel", type: "bool" },
  {
    key: "social_link",
    label: "Social Link (Facebook/Instagram)",
    type: "text",
  },
];

export const ATTENDEE_FIELD_BY_KEY: Record<string, AttendeeFieldDef> =
  Object.fromEntries(ATTENDEE_FIELDS.map((f) => [f.key, f]));
