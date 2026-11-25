// Location search for the host event forms.
// PROVIDER below picks the search: "google" = Google Places (New), "osm" =
// OpenStreetMap Nominatim. To roll back to OpenStreetMap, set it to "osm".
// Google also needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; without it OSM is used.
// A failing Google call (quota, bad key, referrer block) falls back to Nominatim
// for that search, so the form never loses search entirely.
// The key ships in the browser bundle: keep it HTTP-referrer restricted to
// myslotmate domains and API-restricted to Places API (New) in Cloud Console.
import { env } from "~/env";

const PROVIDER: "google" | "osm" = "google";

const KEY = env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
export const useGoogle = (PROVIDER as string) === "google" && KEY.length > 0;

/** `lat`/`lng` are set for OSM hits; Google hits carry `placeId` and need resolvePlace. */
export type PlaceHit = {
  label: string;
  sub?: string;
  placeId?: string;
  lat?: number;
  lng?: number;
};

/** One token per search-then-pick cycle so Google bills it as one session. */
export const newSessionToken = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

async function searchOsm(q: string): Promise<PlaceHit[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=in&addressdetails=1`,
  );
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  const data = (await res.json()) as {
    display_name: string;
    lat: string;
    lon: string;
    address?: { state?: string };
  }[];
  return data.map((d) => ({
    label: d.display_name,
    sub: d.address?.state,
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
  }));
}

async function searchGoogle(q: string, token: string): Promise<PlaceHit[]> {
  const res = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": KEY,
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat",
      },
      body: JSON.stringify({
        input: q,
        sessionToken: token,
        includedRegionCodes: ["in"],
      }),
    },
  );
  if (!res.ok) throw new Error(`places ${res.status}`);
  const json = (await res.json()) as {
    suggestions?: {
      placePrediction?: {
        placeId: string;
        text?: { text?: string };
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
      };
    }[];
  };
  return (json.suggestions ?? []).flatMap((s) => {
    const p = s.placePrediction;
    if (!p?.placeId) return [];
    return [
      {
        placeId: p.placeId,
        label: p.text?.text ?? p.structuredFormat?.mainText?.text ?? "",
        sub: p.structuredFormat?.secondaryText?.text,
      },
    ];
  });
}

export async function searchPlaces(
  q: string,
  token: string,
): Promise<PlaceHit[]> {
  if (useGoogle) {
    try {
      return await searchGoogle(q, token);
    } catch (err) {
      console.warn("Google Places failed, using OpenStreetMap:", err);
    }
  }
  return searchOsm(q);
}

/** Coordinates + display text for a picked hit. */
export async function resolvePlace(
  hit: PlaceHit,
  token: string,
): Promise<{ label: string; lat: number; lng: number }> {
  if (hit.lat != null && hit.lng != null)
    return { label: hit.label, lat: hit.lat, lng: hit.lng };
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${hit.placeId}?sessionToken=${token}`,
    {
      headers: {
        "X-Goog-Api-Key": KEY,
        "X-Goog-FieldMask": "location,formattedAddress,displayName.text",
      },
    },
  );
  if (!res.ok) throw new Error(`place ${res.status}`);
  const p = (await res.json()) as {
    location?: { latitude: number; longitude: number };
    formattedAddress?: string;
    displayName?: { text?: string };
  };
  if (!p.location) throw new Error("place has no location");
  const name = p.displayName?.text ?? "";
  const addr = p.formattedAddress ?? "";
  return {
    label:
      name && addr && !addr.startsWith(name)
        ? `${name}, ${addr}`
        : addr || name || hit.label,
    lat: p.location.latitude,
    lng: p.location.longitude,
  };
}

/** Address for a map click. Google Geocoding, OpenStreetMap if Google fails. */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  if (useGoogle) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${KEY}`,
      );
      const j = (await res.json()) as {
        status: string;
        results?: { formatted_address: string }[];
      };
      if (j.status === "OK" && j.results?.[0])
        return j.results[0].formatted_address;
      if (j.status === "ZERO_RESULTS") return null;
      throw new Error(`geocode ${j.status}`);
    } catch (err) {
      console.warn("Google Geocoding failed, using OpenStreetMap:", err);
    }
  }
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
  );
  const d = (await res.json()) as { display_name?: string } | null;
  return d?.display_name ?? null;
}

/**
 * Leaflet tile layer for the map picker: Google Map Tiles API (2D roadmap) when
 * Google is on, OpenStreetMap otherwise or if the session call fails.
 */
export type TileSource = { url: string; attribution: string };
export const OSM_TILES: TileSource = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};
let tileSource: Promise<TileSource> | null = null;
export function mapTiles(): Promise<TileSource> {
  if (!useGoogle) return Promise.resolve(OSM_TILES);
  tileSource ??= fetch(
    `https://tile.googleapis.com/v1/createSession?key=${KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mapType: "roadmap",
        language: "en-US",
        region: "IN",
      }),
    },
  )
    .then(async (res) => {
      const j = (await res.json()) as { session?: string };
      if (!res.ok || !j.session) throw new Error(`tiles ${res.status}`);
      return {
        url: `https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${j.session}&key=${KEY}`,
        attribution: `Map data &copy;${new Date().getFullYear()} Google`,
      };
    })
    .catch((err) => {
      console.warn("Google Map Tiles failed, using OpenStreetMap:", err);
      tileSource = null; // retry next time the picker opens
      return OSM_TILES;
    });
  return tileSource;
}
