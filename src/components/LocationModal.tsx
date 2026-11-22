"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Check, LocateFixed, MapPin, Search, X } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────── */

export interface CityLocation {
  city: string;
  state: string;
  lat: number;
  lng: number;
}

/**
 * Cities people can pick. The first block is shown as "Popular cities" with a
 * landmark icon from /assets/cities/{icon}.svg; everything is listed A–Z.
 */
const FEATURED: { city: string; label?: string; icon: string }[] = [
  { city: "Guwahati", icon: "guwahati" },
  { city: "Shillong", icon: "shillong" },
  { city: "Delhi", label: "Delhi NCR", icon: "delhi" },
  { city: "Bengaluru", icon: "bengaluru" },
  { city: "Mumbai", icon: "mumbai" },
  { city: "Kolkata", icon: "kolkata" },
  { city: "Hyderabad", icon: "hyderabad" },
  { city: "Pune", icon: "pune" },
  { city: "Chennai", icon: "chennai" },
  { city: "Jaipur", icon: "jaipur" },
  { city: "Ahmedabad", icon: "ahmedabad" },
  { city: "Goa", icon: "goa" },
];

// Indian cities with coordinates (used for "near you" distances too).
export const POPULAR_CITIES: CityLocation[] = [
  // Northeast
  { city: "Guwahati", state: "Assam", lat: 26.1445, lng: 91.7362 },
  { city: "Shillong", state: "Meghalaya", lat: 25.5788, lng: 91.8933 },
  { city: "Silchar", state: "Assam", lat: 24.817, lng: 92.779 },
  { city: "Dibrugarh", state: "Assam", lat: 27.4728, lng: 94.912 },
  { city: "Jorhat", state: "Assam", lat: 26.7509, lng: 94.2037 },
  { city: "Tezpur", state: "Assam", lat: 26.6528, lng: 92.7926 },
  { city: "Tinsukia", state: "Assam", lat: 27.4886, lng: 95.3558 },
  { city: "Nagaon", state: "Assam", lat: 26.3464, lng: 92.684 },
  { city: "Agartala", state: "Tripura", lat: 23.8315, lng: 91.2868 },
  { city: "Imphal", state: "Manipur", lat: 24.817, lng: 93.9368 },
  { city: "Aizawl", state: "Mizoram", lat: 23.7271, lng: 92.7176 },
  { city: "Kohima", state: "Nagaland", lat: 25.6751, lng: 94.1086 },
  { city: "Dimapur", state: "Nagaland", lat: 25.9063, lng: 93.7276 },
  { city: "Itanagar", state: "Arunachal Pradesh", lat: 27.0844, lng: 93.6053 },
  { city: "Tawang", state: "Arunachal Pradesh", lat: 27.5859, lng: 91.8594 },
  { city: "Gangtok", state: "Sikkim", lat: 27.3389, lng: 88.6065 },
  { city: "Cherrapunji", state: "Meghalaya", lat: 25.2702, lng: 91.7323 },
  { city: "Siliguri", state: "West Bengal", lat: 26.7271, lng: 88.3953 },
  { city: "Darjeeling", state: "West Bengal", lat: 27.041, lng: 88.2663 },

  // Metros
  { city: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777 },
  { city: "Delhi", state: "Delhi", lat: 28.7041, lng: 77.1025 },
  { city: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
  { city: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867 },
  { city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
  { city: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639 },

  // Rest of India
  { city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
  { city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714 },
  { city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873 },
  { city: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462 },
  { city: "Chandigarh", state: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { city: "Kochi", state: "Kerala", lat: 9.9312, lng: 76.2673 },
  { city: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577 },
  { city: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126 },
  { city: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882 },
  { city: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lng: 76.9558 },
  { city: "Goa", state: "Goa", lat: 15.2993, lng: 73.8243 },
  {
    city: "Visakhapatnam",
    state: "Andhra Pradesh",
    lat: 17.6869,
    lng: 83.2185,
  },
  { city: "Vijayawada", state: "Andhra Pradesh", lat: 16.5062, lng: 80.648 },
  { city: "Vadodara", state: "Gujarat", lat: 22.3072, lng: 73.1812 },
  { city: "Surat", state: "Gujarat", lat: 21.1702, lng: 72.8311 },
  { city: "Rajkot", state: "Gujarat", lat: 22.3039, lng: 70.8022 },
  { city: "Ranchi", state: "Jharkhand", lat: 23.3441, lng: 85.3096 },
  { city: "Jamshedpur", state: "Jharkhand", lat: 22.8046, lng: 86.2029 },
  { city: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376 },
  { city: "Bhubaneswar", state: "Odisha", lat: 20.2961, lng: 85.8245 },
  { city: "Raipur", state: "Chhattisgarh", lat: 21.2514, lng: 81.6296 },
  { city: "Srinagar", state: "Jammu & Kashmir", lat: 34.0837, lng: 74.7973 },
  { city: "Jammu", state: "Jammu & Kashmir", lat: 32.7266, lng: 74.857 },
  { city: "Leh", state: "Ladakh", lat: 34.1526, lng: 77.5771 },
  { city: "Amritsar", state: "Punjab", lat: 31.634, lng: 74.8723 },
  { city: "Ludhiana", state: "Punjab", lat: 30.901, lng: 75.8573 },
  { city: "Dehradun", state: "Uttarakhand", lat: 30.3165, lng: 78.0322 },
  { city: "Rishikesh", state: "Uttarakhand", lat: 30.0869, lng: 78.2676 },
  { city: "Shimla", state: "Himachal Pradesh", lat: 31.1048, lng: 77.1734 },
  { city: "Manali", state: "Himachal Pradesh", lat: 32.2432, lng: 77.1892 },
  { city: "Dharamshala", state: "Himachal Pradesh", lat: 32.219, lng: 76.3234 },
  { city: "Udaipur", state: "Rajasthan", lat: 24.5854, lng: 73.7125 },
  { city: "Jodhpur", state: "Rajasthan", lat: 26.2389, lng: 73.0243 },
  { city: "Agra", state: "Uttar Pradesh", lat: 27.1767, lng: 78.0081 },
  { city: "Varanasi", state: "Uttar Pradesh", lat: 25.3176, lng: 82.9739 },
  { city: "Kanpur", state: "Uttar Pradesh", lat: 26.4499, lng: 80.3319 },
  { city: "Noida", state: "Uttar Pradesh", lat: 28.5355, lng: 77.391 },
  { city: "Gurugram", state: "Haryana", lat: 28.4595, lng: 77.0266 },
  { city: "Mysuru", state: "Karnataka", lat: 12.2958, lng: 76.6394 },
  { city: "Mangaluru", state: "Karnataka", lat: 12.9141, lng: 74.856 },
  { city: "Thiruvananthapuram", state: "Kerala", lat: 8.5241, lng: 76.9366 },
  { city: "Kozhikode", state: "Kerala", lat: 11.2588, lng: 75.7804 },
  { city: "Madurai", state: "Tamil Nadu", lat: 9.9252, lng: 78.1198 },
  { city: "Puducherry", state: "Puducherry", lat: 11.9416, lng: 79.8083 },
  { city: "Nashik", state: "Maharashtra", lat: 19.9975, lng: 73.7898 },
  { city: "Aurangabad", state: "Maharashtra", lat: 19.8762, lng: 75.3433 },
  { city: "Durgapur", state: "West Bengal", lat: 23.5204, lng: 87.3119 },
  { city: "Erode", state: "Tamil Nadu", lat: 11.341, lng: 77.7172 },
  { city: "Ernakulam", state: "Kerala", lat: 9.9816, lng: 76.2999 },
  { city: "Eluru", state: "Andhra Pradesh", lat: 16.7107, lng: 81.0952 },
  { city: "Faridabad", state: "Haryana", lat: 28.4089, lng: 77.3178 },
  { city: "Firozabad", state: "Uttar Pradesh", lat: 27.1592, lng: 78.3957 },
  { city: "Fatehpur", state: "Uttar Pradesh", lat: 25.9304, lng: 80.8139 },
  { city: "Ooty", state: "Tamil Nadu", lat: 11.4102, lng: 76.695 },
  { city: "Ongole", state: "Andhra Pradesh", lat: 15.5057, lng: 80.0499 },
  { city: "Orchha", state: "Madhya Pradesh", lat: 25.3519, lng: 78.6406 },
  { city: "Qadian", state: "Punjab", lat: 31.8192, lng: 75.3764 },
  { city: "Quepem", state: "Goa", lat: 15.2128, lng: 74.0772 },
  { city: "Warangal", state: "Telangana", lat: 17.9689, lng: 79.5941 },
  { city: "Wardha", state: "Maharashtra", lat: 20.7453, lng: 78.6022 },
  { city: "Wayanad", state: "Kerala", lat: 11.6854, lng: 76.132 },
  { city: "Yavatmal", state: "Maharashtra", lat: 20.3888, lng: 78.1204 },
  { city: "Yamunanagar", state: "Haryana", lat: 30.129, lng: 77.2674 },
  { city: "Yercaud", state: "Tamil Nadu", lat: 11.7748, lng: 78.2097 },
  { city: "Ziro", state: "Arunachal Pradesh", lat: 27.5449, lng: 93.8197 },
  { city: "Zirakpur", state: "Punjab", lat: 30.6425, lng: 76.8173 },
  { city: "Zunheboto", state: "Nagaland", lat: 25.9667, lng: 94.5167 },
  {
    city: "Port Blair",
    state: "Andaman & Nicobar",
    lat: 11.6234,
    lng: 92.7265,
  },
];

/* ── Helpers ───────────────────────────────────────────────── */

const STORAGE_KEY = "msm_location";

export function getSavedLocation(): CityLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CityLocation;
  } catch {
    return null;
  }
}

export function saveLocation(loc: CityLocation) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  // `storage` only fires in *other* tabs, so nudge this tab's listeners too.
  window.dispatchEvent(new Event("storage"));
}

/** Reverse-geocode lat/lng → city, state via OpenStreetMap Nominatim (free, no key) */
async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<CityLocation | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
    );
    const data = (await res.json()) as {
      lat?: string;
      lon?: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        state_district?: string;
        county?: string;
        state?: string;
      };
    };
    const addr = data.address;
    if (!addr) return null;
    const city =
      addr.city ??
      addr.town ??
      addr.village ??
      addr.state_district ??
      addr.county ??
      "Unknown";
    return {
      city,
      state: addr.state ?? "",
      lat: parseFloat(data.lat ?? "0"),
      lng: parseFloat(data.lon ?? "0"),
    };
  } catch {
    return null;
  }
}

/** Calculate distance between two points (Haversine formula) in kilometers */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Short label for the nav: "Delhi NCR" rather than "Delhi". */
export function cityLabel(loc: CityLocation | null): string | null {
  if (!loc || loc.city === "Select City" || loc.city === "Unknown") return null;
  return FEATURED.find((f) => f.city === loc.city)?.label ?? loc.city;
}

/* ── Component ─────────────────────────────────────────────── */

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (location: CityLocation) => void;
  current: CityLocation | null;
}

type Geo = "idle" | "detecting" | "denied" | "failed";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Tints a line-art SVG with the brand lavender via CSS mask. */
function CityIcon({ icon }: { icon: string }) {
  const url = `url(/assets/cities/${icon}.svg)`;
  return (
    <span
      aria-hidden
      className="block h-12 w-12 bg-[#C9A7FF] transition group-hover:bg-white sm:h-14 sm:w-14"
      style={{
        maskImage: url,
        WebkitMaskImage: url,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

export default function LocationModal({
  open,
  onClose,
  onSelect,
  current,
}: LocationModalProps) {
  const [search, setSearch] = useState("");
  const [geo, setGeo] = useState<Geo>("idle");
  const [remote, setRemote] = useState<CityLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [letter, setLetter] = useState("A");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const byLetter = useMemo(() => {
    const m = new Map<string, CityLocation[]>();
    for (const c of [...POPULAR_CITIES].sort((a, b) =>
      a.city.localeCompare(b.city),
    )) {
      const l = c.city[0]!.toUpperCase();
      m.set(l, [...(m.get(l) ?? []), c]);
    }
    return m;
  }, []);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setRemote([]);
    setGeo("idle");
    const first = current?.city?.[0]?.toUpperCase();
    setLetter(first && byLetter.has(first) ? first : "A");
    // Don't pop the keyboard over the whole sheet on phones.
    if (window.matchMedia("(min-width: 640px)").matches)
      setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // Page scroll is locked by the .msm-modal rule in globals.css.
    return () => window.removeEventListener("keydown", onKey);
  }, [open, current?.city, byLetter, onClose]);

  const choose = useCallback(
    (loc: CityLocation) => {
      saveLocation(loc);
      onSelect(loc);
      onClose();
    },
    [onSelect, onClose],
  );

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeo("failed");
      return;
    }
    setGeo("detecting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void (async () => {
          const loc = await reverseGeocode(
            pos.coords.latitude,
            pos.coords.longitude,
          );
          if (loc) {
            setGeo("idle");
            choose(loc);
          } else setGeo("failed");
        })();
      },
      (err) => setGeo(err.code === err.PERMISSION_DENIED ? "denied" : "failed"),
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }, [choose]);

  // Areas and towns outside our list come from OpenStreetMap.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = search.trim();
    if (q.length < 3) {
      setRemote([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=8&countrycodes=in`,
          );
          const data = (await res.json()) as {
            lat?: string;
            lon?: string;
            address?: {
              city?: string;
              town?: string;
              village?: string;
              suburb?: string;
              state_district?: string;
              county?: string;
              state?: string;
            };
          }[];
          const seen = new Set<string>();
          const out: CityLocation[] = [];
          for (const item of data) {
            const a = item.address;
            const city =
              a?.city ??
              a?.town ??
              a?.village ??
              a?.state_district ??
              a?.county;
            if (!a || !city) continue;
            const key = `${city}-${a.state ?? ""}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({
              city,
              state: a.state ?? "",
              lat: parseFloat(item.lat ?? "0"),
              lng: parseFloat(item.lon ?? "0"),
            });
          }
          setRemote(out);
        } catch {
          setRemote([]);
        } finally {
          setSearching(false);
        }
      })();
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Render at the body: a parent with backdrop-filter (the sticky top bar)
  // would otherwise become the containing block for `fixed`.
  if (!open || typeof document === "undefined") return null;

  const q = search.trim().toLowerCase();
  const localMatches = q
    ? POPULAR_CITIES.filter(
        (c) =>
          c.city.toLowerCase().includes(q) || c.state.toLowerCase().includes(q),
      )
    : [];
  const results = [
    ...localMatches,
    ...remote.filter(
      (r) =>
        !localMatches.some((l) => l.city === r.city && l.state === r.state),
    ),
  ];
  const isCurrent = (c: CityLocation) => current?.city === c.city;

  return createPortal(
    <div
      className="msm-modal fixed inset-0 z-[10000] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select location"
        onClick={(e) => e.stopPropagation()}
        className="animate-in slide-in-from-bottom-6 sm:zoom-in-95 flex max-h-[92dvh] w-full max-w-[760px] flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#121426] text-white shadow-2xl duration-200 sm:max-h-[86vh] sm:rounded-[28px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4 sm:px-7 sm:py-5">
          <h2 className="font-outfit text-xl font-bold sm:text-2xl">
            Select location
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto px-5 pt-5 pb-8 sm:px-7">
          {/* Search */}
          <label className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-[#080914] px-4 transition focus-within:border-[#A020F0]/60 sm:h-14">
            <Search className="h-5 w-5 shrink-0 text-white/45" />
            <input
              ref={inputRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search city, area or locality"
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-white/40"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
                className="text-white/45 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>

          {/* Current location */}
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#A020F0]/30 bg-[#A020F0]/[0.08] p-3.5 sm:gap-4 sm:p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#A020F0]/20 text-[#D8B4FE]">
              <LocateFixed
                className={`h-5 w-5 ${geo === "detecting" ? "animate-spin" : ""}`}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[#E9D5FF]">
                Use current location
              </p>
              <p className="mt-0.5 text-xs text-white/55 sm:text-[13px]">
                {geo === "denied"
                  ? "Location is blocked. Allow it in your browser settings, or pick a city below."
                  : geo === "failed"
                    ? "Couldn't find you just now. Try again or pick a city."
                    : "See experiences happening around you."}
              </p>
            </div>
            <button
              type="button"
              onClick={detectLocation}
              disabled={geo === "detecting"}
              className="shrink-0 rounded-full border border-[#C9A7FF] px-4 py-2 text-sm font-semibold text-[#E9D5FF] transition hover:bg-[#A020F0]/20 disabled:opacity-60 sm:px-5"
            >
              {geo === "detecting" ? "Finding…" : "Enable"}
            </button>
          </div>

          {q ? (
            <section className="mt-6">
              <h3 className="text-sm font-semibold text-white/80">
                {searching && results.length === 0
                  ? "Searching…"
                  : `Results for “${search.trim()}”`}
              </h3>
              <div className="mt-3 flex flex-col divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.06]">
                {results.map((c) => (
                  <button
                    key={`${c.city}-${c.state}-${c.lat}`}
                    type="button"
                    onClick={() => choose(c)}
                    className="flex items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04]"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-[#C9A7FF]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {c.city}
                      </span>
                      {c.state && (
                        <span className="block truncate text-xs text-white/50">
                          {c.state}
                        </span>
                      )}
                    </span>
                    {isCurrent(c) && (
                      <Check className="h-4 w-4 text-[#C9A7FF]" />
                    )}
                  </button>
                ))}
                {!searching && results.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-white/50">
                    No places found for “{search.trim()}”.
                  </p>
                )}
              </div>
            </section>
          ) : (
            <>
              {/* Popular */}
              <section className="mt-7">
                <h3 className="font-outfit text-base font-semibold">
                  Popular cities
                </h3>
                <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-6">
                  {FEATURED.map((f) => {
                    const loc = POPULAR_CITIES.find((c) => c.city === f.city)!;
                    const on = isCurrent(loc);
                    return (
                      <button
                        key={f.city}
                        type="button"
                        onClick={() => choose(loc)}
                        aria-pressed={on}
                        className={`group relative flex flex-col items-center gap-2.5 rounded-2xl border px-2 pt-4 pb-3 transition ${
                          on
                            ? "border-[#A020F0] bg-[#A020F0]/15"
                            : "border-white/[0.06] bg-white/[0.03] hover:border-[#A020F0]/50 hover:bg-[#A020F0]/10"
                        }`}
                      >
                        {on && (
                          <Check className="absolute top-2 right-2 h-3.5 w-3.5 text-[#D8B4FE]" />
                        )}
                        <CityIcon icon={f.icon} />
                        <span className="text-[13px] font-medium sm:text-sm">
                          {f.label ?? f.city}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* All cities A–Z */}
              <section className="mt-8">
                <h3 className="font-outfit text-base font-semibold">
                  All cities
                </h3>
                <div className="mt-3 flex flex-wrap gap-1">
                  {/* Every letter stays tappable; empty ones say so below. */}
                  {LETTERS.map((l) => {
                    const has = byLetter.has(l);
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLetter(l)}
                        aria-pressed={letter === l}
                        className={`h-9 w-9 rounded-lg text-sm font-semibold transition ${
                          letter === l
                            ? "bg-gradient-to-br from-[#7038F5] to-[#B724EA] text-white"
                            : has
                              ? "text-[#C9A7FF] hover:bg-white/[0.06]"
                              : "text-white/30 hover:bg-white/[0.04]"
                        }`}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
                {!byLetter.has(letter) && (
                  <p className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-5 text-center text-sm text-white/50">
                    No cities available starting with “{letter}”.
                  </p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 md:grid-cols-4">
                  {(byLetter.get(letter) ?? []).map((c) => (
                    <button
                      key={c.city}
                      type="button"
                      onClick={() => choose(c)}
                      className={`flex items-center gap-1.5 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-white/[0.05] ${
                        isCurrent(c)
                          ? "font-semibold text-[#D8B4FE]"
                          : "text-white/80 hover:text-white"
                      }`}
                    >
                      {c.city}
                      {isCurrent(c) && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
