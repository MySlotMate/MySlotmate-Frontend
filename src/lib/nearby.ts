"use client";

import { useEffect, useState } from "react";
import {
  calculateDistance,
  getSavedLocation,
  type CityLocation,
} from "~/components/LocationModal";
import type { EventDTO } from "~/lib/api";

/** How far counts as "in or near" the chosen city. */
export const NEAR_KM = 40;

/** The city from the top-bar picker; updates when the picker saves. */
export function useSavedLocation(): CityLocation | null {
  const [place, setPlace] = useState<CityLocation | null>(null);
  useEffect(() => {
    const sync = () => setPlace(getSavedLocation());
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return place;
}

/** A real city name, not the placeholder saved before geocoding finishes. */
export function placeName(place: CityLocation | null): string | null {
  return place && place.city !== "Select City" && place.city !== "Unknown"
    ? place.city
    : null;
}

/** In the chosen city (within NEAR_KM), or online so it works from anywhere. */
export function isNear(e: EventDTO, place: CityLocation | null): boolean {
  if (!place?.lat) return false;
  if (e.is_online) return true;
  if (e.location_lat != null && e.location_lng != null)
    return (
      calculateDistance(place.lat, place.lng, e.location_lat, e.location_lng) <=
      NEAR_KM
    );
  return (e.location ?? "").toLowerCase().includes(place.city.toLowerCase());
}

/** Stable sort: near ones first, otherwise the existing order is kept. */
export function nearFirst<T extends EventDTO>(
  list: T[],
  place: CityLocation | null,
): T[] {
  if (!placeName(place)) return list;
  const near: T[] = [];
  const far: T[] = [];
  for (const e of list) (isNear(e, place) ? near : far).push(e);
  return [...near, ...far];
}
