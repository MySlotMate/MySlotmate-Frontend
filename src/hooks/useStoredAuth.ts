"use client";

import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "~/utils/firebase";
import {
  AUTH_STORAGE_EVENT,
  LOGGED_OUT_KEY,
  clearStoredAuth,
  getLoggedOutAt,
  getStoredHostId,
  getStoredUserId,
  setStoredUserId,
} from "~/lib/auth-storage";
import { isSigningOut, mayRestore, signOutEverywhere } from "~/lib/signOut";

type StoredAuthState = {
  hostId: string | null;
  userId: string | null;
};

/**
 * A user id that turns up after a log-out, while this tab's Firebase has no
 * user, was written by a stale tab. Treat it as logged out instead of
 * flipping the page to the signed-in view (a real login clears the
 * logged-out note, so this never hides a genuine sign-in).
 */
const readStoredAuth = (): StoredAuthState => {
  const userId = getStoredUserId();
  const stale =
    !!userId &&
    getLoggedOutAt() !== null &&
    typeof window !== "undefined" &&
    !(auth.currentUser && mayRestore(auth.currentUser));
  return stale
    ? { hostId: null, userId: null }
    : { hostId: getStoredHostId(), userId };
};

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
      // A Firebase session from before the latest log-out (kept alive by a
      // stale tab) is a zombie: end it here instead of restoring the login.
      if (fbUser && !isSigningOut() && !mayRestore(fbUser)) {
        void signOut(auth);
        return;
      }
      if (!fbUser || getStoredUserId() || healing) return;
      healing = true;
      // eslint-disable-next-line no-restricted-syntax -- reviewed: public endpoint, same lookup the login popup does
      const url = `${process.env.NEXT_PUBLIC_API_URL}/users/by-firebase/${fbUser.uid}`;
      void fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((res: { data?: { id?: string } } | null) => {
          const id = res?.data?.id;
          if (
            id &&
            !getStoredUserId() &&
            auth.currentUser &&
            mayRestore(auth.currentUser)
          )
            setStoredUserId(id);
        })
        .catch(() => {
          /* offline / no account yet — the login popup path still works */
        })
        .finally(() => {
          healing = false;
        });
    });

    // Another tab logged out: log this tab out too, so the two never fight
    // over the stored id. Only if this tab still thinks it's signed in, so
    // the tab that logged out doesn't react to its own note.
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === LOGGED_OUT_KEY &&
        e.newValue &&
        !isSigningOut() &&
        (getStoredUserId() ?? auth.currentUser)
      ) {
        void signOutEverywhere({ broadcast: false });
        return;
      }
      syncAuthState();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(AUTH_STORAGE_EVENT, syncAuthState as EventListener);

    return () => {
      unsubscribe();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        AUTH_STORAGE_EVENT,
        syncAuthState as EventListener,
      );
    };
  }, []);

  return authState;
}
