/**
 * API service – axios-based, typed envelopes.
 * Every endpoint follows: { success, data, message, error }
 */
import axios, { type AxiosError } from "axios";
import { env } from "~/env";

const BASE: string = env.NEXT_PUBLIC_API_URL;

export interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

const api = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
});

export async function apiFetch<T>(
  path: string,
  config?: Parameters<typeof api.request>[0],
): Promise<Envelope<T>> {
  try {
    const res = await api.request<Envelope<T>>({ url: path, ...config });
    return res.data;
  } catch (err) {
    const axErr = err as AxiosError<Envelope<T>>;
    const data = axErr.response?.data;
    const msg = data?.error ?? data?.message ?? axErr.message;
    const error = new Error(msg);
    (error as Error & { status: number; data?: Envelope<T> }).status =
      axErr.response?.status ?? 500;
    // Preserve response data for error cases (e.g., 409 conflict may still contain user data)
    if (data) {
      (error as Error & { status: number; data?: Envelope<T> }).data = data;
    }
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/*  Auth                                                               */
/* ------------------------------------------------------------------ */

export interface UserDTO {
  id: string;
  auth_uid: string;
  name: string;
  phn_number: string;
  email: string;
  avatar_url: string | null;
  city: string | null;
  account_id: string | null;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignUpPayload {
  auth_uid: string;
  email: string;
  name: string;
  phn_number: string;
  avatar_url?: string | null;
}

/** POST /auth/signup — 201 = created, 409 = already exists */
export function signUp(body: SignUpPayload) {
  return apiFetch<UserDTO>("/auth/signup", { method: "POST", data: body });
}

/** GET /users/me?user_id=<uuid> */
export function getMyProfile(userId: string) {
  return apiFetch<UserDTO>("/users/me", { params: { user_id: userId } });
}

/* ── Aadhaar Verification ──────────────────────────────────────── */

export interface InitiateAadharPayload {
  user_id: string;
  aadhar_number: string;
}

export interface AadharInitResponse {
  transaction_id: string;
  message: string;
}

/** POST /auth/verify-aadhar/init */
export function initiateAadhar(body: InitiateAadharPayload) {
  return apiFetch<AadharInitResponse>("/auth/verify-aadhar/init", {
    method: "POST",
    data: body,
  });
}

export interface CompleteAadharPayload {
  user_id: string;
  transaction_id: string;
  otp: string;
}

/** POST /auth/verify-aadhar/complete */
export function completeAadhar(body: CompleteAadharPayload) {
  return apiFetch<{ message: string }>("/auth/verify-aadhar/complete", {
    method: "POST",
    data: body,
  });
}

/** POST /auth/otp/send */
export function sendPhoneOTP(userId: string) {
  return apiFetch<{ message: string }>("/auth/otp/send", {
    method: "POST",
    data: { user_id: userId },
  });
}

/** POST /auth/otp/verify */
export function verifyPhoneOTP(userId: string, otp: string) {
  return apiFetch<{ message: string }>("/auth/otp/verify", {
    method: "POST",
    data: { user_id: userId, otp },
  });
}

export interface PhoneLoginSendResponse {
  session_id: string;
  message: string;
}

export interface PhoneLoginVerifyResponse {
  user: UserDTO;
  token: string;
  firebase_custom_token?: string;
}

/** POST /auth/otp/login/send */
export function sendLoginOTP(phone: string) {
  return apiFetch<PhoneLoginSendResponse>("/auth/otp/login/send", {
    method: "POST",
    data: { phone },
  });
}

/** POST /auth/otp/login/verify */
export function verifyLoginOTP(phone: string, sessionID: string, otp: string) {
  return apiFetch<PhoneLoginVerifyResponse>("/auth/otp/login/verify", {
    method: "POST",
    data: { phone, session_id: sessionID, otp },
  });
}

/* ── User Profile ──────────────────────────────────────────────── */

export interface UserProfileUpdatePayload {
  name?: string | null;
  avatar_url?: string | null;
  city?: string | null;
}

/** PUT /users/me?user_id=<uuid> */
export function updateUserProfile(
  userId: string,
  body: UserProfileUpdatePayload,
) {
  return apiFetch<UserDTO>("/users/me", {
    method: "PUT",
    params: { user_id: userId },
    data: body,
  });
}

/* ------------------------------------------------------------------ */
/*  Attendee profile (reusable per-user attendee details)              */
/* ------------------------------------------------------------------ */

export interface AttendeeProfileDTO {
  user_id: string;
  name: string | null;
  age: number | null;
  gender: string | null;
  qualification: string | null;
  occupation: string | null;
  marital_status: string | null;
  contact_number: string | null;
  whatsapp_number: string | null;
  registration_type: string | null;
  govt_id_url: string | null;
  travel: boolean | null;
  social_link: string | null;
}

export interface AttendeeProfileUpdatePayload {
  user_id: string;
  name?: string | null;
  age?: number | null;
  gender?: string | null;
  qualification?: string | null;
  occupation?: string | null;
  marital_status?: string | null;
  contact_number?: string | null;
  whatsapp_number?: string | null;
  registration_type?: string | null;
  govt_id_url?: string | null;
  travel?: boolean | null;
  social_link?: string | null;
}

/** GET /users/attendee-profile?user_id=<uuid> — null when none saved yet. */
export function getAttendeeProfile(userId: string) {
  return apiFetch<AttendeeProfileDTO | null>("/users/attendee-profile", {
    params: { user_id: userId },
  });
}

/** PUT /users/attendee-profile — upsert the user's attendee details. */
export function updateAttendeeProfile(body: AttendeeProfileUpdatePayload) {
  return apiFetch<AttendeeProfileDTO>("/users/attendee-profile", {
    method: "PUT",
    data: body,
  });
}

/* ------------------------------------------------------------------ */
/*  Upload                                                             */
/* ------------------------------------------------------------------ */

export interface UploadResult {
  file_name: string;
  url: string;
  size: number;
}

export interface UploadFilesPayload {
  files: File[];
  folder?: UploadFolder;
}

export type UploadFolder =
  | "general"
  | "blogs/covers"
  | "events/covers"
  | "events/gallery"
  | "hosts/avatars"
  | "hosts/government-ids"
  | "support/evidence"
  | "attendees/id-proofs";

/**
 * POST /upload/?folder=<prefix>
 * Uploads files to S3. Returns URLs.
 */
export async function uploadFiles(
  files: File[],
  folder: UploadFolder = "general",
) {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  try {
    const res = await api.post<Envelope<UploadResult[]>>("/upload/", formData, {
      params: { folder },
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (err) {
    const axErr = err as AxiosError<Envelope<UploadResult[]>>;
    const data = axErr.response?.data;
    const msg = data?.error ?? data?.message ?? axErr.message;
    const error = new Error(msg);
    (error as Error & { status: number }).status =
      axErr.response?.status ?? 500;
    throw error;
  }
}

export async function uploadBlogCover(file: File) {
  const response = await uploadFiles([file], "blogs/covers");
  return response.data[0] ?? null;
}

/* ------------------------------------------------------------------ */
/*  Hosts                                                              */
/* ------------------------------------------------------------------ */

export interface HostDTO {
  id: string;
  /** Clean, URL-safe identifier for public links (/host/{slug}). */
  slug: string;
  user_id: string;
  account_id: string | null;
  first_name: string;
  last_name: string;
  phn_number: string;
  city: string;
  avatar_url: string | null;
  avatar_from_instagram: boolean;
  tagline: string | null;
  bio: string | null;
  application_status:
    | "draft"
    | "pending"
    | "under_review"
    | "approved"
    | "rejected";
  experience_desc: string | null;
  moods: string[];
  description: string | null;
  preferred_days: string[];
  group_size: number | null;
  government_id_url: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  is_identity_verified: boolean;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_super_host: boolean;
  is_community_champ: boolean;
  is_professional: boolean;
  expertise_tags: string[];
  social_instagram: string | null;
  social_linkedin: string | null;
  social_website: string | null;
  /** Up to 4 recent Instagram post photos scraped once at application time (re-hosted on S3) */
  gallery_urls: string[];
  instagram_scraped_at: string | null;
  avg_rating: number | null;
  total_reviews: number;
  /**
   * Admin-set overrides for the three headline stats on the host profile. When
   * non-null these replace the derived values (experiences hosted and people
   * met counted from the host's events, rating averaged from reviews).
   */
  events_hosted_override: number | null;
  people_met_override: number | null;
  avg_rating_override: number | null;
  created_at: string;
  updated_at: string;
}

export interface HostApplicationDTO {
  status: HostDTO;
}
export interface HostApplicationPayload {
  user_id: string;
  first_name: string;
  last_name: string;
  city: string;
  phn_number: string;
  experience_desc?: string;
  moods?: string[];
  description?: string;
  preferred_days?: string[];
  group_size?: number;
  government_id_url?: string;
  avatar_url?: string;
  tagline?: string;
  bio?: string;
  social_instagram?: string | null;
  social_linkedin?: string | null;
  social_website?: string | null;
  is_professional?: boolean;
}

/** POST /hosts/apply — submit host application (status → pending) */
export function submitHostApplication(body: HostApplicationPayload) {
  return apiFetch<HostDTO>("/hosts/apply", { method: "POST", data: body });
}

/** POST /hosts/apply/draft — save host application as draft */
export function saveHostDraft(body: HostApplicationPayload) {
  return apiFetch<HostDTO>("/hosts/apply/draft", {
    method: "POST",
    data: body,
  });
}

export interface ApplicationStatusResponse {
  status?: {
    id: string;
    application_status:
      | "draft"
      | "pending"
      | "under_review"
      | "approved"
      | "rejected";
  };
}

/** GET /hosts/application-status?user_id=<uuid> */
export function getApplicationStatus(userId: string) {
  return apiFetch<ApplicationStatusResponse>("/hosts/application-status", {
    params: { user_id: userId },
  });
}

/** GET /hosts/me?user_id=<uuid> */
export function getMyHost(userId: string) {
  return apiFetch<HostDTO>("/hosts/me", { params: { user_id: userId } });
}

export interface HostProfileUpdatePayload {
  tagline?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  city?: string | null;
  expertise_tags?: string[];
  social_instagram?: string | null;
  social_linkedin?: string | null;
  social_website?: string | null;
}

/** PUT /hosts/me?host_id=<uuid> */
export function updateHostProfile(
  hostId: string,
  body: HostProfileUpdatePayload,
) {
  return apiFetch<HostDTO>("/hosts/me", {
    method: "PUT",
    params: { host_id: hostId },
    data: body,
  });
}

/** PUT /hosts/me/social — Connect a social media account */
export function connectSocialMedia(
  userId: string,
  platform: "instagram" | "linkedin" | "website" | "youtube" | "twitter",
  url: string,
) {
  return apiFetch<HostDTO>("/hosts/me/social", {
    method: "PUT",
    data: { user_id: userId, platform, url },
  });
}

/** DELETE /hosts/me/social/{platform} — Disconnect a social media account */
export function disconnectSocialMedia(
  userId: string,
  platform: "instagram" | "linkedin" | "website" | "youtube" | "twitter",
) {
  return apiFetch<HostDTO>(`/hosts/me/social/${platform}`, {
    method: "DELETE",
    params: { user_id: userId },
  });
}

/** Public-facing host profile (no sensitive fields like phn_number, government_id_url, etc.) */
export interface PublicHostProfileDTO {
  id: string;
  /** Clean, URL-safe identifier for public links (/host/{slug}). */
  slug: string;
  first_name: string;
  last_name: string;
  city: string;
  avatar_url: string | null;
  /** true when avatar_url was pulled from the host's Instagram profile (shows an IG badge) */
  avatar_from_instagram: boolean;
  tagline: string | null;
  bio: string | null;
  is_identity_verified: boolean;
  is_super_host: boolean;
  is_community_champ: boolean;
  is_professional: boolean;
  expertise_tags: string[];
  social_instagram: string | null;
  social_linkedin: string | null;
  social_website: string | null;
  /** Up to 4 recent Instagram post photos scraped once at application time (re-hosted on S3) */
  gallery_urls: string[];
  avg_rating: number | null;
  total_reviews: number;
  /**
   * Admin-set overrides for the three headline profile stats. When non-null
   * these replace the derived values.
   */
  events_hosted_override: number | null;
  people_met_override: number | null;
  avg_rating_override: number | null;
}

/** GET /hosts — list all approved hosts (public) */
export function listHosts() {
  return apiFetch<PublicHostProfileDTO[]>("/hosts");
}

/** GET /hosts/{hostID} — view a host's public profile */
export function getPublicHostProfile(hostId: string) {
  return apiFetch<PublicHostProfileDTO>(`/hosts/${hostId}`);
}

/* ------------------------------------------------------------------ */
/*  Admin                                                              */
/* ------------------------------------------------------------------ */

function getAuthHeader(idToken: string) {
  return { Authorization: `Bearer ${idToken}` };
}

/** GET /admin/hosts/applications — list all pending host applications */
export function listPendingHostApplications(idToken: string) {
  return apiFetch<HostDTO[]>("/admin/hosts/applications", {
    headers: getAuthHeader(idToken),
  });
}

/** POST /admin/hosts/{hostID}/approve — approve host application */
export function approveHostApplication(hostId: string, idToken: string) {
  return apiFetch<HostDTO>(`/admin/hosts/${hostId}/approve`, {
    method: "POST",
    headers: getAuthHeader(idToken),
  });
}

/** POST /admin/hosts/{hostID}/reject — reject host application */
export function rejectHostApplication(
  hostId: string,
  idToken: string,
  reason?: string,
) {
  return apiFetch<HostDTO>(`/admin/hosts/${hostId}/reject`, {
    method: "POST",
    headers: getAuthHeader(idToken),
    data: reason ? { reason } : {},
  });
}

/** GET /admin/platform/balance — get platform account balance and fee collection */
export interface PlatformBalanceDTO {
  account_id: string;
  balance_cents: number;
  collected_from_bookings: number;
}

export function getPlatformBalance(idToken: string) {
  return apiFetch<PlatformBalanceDTO>("/admin/platform/balance", {
    headers: getAuthHeader(idToken),
  });
}

/** GET /admin/platform/payout-methods — list all payout methods for platform account */
export function getPlatformPayoutMethods(idToken: string) {
  return apiFetch<PayoutMethodDTO[]>("/admin/platform/payout-methods", {
    headers: getAuthHeader(idToken),
  });
}

/** Platform payout method payload (no host_id required) */
export interface PlatformAddPayoutMethodPayload {
  type: "bank" | "upi";
  bank_name?: string;
  account_type?: string;
  account_number?: string;
  ifsc?: string;
  beneficiary_name?: string;
  upi_id?: string;
}

/** POST /admin/platform/payout-methods — add a payout method for platform account */
export function addPlatformPayoutMethod(
  body: PlatformAddPayoutMethodPayload,
  idToken: string,
) {
  return apiFetch<PayoutMethodDTO>("/admin/platform/payout-methods", {
    method: "POST",
    headers: getAuthHeader(idToken),
    data: body,
  });
}

/** PUT /admin/platform/payout-methods/{methodID}/primary — set primary for platform */
export function setPlatformPrimaryPayoutMethod(
  methodId: string,
  idToken: string,
) {
  return apiFetch<{ message: string }>(
    `/admin/platform/payout-methods/${methodId}/primary`,
    {
      method: "PUT",
      headers: getAuthHeader(idToken),
    },
  );
}

/** DELETE /admin/platform/payout-methods/{methodID} — delete payout method from platform */
export function deletePlatformPayoutMethod(methodId: string, idToken: string) {
  return apiFetch<{ message: string }>(
    `/admin/platform/payout-methods/${methodId}`,
    {
      method: "DELETE",
      headers: getAuthHeader(idToken),
    },
  );
}

/** POST /admin/platform/withdraw — withdraw platform fees to admin's bank/UPI */
export function withdrawPlatformFees(
  body: {
    amount_cents: number;
    idempotency_key?: string;
  },
  idToken: string,
) {
  return apiFetch<PaymentDTO>("/admin/platform/withdraw", {
    method: "POST",
    headers: getAuthHeader(idToken),
    data: body,
  });
}

/* ------------------------------------------------------------------ */
/*  Blogs                                                              */
/* ------------------------------------------------------------------ */

export interface BlogDTO {
  id: string;
  /** Clean, URL-safe identifier for public links (/blogs/{slug}). */
  slug: string;
  title: string | null;
  description: string | null;
  category: string | null;
  content: string | null;
  cover_image_url: string | null;
  author_id: string | null;
  author_name: string | null;
  read_time_minutes: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogPaginationParams {
  limit?: number;
  offset?: number;
}

export interface BlogCreatePayload {
  title: string;
  /** Optional custom URL slug; defaults to a slugified title on the server. */
  slug?: string;
  description: string;
  category: string;
  content: string;
  cover_image_url?: string | null;
  read_time_minutes: number;
}

export interface BlogUpdatePayload {
  title?: string;
  /** Optional custom URL slug; when changed, updates the blog's public URL. */
  slug?: string;
  description?: string;
  category?: string;
  content?: string;
  cover_image_url?: string | null;
  read_time_minutes?: number;
}

/** GET /blogs — list all published blogs */
export function listBlogs(pagination?: BlogPaginationParams) {
  return apiFetch<BlogDTO[]>("/blogs", { params: pagination });
}

/** GET /blogs/admin — list every blog incl. drafts (admin only) */
export function listAdminBlogs(
  idToken: string,
  pagination?: BlogPaginationParams,
) {
  return apiFetch<BlogDTO[]>("/blogs/admin", {
    headers: getAuthHeader(idToken),
    params: pagination,
  });
}

/** GET /blogs/{blogID} — get a single blog by ID.
 *  Pass idToken so admins can fetch their own unpublished drafts. */
export function getBlog(blogId: string, idToken?: string) {
  return apiFetch<BlogDTO>(`/blogs/${blogId}`, {
    headers: idToken ? getAuthHeader(idToken) : undefined,
  });
}

/** GET /blogs/category/{category} — get published blogs filtered by category */
export function listBlogsByCategory(
  category: string,
  pagination?: BlogPaginationParams,
) {
  return apiFetch<BlogDTO[]>(
    `/blogs/category/${encodeURIComponent(category)}`,
    {
      params: pagination,
    },
  );
}

/** POST /blogs — create a new blog post (admin only) */
export function createBlog(body: BlogCreatePayload, idToken: string) {
  return apiFetch<BlogDTO>("/blogs", {
    method: "POST",
    headers: getAuthHeader(idToken),
    data: body,
  });
}

/** PUT /blogs/{blogID} — update a blog post (admin only) */
export function updateBlog(
  blogId: string,
  body: BlogUpdatePayload,
  idToken: string,
) {
  return apiFetch<BlogDTO>(`/blogs/${blogId}`, {
    method: "PUT",
    headers: getAuthHeader(idToken),
    data: body,
  });
}

/** DELETE /blogs/{blogID} — delete a blog post (admin only) */
export function deleteBlog(blogId: string, idToken: string) {
  return apiFetch<{ message: string }>(`/blogs/${blogId}`, {
    method: "DELETE",
    headers: getAuthHeader(idToken),
  });
}

/** POST /blogs/{blogID}/publish — publish a blog post (admin only) */
export function publishBlog(blogId: string, idToken: string) {
  return apiFetch<BlogDTO>(`/blogs/${blogId}/publish`, {
    method: "POST",
    headers: getAuthHeader(idToken),
  });
}

/** POST /blogs/{blogID}/unpublish — unpublish a blog post (admin only) */
export function unpublishBlog(blogId: string, idToken: string) {
  return apiFetch<BlogDTO>(`/blogs/${blogId}/unpublish`, {
    method: "POST",
    headers: getAuthHeader(idToken),
  });
}

/* ------------------------------------------------------------------ */
/*  Host Dashboard                                                     */
/* ------------------------------------------------------------------ */

export interface HostEarningsDTO {
  // Live numbers computed from the bookings table (see backend
  // GetHostEarningsBreakdown). Always satisfy:
  //   total_earnings_cents = pending_clearance_cents + available_balance_cents + in_flight_payouts_cents
  //   current_balance_cents = total_earnings_cents - in_flight_payouts_cents
  //                         = pending_clearance_cents + available_balance_cents

  /** Lifetime net earnings (refunds / cancellations already deducted). */
  total_earnings_cents: number;
  /** Withdrawable right now: confirmed bookings whose event has happened,
   *  minus payouts in flight or completed. */
  available_balance_cents: number;
  /** Locked because the event has not happened yet. */
  pending_clearance_cents: number;
  /** Still owed to the host = total − paid out. */
  current_balance_cents: number;
  /** Already paid out or in flight (pending / processing / completed payouts). */
  in_flight_payouts_cents: number;

  estimated_clearance_at: string | null;
  platform_fee?: { host_percentage: number; platform_percentage: number };
}

export interface HostDashboardDTO {
  total_events: number;
  total_bookings: number;
  total_earnings_cents: number;
  avg_rating: number;
  total_reviews: number;
  upcoming_today: number;
  monthly_bookings: number;
}

/** GET /hosts/dashboard?host_id=<uuid>&user_id=<uuid> */
export function getHostDashboard(hostId: string, userId: string) {
  return apiFetch<HostDashboardDTO>("/hosts/dashboard", {
    params: { host_id: hostId, user_id: userId },
  });
}

export interface AttentionItemDTO {
  /** "cancelled_booking" | "pending_review" | "unread_message" | "low_rating" */
  type: string;
  count: number;
  message: string;
  data?: unknown;
}

export interface HostAttentionItemsDTO {
  items: AttentionItemDTO[];
}

/** GET /hosts/attention-items?host_id=<uuid> — get items needing attention */
export function getHostAttentionItems(hostId: string) {
  return apiFetch<HostAttentionItemsDTO>("/hosts/attention-items", {
    params: { host_id: hostId },
  });
}

/** GET /events/today/{hostID} — get today's schedule for a host */
export function getTodaySchedule(hostId: string) {
  return apiFetch<EventDTO[]>(`/events/today/${hostId}`);
}

/* ------------------------------------------------------------------ */
/*  Events                                                             */
/* ------------------------------------------------------------------ */

/** A named ticket tier on an event (e.g. General / VIP). */
export interface PriceTierDTO {
  id: string;
  event_id: string;
  name: string;
  price_cents: number;
  capacity: number | null;
  sort_order: number;
  is_active: boolean;
}

/** Tier payload when creating/updating an event (no id — server assigns). */
export interface PriceTierInput {
  name: string;
  price_cents: number;
  capacity?: number | null;
  sort_order?: number;
}

export interface EventDTO {
  id: string;
  /** Clean, URL-safe identifier for public links (/experience/{slug}). */
  slug: string;
  host_id: string;
  title: string;
  hook_line: string | null;
  mood: string | null;
  description: string | null;
  cover_image_url: string | null;
  gallery_urls: string[];
  time: string;
  end_time: string | null;
  is_online: boolean;
  location: string | null;
  location_lat: number | null;
  location_lng: number | null;
  duration_minutes: number | null;
  capacity: number;
  min_group_size: number | null;
  max_group_size: number | null;
  languages: string[] | null;
  level: string | null;
  price_cents: number | null;
  is_free: boolean;
  is_recurring: boolean;
  recurrence_rule: string | null;
  cancellation_policy: string | null;
  ai_suggestion: string | null;
  meeting_link: string | null;
  google_maps_url: string | null;
  status: string;
  published_at: string | null;
  paused_at: string | null;
  paused_from: string | null;
  paused_dates: string[] | null;
  avg_rating: number | null;
  total_bookings: number;
  total_reviews: number;
  next_available_date: string | null;
  bookings_last_week?: number;
  price_tiers: PriceTierDTO[];
  requires_attendee_details: boolean;
  attendee_fields: string[];
  /** Per-experience terms, printed on the ticket PDF. */
  terms_and_conditions: string | null;
  /** Private events are listed with a lock; booking needs the passkey. */
  is_private: boolean;
  /** True when the event's passkey also comps a paid booking to free. */
  passkey_grants_free: boolean;
  /** Only present when fetched with the owning host_id (see getEvent); else null. */
  access_passkey: string | null;
  created_at: string;
  updated_at: string;
}

export interface OccurrenceAvailability {
  date: string;
  total_booked: number;
  capacity: number;
  remaining: number;
  is_fully_booked: boolean;
  is_paused?: boolean;
}

/** GET /events/host/{hostID} */
export function getEventsByHost(hostId: string) {
  return apiFetch<EventDTO[]>(`/events/host/${hostId}`);
}

/** GET /events/ — list all published (live) events (public) */
export function listPublicEvents() {
  return apiFetch<EventDTO[]>("/events/");
}

/** GET /platform-settings/{key} — get a platform setting by key (public) */
export function getPlatformSetting<T = unknown>(key: string) {
  return apiFetch<T>(`/platform-settings/${encodeURIComponent(key)}`);
}

/** GET /events/{eventID}. Pass the owning hostId to also receive the private
 *  event's access_passkey (stripped for everyone else) — used by the host edit
 *  form so the host can view/re-share their passkey. */
export function getEvent(eventId: string, hostId?: string) {
  const qs = hostId ? `?host_id=${encodeURIComponent(hostId)}` : "";
  return apiFetch<EventDTO>(`/events/${eventId}${qs}`);
}

/** GET /events/{eventID}/availability */
export function getEventAvailability(eventId: string) {
  return apiFetch<OccurrenceAvailability[]>(`/events/${eventId}/availability`);
}

/* ------------------------------------------------------------------ */
/*  Host on-spot ("walk-in") booking                                   */
/* ------------------------------------------------------------------ */
// A host books a guest onto their own event and collects payment via Razorpay
// on-screen. Scoped by host_id (ownership verified server-side). Flow:
// initiate → (paid: Razorpay checkout) → complete. Free events confirm on
// initiate (paid === false).

/** Attendee-profile answers collected at booking, without user_id (the guest is
 *  created server-side). Mirrors the customer booking form's upsert payload. */
export type WalkInAttendeeDetails = Omit<AttendeeProfileUpdatePayload, "user_id">;

export interface HostWalkInInitiateBody {
  host_id: string;
  event_id: string;
  guest_name: string;
  guest_phone: string;
  quantity: number;
  occurrence_date?: string; // RFC3339; required for recurring events
  attendee_details?: WalkInAttendeeDetails;
}

export interface HostWalkInInitiateResponse {
  paid: boolean;
  booking?: unknown;
  guest_user_id: string;
  occurrence_date: string;
  // Razorpay checkout fields (paid path only).
  order_id?: string;
  key_id?: string;
  amount_cents?: number;
  currency?: string;
  payment_id?: string;
}

export interface HostWalkInCompleteBody {
  host_id: string;
  event_id: string;
  guest_user_id: string;
  quantity: number;
  occurrence_date?: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/** POST /host/bookings/walk-in/initiate */
export function hostInitiateWalkIn(body: HostWalkInInitiateBody) {
  return apiFetch<HostWalkInInitiateResponse>(
    "/host/bookings/walk-in/initiate",
    { method: "POST", data: body },
  );
}

/** POST /host/bookings/walk-in/complete — returns the created booking. */
export function hostCompleteWalkIn(body: HostWalkInCompleteBody) {
  return apiFetch<BookingDTO>("/host/bookings/walk-in/complete", {
    method: "POST",
    data: body,
  });
}

export interface ExperienceTemplateDTO {
  id: string;
  mood: string;
  title: string;
  hook_line: string;
  created_at: string;
  updated_at: string;
}

/** GET /experience-templates?mood=<mood> — mood-keyed title/hook_line suggestions */
export function listExperienceTemplates(mood?: string) {
  const qs = mood ? `?mood=${encodeURIComponent(mood)}` : "";
  return apiFetch<ExperienceTemplateDTO[]>(`/experience-templates${qs}`);
}

/** GET /events/{eventID}/occurrences?host_id=… — host pause-management view (includes paused) */
export function getEventOccurrencesForHost(eventId: string, hostId: string) {
  return apiFetch<OccurrenceAvailability[]>(
    `/events/${eventId}/occurrences?host_id=${hostId}`,
  );
}

/* ------------------------------------------------------------------ */
/*  Reviews                                                            */
/* ------------------------------------------------------------------ */

export interface ReviewDTO {
  id: string;
  event_id: string;
  user_id: string;
  rating: number;
  name: string | null;
  description: string;
  photo_urls: string[];
  reply: string[];
  sentiment_score: number | null;
  created_at: string;
  updated_at: string;
}

/** GET /reviews/event/{eventID} */
export function getReviewsByEvent(eventId: string) {
  return apiFetch<ReviewDTO[]>(`/reviews/event/${eventId}`);
}

/** GET /reviews/event/{eventID}/rating */
export function getEventRating(eventId: string) {
  return apiFetch<{ average_rating: number; total_reviews: number }>(
    `/reviews/event/${eventId}/rating`,
  );
}

/* ------------------------------------------------------------------ */
/*  Saved Experiences                                                  */
/* ------------------------------------------------------------------ */

export interface SavedExperienceDTO {
  id: string;
  user_id: string;
  event_id: string;
  saved_at: string;
}

/** POST /users/saved-experiences — save/bookmark an experience */
export function saveExperience(body: { user_id: string; event_id: string }) {
  return apiFetch<SavedExperienceDTO>("/users/saved-experiences", {
    method: "POST",
    data: body,
  });
}

/** GET /users/saved-experiences?user_id=<uuid> */
export function getSavedExperiences(userId: string) {
  return apiFetch<SavedExperienceDTO[]>("/users/saved-experiences", {
    params: { user_id: userId },
  });
}

/** DELETE /users/saved-experiences/{eventID}?user_id=<uuid> */
export function unsaveExperience(eventId: string, userId: string) {
  return apiFetch<{ message: string }>(`/users/saved-experiences/${eventId}`, {
    method: "DELETE",
    params: { user_id: userId },
  });
}

/** GET /users/saved-experiences/{eventID}/check?user_id=<uuid> */
export function isExperienceSaved(eventId: string, userId: string) {
  return apiFetch<{ saved: boolean }>(
    `/users/saved-experiences/${eventId}/check`,
    {
      params: { user_id: userId },
    },
  );
}

/* ------------------------------------------------------------------ */
/*  Events (CRUD, publish/pause/resume, calendar, attendees)           */
/* ------------------------------------------------------------------ */

export interface EventCreatePayload {
  host_id: string;
  title: string;
  hook_line?: string;
  mood?: string;
  description?: string;
  cover_image_url?: string;
  gallery_urls?: string[];
  time: string;
  end_time?: string;
  is_online?: boolean;
  location?: string;
  location_lat?: number;
  location_lng?: number;
  duration_minutes?: number;
  capacity: number;
  min_group_size?: number;
  max_group_size?: number;
  languages?: string[];
  level?: string;
  price_cents?: number;
  is_free?: boolean;
  is_recurring?: boolean;
  recurrence_rule?: string;
  cancellation_policy?: string;
  ai_suggestion?: string;
  meeting_link?: string;
  google_maps_url?: string;
  status?: "draft" | "live";
  price_tiers?: PriceTierInput[];
  requires_attendee_details?: boolean;
  attendee_fields?: string[];
  /** Private events are listed with a lock; booking needs the passkey. */
  is_private?: boolean;
  access_passkey?: string;
  /** When true, the passkey also comps a paid booking to free. */
  passkey_grants_free?: boolean;
}

export interface EventUpdatePayload {
  host_id: string;
  title?: string;
  hook_line?: string;
  mood?: string;
  description?: string;
  cover_image_url?: string;
  gallery_urls?: string[];
  time?: string;
  end_time?: string;
  is_online?: boolean;
  location?: string;
  location_lat?: number;
  location_lng?: number;
  duration_minutes?: number;
  capacity?: number;
  min_group_size?: number;
  max_group_size?: number;
  languages?: string[];
  level?: string;
  price_cents?: number;
  is_free?: boolean;
  is_recurring?: boolean;
  recurrence_rule?: string;
  cancellation_policy?: string;
  meeting_link?: string;
  google_maps_url?: string;
  price_tiers?: PriceTierInput[];
  requires_attendee_details?: boolean;
  attendee_fields?: string[];
  is_private?: boolean;
  /** Omit to keep the current passkey; send a value to replace it. */
  access_passkey?: string;
  passkey_grants_free?: boolean;
}

/** POST /events/ — create a new event */
export function createEvent(body: EventCreatePayload) {
  return apiFetch<EventDTO>("/events/", { method: "POST", data: body });
}

/** PUT /events/{eventID} — update an event */
export function updateEvent(eventId: string, body: EventUpdatePayload) {
  return apiFetch<EventDTO>(`/events/${eventId}`, {
    method: "PUT",
    data: body,
  });
}

/** GET /events/host/{hostID}/filtered */
export function getHostEventsFiltered(
  hostId: string,
  filters?: {
    status?: string;
    mood?: string;
    from?: string;
    to?: string;
    limit?: string;
    offset?: string;
  },
) {
  return apiFetch<EventDTO[]>(`/events/host/${hostId}/filtered`, {
    params: filters,
  });
}

/** GET /events/calendar/{hostID} — calendar view of events */
export function getCalendarEvents(hostId: string) {
  return apiFetch<EventDTO[]>(`/events/calendar/${hostId}`);
}

/** POST /events/{eventID}/publish — publish a draft event */
export function publishEvent(eventId: string, hostId: string) {
  return apiFetch<EventDTO>(`/events/${eventId}/publish`, {
    method: "POST",
    data: { host_id: hostId },
  });
}

/** POST /events/{eventID}/pause — pause a live event */
export function pauseEvent(
  eventId: string,
  hostId: string,
  pausedFrom?: string,
  pausedDate?: string,
) {
  return apiFetch<EventDTO>(`/events/${eventId}/pause`, {
    method: "POST",
    data: {
      host_id: hostId,
      paused_from: pausedFrom,
      paused_date: pausedDate,
    },
  });
}

/** POST /events/{eventID}/resume — resume a paused event */
export function resumeEvent(eventId: string, hostId: string) {
  return apiFetch<EventDTO>(`/events/${eventId}/resume`, {
    method: "POST",
    data: { host_id: hostId },
  });
}

/** GET /events/{eventID}/attendees — list confirmed attendees */
export function getEventAttendees(eventId: string, date?: string) {
  let url = `/events/${eventId}/attendees`;
  if (date) url += `?date=${encodeURIComponent(date)}`;
  return apiFetch<BookingDTO[]>(url);
}

/* ------------------------------------------------------------------ */
/*  Bookings                                                           */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Door check-in (host QR scanner)                                    */
/* ------------------------------------------------------------------ */

/** Why a scanned ticket was accepted or turned away. */
export type ScanVerdict =
  | "valid"
  | "not_found"
  | "wrong_event"
  | "wrong_occurrence"
  | "not_confirmed"
  | "already_checked_in"
  | "too_many"
  | "not_your_event";

export interface ScanResultDTO {
  verdict: ScanVerdict;
  /** Ready-to-show explanation — the door screen renders this verbatim. */
  message: string;
  booking_id?: string;
  guest_name?: string;
  guest_email?: string;
  event_title?: string;
  occurrence_date?: string;
  quantity?: number;
  checked_in_count: number;
  remaining: number;
  /** How many guests this particular scan admitted (0 for a plain verify). */
  just_checked_in: number;
}

/** The door session: which host is scanning, for which event and date. */
export interface ScanSession {
  host_id: string;
  event_id: string;
  occurrence_date: string;
}

/** POST /hosts/scan/verify — judge a ticket without admitting anyone. */
export function verifyScannedTicket(session: ScanSession, bookingId: string) {
  return apiFetch<ScanResultDTO>("/hosts/scan/verify", {
    method: "POST",
    data: { ...session, booking_id: bookingId },
  });
}

/** POST /hosts/scan/check-in — admit `count` guests against a ticket. */
export function checkInScannedTicket(
  session: ScanSession,
  bookingId: string,
  count: number,
) {
  return apiFetch<ScanResultDTO>("/hosts/scan/check-in", {
    method: "POST",
    data: { ...session, booking_id: bookingId, count },
  });
}

/**
 * Pull the booking id out of a scanned QR. Tickets encode a confirmation URL
 * (`/experience/{eventId}/confirmation?booking={bookingId}`), so anything else
 * — a random QR at the venue, a website, a bare string — is not a ticket and
 * returns null rather than being sent to the server.
 */
export function parseTicketQr(raw: string): string | null {
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  try {
    const bookingId = new URL(raw.trim()).searchParams.get("booking");
    return bookingId && UUID_RE.test(bookingId) ? bookingId : null;
  } catch {
    return null; // not a URL at all
  }
}

export interface BookingDTO {
  id: string;
  event_id: string;
  user_id: string;
  occurrence_date: string;
  quantity: number;
  status: "pending" | "confirmed" | "cancelled" | "refunded";
  payment_id: string | null;
  idempotency_key: string | null;
  amount_cents: number | null;
  service_fee_cents: number | null;
  net_earning_cents: number | null;
  price_tier_id: string | null;
  unit_price_cents: number | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  // Joined user fields — present only on the host attendees endpoint.
  user_name?: string;
  user_email?: string;
  user_avatar_url?: string | null;
  // Submitted attendee details — present on the host attendees endpoint when
  // the guest filled the attendee form.
  attendee_profile?: AttendeeProfileDTO | null;
}

export interface CreateBookingPayload {
  user_id: string;
  event_id: string;
  quantity: number;
  occurrence_date?: string;
  idempotency_key?: string;
  price_tier_id?: string;
  /** Passkey for a private event (also comps it when the event opts in). */
  passkey?: string;
  /** Comp code that waives the whole booking to free. */
  coupon_code?: string;
}

/** POST /bookings/ — create a booking */
export function createBooking(body: CreateBookingPayload) {
  return apiFetch<BookingDTO>("/bookings/", { method: "POST", data: body });
}

/** POST /events/{slugOrId}/unlock — dry-run check of a private event's passkey.
 *  Returns whether the passkey is valid and whether it also comps the booking.
 *  The passkey itself is never returned. Authoritative re-check happens at booking. */
export function unlockEvent(slugOrId: string, passkey: string) {
  return apiFetch<{ valid: boolean; grants_free: boolean }>(
    `/events/${slugOrId}/unlock`,
    { method: "POST", data: { passkey } },
  );
}

/** POST /coupons/validate — dry-run check of a comp code for this event+user. */
export function validateCoupon(eventId: string, userId: string, code: string) {
  return apiFetch<{ valid: boolean; comps_booking: boolean; code: string }>(
    "/coupons/validate",
    { method: "POST", data: { event_id: eventId, user_id: userId, code } },
  );
}

/* ------------------------------------------------------------------ */
/*  Coupons (host comp codes — always full waivers)                    */
/* ------------------------------------------------------------------ */

export interface CouponDTO {
  id: string;
  host_id: string;
  event_id: string | null;
  code: string;
  /** true = free-booking code (comp); false = access code (unlocks, guest pays). */
  grants_free: boolean;
  max_redemptions: number | null;
  times_redeemed: number;
  per_user_limit: number | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CouponPayload {
  host_id: string;
  event_id?: string | null;
  code: string;
  /** true = free-booking code (comp); false = access code. Defaults to true. */
  grants_free?: boolean;
  max_redemptions?: number | null;
  per_user_limit?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active?: boolean;
}

/** GET /coupons/host/{hostID} */
export function getHostCoupons(hostId: string) {
  return apiFetch<CouponDTO[]>(`/coupons/host/${hostId}`);
}

/** POST /coupons/ — create a comp code */
export function createCoupon(body: CouponPayload) {
  return apiFetch<CouponDTO>("/coupons/", { method: "POST", data: body });
}

export interface CouponBatchPayload {
  host_id: string;
  event_id?: string | null;
  count: number;
  prefix?: string;
  /** true = free-booking codes (comp); false = access codes. Defaults to true. */
  grants_free?: boolean;
  /** Defaults to single-use (max_redemptions=1, per_user_limit=1). */
  max_redemptions?: number | null;
  per_user_limit?: number | null;
  valid_until?: string | null;
}

/** POST /coupons/batch — generate `count` unique single-use codes at once */
export function createCouponsBatch(body: CouponBatchPayload) {
  return apiFetch<CouponDTO[]>("/coupons/batch", { method: "POST", data: body });
}

/** PUT /coupons/{id} — update a comp code (partial; omitted limits are kept) */
export function updateCoupon(couponId: string, body: CouponPayload) {
  return apiFetch<CouponDTO>(`/coupons/${couponId}`, {
    method: "PUT",
    data: body,
  });
}

/** DELETE /coupons/{id}?host_id= */
export function deleteCoupon(couponId: string, hostId: string) {
  return apiFetch<{ deleted: boolean }>(
    `/coupons/${couponId}?host_id=${encodeURIComponent(hostId)}`,
    { method: "DELETE" },
  );
}

/** POST /bookings/{bookingID}/confirm — confirm a pending booking */
export function confirmBooking(bookingId: string) {
  return apiFetch<BookingDTO>(`/bookings/${bookingId}/confirm`, {
    method: "POST",
  });
}

/** POST /bookings/{bookingID}/cancel — cancel a booking.
 *  refundDestination defaults to "wallet" — money goes back to the user's
 *  wallet only. Pass "source" to also chain a Razorpay refund back to the
 *  original card/UPI (best-effort: if no refundable top-up exists or Razorpay
 *  rejects, the wallet refund stands and the booking is still cancelled). */
export function cancelBooking(
  bookingId: string,
  userId: string,
  refundDestination: "wallet" | "source" = "wallet",
) {
  return apiFetch<BookingDTO>(`/bookings/${bookingId}/cancel`, {
    method: "POST",
    data: { user_id: userId, refund_destination: refundDestination },
  });
}

/** GET /bookings/user/{userID} — list bookings for a user */
export function getBookingsByUser(userId: string) {
  return apiFetch<BookingDTO[]>(`/bookings/user/${userId}`);
}

/** GET /bookings/{bookingID} — get a single booking */
export function getBooking(bookingId: string) {
  return apiFetch<BookingDTO>(`/bookings/${bookingId}`);
}

/* ------------------------------------------------------------------ */
/*  Payouts                                                            */
/* ------------------------------------------------------------------ */

export interface PayoutMethodDTO {
  id: string;
  host_id: string;
  type: "bank" | "upi";
  bank_name: string | null;
  account_type: string | null;
  last_four_digits: string | null;
  ifsc: string | null;
  beneficiary_name: string | null;
  upi_id: string | null;
  is_verified: boolean;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddPayoutMethodPayload {
  host_id: string;
  type: "bank" | "upi";
  bank_name?: string;
  account_type?: string;
  account_number?: string;
  ifsc?: string;
  beneficiary_name?: string;
  upi_id?: string;
}

export interface PaymentDTO {
  id: string;
  idempotency_key: string;
  account_id: string;
  type: "booking" | "withdrawal" | "refund" | "payout" | "topup";
  reference_id: string | null;
  amount_cents: number;
  status: "pending" | "processing" | "completed" | "failed" | "reversed";
  retry_count: number;
  last_error: string | null;
  payout_method_id: string | null;
  display_reference: string | null;
  gateway_order_id?: string | null; // Razorpay order_xxxxx
  gateway_payment_id?: string | null; // Razorpay pay_xxxxx
  gateway_refund_id?: string | null; // Razorpay rfnd_xxxxx — set on source refunds
  refund_of_payment_id?: string | null; // the top-up this refund went against (source refund)
  created_at: string;
  updated_at: string;
}

/** GET /users/wallet/transactions — user's wallet payment history.
 *  Returns top-ups, bookings, and refunds (both wallet and source). Newest first. */
export function getWalletTransactions(userId: string, limit = 50, offset = 0) {
  return apiFetch<PaymentDTO[]>(
    `/users/wallet/transactions?user_id=${userId}&limit=${limit}&offset=${offset}`,
  );
}

// NOTE: all /payouts/* endpoints are auth.RequireUser-protected (F6). They
// must send `Authorization: Bearer <firebase-id-token>` or the backend returns
// 401 and React Query falls back to undefined (showing 0/empty everywhere).
// The body/URL `host_id` fields are now redundant — backend derives host from
// the auth token — but kept for backward compat with existing callers.

/** POST /payouts/methods — add a payout method */
export function addPayoutMethod(body: AddPayoutMethodPayload, idToken: string) {
  return apiFetch<PayoutMethodDTO>("/payouts/methods", {
    method: "POST",
    data: body,
    headers: getAuthHeader(idToken),
  });
}

/** GET /payouts/methods/{hostID} — list payout methods */
export function getPayoutMethods(hostId: string, idToken: string) {
  return apiFetch<PayoutMethodDTO[]>(`/payouts/methods/${hostId}`, {
    headers: getAuthHeader(idToken),
  });
}

/** PUT /payouts/methods/{methodID}/primary — set primary payout method */
export function setPrimaryPayoutMethod(
  methodId: string,
  hostId: string,
  idToken: string,
) {
  return apiFetch<{ message: string }>(`/payouts/methods/${methodId}/primary`, {
    method: "PUT",
    data: { host_id: hostId },
    headers: getAuthHeader(idToken),
  });
}

/** DELETE /payouts/methods/{methodID}?host_id=<uuid> */
export function deletePayoutMethod(
  methodId: string,
  hostId: string,
  idToken: string,
) {
  return apiFetch<{ message: string }>(`/payouts/methods/${methodId}`, {
    method: "DELETE",
    params: { host_id: hostId },
    headers: getAuthHeader(idToken),
  });
}

/** POST /payouts/withdraw — request a payout withdrawal */
export function withdraw(
  body: {
    host_id: string;
    amount_cents: number;
    idempotency_key: string;
    payout_method_id?: string;
  },
  idToken: string,
) {
  return apiFetch<PaymentDTO>("/payouts/withdraw", {
    method: "POST",
    data: body,
    headers: getAuthHeader(idToken),
  });
}

/** GET /payouts/earnings/{hostID} — earnings summary */
export function getEarnings(hostId: string, idToken: string) {
  return apiFetch<HostEarningsDTO>(`/payouts/earnings/${hostId}`, {
    headers: getAuthHeader(idToken),
  });
}

/** One row of the host's sales history — a booking made on one of their
 *  events, joined with the buyer and event for display. */
export interface HostSaleDTO {
  BookingID: string;
  EventID: string;
  EventTitle: string;
  BuyerUserID: string;
  BuyerName: string;
  BuyerEmail: string;
  BuyerAvatarURL: string | null;
  OccurrenceDate: string;
  Quantity: number;
  AmountCents: number;
  NetEarningCents: number | null;
  ServiceFeeCents: number | null;
  Status: "pending" | "confirmed" | "cancelled" | "refunded";
  CreatedAt: string;
  CancelledAt: string | null;
}

/** GET /payouts/sales — list of bookings on this host's events.
 *  `fromDate` is an RFC3339 timestamp; sales created before it are excluded.
 *  Pass undefined for all-time. */
export function getHostSales(
  idToken: string,
  opts?: { limit?: number; offset?: number; fromDate?: string },
) {
  const params: Record<string, string | number> = {};
  if (opts?.limit !== undefined) params.limit = opts.limit;
  if (opts?.offset !== undefined) params.offset = opts.offset;
  if (opts?.fromDate) params.from_date = opts.fromDate;
  return apiFetch<HostSaleDTO[]>("/payouts/sales", {
    params,
    headers: getAuthHeader(idToken),
  });
}

/** GET /payouts/history/{hostID} — paginated payout history */
export function getPayoutHistory(
  hostId: string,
  idToken: string,
  pagination?: { limit?: number; offset?: number },
) {
  return apiFetch<PaymentDTO[]>(`/payouts/history/${hostId}`, {
    params: pagination,
    headers: getAuthHeader(idToken),
  });
}

/* ------------------------------------------------------------------ */
/*  Reviews (write)                                                    */
/* ------------------------------------------------------------------ */

export interface CreateReviewPayload {
  user_id: string;
  event_id: string;
  rating: number;
  name?: string;
  description: string;
  photo_urls?: string[];
}

/** POST /reviews/ — submit a review */
export function createReview(body: CreateReviewPayload) {
  return apiFetch<ReviewDTO>("/reviews/", { method: "POST", data: body });
}

/** POST /reviews/{reviewId}/reply — host adds a reply to a review */
export function addReplyToReview(reviewId: string, body: { reply: string }) {
  return apiFetch<ReviewDTO>(`/reviews/${reviewId}/reply`, {
    method: "POST",
    data: body,
  });
}

/* ------------------------------------------------------------------ */
/*  Inbox                                                              */
/* ------------------------------------------------------------------ */

export interface InboxMessageDTO {
  id: string;
  event_id: string;
  sender_type: "system" | "host" | "guest";
  sender_id: string | null;
  message: string;
  attachment_url: string | null;
  is_read: boolean;
  created_at: string;
}

/** POST /inbox/send — send a message in an event thread */
export function sendMessage(body: {
  event_id: string;
  host_id: string;
  sender_type: "system" | "host" | "guest";
  sender_id?: string;
  message: string;
  attachment_url?: string;
}) {
  return apiFetch<InboxMessageDTO>("/inbox/send", {
    method: "POST",
    data: body,
  });
}

/** POST /inbox/broadcast — host broadcasts to all event attendees */
export function broadcastMessage(body: {
  host_id: string;
  event_id: string;
  message: string;
}) {
  return apiFetch<InboxMessageDTO>("/inbox/broadcast", {
    method: "POST",
    data: body,
  });
}

/** GET /inbox/event/{eventID} — all messages for an event thread */
export function getEventMessages(eventId: string) {
  return apiFetch<InboxMessageDTO[]>(`/inbox/event/${eventId}`);
}

/** GET /inbox/host/{hostID} — all messages across host's events */
export function getHostMessages(hostId: string) {
  return apiFetch<InboxMessageDTO[]>(`/inbox/host/${hostId}`);
}

/** POST /inbox/{messageID}/read — mark a message as read */
export function markMessageRead(messageId: string) {
  return apiFetch<{ message: string }>(`/inbox/${messageId}/read`, {
    method: "POST",
  });
}

/* ------------------------------------------------------------------ */
/*  Support                                                            */
/* ------------------------------------------------------------------ */

export interface SupportTicketDTO {
  id: string;
  user_id: string;
  category: "report_participant" | "technical_support" | "policy_help";
  reported_user_id: string | null;
  subject: string;
  messages: { sender: string; text: string; created_at: string }[];
  status: "open" | "in_progress" | "resolved" | "closed";
  event_id: string | null;
  session_date: string | null;
  report_reason: string | null;
  evidence_urls: string[];
  is_urgent: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSupportTicketPayload {
  user_id: string;
  category: "report_participant" | "technical_support" | "policy_help";
  subject: string;
  message: string;
  reported_user_id?: string;
  event_id?: string;
  session_date?: string;
  report_reason?: string;
  evidence_urls?: string[];
  is_urgent?: boolean;
}

/** POST /support/ — create a support ticket */
export function createSupportTicket(body: CreateSupportTicketPayload) {
  return apiFetch<SupportTicketDTO>("/support/", {
    method: "POST",
    data: body,
  });
}

/** GET /support/{ticketID} — get a support ticket by ID */
export function getSupportTicket(ticketId: string) {
  return apiFetch<SupportTicketDTO>(`/support/${ticketId}`);
}

/** GET /support/user/{userID} — list all tickets for a user */
export function getUserTickets(userId: string) {
  return apiFetch<SupportTicketDTO[]>(`/support/user/${userId}`);
}

/** POST /support/{ticketID}/message — add a message to a ticket thread */
export function addSupportMessage(ticketId: string, message: string) {
  return apiFetch<SupportTicketDTO>(`/support/${ticketId}/message`, {
    method: "POST",
    data: { message },
  });
}

/** POST /support/{ticketID}/resolve — mark ticket as resolved */
export function resolveSupportTicket(ticketId: string) {
  return apiFetch<SupportTicketDTO>(`/support/${ticketId}/resolve`, {
    method: "POST",
  });
}

/* ════════════════════════════════════════════════════════════════════════════
   WALLET / TOP-UP
   ══════════════════════════════════════════════════════════════════════════ */

export interface WalletBalanceDTO {
  account_id: string;
  balance_cents: number; // balance in paise (100 paise = ₹1)
}

export interface TopupOrderDTO {
  order_id: string; // Razorpay order ID
  key_id: string; // Razorpay key for frontend
  amount_cents: number;
  currency: string;
}

export interface CreateTopupPayload {
  user_id: string;
  amount_cents: number;
  idempotency_key: string;
}

export interface TopupVerifyPayload {
  user_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/** GET /users/wallet/balance — get user's wallet balance */
export function getWalletBalance(userId: string) {
  return apiFetch<WalletBalanceDTO>(`/users/wallet/balance?user_id=${userId}`);
}

/** POST /users/wallet/topup — create a Razorpay order for topping up wallet */
export function createTopupOrder(payload: CreateTopupPayload) {
  return apiFetch<TopupOrderDTO>("/users/wallet/topup", {
    method: "POST",
    data: payload,
  });
}

/** POST /users/wallet/topup/verify — verify Razorpay payment and credit wallet */
export function verifyTopupPayment(payload: TopupVerifyPayload) {
  return apiFetch<WalletBalanceDTO>("/users/wallet/topup/verify", {
    method: "POST",
    data: payload,
  });
}
