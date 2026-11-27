import type {
  ActivityData,
  ActivityType,
  MilestoneMarker,
  RouteGeoJSON,
  TrackPoint,
} from "@/types/activity";

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "-";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}j ${minutes}m`;
  }
  return `${minutes}m ${seconds}d`;
}

function formatPace(distanceKm: number, durationSeconds: number): string {
  if (distanceKm <= 0 || durationSeconds <= 0) return "-:--";
  const paceSecondsPerKm = durationSeconds / distanceKm;
  const mins = Math.floor(paceSecondsPerKm / 60);
  const secs = Math.floor(paceSecondsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatSpeed(distanceKm: number, durationSeconds: number): string {
  if (distanceKm <= 0 || durationSeconds <= 0) return "0.0";
  const hours = durationSeconds / 3600;
  return (distanceKm / hours).toFixed(1);
}

/**
 * Menginterpolasi koordinat [lon, lat] & rute yang sudah ditempuh pada jarak targetKm
 */
export function getProgressStateAtKm(
  points: TrackPoint[],
  targetKm: number
): {
  currentCoord: [number, number];
  completedGeoJson: RouteGeoJSON;
} {
  if (points.length === 0) {
    return {
      currentCoord: [106.8018, -6.2185],
      completedGeoJson: { type: "FeatureCollection", features: [] },
    };
  }

  if (targetKm <= 0) {
    const first = points[0];
    return {
      currentCoord: [first.lon, first.lat],
      completedGeoJson: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [[first.lon, first.lat]],
            },
          },
        ],
      },
    };
  }

  const last = points[points.length - 1];
  if (targetKm >= last.cumulativeKm) {
    return {
      currentCoord: [last.lon, last.lat],
      completedGeoJson: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: points.map((p) => [p.lon, p.lat]),
            },
          },
        ],
      },
    };
  }

  const completedCoords: Array<[number, number]> = [[points[0].lon, points[0].lat]];
  let currentCoord: [number, number] = [points[0].lon, points[0].lat];

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    if (curr.cumulativeKm < targetKm) {
      completedCoords.push([curr.lon, curr.lat]);
    } else {
      const segmentDist = curr.cumulativeKm - prev.cumulativeKm;
      const ratio =
        segmentDist > 0 ? (targetKm - prev.cumulativeKm) / segmentDist : 0;
      const interpLon = prev.lon + (curr.lon - prev.lon) * ratio;
      const interpLat = prev.lat + (curr.lat - prev.lat) * ratio;
      currentCoord = [interpLon, interpLat];
      completedCoords.push(currentCoord);
      break;
    }
  }

  return {
    currentCoord,
    completedGeoJson: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: completedCoords,
          },
        },
      ],
    },
  };
}

/**
 * Membuat titik bendera milestone setiap kelipatan intervalKm (misal tiap 1 km atau 5 km)
 */
export function generateMilestones(
  points: TrackPoint[],
  intervalKm: number
): MilestoneMarker[] {
  if (points.length < 2 || intervalKm <= 0) return [];
  const totalKm = points[points.length - 1].cumulativeKm;
  const milestones: MilestoneMarker[] = [];

  for (let km = intervalKm; km < totalKm; km += intervalKm) {
    const roundedKm = Number(km.toFixed(1));
    const { currentCoord } = getProgressStateAtKm(points, roundedKm);
    milestones.push({
      km: roundedKm,
      lon: currentCoord[0],
      lat: currentCoord[1],
      label: `${roundedKm} KM`,
    });
  }

  return milestones;
}

export function parseGpxFile(
  xmlString: string,
  defaultType: ActivityType = "run"
): ActivityData {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError) {
    throw new Error("Format file GPX tidak valid atau rusak.");
  }

  const rawTitle =
    xmlDoc.querySelector("trk > name")?.textContent?.trim() ||
    xmlDoc.querySelector("metadata > name")?.textContent?.trim() ||
    (defaultType === "run" ? "Morning Run" : "Morning Ride");

  const gpxTypeTag = xmlDoc
    .querySelector("trk > type")
    ?.textContent?.toLowerCase();
  let detectedType: ActivityType = defaultType;
  if (
    gpxTypeTag?.includes("cycl") ||
    gpxTypeTag?.includes("ride") ||
    gpxTypeTag?.includes("bik")
  ) {
    detectedType = "ride";
  } else if (gpxTypeTag?.includes("run")) {
    detectedType = "run";
  }

  const trkpts = Array.from(xmlDoc.querySelectorAll("trkpt"));
  if (trkpts.length < 2) {
    throw new Error("File GPX tidak memiliki cukup titik rute GPS.");
  }

  const points: TrackPoint[] = [];
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  let totalDistanceKm = 0;
  let elevationGain = 0;

  for (let i = 0; i < trkpts.length; i++) {
    const pt = trkpts[i];
    const lat = parseFloat(pt.getAttribute("lat") || "0");
    const lon = parseFloat(pt.getAttribute("lon") || "0");
    const eleText = pt.querySelector("ele")?.textContent;
    const timeText = pt.querySelector("time")?.textContent;
    const ele = eleText ? parseFloat(eleText) : undefined;
    const time = timeText ? new Date(timeText).getTime() : undefined;

    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;

    if (i > 0) {
      const prev = points[i - 1];
      totalDistanceKm += haversineDistanceKm(prev.lat, prev.lon, lat, lon);

      if (prev.ele !== undefined && ele !== undefined) {
        const diff = ele - prev.ele;
        if (diff > 0) {
          elevationGain += diff;
        }
      }
    }

    points.push({
      lat,
      lon,
      ele,
      time,
      cumulativeKm: totalDistanceKm,
    });
  }

  const firstTime = points[0].time;
  const lastTime = points[points.length - 1].time;
  const durationSeconds =
    firstTime && lastTime && lastTime > firstTime
      ? Math.floor((lastTime - firstTime) / 1000)
      : 0;

  const activityDate = firstTime
    ? new Date(firstTime).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

  return {
    id: crypto.randomUUID(),
    type: detectedType,
    title: rawTitle,
    date: activityDate,
    distanceKm: Number(totalDistanceKm.toFixed(2)),
    durationSeconds,
    elevationGain: Math.round(elevationGain),
    paceFormatted: formatPace(totalDistanceKm, durationSeconds),
    speedFormatted: formatSpeed(totalDistanceKm, durationSeconds),
    durationFormatted: formatDuration(durationSeconds),
    bounds: [
      [minLon, minLat],
      [maxLon, maxLat],
    ],
    points,
    geoJson: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: points.map((p) => [p.lon, p.lat]),
          },
        },
      ],
    },
  };
}