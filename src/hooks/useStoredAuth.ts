"use client";

import { useEffect, useState } from "react";
import { auth } from "~/utils/firebase";
import {
  AUTH_STORAGE_EVENT,
  clearStoredAuth,
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

    // A stored user id with no Firebase session and no stored token can't make
    // authed calls (browser dropped IndexedDB but kept localStorage). Treat as
    // logged out so the login prompt shows once, instead of failing silently.
    void auth.authStateReady().then(() => {
      if (
        getStoredUserId() &&
        !auth.currentUser &&
        !localStorage.getItem("msm_auth_token")
      ) {
        clearStoredAuth();
      }
    });

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
