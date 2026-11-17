"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApplicationStatus } from "~/hooks/useApi";
import { setStoredHostId } from "~/lib/auth-storage";
import { useStoredAuth } from "./useStoredAuth";

export function useListTimeAction() {
  const router = useRouter();
  // Kept so callers that still render <BecomeHostModal> compile; the click
  // no longer opens it.
  const [showBecomeHost, setShowBecomeHost] = useState(false);
  const { userId } = useStoredAuth();

  const validUserId = userId && userId !== "existing" ? userId : null;
  const { data: hostData } = useApplicationStatus(validUserId);
  const hostStatus = hostData?.status?.application_status ?? null;

  useEffect(() => {
    if (hostData?.status?.id) {
      setStoredHostId(hostData.status.id);
    }
  }, [hostData?.status?.id]);

  const handleListTimeClick = () => {
    // Everyone goes straight to creating an event. The create page asks for
    // sign-in only when they publish or save a draft.
    router.push("/host-dashboard/experiences/new");
  };

  return {
    closeBecomeHostModal: () => setShowBecomeHost(false),
    handleListTimeClick,
    hostStatus,
    showBecomeHostModal: showBecomeHost,
  };
}
