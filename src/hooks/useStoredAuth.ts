"use client";

import { useEffect, useState } from "react";
import { auth } from "~/utils/firebase";
import {
  AUTH_STORAGE_EVENT,
  clearStoredAuth,
  getStoredHostId,
  getStoredUserId,
  setStoredUserId,
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

    // The reverse of the case above: a Firebase session exists (e.g. kept from
    // an earlier visit) but the app user id was never stored, because only the
    // login popup stores it. Look the account up by Firebase UID and store it,
    // otherwise the navbar shows "logged in" while every page lacks a user id.
    let healing = false;
    const unsubscribe = auth.onAuthStateChanged((fbUser) => {
      if (!fbUser || getStoredUserId() || healing) return;
      healing = true;
      // eslint-disable-next-line no-restricted-syntax -- reviewed: public endpoint, same lookup the login popup does
      const url = `${process.env.NEXT_PUBLIC_API_URL}/users/by-firebase/${fbUser.uid}`;
      void fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((res: { data?: { id?: string } } | null) => {
          const id = res?.data?.id;
          if (id && !getStoredUserId()) setStoredUserId(id);
        })
        .catch(() => {
          /* offline / no account yet — the login popup path still works */
        })
        .finally(() => {
          healing = false;
        });
    });

    window.addEventListener("storage", syncAuthState);
    window.addEventListener(AUTH_STORAGE_EVENT, syncAuthState as EventListener);

    return () => {
      unsubscribe();
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener(
        AUTH_STORAGE_EVENT,
        syncAuthState as EventListener,
      );
    };
  }, []);

  return authState;
}
