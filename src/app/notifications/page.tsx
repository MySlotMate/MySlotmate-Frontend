"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BellOff,
  CalendarClock,
  ChevronRight,
  LifeBuoy,
  Megaphone,
  Ticket,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import GoogleLogin from "~/components/GoogleLogin";
import {
  useNotifications,
  type AppNotification,
  type NotificationKind,
} from "~/hooks/useNotifications";
import { formatIST } from "~/lib/datetime";

const KIND: Record<
  NotificationKind,
  { icon: LucideIcon; tone: string; label: string }
> = {
  booking: {
    icon: Ticket,
    tone: "bg-[#A020F0]/20 text-[#D8B4FE]",
    label: "Bookings",
  },
  reminder: {
    icon: CalendarClock,
    tone: "bg-amber-500/15 text-amber-300",
    label: "Bookings",
  },
  payment: {
    icon: Wallet,
    tone: "bg-emerald-500/15 text-emerald-300",
    label: "Payments",
  },
  host: {
    icon: Megaphone,
    tone: "bg-sky-500/15 text-sky-300",
    label: "Hosting",
  },
  support: {
    icon: LifeBuoy,
    tone: "bg-rose-500/15 text-rose-300",
    label: "Support",
  },
};

type Filter = "all" | "Bookings" | "Payments" | "Hosting" | "Support";

function ago(iso: string) {
  const diff = Date.now() - Date.parse(iso);
  if (diff < 0) return formatIST(iso, "d MMM");
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return formatIST(iso, "d MMM");
}

function groupOf(iso: string) {
  const key = formatIST(iso, "yyyy-MM-dd");
  const today = formatIST(new Date(), "yyyy-MM-dd");
  const yesterday = formatIST(new Date(Date.now() - 864e5), "yyyy-MM-dd");
  if (key >= today) return "Today";
  if (key === yesterday) return "Yesterday";
  if (Date.now() - Date.parse(iso) < 7 * 864e5) return "This week";
  return "Earlier";
}

function Row({ n, unread }: { n: AppNotification; unread: boolean }) {
  const k = KIND[n.kind];
  return (
    <Link
      href={n.href}
      className={`group flex items-start gap-3.5 rounded-2xl px-3 py-3.5 transition hover:bg-white/[0.04] sm:px-4 ${unread ? "bg-[#A020F0]/[0.06]" : ""}`}
    >
      <span className="relative shrink-0">
        {n.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={n.image}
            alt=""
            loading="lazy"
            className="h-12 w-12 rounded-2xl object-cover"
          />
        ) : (
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${k.tone}`}
          >
            <k.icon className="h-5 w-5" />
          </span>
        )}
        {n.image && (
          <span
            className={`absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#080914] bg-[#1B1D33] ${k.tone.split(" ")[1]}`}
          >
            <k.icon className="h-3 w-3" />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span
            className={`truncate text-[15px] ${unread ? "font-semibold text-white" : "font-medium text-white/85"}`}
          >
            {n.title}
          </span>
          <span className="shrink-0 text-xs text-white/40">{ago(n.at)}</span>
        </span>
        <span className="mt-0.5 line-clamp-2 block text-sm leading-5 text-white/55">
          {n.body}
        </span>
      </span>
      {unread ? (
        <span
          aria-label="Unread"
          className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#A020F0]"
        />
      ) : (
        <ChevronRight className="mt-1.5 h-4 w-4 shrink-0 text-white/25 transition group-hover:text-white/60" />
      )}
    </Link>
  );
}

/** A reminder for something coming up in the next two days. */
function ReminderCard({ n }: { n: AppNotification }) {
  return (
    <Link
      href={n.href}
      className="group relative flex items-center gap-4 overflow-hidden rounded-3xl border border-amber-400/20 bg-[#1B1D33] p-4 sm:p-5"
    >
      {n.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={n.image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-125 object-cover opacity-25 blur-2xl"
        />
      )}
      <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-amber-500/15 text-amber-300">
        {n.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={n.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <CalendarClock className="h-6 w-6" />
        )}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="text-xs font-semibold tracking-[0.12em] text-amber-300 uppercase">
          {n.title}
        </span>
        <span className="mt-1 line-clamp-2 block text-[15px] font-medium text-white">
          {n.body}
        </span>
      </span>
      <span className="relative hidden h-10 shrink-0 items-center rounded-full bg-white px-4 text-sm font-semibold text-[#080914] transition group-hover:bg-white/90 sm:flex">
        View ticket
      </span>
    </Link>
  );
}

export default function NotificationsPage() {
  const { items, isUnread, markAllRead, unreadCount, isLoading, signedIn } =
    useNotifications();
  const [filter, setFilter] = useState<Filter>("all");
  const [login, setLogin] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Keep what was unread on arrival highlighted while clearing the badge.
  const [unreadIds, setUnreadIds] = useState<Set<string> | null>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (unreadIds || isLoading || items.length === 0) return;
    setUnreadIds(new Set(items.filter(isUnread).map((n) => n.id)));
    markAllRead();
  }, [items, isUnread, isLoading, markAllRead, unreadIds]);
  const wasUnread = (n: AppNotification) =>
    unreadIds ? unreadIds.has(n.id) : isUnread(n);

  const reminders = items.filter((n) => n.pinned);
  const feed = items.filter(
    (n) => !n.pinned && (filter === "all" || KIND[n.kind].label === filter),
  );
  const filters = useMemo(() => {
    const present = new Set(items.map((n) => KIND[n.kind].label));
    return (["Bookings", "Payments", "Hosting", "Support"] as const).filter(
      (f) => present.has(f),
    );
  }, [items]);

  const groups = useMemo(() => {
    const order = ["Today", "Yesterday", "This week", "Earlier"];
    const map = new Map<string, AppNotification[]>();
    for (const n of feed) {
      const g = groupOf(n.at);
      map.set(g, [...(map.get(g) ?? []), n]);
    }
    return order
      .filter((g) => map.has(g))
      .map((g) => [g, map.get(g)!] as const);
  }, [feed]);

  return (
    <main className="min-h-screen bg-[#080914] font-[family-name:var(--font-inter)] text-white max-md:pb-28">
      <div className="mx-auto w-full max-w-[760px] px-5 pt-5 pb-16 md:px-6 md:pt-10">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to home"
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10 md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-outfit flex-1 text-[28px] leading-tight font-semibold tracking-[-0.01em] md:text-[36px]">
            Notifications
          </h1>
          {mounted && signedIn && unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="shrink-0 text-sm font-semibold text-[#D8B4FE] transition hover:text-white"
            >
              Mark all as read
            </button>
          )}
        </div>

        {!mounted || isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex animate-pulse items-center gap-3.5 px-3 py-3.5"
              >
                <div className="h-12 w-12 rounded-2xl bg-white/[0.06]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 rounded bg-white/[0.06]" />
                  <div className="h-3 w-3/4 rounded bg-white/[0.04]" />
                </div>
              </div>
            ))}
          </div>
        ) : !signedIn ? (
          <div className="flex flex-col items-center rounded-3xl border border-white/[0.08] bg-[#121426] px-6 py-14 text-center">
            <BellOff className="h-10 w-10 text-[#D8B4FE]" />
            <p className="font-outfit mt-4 text-xl font-semibold">
              Sign in to see your updates
            </p>
            <p className="mt-1 text-sm text-white/55">
              Bookings, reminders and payments all land here.
            </p>
            <button
              type="button"
              onClick={() => setLogin(true)}
              className="mt-6 h-11 rounded-full bg-white px-6 text-sm font-semibold text-[#080914]"
            >
              Log in
            </button>
          </div>
        ) : (
          <>
            {reminders.length > 0 && (
              <div className="mb-6 space-y-3">
                {reminders.map((n) => (
                  <ReminderCard key={n.id} n={n} />
                ))}
              </div>
            )}

            {filters.length > 1 && (
              <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:px-0">
                {(["all", ...filters] as Filter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    aria-pressed={filter === f}
                    className={`h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition ${
                      filter === f
                        ? "bg-white text-[#080914]"
                        : "border border-white/10 bg-white/[0.04] text-white/70 hover:text-white"
                    }`}
                  >
                    {f === "all" ? "All" : f}
                  </button>
                ))}
              </div>
            )}

            {groups.length === 0 ? (
              <div className="flex flex-col items-center rounded-3xl border border-dashed border-white/10 px-6 py-14 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#A020F0]/15">
                  <BellOff className="h-7 w-7 text-[#D8B4FE]" />
                </span>
                <p className="font-outfit mt-4 text-xl font-semibold">
                  You&apos;re all caught up
                </p>
                <p className="mt-1 text-sm text-white/55">
                  Book something fun and your updates will show up here.
                </p>
                <Link
                  href="/explore"
                  className="mt-6 flex h-11 items-center rounded-full bg-white px-6 text-sm font-semibold text-[#080914]"
                >
                  Explore events
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {groups.map(([g, list]) => (
                  <section key={g}>
                    <h2 className="mb-1 px-3 text-xs font-semibold tracking-[0.12em] text-white/40 uppercase sm:px-4">
                      {g}
                    </h2>
                    <div className="space-y-1">
                      {list.map((n) => (
                        <Row key={n.id} n={n} unread={wasUnread(n)} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <GoogleLogin open={login} onClose={() => setLogin(false)} />
    </main>
  );
}
