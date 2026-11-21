# Backend spec: two-path host application

**For:** backend team · **From:** frontend · **Status:** ready to build
**Design source:** Figma *MySlotmate App design*, section "Host Verification flow" (community and professional tracks).

The web form is live on the frontend (`/become-host`). It already sends every field below to the existing `POST /hosts/apply`. Today the server stores only the fields it knows and ignores the rest, so **the new answers are lost**, except for a readable summary the form also writes into `experience_desc` (section 6). This spec asks the server to store them properly and show them to reviewers.

Frontend files: `src/components/become-host/HostApplyFlow.tsx` (the form and payload), `src/app/become-host/page.tsx` (status screen), `src/lib/api.ts` (`HostApplicationPayload`, `HostDTO`).

---

## 1. The two paths

| | Community host | Verified professional |
|---|---|---|
| Who | People who bring others together: clubs, meetups, social and outdoor events | People offering expert services: 1-on-1 sessions, classes, masterclasses |
| `host_type` | `"community"` | `"professional"` |
| `is_professional` | `false` | `true` (kept for existing code) |
| Review time shown to the applicant | 24–48 hours | 2–5 days |
| Required | name, city, government ID, category, description (20+ chars) | name, city, government ID, profession, years of experience, specialization, **and at least one of** certificate / license number / portfolio URL / LinkedIn |
| On approval | `host_tier = "community"` | `host_tier = "professional"`, Verified Professional badge |

Both paths then do the existing phone OTP check (`POST /auth/otp/send`, then `POST /auth/otp/verify`) before submitting.

---

## 2. Endpoint: `POST /hosts/apply` (and `POST /hosts/apply/draft`)

No new endpoint. Extend the request body. Existing fields keep their meaning; new fields are all optional at the JSON level and validated per `host_type` (section 3).

```ts
interface HostApplicationPayload {
  // ── existing ──────────────────────────────────────────────
  user_id: string;
  first_name: string;
  last_name: string;
  city: string;
  phn_number: string;
  is_professional?: boolean;
  moods?: string[];            // one mood key, see 4.1 / 4.2
  tagline?: string;            // community name, or the professional's specialization
  description?: string;        // community "about", or the professional's work history
  experience_desc?: string;    // readable summary of every answer (section 6)
  government_id_url?: string;  // now always sent on submit
  social_instagram?: string | null;
  social_linkedin?: string | null;
  social_website?: string | null; // portfolio URL, or a non-Instagram social link

  // ── new: both paths ──────────────────────────────────────
  host_type: "community" | "professional";
  selfie_url?: string;         // optional, to match against the ID

  // ── new: community path ──────────────────────────────────
  community_name?: string;           // max 80
  community_category?: MoodKey;      // same value as moods[0]
  years_experience?: YearsBand;      // optional on this path
  events_hosted?: EventsBand;        // optional
  portfolio_url?: string;            // optional
  portfolio_photo_urls?: string[];   // 0–3 event photos or posters

  // ── new: professional path ───────────────────────────────
  profession?: ProfessionKey;        // required on this path
  certificate_url?: string;
  degree_url?: string;
  license_number?: string;           // max 60
  professional_body?: string;        // max 120, e.g. "Yoga Alliance"
  specialization?: string;           // required, max 120
  work_history?: string;             // max 500
  languages?: string[];              // at least one
  achievements?: string;             // max 200
  testimonial_url?: string;
}
```

**Drafts:** `/hosts/apply/draft` receives the same body without files (the form uploads files only on final submit). Save whatever arrives; don't validate required fields for drafts.

**Response:** unchanged (`HostDTO`). Please add the new fields to `HostDTO` too (section 5) so the status page and admin can read them back.

---

## 3. Validation (on `POST /hosts/apply` only)

Return `400` with a stable `error` code and a human `message`. The frontend shows `message` as a sentence, so keep it plain English.

| Rule | `error` | `message` |
|---|---|---|
| `host_type` missing or not one of the two values | `invalid_host_type` | "Choose community host or verified professional." |
| `government_id_url` missing | `government_id_required` | "Please upload a government ID." |
| community: `community_category` missing / not a mood key | `category_required` | "Choose the kind of events you host." |
| community: `description` under 20 chars | `description_too_short` | "Tell us a little more about your community." |
| professional: `profession` missing / unknown | `profession_required` | "Choose your field." |
| professional: `years_experience` or `specialization` missing | `experience_required` | "Add your experience and specialization." |
| professional: none of `certificate_url`, `license_number`, `portfolio_url`, `social_linkedin` | `credential_required` | "Add a certificate, license number, portfolio or LinkedIn." |
| `portfolio_photo_urls` has more than 3 | `too_many_photos` | "You can add up to 3 photos." |
| Any URL field not `https://` and not on our upload bucket where it should be (see 7) | `invalid_file_url` | "One of your files didn't upload properly. Please try again." |
| Phone not OTP-verified in the last 15 minutes | `phone_not_verified` | "Please verify your phone number first." |

The frontend enforces the same rules before submit, so these are a safety net.

---

## 4. Allowed values

### 4.1 `MoodKey` (community category, and `moods[0]`)

The existing mood keys, unchanged:

| Key | Shown as |
|---|---|
| `social` | Social & meetups |
| `adventurous` | Adventure & outdoors |
| `wellness` | Wellness |
| `creative` | Arts & crafts |
| `educational` | Learning |
| `culinary` | Food & drink |
| `cultural` | Culture |
| `relaxing` | Chill |

### 4.2 `ProfessionKey`

| Key | Shown as | `moods[0]` the form sends |
|---|---|---|
| `fitness` | Fitness | `wellness` |
| `nutrition` | Nutrition | `wellness` |
| `yoga` | Yoga | `wellness` |
| `therapy` | Therapy | `wellness` |
| `photography` | Photography | `creative` |
| `music` | Music | `creative` |
| `business` | Business | `educational` |
| `finance` | Finance | `educational` |
| `legal` | Legal | `educational` |
| `education` | Education | `educational` |
| `career` | Career | `educational` |
| `technology` | Technology | `educational` |

### 4.3 Bands (stored as the label string)

- `YearsBand`: `"Just starting"` (community only), `"Under 1 year"`, `"1–3 years"`, `"3–5 years"`, `"5+ years"`
- `EventsBand`: `"None yet"`, `"1–5"`, `"6–20"`, `"20+"`
- `languages`: today the form offers `"English"`, `"Hindi"`, `"Assamese"`, `"Bengali"`. Accept any non-empty strings (max 8, each max 30) so we can add more without a backend change.

The bands use an en dash (`–`, U+2013). Store them as sent.

---

## 5. Storage

Add to the `hosts` table (or a 1:1 `host_applications` table if you prefer to keep `hosts` lean; either works for the frontend as long as `HostDTO` returns the fields):

| Column | Type | Notes |
|---|---|---|
| `host_type` | text, check in (`community`, `professional`) | Backfill existing rows: `professional` where `is_professional`, else `community` |
| `selfie_url` | text null | Private (see 7) |
| `community_name` | text null | |
| `community_category` | text null | |
| `years_experience` | text null | |
| `events_hosted` | text null | |
| `portfolio_url` | text null | |
| `portfolio_photo_urls` | text[] not null default `{}` | |
| `profession` | text null | |
| `certificate_url` | text null | Private |
| `degree_url` | text null | Private |
| `license_number` | text null | |
| `professional_body` | text null | |
| `specialization` | text null | |
| `work_history` | text null | |
| `languages` | text[] not null default `{}` | |
| `achievements` | text null | |
| `testimonial_url` | text null | |

Return all of them on `HostDTO`, **except** the private document URLs (`government_id_url`, `selfie_url`, `certificate_url`, `degree_url`): return those only to the host themselves and to admins, never on public host endpoints (`GET /hosts`, `/hosts/{slug}`).

---

## 6. The `experience_desc` summary (keep accepting it)

Until this ships, the form writes every answer into `experience_desc` as plain lines, for example:

```
Path: Verified professional
Profession: Yoga
Specialization: Hatha yoga for beginners
Experience: 3–5 years
Languages: English, Hindi
License / registration: LIC-123456
```

Keep storing it as today. Once the structured fields are saved and shown in admin, we can stop sending the summary (frontend change, no backend work).

---

## 7. Files

The form uploads with the existing `POST /upload/?folder=…` before calling `/hosts/apply`:

| Field | Folder | Visibility |
|---|---|---|
| `government_id_url`, `selfie_url`, `certificate_url`, `degree_url` | `hosts/government-ids` | **Private.** Admin and the host only |
| `portfolio_photo_urls`, `testimonial_url` | `general` | Can be public |

Each file is at most 10 MB, image or PDF (the selfie is image only). The `hosts/government-ids` folder must not be publicly listable, and those URLs should be signed or proxied for admins rather than open S3 links. Please confirm how the folder is configured today.

---

## 8. Admin review

Applicants are promised an answer in 24–48 hours (community) or 2–5 days (professional), so the admin queue needs to make both quick:

- Show `host_type` as a badge and allow filtering by it.
- Group fields by step in the same order as the form: About you → Community (or Profession, Credentials, Experience).
- Show document thumbnails with an "Open" action for ID, selfie, certificate, degree and testimonial.
- Approve sets `application_status = "approved"`, `approved_at`, `is_identity_verified = true`, and `host_tier` from `host_type`. Professionals also get `is_professional = true`.
- Reject sets `rejected_at` and a `rejection_reason` (new, text, shown to the applicant on `/become-host`; please add it to `HostDTO`).
- Optional: "Approve as community host" for a professional application that doesn't meet the credentials bar, so the person can still host.

---

## 9. Acceptance checklist

- [ ] `POST /hosts/apply` stores every new field from section 2 and returns them on `HostDTO`.
- [ ] Existing rows backfilled with `host_type`.
- [ ] Validation rules in section 3 return the listed `error` codes and plain-English `message`s.
- [ ] Drafts accept partial bodies without validation.
- [ ] Private document URLs never appear on public host endpoints.
- [ ] `hosts/government-ids` uploads are private; admins see them through signed URLs.
- [ ] Admin queue shows `host_type`, all fields grouped by step, and the documents.
- [ ] Approve sets `host_tier` from `host_type`; reject stores `rejection_reason`.
- [ ] Existing applications (old form) still display correctly in admin.

## 10. Open decisions

1. **Selfie:** the app design makes it required; the web makes it optional so laptop applicants aren't blocked. Should admins require it before approving?
2. **Credentials bar:** the web asks professionals for at least one of certificate / license / portfolio / LinkedIn. Should some professions (therapy, legal, finance) require a certificate or license specifically?
3. **Switching paths:** can a community host later apply as a professional? Suggest yes: a new application with `host_type = "professional"` that, if approved, upgrades the tier.
4. **Free events on either path:** the form says free community events can be run on either path. Confirm there's no extra rule for professionals running free events.
