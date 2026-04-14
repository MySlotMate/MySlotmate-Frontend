"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApplicationStatus } from "~/hooks/useApi";
import { setStoredHostId } from "~/lib/auth-storage";
import { useStoredAuth } from "./useStoredAuth";

export function useListTimeAction() {
  const router = useRouter();
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
    if (hostStatus === "approved") {
      router.push("/host-dashboard");
      return;
    }

    setShowBecomeHost(true);
  };

  return {
    closeBecomeHostModal: () => setShowBecomeHost(false),
    handleListTimeClick,
    hostStatus,
    showBecomeHostModal: showBecomeHost,
  };
}
