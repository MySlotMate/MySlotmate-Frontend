"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import HomeSidebar from "./HomeSidebar";

/**
 * Mounted once in the root layout, so the rail stays put (no remount, no
 * flash) while the user moves between pages. Shows only on the dark,
 * redesigned routes; everything else keeps its own navbar.
 */
export default function AppSidebar() {
  const path = usePathname() ?? "";
  const { userId } = useStoredAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Logged-out visitors get the public website at "/", which has its own nav.
  if (path === "/")
    return mounted && userId ? <HomeSidebar active="home" /> : null;
  if (path === "/explore") return <HomeSidebar active="explore" />;
  if (path === "/activities") return <HomeSidebar active="journey" />;
  if (path === "/profile") return <HomeSidebar active="profile" />;
  if (
    path === "/host-dashboard/experiences" ||
    path === "/host-dashboard/experiences/new"
  )
    return <HomeSidebar active="profile" />;
  if (path === "/become-host") return <HomeSidebar active="profile" />;
  if (/^\/host\/[^/]+$/.test(path)) return <HomeSidebar active="explore" />;
  if (/^\/experience\/[^/]+\/confirmation$/.test(path))
    return <HomeSidebar active="explore" />;
  // Detail + booking pages have their own bottom action bar on mobile.
  if (/^\/experience\/[^/]+(\/book)?$/.test(path))
    return <HomeSidebar active="explore" tabBar={false} />;
  return null;
}
