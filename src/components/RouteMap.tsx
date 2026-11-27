import { useEffect, useRef } from "react";
import { Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { CardTheme, RouteGeoJSON } from "@/types/activity";

// Daftarkan worker URL di level modul agar Vite mem-bundle worker secara mandiri
setWorkerUrl(workerUrl);

interface RouteMapProps {
  geoJson: RouteGeoJSON;
  bounds: [[number, number], [number, number]];
  theme: CardTheme;
  className?: string;
}

const THEME_CONFIG: Record<
  CardTheme,
  { tileUrl: string; lineColor: string; casingColor: string }
> = {
  light: {
    tileUrl: "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
    lineColor: "#f97316",
    casingColor: "#ffffff",
  },
  dark: {
    tileUrl: "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
    lineColor: "#a3e635",
    casingColor: "#09090b",
  },
  mint: {
    tileUrl:
      "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
    lineColor: "#059669",
    casingColor: "#ffffff",
  },
};

function createMapStyle(tileUrl: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      "carto-tiles": {
        type: "raster",
        tiles: [tileUrl],
        tileSize: 256,
      },
    },
    layers: [
      {
        id: "base-tiles",
        type: "raster",
        source: "carto-tiles",
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  };
}

export function RouteMap({
  geoJson,
  bounds,
  theme,
  className = "",
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const config = THEME_CONFIG[theme];
    const coords = geoJson.features[0]?.geometry.coordinates ?? [];
    const startCoord = coords[0];
    const endCoord = coords[coords.length - 1];

    const map = new MapLibreMap({
      container: containerRef.current,
      style: createMapStyle(config.tileUrl),
      interactive: false,
      attributionControl: false,
      canvasContextAttributes: {
        preserveDrawingBuffer: true, // Wajib agar html-to-image bisa menangkap canvas WebGL
      },
    });

    mapRef.current = map;

    map.on("load", () => {
      map.addSource("route", {
        type: "geojson",
        data: geoJson,
      });

      map.addLayer({
        id: "route-casing",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": config.casingColor,
          "line-width": 7,
          "line-opacity": 0.85,
        },
      });

      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": config.lineColor,
          "line-width": 4.5,
        },
      });

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
            "circle-radius": 6,
            "circle-color": [
              "match",
              ["get", "role"],
              "start",
              "#22c55e",
              "#ef4444",
            ],
            "circle-stroke-width": 2.5,
            "circle-stroke-color": "#ffffff",
          },
        });
      }

      map.fitBounds(bounds, { padding: 44, animate: false });
    });

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
        mapRef.current.fitBounds(bounds, { padding: 44, animate: false });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [geoJson, bounds, theme]);

  return <div ref={containerRef} className={`h-full w-full ${className}`} />;
}