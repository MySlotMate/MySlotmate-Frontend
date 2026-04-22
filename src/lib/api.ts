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
  | "support/evidence";

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
  user_id: string;
  account_id: string | null;
  first_name: string;
  last_name: string;
  phn_number: string;
  city: string;
  avatar_url: string | null;
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
  expertise_tags: string[];
  social_instagram: string | null;
  social_linkedin: string | null;
  social_website: string | null;
  avg_rating: number | null;
  total_reviews: number;
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
  first_name: string;
  last_name: string;
  city: string;
  avatar_url: string | null;
  tagline: string | null;
  bio: string | null;
  is_identity_verified: boolean;
  is_super_host: boolean;
  is_community_champ: boolean;
  expertise_tags: string[];
  social_instagram: string | null;
  social_linkedin: string | null;
  social_website: string | null;
  avg_rating: number | null;
  total_reviews: number;
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
  description: string;
  category: string;
  content: string;
  cover_image_url?: string | null;
  read_time_minutes: number;
}

export interface BlogUpdatePayload {
  title?: string;
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

/** GET /blogs/{blogID} — get a single blog by ID */
export function getBlog(blogId: string) {
  return apiFetch<BlogDTO>(`/blogs/${blogId}`);
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
  id: string;
  host_id: string;
  total_earnings_cents: number;
  pending_clearance_cents: number;
  estimated_clearance_at: string | null;
  created_at: string;
  updated_at: string;
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
  id: string;
  type: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  action_url?: string;
  action_label?: string;
  created_at: string;
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

export interface EventDTO {
  id: string;
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
  avg_rating: number | null;
  total_bookings: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
}

/** GET /events/host/{hostID} */
export function getEventsByHost(hostId: string) {
  return apiFetch<EventDTO[]>(`/events/host/${hostId}`);
}

/** GET /events/ — list all published (live) events (public) */
export function listPublicEvents() {
  return apiFetch<EventDTO[]>("/events/");
}

/** GET /events/{eventID} */
export function getEvent(eventId: string) {
  return apiFetch<EventDTO>(`/events/${eventId}`);
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
  return apiFetch<{ avg_rating: number; total_reviews: number }>(
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
  price_cents?: number;
  is_free?: boolean;
  is_recurring?: boolean;
  recurrence_rule?: string;
  cancellation_policy?: string;
  ai_suggestion?: string;
  meeting_link?: string;
  google_maps_url?: string;
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
  price_cents?: number;
  is_free?: boolean;
  is_recurring?: boolean;
  recurrence_rule?: string;
  cancellation_policy?: string;
  meeting_link?: string;
  google_maps_url?: string;
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
  filters?: { status?: string; mood?: string; from?: string; to?: string },
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
export function pauseEvent(eventId: string, hostId: string) {
  return apiFetch<EventDTO>(`/events/${eventId}/pause`, {
    method: "POST",
    data: { host_id: hostId },
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
export function getEventAttendees(eventId: string) {
  return apiFetch<BookingDTO[]>(`/events/${eventId}/attendees`);
}

/* ------------------------------------------------------------------ */
/*  Bookings                                                           */
/* ------------------------------------------------------------------ */

export interface BookingDTO {
  id: string;
  event_id: string;
  user_id: string;
  quantity: number;
  status: "pending" | "confirmed" | "cancelled" | "refunded";
  payment_id: string | null;
  idempotency_key: string | null;
  amount_cents: number | null;
  service_fee_cents: number | null;
  net_earning_cents: number | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
}

export interface CreateBookingPayload {
  user_id: string;
  event_id: string;
  quantity: number;
  idempotency_key?: string;
}

/** POST /bookings/ — create a booking */
export function createBooking(body: CreateBookingPayload) {
  return apiFetch<BookingDTO>("/bookings/", { method: "POST", data: body });
}

/** POST /bookings/{bookingID}/confirm — confirm a pending booking */
export function confirmBooking(bookingId: string) {
  return apiFetch<BookingDTO>(`/bookings/${bookingId}/confirm`, {
    method: "POST",
  });
}

/** POST /bookings/{bookingID}/cancel — cancel a booking */
export function cancelBooking(bookingId: string, userId: string) {
  return apiFetch<BookingDTO>(`/bookings/${bookingId}/cancel`, {
    method: "POST",
    data: { user_id: userId },
  });
}

/** GET /bookings/user/{userID} — list bookings for a user */
export function getBookingsByUser(userId: string) {
  return apiFetch<BookingDTO[]>(`/bookings/user/${userId}`);
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
  created_at: string;
  updated_at: string;
}

/** POST /payouts/methods — add a payout method */
export function addPayoutMethod(body: AddPayoutMethodPayload) {
  return apiFetch<PayoutMethodDTO>("/payouts/methods", {
    method: "POST",
    data: body,
  });
}

/** GET /payouts/methods/{hostID} — list payout methods */
export function getPayoutMethods(hostId: string) {
  return apiFetch<PayoutMethodDTO[]>(`/payouts/methods/${hostId}`);
}

/** PUT /payouts/methods/{methodID}/primary — set primary payout method */
export function setPrimaryPayoutMethod(methodId: string, hostId: string) {
  return apiFetch<{ message: string }>(`/payouts/methods/${methodId}/primary`, {
    method: "PUT",
    data: { host_id: hostId },
  });
}

/** DELETE /payouts/methods/{methodID}?host_id=<uuid> */
export function deletePayoutMethod(methodId: string, hostId: string) {
  return apiFetch<{ message: string }>(`/payouts/methods/${methodId}`, {
    method: "DELETE",
    params: { host_id: hostId },
  });
}

/** POST /payouts/withdraw — request a payout withdrawal */
export function withdraw(body: {
  host_id: string;
  amount_cents: number;
  idempotency_key: string;
  payout_method_id?: string;
}) {
  return apiFetch<PaymentDTO>("/payouts/withdraw", {
    method: "POST",
    data: body,
  });
}

/** GET /payouts/earnings/{hostID} — earnings summary */
export function getEarnings(hostId: string) {
  return apiFetch<HostEarningsDTO>(`/payouts/earnings/${hostId}`);
}

/** GET /payouts/history/{hostID} — paginated payout history */
export function getPayoutHistory(
  hostId: string,
  pagination?: { limit?: number; offset?: number },
) {
  return apiFetch<PaymentDTO[]>(`/payouts/history/${hostId}`, {
    params: pagination,
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
