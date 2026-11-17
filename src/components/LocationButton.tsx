"use client";

import { useEffect, useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import LocationModal, {
  cityLabel,
  getSavedLocation,
  type CityLocation,
} from "~/components/LocationModal";

/**
 * The city picker in the app's top bar. Pages that filter by city read the
 * saved location and listen for `storage`, which saveLocation() fires.
 */
export default function LocationButton({
  className = "",
}: {
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loc, setLoc] = useState<CityLocation | null>(null);

  useEffect(() => {
    const sync = () => setLoc(getSavedLocation());
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const label = cityLabel(loc);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label ? `Location: ${label}. Change city` : "Choose city"}
        className={`flex h-10 max-w-[200px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] pr-3 pl-3 text-sm font-medium text-white transition hover:border-white/25 hover:bg-white/[0.07] ${className}`}
      >
        <MapPin className="h-4 w-4 shrink-0 text-[#C9A7FF]" />
        <span className={`truncate ${label ? "" : "text-white/60"}`}>
          {label ?? "Choose city"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-white/50" />
      </button>
      <LocationModal
        open={open}
        onClose={() => setOpen(false)}
        onSelect={setLoc}
        current={loc}
      />
    </>
  );
}
