"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * A back button plus "Home › Explore › Event" for inner pages, built from the
 * address so every page gets one with a single line. Phones show just the
 * back button and the last two steps; desktop shows the whole trail.
 */

const LABELS: Record<string, string> = {
  explore: "Explore",
  activities: "My journey",
  profile: "Profile",
  notifications: "Notifications",
  "saved-experiences": "Saved",
  wallet: "Wallet",
  hosts: "Hosts",
  experiences: "Experiences",
  blogs: "Stories",
  about: "About",
  support: "Help centre",
  policies: "Privacy policy",
  "terms-conditions": "Terms & conditions",
  report: "Report a safety concern",
  technical: "Report a problem",
  "host-with-us": "Host with us",
  privacy: "Privacy",
  "delete-account": "Delete account",
  "become-host": "Become a host",
  book: "Book",
  confirmation: "Booking confirmed",
  tickets: "Tickets",
};

/** Dynamic pages and the list page they belong under. */
const PARENTS: Record<string, { label: string; href: string }> = {
  experience: { label: "Explore", href: "/explore" },
  host: { label: "Hosts", href: "/hosts" },
};

interface Crumb {
  label: string;
  href: string;
  /** A slug we prettified; replaced by the page title when it's the last. */
  dynamic?: boolean;
}

const prettify = (slug: string) =>
  decodeURIComponent(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

function trailFor(path: string): Crumb[] {
  const segs = path.split("/").filter(Boolean);
  const crumbs: Crumb[] = [{ label: "Home", href: "/" }];
  let href = "";
  segs.forEach((seg, i) => {
    href += `/${seg}`;
    const parent = i === 0 ? PARENTS[seg] : undefined;
    if (parent) {
      crumbs.push(parent);
      return;
    }
    const prev = segs[i - 1];
    if (i === 1 && prev && PARENTS[prev]) {
      crumbs.push({ label: prettify(seg), href, dynamic: true });
      return;
    }
    crumbs.push({ label: LABELS[seg] ?? prettify(seg), href });
  });
  return crumbs;
}

/** "Dank Curry — Host in Guwahati | MySlotMate" → "Dank Curry". */
function titleLabel() {
  const t = document.title
    .split(" | ")[0]
    ?.split(/ [—–-] /)[0]
    ?.trim();
  return t && t !== "MySlotMate" ? t : null;
}

export default function Breadcrumbs({
  current,
  className = "",
}: {
  /** Name for the last step when the address alone can't tell (e.g. a title). */
  current?: string | null;
  className?: string;
}) {
  const path = usePathname() ?? "/";
  const [pageTitle, setPageTitle] = useState<string | null>(null);

  // Follow the page title, which loads after the data does.
  useEffect(() => {
    const read = () => setPageTitle(titleLabel());
    read();
    const el = document.querySelector("title");
    if (!el) return;
    const obs = new MutationObserver(read);
    obs.observe(el, { childList: true, characterData: true, subtree: true });
    return () => obs.disconnect();
  }, [path]);

  const crumbs = trailFor(path);
  const last = crumbs[crumbs.length - 1];
  if (last && (current ?? (last.dynamic ? pageTitle : null)))
    last.label = (current ?? pageTitle)!;
  return <BreadcrumbTrail crumbs={crumbs} className={className} />;
}

/**
 * The trail itself, for pages that pass their own steps. The last step is
 * the current page; the one before it is where Back goes if there's no
 * history (e.g. opened from a shared link).
 */
export function BreadcrumbTrail({
  crumbs,
  className = "",
}: {
  crumbs: { label: string; href?: string }[];
  className?: string;
}) {
  const router = useRouter();
  if (crumbs.length < 2) return null;
  const parentHref =
    [...crumbs.slice(0, -1)].reverse().find((c) => c.href)?.href ?? "/";
  const parentLabel = crumbs[crumbs.length - 2]!.label;

  const back = () => {
    // Came from another page on the site: go back there; otherwise go up.
    if (window.history.length > 1) router.back();
    else router.push(parentHref);
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className={`mb-4 flex min-w-0 items-center gap-2.5 font-[family-name:var(--font-inter)] text-[13px] md:mb-5 ${className}`}
    >
      <button
        type="button"
        onClick={back}
        aria-label={`Back to ${parentLabel}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <ol className="flex min-w-0 items-center gap-1.5 text-white/45">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          // Phones keep the parent and the current page only.
          const hideOnPhone = i < crumbs.length - 2 ? "hidden sm:flex" : "flex";
          return (
            <Fragment key={`${c.label}-${i}`}>
              {i > 0 && (
                <li
                  aria-hidden
                  className={`${i <= crumbs.length - 2 ? "hidden sm:flex" : "flex"} shrink-0 items-center`}
                >
                  <ChevronRight className="h-3.5 w-3.5 text-white/25" />
                </li>
              )}
              <li
                className={`${hideOnPhone} min-w-0 items-center ${isLast ? "" : "shrink-0"}`}
              >
                {isLast || !c.href ? (
                  <span
                    aria-current={isLast ? "page" : undefined}
                    className={
                      isLast
                        ? "truncate font-medium text-white/85"
                        : "whitespace-nowrap"
                    }
                  >
                    {c.label}
                  </span>
                ) : (
                  <Link
                    href={c.href}
                    className="whitespace-nowrap transition hover:text-white"
                  >
                    {c.label}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
