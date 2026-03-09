"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FiX, FiSearch } from "react-icons/fi";
import { IoLocationSharp } from "react-icons/io5";
import { LuLocateFixed } from "react-icons/lu";

/* ── Types ─────────────────────────────────────────────────── */

export interface CityLocation {
  city: string;
  state: string;
}



const POPULAR_CITIES: CityLocation[] = [
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Delhi", state: "Delhi" },
  { city: "Bengaluru", state: "Karnataka" },
  { city: "Hyderabad", state: "Telangana" },
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Kolkata", state: "West Bengal" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Ahmedabad", state: "Gujarat" },
  { city: "Jaipur", state: "Rajasthan" },
  { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Guwahati", state: "Assam" },
  { city: "Chandigarh", state: "Chandigarh" },
  { city: "Kochi", state: "Kerala" },
  { city: "Indore", state: "Madhya Pradesh" },
  { city: "Bhopal", state: "Madhya Pradesh" },
  { city: "Nagpur", state: "Maharashtra" },
  { city: "Goa", state: "Goa" },
  { city: "Coimbatore", state: "Tamil Nadu" },
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
}

/** Reverse-geocode lat/lng → city, state via OpenStreetMap Nominatim (free, no key) */
async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<CityLocation | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { "User-Agent": "MySlotMate/1.0" } },
    );
    const data = (await res.json()) as {
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
      addr.city ?? addr.town ?? addr.village ?? addr.state_district ?? addr.county ?? "Unknown";
    const state = addr.state ?? "";
    return { city, state };
  } catch {
    return null;
  }
}

/* ── Component ─────────────────────────────────────────────── */

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (location: CityLocation) => void;
  current: CityLocation | null;
}

export default function LocationModal({
  open,
  onClose,
  onSelect,
  current,
}: LocationModalProps) {
  const [search, setSearch] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [searchResults, setSearchResults] = useState<CityLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus search input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSearch("");
      setSearchResults([]);
    }
  }, [open]);

  /* ── Detect current location ─────────────────────────────── */

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void (async () => {
          const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          setDetecting(false);
          if (loc) {
            saveLocation(loc);
            onSelect(loc);
            onClose();
          }
        })();
      },
      () => setDetecting(false),
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }, [onSelect, onClose]);

  /* ── Search cities via Nominatim ─────────────────────────── */

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (search.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search)}&format=json&addressdetails=1&limit=8&countrycodes=in`,
          { headers: { "User-Agent": "MySlotMate/1.0" } },
        );
        const data = (await res.json()) as {
          address?: {
            city?: string;
            town?: string;
            village?: string;
            state_district?: string;
            county?: string;
            state?: string;
          };
          display_name?: string;
        }[];

        const seen = new Set<string>();
        const results: CityLocation[] = [];
        for (const item of data) {
          const addr = item.address;
          if (!addr) continue;
          const city =
            addr.city ?? addr.town ?? addr.village ?? addr.state_district ?? addr.county;
          if (!city) continue;
          const key = `${city}-${addr.state ?? ""}`;
          if (seen.has(key)) continue;
          seen.add(key);
          results.push({ city, state: addr.state ?? "" });
        }
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
      })();
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  /* ── Select handler ──────────────────────────────────────── */

  const handleSelect = (loc: CityLocation) => {
    saveLocation(loc);
    onSelect(loc);
    onClose();
  };

  if (!open) return null;

  // Filter popular cities by local search (instant, no API)
  const filteredPopular =
    search.trim().length > 0
      ? POPULAR_CITIES.filter(
          (c) =>
            c.city.toLowerCase().includes(search.toLowerCase()) ||
            c.state.toLowerCase().includes(search.toLowerCase()),
        )
      : POPULAR_CITIES;

  // Decide which list to show
  const showSearchResults = search.trim().length >= 2 && searchResults.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-md rounded-2xl bg-white shadow-2xl sm:inset-x-auto sm:w-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">Select Location</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 transition"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 focus-within:border-[#0094CA] focus-within:ring-1 focus-within:ring-[#0094CA]/30 transition">
            <FiSearch className="h-4 w-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for your city..."
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Detect location button */}
        <button
          onClick={detectLocation}
          disabled={detecting}
          className="mx-5 mt-3 flex w-[calc(100%-2.5rem)] items-center gap-2.5 rounded-xl border border-[#0094CA]/20 bg-[#e6f8ff] px-4 py-3 text-sm font-semibold text-[#0094CA] transition hover:bg-[#d0f0ff] disabled:opacity-60"
        >
          <LuLocateFixed className={`h-5 w-5 ${detecting ? "animate-spin" : ""}`} />
          {detecting ? "Detecting location…" : "Use my current location"}
        </button>

        {/* Current location indicator */}
        {current && (
          <div className="mx-5 mt-2 flex items-center gap-2 text-xs text-gray-500">
            <IoLocationSharp className="h-3.5 w-3.5 text-[#0094CA]" />
            Current: <span className="font-medium text-gray-700">{current.city}, {current.state}</span>
          </div>
        )}

        {/* City list */}
        <div className="mt-3 max-h-[45vh] overflow-y-auto px-5 pb-5">
          {!showSearchResults && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Popular Cities
            </p>
          )}

          {showSearchResults ? (
            /* Search results from Nominatim */
            <div className="grid grid-cols-2 gap-2">
              {searchResults.map((loc) => (
                <button
                  key={`${loc.city}-${loc.state}`}
                  onClick={() => handleSelect(loc)}
                  className={`flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition hover:border-[#0094CA] hover:bg-[#e6f8ff] ${
                    current?.city === loc.city && current?.state === loc.state
                      ? "border-[#0094CA] bg-[#e6f8ff]"
                      : "border-gray-200"
                  }`}
                >
                  <span className="text-sm font-semibold text-gray-900">{loc.city}</span>
                  <span className="text-[11px] text-gray-500">{loc.state}</span>
                </button>
              ))}
            </div>
          ) : (
            /* Popular cities grid */
            <div className="grid grid-cols-3 gap-2">
              {filteredPopular.map((loc) => (
                <button
                  key={`${loc.city}-${loc.state}`}
                  onClick={() => handleSelect(loc)}
                  className={`flex flex-col items-center rounded-xl border px-2 py-3 text-center transition hover:border-[#0094CA] hover:bg-[#e6f8ff] ${
                    current?.city === loc.city && current?.state === loc.state
                      ? "border-[#0094CA] bg-[#e6f8ff]"
                      : "border-gray-200"
                  }`}
                >
                  <IoLocationSharp className="mb-1 h-5 w-5 text-[#0094CA]" />
                  <span className="text-xs font-semibold text-gray-900">{loc.city}</span>
                  <span className="text-[10px] text-gray-400">{loc.state}</span>
                </button>
              ))}
            </div>
          )}

          {searching && (
            <p className="mt-3 text-center text-xs text-gray-400">Searching…</p>
          )}

          {search.trim().length >= 2 &&
            !searching &&
            searchResults.length === 0 &&
            filteredPopular.length === 0 && (
              <p className="mt-3 text-center text-sm text-gray-500">
                No cities found for &ldquo;{search}&rdquo;
              </p>
            )}
        </div>
      </div>
    </>
  );
}
