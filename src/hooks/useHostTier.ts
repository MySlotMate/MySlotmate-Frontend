"use client";

import { useEffect, useState } from "react";
import { useApplicationStatus } from "~/hooks/useApi";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { tierFor, type HostTier } from "~/lib/hostTier";

/** The signed-in user's host tier (guest / free / verified). */
export function useHostTier(): {
  tier: HostTier;
  isVerified: boolean;
  applicationStatus: string | null;
  isLoading: boolean;
} {
  const { userId } = useStoredAuth();
  // Auth lives in localStorage: report "loading" until mounted so the server
  // render and the first client render agree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const uid = userId && userId !== "existing" ? userId : null;
  const { data, isLoading } = useApplicationStatus(uid);
  const applicationStatus = data?.status?.application_status ?? null;
  const tier = tierFor(Boolean(uid), applicationStatus);
  return {
    tier,
    isVerified: tier === "verified",
    applicationStatus,
    isLoading: !mounted || (Boolean(uid) && isLoading),
  };
}
