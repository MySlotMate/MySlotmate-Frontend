"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "~/utils/firebase";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { getLoggedOutAt, getStoredUserId } from "~/lib/auth-storage";
import { mayRestore } from "~/lib/signOut";

/**
 * Pages that only make sense signed in. A signed-out visitor who lands on
 * one (after logging out, or from a bookmark) goes to the public home page.
 * Event pages, host profiles, Explore and the website pages stay public so
 * they can be shared and found in search.
 */
const PRIVATE = [
  /^\/activities(\/|$)/,
  /^\/profile(\/|$)/,
  /^\/notifications(\/|$)/,
  /^\/saved-experiences(\/|$)/,
  /^\/wallet(\/|$)/,
  /^\/host-dashboard(\/|$)/,
];

export default function AuthGate() {
  const path = usePathname() ?? "";
  const router = useRouter();
  const { userId } = useStoredAuth();
  const isPrivate = PRIVATE.some((re) => re.test(path));

  useEffect(() => {
    if (!isPrivate || userId) return;
    let cancelled = false;
    // Wait for Firebase to settle: a live Firebase session with no stored id
    // is being repaired by useStoredAuth, so don't bounce that user.
    void auth.authStateReady().then(() => {
      if (cancelled) return;
      // A live Firebase session counts unless it predates the latest log-out.
      if (auth.currentUser && mayRestore(auth.currentUser)) return;
      // A stored id counts only if nobody has logged out since: an id that
      // reappears after a log-out was written by a stale tab.
      if (getStoredUserId() && getLoggedOutAt() === null) return;
      router.replace("/");
    });
    return () => {
      cancelled = true;
    };
  }, [isPrivate, userId, router]);

  return null;
}
