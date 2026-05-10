"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FiX } from "react-icons/fi";
import { IoLocationSharp } from "react-icons/io5";
import { LuLocateFixed } from "react-icons/lu";

/* ── Types ─────────────────────────────────────────────────── */

export interface CityLocation {
  city: string;
  state: string;
  lat: number;
  lng: number;
}

// Comprehensive database of Indian cities with coordinates
export const POPULAR_CITIES: CityLocation[] = [
  // Top metros
  { city: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777 },
  { city: "Delhi", state: "Delhi", lat: 28.7041, lng: 77.1025 },
  { city: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
  { city: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867 },
  { city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
  { city: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639 },

  // Tier 2 cities
  { city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
  { city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714 },
  { city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873 },
  { city: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462 },
  { city: "Guwahati", state: "Assam", lat: 26.1445, lng: 91.7362 },
  { city: "Silchar", state: "Assam", lat: 24.817, lng: 92.779 },
  { city: "Chandigarh", state: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { city: "Kochi", state: "Kerala", lat: 9.9312, lng: 76.2673 },
  { city: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577 },
  { city: "Bhopal", state: "Madhya Pradesh", lat: 23.1815, lng: 79.9864 },
  { city: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882 },
  { city: "Coimbatore", state: "Tamil Nadu", lat: 11.0081, lng: 76.9124 },

  // Beach & tourism cities
  { city: "Goa", state: "Goa", lat: 15.2993, lng: 73.8243 },

  // Tier 3 & tier 2 expansion
  {
    city: "Visakhapatnam",
    state: "Andhra Pradesh",
    lat: 17.6869,
    lng: 83.2185,
  },
  { city: "Vadodara", state: "Gujarat", lat: 22.3072, lng: 73.1812 },
  { city: "Surat", state: "Gujarat", lat: 21.1458, lng: 72.8479 },
  { city: "Ranchi", state: "Jharkhand", lat: 23.3441, lng: 85.3096 },
  { city: "Srinagar", state: "Jammu & Kashmir", lat: 34.0837, lng: 74.7973 },
  { city: "Mysore", state: "Karnataka", lat: 12.2958, lng: 76.6394 },
  { city: "Shimla", state: "Himachal Pradesh", lat: 31.7724, lng: 77.1092 },
  { city: "Manali", state: "Himachal Pradesh", lat: 32.2396, lng: 77.1887 },
  { city: "Rishikesh", state: "Uttarakhand", lat: 30.0886, lng: 78.2676 },
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
    const state = addr.state ?? "";
    const resLat = parseFloat(data.lat ?? "0");
    const resLng = parseFloat(data.lon ?? "0");
    return { city, state, lat: resLat, lng: resLng };
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
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
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
          const loc = await reverseGeocode(
            pos.coords.latitude,
            pos.coords.longitude,
          );
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
            display_name?: string;
          }[];

          const seen = new Set<string>();
          const results: CityLocation[] = [];
          for (const item of data) {
            const addr = item.address;
            if (!addr) continue;
            const city =
              addr.city ??
              addr.town ??
              addr.village ??
              addr.state_district ??
              addr.county;
            if (!city) continue;
            const key = `${city}-${addr.state ?? ""}`;
            if (seen.has(key)) continue;
            seen.add(key);
            results.push({
              city,
              state: addr.state ?? "",
              lat: parseFloat(item.lat ?? "0"),
              lng: parseFloat(item.lon ?? "0"),
            });
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
  const showSearchResults =
    search.trim().length >= 2 && searchResults.length > 0;

  // Separate featured cities for the top row
  const FEATURED_NAMES = [
    "Ahmedabad",
    "Chennai",
    "Delhi",
    "Goa",
    "Hyderabad",
    "Kolkata",
    "Mumbai",
  ];
  const featuredCities = filteredPopular
    .filter((c) => FEATURED_NAMES.includes(c.city))
    .sort(
      (a, b) => FEATURED_NAMES.indexOf(a.city) - FEATURED_NAMES.indexOf(b.city),
    );
  const moreCities = filteredPopular
    .filter((c) => !FEATURED_NAMES.includes(c.city))
    .sort((a, b) => a.city.localeCompare(b.city));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm transition-all"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed top-1/2 left-1/2 z-[10000] w-[95%] max-w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-[38px] bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.15)] sm:p-8">
        {/* Header & Close */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#16304c]">Select Location</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scrollbar max-h-[75vh] overflow-y-auto px-1 pr-2">
          {/* Search Bar */}
          <div className="mt-5 px-1">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search city, area or locality"
              className="box-border w-full rounded-xl border border-[#aeddf873] bg-white px-5 py-3 text-sm text-[#16304c] placeholder-[#5e88ab] transition outline-none focus:ring-2 focus:ring-[#0094CA]/20"
            />
          </div>

          {/* Current Location Action */}
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={detectLocation}
              disabled={detecting}
              className="flex items-center gap-2 text-sm font-semibold text-[#0094CA] transition hover:text-[#007ba8] disabled:opacity-60"
            >
              <LuLocateFixed
                className={`h-4 w-4 ${detecting ? "animate-spin" : ""}`}
              />
              {detecting ? "Detecting location…" : "Use Current Location"}
            </button>
            {current && (
              <span className="text-xs text-[#5e88ab]">
                Current:{" "}
                <strong className="text-[#16304c]">{current.city}</strong>
              </span>
            )}
          </div>

          {showSearchResults ? (
            /* Nominatim API Search Results */
            <div className="mt-8">
              <h3 className="text-sm font-bold text-[#16304c]">
                Search Results
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {searchResults.map((loc) => (
                  <button
                    key={`${loc.city}-${loc.state}`}
                    onClick={() => handleSelect(loc)}
                    className="flex flex-col items-start rounded-xl border border-[#aeddf873] p-3 text-left transition hover:border-[#0094CA] hover:bg-[#f0f9ff]"
                  >
                    <span className="text-sm font-bold text-[#16304c]">
                      {loc.city}
                    </span>
                    <span className="line-clamp-1 text-xs text-[#5e88ab]">
                      {loc.state}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Popular Cities Section (Featured) */}
              {featuredCities.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-sm font-bold text-[#16304c]">
                    Popular Cities
                  </h3>
                  <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5 sm:gap-4 md:grid-cols-7">
                    {featuredCities.map((loc) => (
                      <button
                        key={loc.city}
                        onClick={() => handleSelect(loc)}
                        className="group flex flex-col items-center gap-3"
                      >
                        <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-[#aeddf873] bg-[#f8fcff] transition-all group-hover:border-[#0094CA] group-hover:bg-[#f0f9ff] group-hover:shadow-[0_8px_20px_rgba(0,148,202,0.1)] sm:h-[72px] sm:w-[72px]">
                          {failedImages.has(loc.city) ? (
                            <IoLocationSharp className="h-9 w-9 text-[#0094CA] opacity-80 transition-opacity group-hover:opacity-100 sm:h-10 sm:w-10" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/assets/home/${loc.city.toLowerCase()}.svg`}
                              alt={loc.city}
                              loading="lazy"
                              onError={() =>
                                setFailedImages((prev) =>
                                  new Set(prev).add(loc.city),
                                )
                              }
                              className="h-9 w-9 object-contain opacity-80 transition-opacity group-hover:opacity-100 sm:h-10 sm:w-10"
                            />
                          )}
                        </div>
                        <span className="text-[12px] font-bold text-[#16304c]">
                          {loc.city}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* More Cities Section (List) */}
              {moreCities.length > 0 && (
                <div className="mt-10">
                  <h3 className="text-sm font-bold text-[#16304c]">
                    More Cities
                  </h3>
                  <div className="mt-5 grid grid-cols-3 gap-y-3 text-[12px] font-medium text-[#5e88ab] sm:grid-cols-4 md:grid-cols-6">
                    {moreCities.map((loc) => (
                      <button
                        key={loc.city}
                        onClick={() => handleSelect(loc)}
                        className="text-left transition-colors hover:text-[#0094CA]"
                      >
                        {loc.city}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {searching && (
                <p className="mt-8 text-center text-sm text-[#5e88ab]">
                  Searching...
                </p>
              )}

              {search.trim().length >= 2 &&
                !searching &&
                searchResults.length === 0 &&
                filteredPopular.length === 0 && (
                  <p className="mt-8 text-center text-sm text-[#5e88ab]">
                    No cities found for &ldquo;{search}&rdquo;
                  </p>
                )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
