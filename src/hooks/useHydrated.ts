"use client";

import { useEffect, useState } from "react";

/** Becomes true once the app has hydrated, and stays true for the session. */
let hydrated = false;

/**
 * False only during the very first render after a full page load, so that
 * render matches the server's HTML. After that (every in-app navigation),
 * it's true from the first render.
 *
 * Use it instead of a per-component `mounted` flag when the decision depends
 * on localStorage (e.g. signed in or not): a per-component flag starts false
 * on every mount, so a signed-in user briefly sees the signed-out version on
 * each client-side navigation.
 */
export function useHydrated() {
  const [isHydrated, setIsHydrated] = useState(hydrated);
  useEffect(() => {
    hydrated = true;
    setIsHydrated(true);
  }, []);
  return isHydrated;
}
