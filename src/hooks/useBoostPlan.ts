"use client";

/**
 * Data hooks for the paid-budget Boost and Premium (src/lib/boostPlan.ts).
 * Every write refreshes the Boost, the host's Boost list and the Boost's
 * creatives, results, reports and documents.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import {
  BOOST_PLAN_ENABLED,
  BOOST_PLAN_MOCK,
  boostPlanApi as api,
  type CreativePayload,
  type FeeLine,
  type PlanRequestPayload,
  type TopUpPayload,
} from "~/lib/boostPlan";

/** The stand-in needs no sign-in, so screens can be tried without one. */
const tok = (t: string | null): string | null =>
  t ?? (BOOST_PLAN_MOCK ? "mock" : null);

const KEYS = [
  "boostPlan",
  "premium",
  "planBoosts",
  "planCreatives",
  "planResults",
  "planReports",
  "planDocs",
];

function useWrite<V, R>(
  idToken: string | null,
  fn: (vars: V, token: string) => Promise<R>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: V) => {
      if (!idToken) throw new Error("Sign in again to continue.");
      return fn(vars, idToken);
    },
    onSuccess: () => {
      for (const k of KEYS) void qc.invalidateQueries({ queryKey: [k] });
      // The older Boost hooks show the same Boost elsewhere.
      void qc.invalidateQueries({ queryKey: ["eventBoost"] });
      void qc.invalidateQueries({ queryKey: ["hostBoosts"] });
    },
  });
}

const read = <T>(key: QueryKey, enabled: boolean, fn: () => Promise<T>) => ({
  queryKey: key,
  enabled: BOOST_PLAN_ENABLED && enabled,
  queryFn: fn,
});

export const usePremium = (t0: string | null, t = tok(t0)) =>
  useQuery(read(["premium", t], !!t, () => api.getPremium(t!)));

export const usePlanBoost = (
  eventId: string | null,
  t0: string | null,
  t = tok(t0),
) =>
  useQuery(
    read(["boostPlan", eventId, t], !!eventId && !!t, () =>
      api.getEventBoost(eventId!, t!),
    ),
  );

export const usePlanBoosts = (t0: string | null, t = tok(t0)) =>
  useQuery(read(["planBoosts", t], !!t, () => api.getHostBoosts(t!)));

export const usePlanResults = (
  boostId: string | null,
  t0: string | null,
  t = tok(t0),
) =>
  useQuery(
    read(["planResults", boostId, t], !!boostId && !!t, () =>
      api.results(boostId!, t!),
    ),
  );

export const usePlanCreatives = (
  boostId: string | null,
  t0: string | null,
  t = tok(t0),
) =>
  useQuery(
    read(["planCreatives", boostId, t], !!boostId && !!t, () =>
      api.creatives(boostId!, t!),
    ),
  );

export const usePlanReports = (
  boostId: string | null,
  t0: string | null,
  t = tok(t0),
) =>
  useQuery(
    read(["planReports", boostId, t], !!boostId && !!t, () =>
      api.reports(boostId!, t!),
    ),
  );

export const usePlanDocuments = (
  boostId: string | null,
  t0: string | null,
  t = tok(t0),
) =>
  useQuery(
    read(["planDocs", boostId, t], !!boostId && !!t, () =>
      api.documents(boostId!, t!),
    ),
  );

export const useApplyPremium = (t0: string | null, t = tok(t0)) =>
  useWrite(t, (note: string, tok) => api.applyPremium(note, tok));

export const useRequestPlanBoost = (t0: string | null, t = tok(t0)) =>
  useWrite(
    t,
    (v: { eventId: string; body: PlanRequestPayload; rates: FeeLine[] }, tok) =>
      api.request(v.eventId, v.body, tok, v.rates),
  );

export const useAcceptPlanBoost = (t0: string | null, t = tok(t0)) =>
  useWrite(t, (boostId: string, tok) => api.accept(boostId, tok));

export const useStopPlanBoost = (t0: string | null, t = tok(t0)) =>
  useWrite(t, (boostId: string, tok) => api.stop(boostId, tok));

export const useCreatePlanPayment = (t0: string | null, t = tok(t0)) =>
  useWrite(
    t,
    (v: { boostId: string; body: { kind: "budget" } | TopUpPayload }, tok) =>
      api.createPayment(v.boostId, v.body, tok),
  );

export const useVerifyPlanPayment = (t0: string | null, t = tok(t0)) =>
  useWrite(
    t,
    (
      v: {
        boostId: string;
        paymentId: string;
        razorpay: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        };
      },
      tok,
    ) => api.verifyPayment(v.boostId, v.paymentId, v.razorpay, tok),
  );

export const useSaveCreative = (t0: string | null, t = tok(t0)) =>
  useWrite(
    t,
    async (
      v: {
        boostId: string;
        files: File[];
        body: Omit<CreativePayload, "file_keys">;
      },
      tok,
    ) => {
      const stored = [];
      for (const f of v.files)
        stored.push(await api.uploadCreativeFile(v.boostId, f, tok));
      return api.saveCreative(
        v.boostId,
        { ...v.body, file_keys: stored.map((s) => s.key) },
        tok,
      );
    },
  );

export const useApproveCreative = (t0: string | null, t = tok(t0)) =>
  useWrite(t, (v: { boostId: string; id: string }, tok) =>
    api.approveCreative(v.boostId, v.id, tok),
  );

export const useRequestCreativeChanges = (t0: string | null, t = tok(t0)) =>
  useWrite(t, (v: { boostId: string; id: string; note: string }, tok) =>
    api.requestCreativeChanges(v.boostId, v.id, v.note, tok),
  );

export const useDeleteCreative = (t0: string | null, t = tok(t0)) =>
  useWrite(t, (v: { boostId: string; id: string }, tok) =>
    api.deleteCreative(v.boostId, v.id, tok),
  );

/** Refreshes everything after a dev-controls step on the stand-in. */
export function useRefreshPlan() {
  const qc = useQueryClient();
  return () => {
    for (const k of KEYS) void qc.invalidateQueries({ queryKey: [k] });
  };
}
