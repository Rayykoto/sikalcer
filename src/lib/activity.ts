export type ActivityType = "run" | "ride";

export type CardTheme = "3d-city" | "satellite" | "dark";

export interface TrackPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: number;
  cumulativeKm: number;
}

export interface MilestoneMarker {
  km: number;
  lat: number;
  lon: number;
  label: string;
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
  paceFormatted: string;
  speedFormatted: string;
  durationFormatted: string;
  bounds: [[number, number], [number, number]];
  points: TrackPoint[];
  geoJson: RouteGeoJSON;
}