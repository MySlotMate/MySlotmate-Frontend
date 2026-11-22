"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  ChevronDown,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import * as components from "~/components";
import SlotCard from "~/components/website/SlotCard";
import { HostCard } from "~/components/home/HomeFeed";
import { useListHosts, useListPublicEvents } from "~/hooks/useApi";
import { isNear, placeName, useSavedLocation } from "~/lib/nearby";
import { eventHasPassed } from "~/lib/eventDates";
import { formatIST } from "~/lib/datetime";
import {
  OTHER_CATEGORY,
  categoriesFor,
  categoryOf,
  kindOf,
  type Category,
} from "~/lib/categories";
import type { EventDTO, PublicHostProfileDTO } from "~/lib/api";

/* ------------------------------------------------------------------ */
/*  Filters                                                            */
/* ------------------------------------------------------------------ */

type Tab = "experiences" | "sessions" | "hosts";
type When = "any" | "today" | "tomorrow" | "weekend";
type Price = "any" | "free" | "under_500" | "500_1500" | "1500_plus";
type Sort = "soonest" | "popular" | "newest";
type HostFilter = "all" | "professional" | "community" | "verified";

const PAGE_SIZE = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

const TABS: { key: Tab; label: string; blurb: string }[] = [
  {
    key: "experiences",
    label: "Experiences",
    blurb: "Group events, workshops and meetups",
  },
  {
    key: "sessions",
    label: "1:1 sessions",
    blurb: "Private time with mentors, coaches and teachers",
  },
  { key: "hosts", label: "Hosts", blurb: "The people behind it all" },
];

const whenOf = (e: EventDTO) => new Date(e.next_available_date ?? e.time);
const dayKey = (d: Date | number) => formatIST(new Date(d), "yyyy-MM-dd");

/** Lowest price a guest can pay, in rupees. */
const fromRupees = (e: EventDTO) =>
  e.is_free
    ? 0
    : (e.price_tiers?.length
        ? Math.min(...e.price_tiers.map((t) => t.price_cents))
        : (e.price_cents ?? 0)) / 100;

function byWhen(e: EventDTO, w: When) {
  if (w === "any") return true;
  const at = whenOf(e);
  if (w === "today") return dayKey(at) === dayKey(Date.now());
  if (w === "tomorrow") return dayKey(at) === dayKey(Date.now() + DAY_MS);
  const iso = Number(formatIST(at, "i")); // 6 = Sat, 7 = Sun
  return (iso === 6 || iso === 7) && at.getTime() - Date.now() < 7 * DAY_MS;
}

function byPrice(e: EventDTO, p: Price) {
  const r = fromRupees(e);
  switch (p) {
    case "any":
      return true;
    case "free":
      return r <= 0;
    case "under_500":
      return r > 0 && r < 500;
    case "500_1500":
      return r >= 500 && r < 1500;
    case "1500_plus":
      return r >= 1500;
  }
}

const matches = (q: string, values: Array<string | null | undefined>) =>
  !q || values.some((v) => (v ?? "").toLowerCase().includes(q));

const hostName = (h?: PublicHostProfileDTO) =>
  h ? `${h.first_name} ${h.last_name}`.trim() : null;

/* ------------------------------------------------------------------ */
/*  Bits                                                               */
/* ------------------------------------------------------------------ */

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition ${
        active
          ? "bg-white text-[#080914]"
          : "border border-white/12 text-white/75 hover:border-white/30 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  const active = value !== options[0]?.value;
  return (
    <label
      className={`relative flex h-9 shrink-0 items-center rounded-full pr-8 pl-3.5 text-[13px] font-medium transition ${
        active
          ? "bg-white text-[#080914]"
          : "border border-white/12 text-white/75 hover:border-white/30"
      }`}
    >
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="cursor-pointer appearance-none bg-transparent outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-[#080914]">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5" />
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ExplorePage() {
  const { data: hosts, isLoading: hostsLoading } = useListHosts();
  const { data: events, isLoading: eventsLoading } = useListPublicEvents();
  const place = useSavedLocation();
  const city = placeName(place);

  const [tab, setTab] = useState<Tab>("experiences");
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [when, setWhen] = useState<When>("any");
  const [price, setPrice] = useState<Price>("any");
  const [sort, setSort] = useState<Sort>("soonest");
  const [hostFilter, setHostFilter] = useState<HostFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  // Set once the deep link has been read, so the URL sync below can't
  // overwrite it first.
  const [ready, setReady] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Deep links: /explore?type=sessions&cat=career
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const type = p.get("type");
    if (type === "sessions" || type === "hosts" || type === "experiences")
      setTab(type);
    setCategory(p.get("cat"));
    setQuery(p.get("q") ?? "");
    // The nav's search shortcut lands here ready to type.
    if (p.get("search")) searchRef.current?.focus();
    setReady(true);
  }, []);

  // Keep the URL shareable without adding history entries.
  useEffect(() => {
    if (!ready) return;
    const p = new URLSearchParams();
    if (tab !== "experiences") p.set("type", tab);
    if (category) p.set("cat", category);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `/explore?${qs}` : "/explore");
  }, [ready, tab, category]);

  const q = useDeferredValue(query).trim().toLowerCase();
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [q, tab, category, when, price, sort, hostFilter]);

  const hostById = useMemo(
    () => new Map((hosts ?? []).map((h) => [h.id, h])),
    [hosts],
  );

  // Bookable events only. See eventHasPassed: `time` alone is wrong for
  // custom-dates events.
  const live = useMemo(() => {
    const now = Date.now();
    return (events ?? []).filter((e) => !eventHasPassed(e, now));
  }, [events]);

  const counts = useMemo(
    () => ({
      experiences: live.filter((e) => kindOf(e) === "experience").length,
      sessions: live.filter((e) => kindOf(e) === "session").length,
      hosts: hosts?.length ?? 0,
    }),
    [live, hosts],
  );

  const kind = tab === "sessions" ? "session" : "experience";

  // Categories with something in them, for the current tab.
  const categories = useMemo<(Category & { count: number })[]>(() => {
    if (tab === "hosts") return [];
    const n = new Map<string, number>();
    for (const e of live) {
      if (kindOf(e) !== kind) continue;
      const c = categoryOf(e).key;
      n.set(c, (n.get(c) ?? 0) + 1);
    }
    // Only categories with live events, busiest first.
    return [...categoriesFor(kind), OTHER_CATEGORY]
      .filter((c) => n.has(c.key))
      .map((c) => ({ ...c, count: n.get(c.key)! }))
      .sort((a, b) => b.count - a.count);
  }, [live, kind, tab]);

  // Drop a category that the current tab doesn't have.
  useEffect(() => {
    if (
      ready &&
      category &&
      categories.length &&
      !categories.some((c) => c.key === category)
    )
      setCategory(null);
  }, [ready, categories, category]);

  const results = useMemo(() => {
    if (tab === "hosts") return [];
    const list = live
      .filter((e) => kindOf(e) === kind)
      .filter((e) => !category || categoryOf(e).key === category)
      .filter((e) => byWhen(e, when) && byPrice(e, price))
      .filter((e) =>
        matches(q, [
          e.title,
          e.hook_line,
          e.location,
          e.mood,
          categoryOf(e).label,
          hostName(hostById.get(e.host_id)),
        ]),
      );
    // Things in or near the chosen city come first; nothing is hidden.
    const near = (e: EventDTO) => isNear(e, place);
    return list.sort(
      (a, b) =>
        Number(near(b)) - Number(near(a)) ||
        (sort === "popular"
          ? (b.total_bookings ?? 0) - (a.total_bookings ?? 0)
          : sort === "newest"
            ? Date.parse(b.created_at) - Date.parse(a.created_at)
            : whenOf(a).getTime() - whenOf(b).getTime()),
    );
  }, [live, kind, tab, category, when, price, q, sort, hostById, place]);

  const nearCount = useMemo(
    () => (city ? results.filter((e) => isNear(e, place)).length : 0),
    [results, place, city],
  );

  const hostResults = useMemo(
    () =>
      (hosts ?? [])
        .filter((h) =>
          hostFilter === "professional"
            ? h.is_professional
            : hostFilter === "community"
              ? h.is_community_champ
              : hostFilter === "verified"
                ? h.is_identity_verified
                : true,
        )
        .filter((h) =>
          matches(q, [
            h.first_name,
            h.last_name,
            h.city,
            h.tagline,
            ...(h.expertise_tags ?? []),
          ]),
        ),
    [hosts, hostFilter, q],
  );

  const filtersOn = when !== "any" || price !== "any" || sort !== "soonest";
  const clearAll = () => {
    setCategory(null);
    setWhen("any");
    setPrice("any");
    setSort("soonest");
    setQuery("");
  };

  const loading = tab === "hosts" ? hostsLoading : eventsLoading;
  const total = tab === "hosts" ? hostResults.length : results.length;
  const filterSelects = (
    <>
      <Select<When>
        label="When"
        value={when}
        onChange={setWhen}
        options={[
          { value: "any", label: "Any time" },
          { value: "today", label: "Today" },
          { value: "tomorrow", label: "Tomorrow" },
          { value: "weekend", label: "This weekend" },
        ]}
      />
      <Select<Price>
        label="Price"
        value={price}
        onChange={setPrice}
        options={[
          { value: "any", label: "Any price" },
          { value: "free", label: "Free" },
          { value: "under_500", label: "Under ₹500" },
          { value: "500_1500", label: "₹500 – ₹1,500" },
          { value: "1500_plus", label: "₹1,500+" },
        ]}
      />
      <Select<Sort>
        label="Sort"
        value={sort}
        onChange={setSort}
        options={[
          { value: "soonest", label: "Soonest" },
          { value: "popular", label: "Most booked" },
          { value: "newest", label: "Newest" },
        ]}
      />
    </>
  );
  const activeCat = categories.find((c) => c.key === category);

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-clip bg-[#080914] text-white max-md:pb-28">
      <components.Navbar dark />

      <div className="mx-auto w-full max-w-[1280px] px-5 pt-5 pb-20 font-[family-name:var(--font-inter)] md:px-6 md:pt-8 lg:px-10">
        <h1 className="sr-only">Explore</h1>

        {/* Row 1: what to browse + search */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div
            role="tablist"
            aria-label="What to explore"
            className="flex w-full rounded-full border border-white/10 bg-white/[0.04] p-1 md:w-auto"
          >
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                title={t.blurb}
                onClick={() => {
                  setTab(t.key);
                  setCategory(null);
                }}
                className={`flex h-9 flex-1 items-center justify-center gap-1 rounded-full px-2 text-[13px] font-semibold whitespace-nowrap transition sm:px-4 sm:text-sm md:flex-none ${
                  tab === t.key
                    ? "bg-white text-[#080914]"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {t.label}
                <span className="text-xs opacity-50">{counts[t.key]}</span>
              </button>
            ))}
          </div>

          <div className="flex h-11 w-full items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 focus-within:border-white/30 md:w-[380px]">
            <Search className="h-4 w-4 shrink-0 text-white/45" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search"
              placeholder={
                tab === "sessions"
                  ? "Search mentors, coaches, subjects…"
                  : tab === "hosts"
                    ? "Search hosts by name, city or skill…"
                    : "Search events, places, hosts…"
              }
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="text-white/50 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: categories (or host types) + filters */}
        <div className="mt-4 flex items-center gap-2">
          <div className="-ml-5 flex min-w-0 flex-1 gap-2 overflow-x-auto pl-5 [scrollbar-width:none] md:ml-0 md:pl-0 [&::-webkit-scrollbar]:hidden">
            {tab === "hosts" ? (
              (
                [
                  ["all", "All hosts"],
                  ["professional", "Professionals"],
                  ["community", "Community champs"],
                  ["verified", "ID verified"],
                ] as const
              ).map(([k, label]) => (
                <Chip
                  key={k}
                  active={hostFilter === k}
                  onClick={() => setHostFilter(k)}
                >
                  {k === "verified" && <BadgeCheck className="h-3.5 w-3.5" />}
                  {label}
                </Chip>
              ))
            ) : (
              <>
                <Chip active={!category} onClick={() => setCategory(null)}>
                  All
                </Chip>
                {categories.map((c) => (
                  <Chip
                    key={c.key}
                    active={category === c.key}
                    onClick={() =>
                      setCategory((cur) => (cur === c.key ? null : c.key))
                    }
                  >
                    <c.icon className="h-3.5 w-3.5" />
                    {c.label}
                  </Chip>
                ))}
              </>
            )}
          </div>

          {tab !== "hosts" && (
            <>
              <div className="hidden shrink-0 gap-2 md:flex">
                {filterSelects}
              </div>
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                aria-expanded={showFilters}
                aria-label="Filters"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition md:hidden ${
                  filtersOn
                    ? "bg-white text-[#080914]"
                    : "border border-white/12 text-white/75"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        {tab !== "hosts" && showFilters && (
          <div className="mt-3 flex flex-wrap gap-2 md:hidden">
            {filterSelects}
          </div>
        )}

        <div className="mt-6 mb-5 flex items-center gap-3 text-sm text-white/50">
          <span>
            {loading
              ? "Loading…"
              : `${total} ${
                  tab === "hosts"
                    ? total === 1
                      ? "host"
                      : "hosts"
                    : tab === "sessions"
                      ? total === 1
                        ? "session"
                        : "sessions"
                      : total === 1
                        ? "experience"
                        : "experiences"
                }${activeCat ? ` in ${activeCat.label}` : ""}${
                  city && tab !== "hosts" && nearCount > 0
                    ? ` · ${nearCount} in or near ${city} first`
                    : ""
                }`}
          </span>
          {(filtersOn || Boolean(category) || query !== "") && (
            <button
              type="button"
              onClick={clearAll}
              className="font-semibold text-[#D8B4FE] hover:text-white"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/6] animate-pulse rounded-[20px] bg-white/[0.05]"
              />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center">
            <p className="font-outfit text-xl font-semibold">
              Nothing here yet
            </p>
            <p className="mt-1 text-sm text-white/55">
              Try another category or clear your filters.
            </p>
            <button
              type="button"
              onClick={clearAll}
              className="mt-5 h-11 rounded-full bg-white px-6 text-sm font-semibold text-[#080914]"
            >
              Clear filters
            </button>
          </div>
        ) : tab === "hosts" ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-5">
            {hostResults.slice(0, visible).map((h) => (
              <HostCard key={h.id} host={h} className="w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4">
            {results.slice(0, visible).map((e, i) => (
              <SlotCard
                key={e.id}
                event={e}
                host={hostById.get(e.host_id)}
                index={i}
              />
            ))}
          </div>
        )}

        {!loading && visible < total && (
          <div className="mt-12 flex justify-center">
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="h-12 rounded-full border border-white/15 px-8 text-[15px] font-semibold text-white transition hover:bg-white/[0.06]"
            >
              Show more
            </button>
          </div>
        )}
      </div>

      <components.Home.Footer dark />
    </main>
  );
}
