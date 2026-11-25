"use client";

import { useState, useEffect, useRef } from "react";
import { FiMapPin, FiLoader } from "react-icons/fi";
import debounce from "lodash.debounce";
import {
  newSessionToken,
  resolvePlace,
  searchPlaces,
  type PlaceHit,
} from "~/lib/placeSearch";

interface LocationSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (display_name: string, lat: number, lon: number) => void;
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
  const [suggestions, setSuggestions] = useState<PlaceHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const token = useRef(newSessionToken());

  const fetchSuggestions = useRef(
    debounce(async (query: string) => {
      if (!query || query.length < 3) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        setSuggestions(await searchPlaces(query, token.current));
        setIsOpen(true);
      } catch (err) {
        console.error("Suggestion fetch error:", err);
      } finally {
        setLoading(false);
      }
    }, 500),
  ).current;

  useEffect(() => {
    return () => fetchSuggestions.cancel();
  }, [fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
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
          className={`w-full rounded-lg border border-white/10 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#A020F0] ${className}`}
        />
        {loading && (
          <div className="absolute top-1/2 right-3 -translate-y-1/2">
            <FiLoader className="animate-spin text-[#D8B4FE]" size={16} />
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-[#121426] shadow-xl">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={async () => {
                setIsOpen(false);
                try {
                  const p = await resolvePlace(item, token.current);
                  onSelect(p.label, p.lat, p.lng);
                } catch (err) {
                  console.error("Place details error:", err);
                } finally {
                  token.current = newSessionToken();
                }
              }}
              className="flex w-full items-start gap-3 border-b border-white/10 p-3 text-left transition last:border-0 hover:bg-white/[0.04]"
            >
              <FiMapPin className="mt-1 shrink-0 text-[#777B98]" size={16} />
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                {item.sub && (
                  <p className="text-xs text-[#A5A8C3]">{item.sub}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
