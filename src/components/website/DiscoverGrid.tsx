"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { getMoodDisplayLabel, normalizeMood } from "~/lib/moods";
import type { EventDTO, PublicHostProfileDTO } from "~/lib/api";
import SlotCard from "./SlotCard";
import { isOneOnOne } from "./shared";

const PAGE = 12;
type Kind = "all" | "group" | "one_on_one";
const KINDS: { key: Kind; label: string }[] = [
  { key: "all", label: "All" },
  { key: "group", label: "Group experiences" },
  { key: "one_on_one", label: "1:1 sessions" },
];

/** The product, straight after the hero: search, filters and the slot grid. */
export default function DiscoverGrid({
  events,
  hostById,
}: {
  events: EventDTO[];
  hostById: Map<string, PublicHostProfileDTO>;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [mood, setMood] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);

  const moods = useMemo(() => {
    const count = new Map<string, number>();
    for (const e of events) {
      if (!e.mood) continue;
      const k = normalizeMood(e.mood);
      count.set(k, (count.get(k) ?? 0) + 1);
    }
    return [...count.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k]) => k);
  }, [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (kind === "one_on_one" && !isOneOnOne(e)) return false;
      if (kind === "group" && isOneOnOne(e)) return false;
      if (mood && normalizeMood(e.mood) !== mood) return false;
      if (!q) return true;
      const host = hostById.get(e.host_id);
      return [e.title, e.location, host?.first_name, host?.last_name]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(q));
    });
  }, [events, hostById, kind, mood, query]);

  const reset = () => setShown(PAGE);

  return (
    <section id="discover" className="w-full scroll-mt-4">
      <div className="sticky top-0 z-30 border-b border-white/[0.05] bg-[#080914]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 py-5 md:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <label className="flex h-12 w-full max-w-[420px] items-center gap-2.5 rounded-full border border-white/10 bg-[#121426] px-4 focus-within:border-[#A020F0]">
              <Search className="h-[18px] w-[18px] shrink-0 text-[#A5A8C3]" />
              <span className="sr-only">Search slots</span>
              <input
                id="website-search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  reset();
                }}
                placeholder="Search slots, hosts or places"
                className="h-full w-full bg-transparent text-[15px] text-white outline-none placeholder:text-[#777B98]"
              />
            </label>
            <p className="font-outfit text-lg text-[#A5A8C3]">
              Happening{" "}
              <span className="font-semibold text-white">near you</span>
            </p>
          </div>

          <div className="hide-scrollbar flex items-center gap-3 overflow-x-auto">
            <div className="flex shrink-0 rounded-full border border-white/10 bg-[#121426] p-1">
              {KINDS.map((k) => (
                <button
                  key={k.key}
                  type="button"
                  aria-pressed={kind === k.key}
                  onClick={() => {
                    setKind(k.key);
                    reset();
                  }}
                  className={`h-8 rounded-full px-4 text-[13px] font-semibold whitespace-nowrap transition ${kind === k.key ? "bg-[#A020F0] text-white" : "text-[#A5A8C3] hover:text-white"}`}
                >
                  {k.label}
                </button>
              ))}
            </div>
            {moods.length > 0 && (
              <span className="h-6 w-px shrink-0 bg-white/10" />
            )}
            {moods.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mood === m}
                onClick={() => {
                  setMood((cur) => (cur === m ? null : m));
                  reset();
                }}
                className={`h-9 shrink-0 rounded-full border px-4 text-[13px] font-medium whitespace-nowrap transition ${mood === m ? "border-[#A020F0] bg-[#241333] text-[#D8B4FE]" : "border-white/10 text-[#A5A8C3] hover:text-white"}`}
              >
                {getMoodDisplayLabel(m)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-5 pt-8 pb-10 md:px-10">
        {filtered.length === 0 ? (
          <div className="rounded-[20px] border border-white/[0.06] bg-[#121426] p-10 text-center text-[#A5A8C3]">
            Nothing matches that yet.{" "}
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setKind("all");
                setMood(null);
              }}
              className="font-semibold text-[#D8B4FE]"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.slice(0, shown).map((e, i) => (
              <SlotCard
                key={e.id}
                event={e}
                host={hostById.get(e.host_id)}
                index={i}
              />
            ))}
          </div>
        )}

        {filtered.length > shown && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setShown((s) => s + PAGE)}
              className="flex h-10 items-center gap-1.5 rounded-full border border-white/10 px-5 text-sm font-semibold text-[#A5A8C3] transition hover:text-white"
            >
              Load more slots <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
