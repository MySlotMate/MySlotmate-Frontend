"use client";

import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";

/**
 * The caller's Firebase ID token, for endpoints behind `auth.RequireUser`
 * (/passes/*, /payouts/*). Falls back to the stored token used by the
 * phone-login flow, which never has a Firebase user.
 *
 * Null while it is still being fetched, or when nobody is signed in.
 */
export function useIdToken(): string | null {
  const [authUser] = useAuthState(auth);
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    if (authUser) {
      void authUser.getIdToken().then(setIdToken);
    } else {
      setIdToken(localStorage.getItem("msm_auth_token"));
    }
  }, [authUser]);

  return idToken;
}
