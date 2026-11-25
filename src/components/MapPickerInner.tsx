"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { mapTiles, OSM_TILES, useGoogle } from "~/lib/placeSearch";

// Fix Leaflet marker icon issue in Next.js
const fixLeafletIcon = () => {
  // @ts-expect-error Leaflet types don't expose _getIconUrl, but it must be cleared for Next.js bundling.
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
};

function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);
  return null;
}

function LocationEvents({
  onPositionChange,
}: {
  onPositionChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface MapPickerInnerProps {
  initialPos: [number, number];
  selectedPos: [number, number] | null;
  onPositionChange: (lat: number, lng: number) => void;
}

export default function MapPickerInner({
  initialPos,
  selectedPos,
  onPositionChange,
}: MapPickerInnerProps) {
  // null while the Google tile session is being created, so OSM never flashes first.
  const [tiles, setTiles] = useState(useGoogle ? null : OSM_TILES);
  useEffect(() => {
    fixLeafletIcon();
    void mapTiles().then(setTiles);
  }, []);

  return (
    <MapContainer
      center={initialPos}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
    >
      {tiles && (
        <TileLayer
          key={tiles.url}
          attribution={tiles.attribution}
          url={tiles.url}
          maxZoom={tiles === OSM_TILES ? 19 : 22}
        />
      )}
      {selectedPos && <Marker position={selectedPos} />}
      <LocationEvents onPositionChange={onPositionChange} />
      <MapController center={selectedPos} />
    </MapContainer>
  );
}
