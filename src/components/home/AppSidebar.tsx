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
  if (path === "/notifications") return <HomeSidebar active="notifications" />;
  if (path === "/become-host") return <HomeSidebar active="profile" />;
  if (/^\/host\/[^/]+$/.test(path)) return <HomeSidebar active="explore" />;
  if (/^\/experience\/[^/]+\/confirmation$/.test(path))
    return <HomeSidebar active="explore" />;
  // Event pages are public: visitors get the website header instead.
  if (/^\/experience\/[^/]+(\/tickets)?$/.test(path))
    return mounted && userId ? (
      <HomeSidebar active="explore" tabBar={false} />
    ) : null;
  // Public website pages (About, Stories, Host with us): signed-in people
  // keep the app's navigation instead of seeing a "Log in" bar.
  if (path === "/about" || path === "/host-with-us")
    return mounted && userId ? <HomeSidebar active="profile" /> : null;
  if (path === "/blogs" || path.startsWith("/blogs/"))
    return mounted && userId ? <HomeSidebar active="explore" /> : null;
  // Booking has its own bottom action bar on mobile.
  if (/^\/experience\/[^/]+\/book$/.test(path))
    return <HomeSidebar active="explore" tabBar={false} />;
  return null;
}
