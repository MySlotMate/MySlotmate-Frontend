"use client";

import { signOut } from "firebase/auth";
import { auth } from "~/utils/firebase";
import {
  LOGGED_OUT_KEY,
  clearStoredAuth,
  getLoggedOutAt,
} from "~/lib/auth-storage";

/**
 * True from the moment a log-out starts until the page reloads. While it's
 * set, nothing may restore the stored user id from the Firebase session.
 */
let signingOut = false;
export const isSigningOut = () => signingOut;

/**
 * May this Firebase session be turned back into an app login? Not if someone
 * logged out (in any tab) after it signed in: that session is stale and is
 * on its way out.
 */
export function mayRestore(fbUser: { metadata: { lastSignInTime?: string } }) {
  if (isSigningOut()) return false;
  const outAt = getLoggedOutAt();
  if (!outAt) return true;
  const signedInAt = Date.parse(fbUser.metadata.lastSignInTime ?? "");
  return Number.isFinite(signedInAt) && signedInAt > outAt;
}


/**
 * The one way to log out.
 *
 * Order matters. Firebase is signed out FIRST, and only then is the stored
 * user id cleared. Clearing first left a window where Firebase still had a
 * user but the app had no id, so `useStoredAuth`'s self-repair put the id
 * straight back and the home page flipped between signed-in and signed-out.
 *
 * By default it then hard-loads the signed-out home page, which also drops
 * every cached query and every bit of signed-in state in memory.
 */
export async function signOutEverywhere({
  redirect = true,
  broadcast = true,
}: { redirect?: boolean; broadcast?: boolean } = {}) {
  signingOut = true;
  // Tell every other open tab first, before any of them can restore the id.
  if (broadcast) {
    try {
      localStorage.setItem(LOGGED_OUT_KEY, String(Date.now()));
    } catch {
      /* storage blocked */
    }
  }
  try {
    await signOut(auth);
  } catch {
    // Already signed out of Firebase, or offline: still clear our side.
  }
  clearStoredAuth();
  try {
    localStorage.removeItem("msm_location");
    localStorage.removeItem("msm_geo_asked");
  } catch {
    /* storage blocked */
  }
  if (redirect) {
    window.location.replace("/");
    return;
  }
  signingOut = false;
}
