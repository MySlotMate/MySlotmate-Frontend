"use client";

import { useEffect, useState } from "react";
import {
  AUTH_STORAGE_EVENT,
  getStoredHostId,
  getStoredUserId,
} from "~/lib/auth-storage";

type StoredAuthState = {
  hostId: string | null;
  userId: string | null;
};

const readStoredAuth = (): StoredAuthState => ({
  hostId: getStoredHostId(),
  userId: getStoredUserId(),
});

export function useStoredAuth() {
  const [authState, setAuthState] = useState<StoredAuthState>(readStoredAuth);

  useEffect(() => {
    const syncAuthState = () => {
      setAuthState(readStoredAuth());
    };

    syncAuthState();

    window.addEventListener("storage", syncAuthState);
    window.addEventListener(AUTH_STORAGE_EVENT, syncAuthState as EventListener);

    return () => {
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener(
        AUTH_STORAGE_EVENT,
        syncAuthState as EventListener,
      );
    };
  }, []);

  return authState;
}
