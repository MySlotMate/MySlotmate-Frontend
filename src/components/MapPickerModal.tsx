"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { FiX, FiCheck, FiSearch, FiMapPin, FiLoader } from "react-icons/fi";
import "leaflet/dist/leaflet.css";
import debounce from "lodash.debounce";

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  address?: Record<string, string>;
}

const MapPickerInner = dynamic(() => import("./MapPickerInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0094CA]" />
        <p className="text-sm text-gray-400">Loading interactive map...</p>
      </div>
    </div>
  ),
});

interface MapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
}

export default function MapPickerModal({
  isOpen,
  onClose,
  onSelect,
  initialLat = 26.1445,
  initialLng = 91.7362,
}: MapPickerModalProps) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [initialCenter, setInitialCenter] = useState<[number, number]>([initialLat, initialLng]);

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
        const data = (await res.json()) as NominatimResult[];
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 500)
  ).current;

  useEffect(() => {
    return () => fetchSuggestions.cancel();
  }, [fetchSuggestions]);

  const handleSelectSuggestion = (item: NominatimResult) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setSelectedPos([lat, lng]);
    setInitialCenter([lat, lng]);
    setAddress(item.display_name);
    setSearchQuery(item.display_name);
    setShowSuggestions(false);
  };

  const handleConfirm = () => {
    if (selectedPos) {
      onSelect(selectedPos[0], selectedPos[1], address);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex h-full max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Pick Location on Map</h2>
            <p className="text-xs text-gray-500">Search for a place or click on the map</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <FiX size={20} />
          </button>
        </div>

        {/* Search Input with Suggestions */}
        <div className="relative p-4">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <FiSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  void fetchSuggestions(e.target.value);
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                placeholder="Type to search for related places..."
                className="w-full rounded-lg border border-gray-200 py-2.5 pr-10 pl-10 text-sm outline-none focus:ring-2 focus:ring-[#0094CA]/20"
              />
              {loading && (
                <div className="absolute top-1/2 right-3 -translate-y-1/2">
                  <FiLoader className="animate-spin text-[#0094CA]" size={16} />
                </div>
              )}
            </div>
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-4 right-4 z-[1001] mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-2xl">
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSuggestion(item)}
                  className="flex w-full items-start gap-3 border-b border-gray-50 p-3 text-left transition hover:bg-gray-50 last:border-0"
                >
                  <FiMapPin className="mt-1 shrink-0 text-gray-400" size={16} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.display_name}</p>
                    {item.type && (
                      <p className="text-xs text-[#0094CA] capitalize">{item.type.replace(/_/g, ' ')}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="relative flex-1 bg-gray-100">
          <MapPickerInner
            initialPos={initialCenter}
            selectedPos={selectedPos}
            onPositionChange={(lat, lng) => {
              setSelectedPos([lat, lng]);
              void (async () => {
                try {
                  const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
                    { headers: { "User-Agent": "MySlotMate/1.0" } }
                  );
                  const data = (await res.json()) as NominatimResult | null;
                  if (data?.display_name) {
                    setAddress(data.display_name);
                  }
                } catch (err) {
                  console.error(err);
                }
              })();
            }}
          />
          
          {/* Address Overlay */}
          <div className="absolute bottom-4 left-4 right-4 z-[1000]">
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-full bg-[#0094CA]/10 p-2 text-[#0094CA]">
                  <FiMapPin size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Selected Location</p>
                  <p className="line-clamp-2 text-sm font-medium text-gray-800">{address || "Click on map to select..."}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 p-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!address}
            className="flex items-center gap-2 rounded-lg bg-[#0094CA] px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-[#007ba8] disabled:opacity-50"
          >
            <FiCheck />
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}
