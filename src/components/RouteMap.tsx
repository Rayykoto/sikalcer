import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  GeoJSONSource,
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
} from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

import { AvatarPreview } from "@/components/AvatarPreview";
import { generateMilestones, getProgressStateAtKm } from "@/lib/gpxParser";
import type {
  ActivityType,
  CardTheme,
  RouteGeoJSON,
  TrackPoint,
} from "@/types/activity";
import type { AvatarConfig } from "@/types/avatar";

setWorkerUrl(workerUrl);

interface RouteMapProps {
  geoJson: RouteGeoJSON;
  points: TrackPoint[];
  bounds: [[number, number], [number, number]];
  theme: CardTheme;
  activityType: ActivityType;
  avatarConfig: AvatarConfig;
  showAvatarOnMap: boolean;
  currentKm: number;
  milestoneIntervalKm: number;
  followAvatar: boolean;
  isPlaying: boolean;
  className?: string;
}

const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "esri-satellite": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
    },
    "carto-labels": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
    },
  },
  layers: [
    {
      id: "satellite-base",
      type: "raster",
      source: "esri-satellite",
      minzoom: 0,
      maxzoom: 19,
    },
    {
      id: "satellite-labels",
      type: "raster",
      source: "carto-labels",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const THEME_CONFIG: Record<
  CardTheme,
  {
    style: string | StyleSpecification;
    baseLineColor: string;
    activeLineColor: string;
    casingColor: string;
  }
> = {
  "3d-city": {
    style: "https://tiles.openfreemap.org/styles/liberty",
    baseLineColor: "#cbd5e1",
    activeLineColor: "#f97316",
    casingColor: "#ffffff",
  },
  satellite: {
    style: SATELLITE_STYLE,
    baseLineColor: "rgba(255,255,255,0.45)",
    activeLineColor: "#38bdf8",
    casingColor: "#0f172a",
  },
  dark: {
    style: "https://tiles.openfreemap.org/styles/dark",
    baseLineColor: "#3f3f46",
    activeLineColor: "#a3e635",
    casingColor: "#09090b",
  },
};

function getMilestoneMessage(km: number, type: ActivityType): string {
  if (km >= 10) return `🏆 ${km} KM! Legenda!`;
  if (km >= 5) return `🔥 ${km} KM tercapai!`;
  return type === "run" ? `⚡ ${km} KM! Gas terus!` : `🚴 ${km} KM! Mantap!`;
}

export function RouteMap({
  geoJson,
  points,
  bounds,
  theme,
  activityType,
  avatarConfig,
  showAvatarOnMap,
  currentKm,
  milestoneIntervalKm,
  followAvatar,
  isPlaying,
  className = "",
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const avatarMarkerRef = useRef<Marker | null>(null);
  const [markerEl, setMarkerEl] = useState<HTMLDivElement | null>(null);

  const milestones = useMemo(
    () => generateMilestones(points, milestoneIntervalKm),
    [points, milestoneIntervalKm]
  );

  const progressState = useMemo(
    () => getProgressStateAtKm(points, currentKm),
    [points, currentKm]
  );

  // Cek apakah avatar sedang berada dekat titik milestone (toleransi ±0.12 km)
  const activeMilestone = useMemo(() => {
    return (
      milestones.find((m) => Math.abs(currentKm - m.km) <= 0.12) ?? null
    );
  }, [milestones, currentKm]);

  // 1. Inisialisasi MapLibre 3D
  useEffect(() => {
    if (!containerRef.current) return;

    const config = THEME_CONFIG[theme];
    const coords = geoJson.features[0]?.geometry.coordinates ?? [];
    const startCoord = coords[0];
    const endCoord = coords[coords.length - 1];

    const map = new MapLibreMap({
      container: containerRef.current,
      style: config.style,
      pitch: 52, // Sudut miring 3D realistis
      bearing: -12,
      interactive: true,
      attributionControl: false,
      canvasContextAttributes: {
        preserveDrawingBuffer: true,
      },
    });

    mapRef.current = map;

    const el = document.createElement("div");
    el.className = "pointer-events-none z-20";
    setMarkerEl(el);

    const marker = new Marker({
      element: el,
      anchor: "bottom",
    })
      .setLngLat(startCoord ?? [106.8018, -6.2185])
      .addTo(map);

    avatarMarkerRef.current = marker;

    map.on("load", () => {
      // Layer 1: Jalur Rute Penuh (Bayangan/Belum Ditempuh)
      map.addSource("route-base", {
        type: "geojson",
        data: geoJson,
      });

      map.addLayer({
        id: "route-base-line",
        type: "line",
        source: "route-base",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": config.baseLineColor,
          "line-width": 5,
          "line-opacity": 0.75,
        },
      });

      // Layer 2: Jalur Aktif yang Sudah Dilewati Avatar
      map.addSource("route-progress", {
        type: "geojson",
        data: progressState.completedGeoJson,
      });

      map.addLayer({
        id: "route-progress-casing",
        type: "line",
        source: "route-progress",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": config.casingColor,
          "line-width": 8,
          "line-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "route-progress-line",
        type: "line",
        source: "route-progress",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": config.activeLineColor,
          "line-width": 5,
        },
      });

      // Layer 3: Titik Milestone (Setiap X km)
      if (milestones.length > 0) {
        map.addSource("milestones", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: milestones.map((m) => ({
              type: "Feature",
              properties: { label: m.label },
              geometry: { type: "Point", coordinates: [m.lon, m.lat] },
            })),
          },
        });

        map.addLayer({
          id: "milestones-circle",
          type: "circle",
          source: "milestones",
          paint: {
            "circle-radius": 6.5,
            "circle-color": "#f59e0b",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });

        map.addLayer({
          id: "milestones-label",
          type: "symbol",
          source: "milestones",
          layout: {
            "text-field": ["get", "label"],
            "text-size": 10,
            "text-offset": [0, 1.3],
            "text-anchor": "top",
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#18181b",
            "text-halo-width": 1.5,
          },
        });
      }

      // Layer 4: Titik Start & Finish
      if (startCoord && endCoord) {
        map.addSource("endpoints", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: { role: "start" },
                geometry: { type: "Point", coordinates: startCoord },
              },
              {
                type: "Feature",
                properties: { role: "end" },
                geometry: { type: "Point", coordinates: endCoord },
              },
            ],
          },
        });

        map.addLayer({
          id: "endpoints-circle",
          type: "circle",
          source: "endpoints",
          paint: {
            "circle-radius": 5.5,
            "circle-color": [
              "match",
              ["get", "role"],
              "start",
              "#22c55e",
              "#ef4444",
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });
      }

      map.fitBounds(bounds, { padding: 48, pitch: 52, animate: false });
    });

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      marker.remove();
      map.remove();
      mapRef.current = null;
      avatarMarkerRef.current = null;
      setMarkerEl(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoJson, bounds, theme, milestones]);

  // 2. Update Posisi Avatar & Garis Progres Secara Real-Time
  useEffect(() => {
    const map = mapRef.current;
    const marker = avatarMarkerRef.current;

    if (marker) {
      marker.setLngLat(progressState.currentCoord);
    }

    if (map && map.isStyleLoaded()) {
      const source = map.getSource("route-progress") as
        | GeoJSONSource
        | undefined;
      if (source) {
        source.setData(progressState.completedGeoJson);
      }

      if (followAvatar) {
        map.easeTo({
          center: progressState.currentCoord,
          zoom: Math.max(map.getZoom(), 15.2),
          pitch: 58,
          duration: 180,
        });
      }
    }
  }, [progressState, followAvatar]);

  // Kembalikan zoom full rute ketika Follow Avatar dimatikan
  useEffect(() => {
    const map = mapRef.current;
    if (!followAvatar && map && map.isStyleLoaded()) {
      map.fitBounds(bounds, { padding: 48, pitch: 52, duration: 500 });
    }
  }, [followAvatar, bounds]);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <div ref={containerRef} className="h-full w-full" />

      {/* Portal Avatar Bergerak di Atas Jalur Peta */}
      {markerEl &&
        showAvatarOnMap &&
        createPortal(
          <div className="flex flex-col items-center">
            {/* Bubble Reaksi saat melewati kelipatan X KM */}
            {activeMilestone && (
              <div className="mb-1 whitespace-nowrap rounded-full bg-amber-400 px-2.5 py-0.5 text-[11px] font-extrabold text-zinc-950 shadow-lg ring-2 ring-white animate-bounce">
                {getMilestoneMessage(activeMilestone.km, activityType)}
              </div>
            )}

            {/* Avatar dengan Animasi Gerak saat berjalan atau mencapai milestone */}
            <div
              className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-white shadow-xl transition-transform ${
                activeMilestone
                  ? "scale-125 ring-4 ring-amber-400/70 animate-bounce"
                  : isPlaying
                  ? "animate-pulse"
                  : ""
              }`}
            >
              <AvatarPreview config={avatarConfig} className="h-11 w-11" />
            </div>

            {/* Pin Penunjuk Titik Jalur */}
            <div className="h-2 w-2 -mt-1 rotate-45 bg-white shadow-xs" />
          </div>,
          markerEl
        )}
    </div>
  );
}