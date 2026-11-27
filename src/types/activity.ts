export type ActivityType = "run" | "ride";

export type CardTheme = "light" | "dark" | "mint";

export interface TrackPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: number;
}

export interface RouteGeoJSON {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: {
      type: "LineString";
      coordinates: Array<[number, number]>; // [lon, lat]
    };
  }>;
}

export interface ActivityData {
  id: string;
  type: ActivityType;
  title: string;
  date: string;
  distanceKm: number;
  durationSeconds: number;
  elevationGain: number;
  paceFormatted: string; // contoh: "5:30" (/km)
  speedFormatted: string; // contoh: "24.5" (km/h)
  durationFormatted: string; // contoh: "45m 12s" atau "1j 20m"
  bounds: [[number, number], [number, number]]; // [[minLon, minLat], [maxLon, maxLat]]
  geoJson: RouteGeoJSON;
}