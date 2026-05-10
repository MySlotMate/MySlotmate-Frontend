"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import * as api from "~/lib/api";

/* ═══ Query Keys ═══════════════════════════════════════════════ */

export const queryKeys = {
  myProfile: (userId: string) => ["myProfile", userId] as const,
  applicationStatus: (userId: string) => ["applicationStatus", userId] as const,
  myHost: (userId: string) => ["myHost", userId] as const,
  hostDashboard: (hostId: string) => ["hostDashboard", hostId] as const,
  hostAttentionItems: (hostId: string) =>
    ["hostAttentionItems", hostId] as const,
  todaySchedule: (hostId: string) => ["todaySchedule", hostId] as const,
  eventsByHost: (hostId: string) => ["eventsByHost", hostId] as const,
  calendarEvents: (hostId: string) => ["calendarEvents", hostId] as const,
  hostEventsFiltered: (hostId: string, filters?: Record<string, string>) =>
    ["hostEventsFiltered", hostId, filters] as const,
  event: (eventId: string) => ["event", eventId] as const,
  eventAvailability: (eventId: string) => ["eventAvailability", eventId] as const,
  eventAttendees: (eventId: string) => ["eventAttendees", eventId] as const,
  reviewsByEvent: (eventId: string) => ["reviewsByEvent", eventId] as const,
  eventRating: (eventId: string) => ["eventRating", eventId] as const,
  savedExperiences: (userId: string) => ["savedExperiences", userId] as const,
  isExperienceSaved: (eventId: string, userId: string) =>
    ["isExperienceSaved", eventId, userId] as const,
  bookingsByUser: (userId: string) => ["bookingsByUser", userId] as const,
  booking: (bookingId: string) => ["booking", bookingId] as const,
  payoutMethods: (hostId: string) => ["payoutMethods", hostId] as const,
  earnings: (hostId: string) => ["earnings", hostId] as const,
  payoutHistory: (hostId: string) => ["payoutHistory", hostId] as const,
  platformBalance: ["platformBalance"] as const,
  platformPayoutMethods: ["platformPayoutMethods"] as const,
  eventMessages: (eventId: string) => ["eventMessages", eventId] as const,
  hostMessages: (hostId: string) => ["hostMessages", hostId] as const,
  supportTicket: (ticketId: string) => ["supportTicket", ticketId] as const,
  userTickets: (userId: string) => ["userTickets", userId] as const,
  listHosts: ["listHosts"] as const,
  listPublicEvents: ["listPublicEvents"] as const,
  blogs: ["blogs"] as const,
  blog: (blogId: string) => ["blog", blogId] as const,
  blogsByCategory: (category: string) => ["blogsByCategory", category] as const,
  publicHostProfile: (hostId: string) => ["publicHostProfile", hostId] as const,
  pendingHostApplications: ["pendingHostApplications"] as const,
  userProfile: (userId: string) => ["userProfile", userId] as const,
};

/* ═══ Queries ══════════════════════════════════════════════════ */

export function useMyProfile(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.myProfile(userId ?? ""),
    queryFn: () => api.getMyProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function useUserProfile(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.userProfile(userId ?? ""),
    queryFn: () => api.getMyProfile(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function useApplicationStatus(
  userId: string | null,
): UseQueryResult<api.ApplicationStatusResponse> {
  return useQuery({
    queryKey: queryKeys.applicationStatus(userId ?? ""),
    queryFn: async () => {
      try {
        const result = await api.getApplicationStatus(userId!);
        return result;
      } catch (err) {
        const error = err as Error & { status?: number };
        const errorMsg = error?.message ?? "";
        const status = error?.status;

        // If it's a 404 (not found), it means no application exists yet
        if (status === 404) {
          return {
            success: false,
            data: {},
            error: "No application found",
          } as api.Envelope<api.ApplicationStatusResponse>;
        }

        // For any other error, if it contains "application" or "already",
        // it might mean application exists but there's an issue fetching it
        if (
          errorMsg.toLowerCase().includes("application") ||
          errorMsg.toLowerCase().includes("already")
        ) {
          return {
            success: true,
            data: {
              status: {
                id: userId ?? "",
                application_status: "pending" as const,
              },
            },
          } as api.Envelope<api.ApplicationStatusResponse>;
        }

        // Re-throw other errors
        throw err;
      }
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    select: (res) => {
      const extracted = res?.data;
      return extracted;
    },
    retry: false,
  });
}

export function useMyHost(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.myHost(userId ?? ""),
    queryFn: () => api.getMyHost(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function useListHosts() {
  return useQuery({
    queryKey: queryKeys.listHosts,
    queryFn: () => api.listHosts(),
    staleTime: 5 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function useListPublicEvents() {
  return useQuery({
    queryKey: queryKeys.listPublicEvents,
    queryFn: () => api.listPublicEvents(),
    staleTime: 5 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function useListBlogs(pagination?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [...queryKeys.blogs, pagination] as const,
    queryFn: () => api.listBlogs(pagination),
    staleTime: 5 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function useBlog(blogId: string | null) {
  return useQuery({
    queryKey: queryKeys.blog(blogId ?? ""),
    queryFn: () => api.getBlog(blogId!),
    enabled: !!blogId,
    staleTime: 2 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function useBlogsByCategory(
  category: string | null,
  pagination?: { limit?: number; offset?: number },
) {
  return useQuery({
    queryKey: [
      ...queryKeys.blogsByCategory(category ?? ""),
      pagination,
    ] as const,
    queryFn: () => api.listBlogsByCategory(category!, pagination),
    enabled: !!category,
    staleTime: 5 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function usePendingHostApplications(idToken: string | null) {
  return useQuery({
    queryKey: queryKeys.pendingHostApplications,
    queryFn: () => api.listPendingHostApplications(idToken!),
    enabled: !!idToken,
    staleTime: 30 * 1000,
    select: (res) => res.data,
  });
}

export function usePlatformBalance(idToken: string | null) {
  return useQuery({
    queryKey: queryKeys.platformBalance,
    queryFn: async () => {
      try {
        const result = await api.getPlatformBalance(idToken!);
        console.log("✅ getPlatformBalance response:", result);
        return result;
      } catch (err) {
        console.error("❌ getPlatformBalance error:", err);
        throw err;
      }
    },
    enabled: !!idToken,
    staleTime: 60 * 1000,
    select: (res) => {
      console.log("💾 usePlatformBalance select - res.data:", res.data);
      return res.data;
    },
  });
}

export function usePlatformPayoutMethods(idToken: string | null) {
  return useQuery({
    queryKey: queryKeys.platformPayoutMethods,
    queryFn: async () => {
      try {
        const result = await api.getPlatformPayoutMethods(idToken!);
        console.log("✅ getPlatformPayoutMethods response:", result);
        return result;
      } catch (err) {
        console.error("❌ getPlatformPayoutMethods error:", err);
        throw err;
      }
    },
    enabled: !!idToken,
    staleTime: 2 * 60 * 1000,
    select: (res) => {
      console.log("💾 usePlatformPayoutMethods select - res.data:", res.data);
      return res.data;
    },
  }) as UseQueryResult<api.PayoutMethodDTO[] | undefined, unknown>;
}

export function usePublicHostProfile(hostId: string | null) {
  return useQuery({
    queryKey: queryKeys.publicHostProfile(hostId ?? ""),
    queryFn: () => api.getPublicHostProfile(hostId!),
    enabled: !!hostId,
    staleTime: 2 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function useHostDashboard(hostId: string | null, userId: string | null) {
  return useQuery({
    queryKey: queryKeys.hostDashboard(hostId ?? ""),
    queryFn: () => api.getHostDashboard(hostId!, userId!),
    enabled: !!hostId && !!userId,
    staleTime: 60 * 1000,
    select: (res) => res.data,
  });
}

export function useHostAttentionItems(hostId: string | null) {
  return useQuery({
    queryKey: queryKeys.hostAttentionItems(hostId ?? ""),
    queryFn: () => api.getHostAttentionItems(hostId!),
    enabled: !!hostId,
    staleTime: 60 * 1000,
    select: (res) => res.data?.items ?? [],
  });
}

export function useTodaySchedule(hostId: string | null) {
  return useQuery({
    queryKey: queryKeys.todaySchedule(hostId ?? ""),
    queryFn: () => api.getTodaySchedule(hostId!),
    enabled: !!hostId,
    staleTime: 5 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function useEventsByHost(hostId: string | null) {
  return useQuery({
    queryKey: queryKeys.eventsByHost(hostId ?? ""),
    queryFn: () => api.getEventsByHost(hostId!),
    enabled: !!hostId,
    staleTime: 0, // Set to 0 to always fetch fresh data
    select: (res) => res.data,
  });
}

export function useCalendarEvents(hostId: string | null) {
  return useQuery({
    queryKey: queryKeys.calendarEvents(hostId ?? ""),
    queryFn: () => api.getCalendarEvents(hostId!),
    enabled: !!hostId,
    staleTime: 60 * 1000,
    select: (res) => res.data,
  });
}

export function useEvent(eventId: string | null) {
  return useQuery({
    queryKey: queryKeys.event(eventId ?? ""),
    queryFn: () => api.getEvent(eventId!),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function useEventAvailability(eventId: string | null) {
  return useQuery({
    queryKey: queryKeys.eventAvailability(eventId ?? ""),
    queryFn: () => api.getEventAvailability(eventId!),
    enabled: !!eventId,
    staleTime: 30 * 1000,
    select: (res) => res.data,
  });
}

export function useEventAttendees(eventId: string | null, date?: string) {
  return useQuery({
    queryKey: [...queryKeys.eventAttendees(eventId ?? ""), date],
    queryFn: () => api.getEventAttendees(eventId!, date),
    enabled: !!eventId,
    staleTime: 60 * 1000,
    select: (res) => res.data,
  });
}

export function useReviewsByEvent(eventId: string | null) {
  return useQuery({
    queryKey: queryKeys.reviewsByEvent(eventId ?? ""),
    queryFn: () => api.getReviewsByEvent(eventId!),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function useEventRating(eventId: string | null) {
  return useQuery({
    queryKey: queryKeys.eventRating(eventId ?? ""),
    queryFn: () => api.getEventRating(eventId!),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function useSavedExperiences(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.savedExperiences(userId ?? ""),
    queryFn: () => api.getSavedExperiences(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function useIsExperienceSaved(
  eventId: string | null,
  userId: string | null,
) {
  return useQuery({
    queryKey: queryKeys.isExperienceSaved(eventId ?? "", userId ?? ""),
    queryFn: () => api.isExperienceSaved(eventId!, userId!),
    enabled: !!eventId && !!userId,
    staleTime: 60 * 1000,
    select: (res) => res.data,
  });
}

export function useBookingsByUser(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.bookingsByUser(userId ?? ""),
    queryFn: () => api.getBookingsByUser(userId!),
    enabled: !!userId,
    staleTime: 60 * 1000,
    select: (res) => res.data,
  });
}

export function useBooking(bookingId: string | null) {
  return useQuery({
    queryKey: queryKeys.booking(bookingId ?? ""),
    queryFn: () => api.getBooking(bookingId!),
    enabled: !!bookingId,
    staleTime: 5 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function usePayoutMethods(hostId: string | null) {
  return useQuery({
    queryKey: queryKeys.payoutMethods(hostId ?? ""),
    queryFn: () => api.getPayoutMethods(hostId!),
    enabled: !!hostId,
    staleTime: 2 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function useEarnings(hostId: string | null) {
  return useQuery({
    queryKey: queryKeys.earnings(hostId ?? ""),
    queryFn: () => api.getEarnings(hostId!),
    enabled: !!hostId,
    staleTime: 60 * 1000,
    select: (res) => res.data,
  });
}

export function usePayoutHistory(
  hostId: string | null,
  pagination?: { limit?: number; offset?: number },
) {
  return useQuery({
    queryKey: queryKeys.payoutHistory(hostId ?? ""),
    queryFn: () => api.getPayoutHistory(hostId!, pagination),
    enabled: !!hostId,
    staleTime: 60 * 1000,
    select: (res) => res.data,
  });
}

export function useEventMessages(eventId: string | null) {
  return useQuery({
    queryKey: queryKeys.eventMessages(eventId ?? ""),
    queryFn: () => api.getEventMessages(eventId!),
    enabled: !!eventId,
    staleTime: 30 * 1000,
    select: (res) => res.data,
  });
}

export function useHostMessages(hostId: string | null) {
  return useQuery({
    queryKey: queryKeys.hostMessages(hostId ?? ""),
    queryFn: () => api.getHostMessages(hostId!),
    enabled: !!hostId,
    staleTime: 30 * 1000,
    select: (res) => res.data,
  });
}

export function useSupportTicket(ticketId: string | null) {
  return useQuery({
    queryKey: queryKeys.supportTicket(ticketId ?? ""),
    queryFn: () => api.getSupportTicket(ticketId!),
    enabled: !!ticketId,
    staleTime: 60 * 1000,
    select: (res) => res.data,
  });
}

export function useUserTickets(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.userTickets(userId ?? ""),
    queryFn: () => api.getUserTickets(userId!),
    enabled: !!userId,
    staleTime: 60 * 1000,
    select: (res) => res.data,
  });
}

/* ═══ Mutations ════════════════════════════════════════════════ */

export function useSignUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.signUp,
    onSuccess: (res) => {
      qc.setQueryData(queryKeys.myProfile(res.data.id), res);
    },
  });
}

export function useInitiateAadhar() {
  return useMutation({ mutationFn: api.initiateAadhar });
}

export function useCompleteAadhar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.completeAadhar,
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.myProfile(variables.user_id),
      });
    },
  });
}

export function useSendPhoneOTP() {
  return useMutation({
    mutationFn: (userId: string) => api.sendPhoneOTP(userId),
  });
}

export function useVerifyPhoneOTP() {
  return useMutation({
    mutationFn: ({ userId, otp }: { userId: string; otp: string }) =>
      api.verifyPhoneOTP(userId, otp),
  });
}

export function useSubmitHostApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.submitHostApplication,
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.applicationStatus(variables.user_id),
      });
    },
  });
}

export function useSaveHostDraft() {
  return useMutation({ mutationFn: api.saveHostDraft });
}

export function useApproveHostApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ hostId, idToken }: { hostId: string; idToken: string }) =>
      api.approveHostApplication(hostId, idToken),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.pendingHostApplications,
      });
    },
  });
}

export function useRejectHostApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      hostId,
      idToken,
      reason,
    }: {
      hostId: string;
      idToken: string;
      reason?: string;
    }) => api.rejectHostApplication(hostId, idToken, reason),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.pendingHostApplications,
      });
    },
  });
}

export function useAddPlatformPayoutMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      body,
      idToken,
    }: {
      body: api.PlatformAddPayoutMethodPayload;
      idToken: string;
    }) =>
      api.addPlatformPayoutMethod(body, idToken),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.platformPayoutMethods });
    },
  }) as UseMutationResult<
    api.Envelope<api.PayoutMethodDTO>,
    unknown,
    { body: api.PlatformAddPayoutMethodPayload; idToken: string }
  >;
}

export function useSetPlatformPrimaryPayoutMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      methodId,
      idToken,
    }: {
      methodId: string;
      idToken: string;
    }) =>
      api.setPlatformPrimaryPayoutMethod(methodId, idToken),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.platformPayoutMethods });
    },
  }) as UseMutationResult<
    api.Envelope<{ message: string }>,
    unknown,
    { methodId: string; idToken: string }
  >;
}

export function useDeletePlatformPayoutMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      methodId,
      idToken,
    }: {
      methodId: string;
      idToken: string;
    }) =>
      api.deletePlatformPayoutMethod(methodId, idToken),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.platformPayoutMethods });
    },
  }) as UseMutationResult<
    api.Envelope<{ message: string }>,
    unknown,
    { methodId: string; idToken: string }
  >;
}

export function useWithdrawPlatformFees() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      body,
      idToken,
    }: {
      body: { amount_cents: number; idempotency_key?: string };
      idToken: string;
    }) =>
      api.withdrawPlatformFees(body, idToken),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.platformBalance });
    },
  }) as UseMutationResult<
    api.Envelope<api.PaymentDTO>,
    unknown,
    {
      body: { amount_cents: number; idempotency_key?: string };
      idToken: string;
    }
  >;
}

export function useCreateBlog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      body,
      idToken,
    }: {
      body: api.BlogCreatePayload;
      idToken: string;
    }) => api.createBlog(body, idToken),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.blogs });
    },
  }) as UseMutationResult<
    api.Envelope<api.BlogDTO>,
    unknown,
    { body: api.BlogCreatePayload; idToken: string }
  >;
}

export function useUpdateBlog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      blogId,
      body,
      idToken,
    }: {
      blogId: string;
      body: api.BlogUpdatePayload;
      idToken: string;
    }) => api.updateBlog(blogId, body, idToken),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.blogs });
      void qc.invalidateQueries({ queryKey: queryKeys.blog(variables.blogId) });
    },
  }) as UseMutationResult<
    api.Envelope<api.BlogDTO>,
    unknown,
    { blogId: string; body: api.BlogUpdatePayload; idToken: string }
  >;
}

export function useDeleteBlog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ blogId, idToken }: { blogId: string; idToken: string }) =>
      api.deleteBlog(blogId, idToken),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.blogs });
      qc.removeQueries({ queryKey: queryKeys.blog(variables.blogId) });
    },
  }) as UseMutationResult<
    api.Envelope<{ message: string }>,
    unknown,
    { blogId: string; idToken: string }
  >;
}

export function usePublishBlog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ blogId, idToken }: { blogId: string; idToken: string }) =>
      api.publishBlog(blogId, idToken),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.blogs });
      void qc.invalidateQueries({ queryKey: queryKeys.blog(variables.blogId) });
    },
  }) as UseMutationResult<
    api.Envelope<api.BlogDTO>,
    unknown,
    { blogId: string; idToken: string }
  >;
}

export function useUnpublishBlog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ blogId, idToken }: { blogId: string; idToken: string }) =>
      api.unpublishBlog(blogId, idToken),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.blogs });
      void qc.invalidateQueries({ queryKey: queryKeys.blog(variables.blogId) });
    },
  }) as UseMutationResult<
    api.Envelope<api.BlogDTO>,
    unknown,
    { blogId: string; idToken: string }
  >;
}

export function useUpdateHostProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      hostId,
      body,
    }: {
      hostId: string;
      body: api.HostProfileUpdatePayload;
    }) => api.updateHostProfile(hostId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["myHost"] });
      void qc.invalidateQueries({ queryKey: ["hostDashboard"] });
    },
  });
}

export function useConnectSocialMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      platform,
      url,
    }: {
      userId: string;
      platform: "instagram" | "linkedin" | "website" | "youtube" | "twitter";
      url: string;
    }) => api.connectSocialMedia(userId, platform, url),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["myHost"] });
    },
  });
}

export function useDisconnectSocialMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      platform,
    }: {
      userId: string;
      platform: "instagram" | "linkedin" | "website" | "youtube" | "twitter";
    }) => api.disconnectSocialMedia(userId, platform),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["myHost"] });
    },
  });
}

export function useUploadFiles() {
  return useMutation({
    mutationFn: ({ files, folder }: api.UploadFilesPayload) =>
      api.uploadFiles(files, folder),
  });
}

export function useUploadBlogCover() {
  return useMutation({
    mutationFn: (file: File) => api.uploadBlogCover(file),
  });
}

/* ═══ Saved Experiences Mutations ═══════════════════════════════ */

export function useSaveExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveExperience,
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.savedExperiences(variables.user_id),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.isExperienceSaved(
          variables.event_id,
          variables.user_id,
        ),
      });
    },
  });
}

export function useUnsaveExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, userId }: { eventId: string; userId: string }) =>
      api.unsaveExperience(eventId, userId),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ["savedExperiences"] });
      void qc.invalidateQueries({
        queryKey: queryKeys.isExperienceSaved(
          variables.eventId,
          variables.userId,
        ),
      });
    },
  });
}

/* ═══ Event Mutations ══════════════════════════════════════════ */

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createEvent,
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.eventsByHost(variables.host_id),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.calendarEvents(variables.host_id),
      });
    },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      body,
    }: {
      eventId: string;
      body: api.EventUpdatePayload;
    }) => api.updateEvent(eventId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["eventsByHost"] });
      void qc.invalidateQueries({ queryKey: ["event"] });
    },
  });
}

export function usePublishEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, hostId }: { eventId: string; hostId: string }) =>
      api.publishEvent(eventId, hostId),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.eventsByHost(variables.hostId),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.calendarEvents(variables.hostId),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.event(variables.eventId),
      });
    },
  });
}

export function usePauseEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, hostId }: { eventId: string; hostId: string }) =>
      api.pauseEvent(eventId, hostId),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.eventsByHost(variables.hostId),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.calendarEvents(variables.hostId),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.event(variables.eventId),
      });
    },
  });
}

export function useResumeEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, hostId }: { eventId: string; hostId: string }) =>
      api.resumeEvent(eventId, hostId),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.eventsByHost(variables.hostId),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.calendarEvents(variables.hostId),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.event(variables.eventId),
      });
    },
  });
}

/* ═══ Booking Mutations ════════════════════════════════════════ */

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createBooking,
    onSuccess: (data, variables) => {
      console.log("[useCreateBooking] Booking created:", data.data);
      console.log(
        "[useCreateBooking] Invalidating queries for bookingsByUser:",
        variables.user_id,
      );
      void qc.invalidateQueries({
        queryKey: queryKeys.bookingsByUser(variables.user_id),
      });
      // Invalidate event queries since booking count changed
      console.log(
        "[useCreateBooking] Invalidating event query:",
        data.data.event_id,
      );
      void qc.invalidateQueries({
        queryKey: queryKeys.event(data.data.event_id),
      });
      // Invalidate all eventsByHost queries to refresh booking counts
      console.log("[useCreateBooking] Invalidating all eventsByHost queries");
      void qc.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "eventsByHost",
      });
      // Also refresh public events list
      console.log("[useCreateBooking] Invalidating listPublicEvents");
      void qc.invalidateQueries({
        queryKey: queryKeys.listPublicEvents,
      });
    },
  });
}

export function useConfirmBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => {
      console.log("[useConfirmBooking] Confirming booking:", bookingId);
      return api.confirmBooking(bookingId).then((res) => {
        console.log("[useConfirmBooking] Response:", res.data);
        return res;
      });
    },
    onSuccess: () => {
      console.log("[useConfirmBooking] Confirmed! Invalidating queries");
      void qc.invalidateQueries({ queryKey: ["bookingsByUser"] });
      // Refresh event queries since booking status changed
      void qc.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "eventsByHost",
      });
      void qc.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "event",
      });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      userId,
    }: {
      bookingId: string;
      userId: string;
    }) => api.cancelBooking(bookingId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["bookingsByUser"] });
      // Refresh event queries since booking status changed
      void qc.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "eventsByHost",
      });
      void qc.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "event",
      });
    },
  });
}

/* ═══ Payout Mutations ═════════════════════════════════════════ */

export function useAddPayoutMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addPayoutMethod,
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.payoutMethods(variables.host_id),
      });
    },
  });
}

export function useSetPrimaryPayoutMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ methodId, hostId }: { methodId: string; hostId: string }) =>
      api.setPrimaryPayoutMethod(methodId, hostId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["payoutMethods"] });
    },
  });
}

export function useDeletePayoutMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ methodId, hostId }: { methodId: string; hostId: string }) =>
      api.deletePayoutMethod(methodId, hostId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["payoutMethods"] });
    },
  });
}

export function useWithdraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.withdraw,
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.earnings(variables.host_id),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.payoutHistory(variables.host_id),
      });
    },
  });
}

/* ═══ Review Mutations ═════════════════════════════════════════ */

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createReview,
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.reviewsByEvent(variables.event_id),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.eventRating(variables.event_id),
      });
    },
  });
}

export function useAddReplyToReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      reviewId,
      reply,
      eventId: _eventId,
    }: {
      reviewId: string;
      reply: string;
      eventId: string;
    }) => api.addReplyToReview(reviewId, { reply }),
    onSuccess: (_data, variables) => {
      // Invalidate the specific event's reviews query with the eventId
      void qc.invalidateQueries({
        queryKey: queryKeys.reviewsByEvent(variables.eventId),
      });
    },
  });
}

/* ═══ Inbox Mutations ══════════════════════════════════════════ */

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.sendMessage,
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.eventMessages(variables.event_id),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.hostMessages(variables.sender_id ?? ""),
      });
    },
  });
}

export function useBroadcastMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.broadcastMessage,
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.eventMessages(variables.event_id),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.hostMessages(variables.host_id),
      });
    },
  });
}

export function useMarkMessageRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => api.markMessageRead(messageId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["eventMessages"] });
      void qc.invalidateQueries({ queryKey: ["hostMessages"] });
    },
  });
}

/* ═══ Support Mutations ════════════════════════════════════════ */

export function useCreateSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createSupportTicket,
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.userTickets(variables.user_id),
      });
    },
  });
}

export function useAddSupportMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticketId,
      message,
    }: {
      ticketId: string;
      message: string;
    }) => api.addSupportMessage(ticketId, message),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["supportTicket"] });
    },
  });
}

export function useResolveSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ticketId: string) => api.resolveSupportTicket(ticketId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["supportTicket"] });
      void qc.invalidateQueries({ queryKey: ["userTickets"] });
    },
  });
}

/* ═══ User Profile Mutation ════════════════════════════════════ */

export function useUpdateUserProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      body,
    }: {
      userId: string;
      body: api.UserProfileUpdatePayload;
    }) => api.updateUserProfile(userId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["myProfile"] });
    },
  });
}

/* ═══ Wallet Queries & Mutations ═══════════════════════════════ */

export const walletKeys = {
  balance: (userId: string) => ["walletBalance", userId] as const,
};

export function useWalletBalance(userId: string | null) {
  return useQuery({
    queryKey: walletKeys.balance(userId ?? ""),
    queryFn: () => api.getWalletBalance(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000,
    select: (res) => res.data,
  });
}

export function useCreateTopupOrder() {
  return useMutation({
    mutationFn: (payload: api.CreateTopupPayload) =>
      api.createTopupOrder(payload),
  });
}

export function useVerifyTopupPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: api.TopupVerifyPayload) =>
      api.verifyTopupPayment(payload),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: walletKeys.balance(variables.user_id),
      });
    },
  });
}
