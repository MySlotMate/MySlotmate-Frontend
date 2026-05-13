"use client";

import { useState, useEffect, useRef } from "react";
import { FiMapPin, FiLoader } from "react-icons/fi";
import debounce from "lodash.debounce";

interface NominatimSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  address?: { state?: string };
}

interface LocationSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (display_name: string, lat: string, lon: string) => void;
  placeholder?: string;
  className?: string;
}

export default function LocationSearchInput({
  value,
  onChange,
  onSelect,
  placeholder = "Search location...",
  className = "",
}: LocationSearchInputProps) {
  const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useRef(
    debounce(async (query: string) => {
      if (!query || query.length < 3) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in`,
          { headers: { "User-Agent": "MySlotMate/1.0" } }
        );
        const data = (await res.json()) as NominatimSuggestion[];
        setSuggestions(data);
        setIsOpen(true);
      } catch (err) {
        console.error("Suggestion fetch error:", err);
      } finally {
        setLoading(false);
      }
    }, 500)
  ).current;

  useEffect(() => {
    return () => fetchSuggestions.cancel();
  }, [fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            void fetchSuggestions(e.target.value);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0094CA] ${className}`}
        />
        {loading && (
          <div className="absolute top-1/2 right-3 -translate-y-1/2">
            <FiLoader className="animate-spin text-[#0094CA]" size={16} />
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-xl">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onSelect(item.display_name, item.lat, item.lon);
                setIsOpen(false);
              }}
              className="flex w-full items-start gap-3 border-b border-gray-50 p-3 text-left transition hover:bg-gray-50 last:border-0"
            >
              <FiMapPin className="mt-1 shrink-0 text-gray-400" size={16} />
              <div>
                <p className="text-sm font-medium text-gray-900">{item.display_name}</p>
                {item.address?.state && (
                  <p className="text-xs text-gray-500">{item.address.state}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
