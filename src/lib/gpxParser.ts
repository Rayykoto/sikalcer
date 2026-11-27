import type { ActivityData, ActivityType, TrackPoint } from "@/types/activity";

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineDistanceKm(p1: TrackPoint, p2: TrackPoint): number {
  const R = 6371; // Radius bumi dalam km
  const dLat = toRad(p2.lat - p1.lat);
  const dLon = toRad(p2.lon - p1.lon);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(p1.lat)) *
      Math.cos(toRad(p2.lat)) *
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

  // Ambil judul aktivitas dari tag <trk><name> atau <metadata><name>
  const rawTitle =
    xmlDoc.querySelector("trk > name")?.textContent?.trim() ||
    xmlDoc.querySelector("metadata > name")?.textContent?.trim() ||
    (defaultType === "run" ? "Morning Run" : "Morning Ride");

  // Deteksi otomatis tipe olahraga jika tag <type> tersedia di GPX
  const gpxTypeTag = xmlDoc
    .querySelector("trk > type")
    ?.textContent?.toLowerCase();
  let detectedType: ActivityType = defaultType;
  if (gpxTypeTag?.includes("cycl") || gpxTypeTag?.includes("ride") || gpxTypeTag?.includes("bik")) {
    detectedType = "ride";
  } else if (gpxTypeTag?.includes("run")) {
    detectedType = "run";
  }

  // Ekstrak seluruh titik koordinat <trkpt>
  const trkpts = Array.from(xmlDoc.querySelectorAll("trkpt"));
  if (trkpts.length < 2) {
    throw new Error("File GPX tidak memiliki cukup titik rute GPS.");
  }

  const points: TrackPoint[] = [];
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  for (const pt of trkpts) {
    const lat = parseFloat(pt.getAttribute("lat") || "0");
    const lon = parseFloat(pt.getAttribute("lon") || "0");
    const eleText = pt.querySelector("ele")?.textContent;
    const timeText = pt.querySelector("time")?.textContent;

    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;

    points.push({
      lat,
      lon,
      ele: eleText ? parseFloat(eleText) : undefined,
      time: timeText ? new Date(timeText).getTime() : undefined,
    });
  }

  // Kalkulasi jarak & elevasi
  let totalDistanceKm = 0;
  let elevationGain = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    totalDistanceKm += haversineDistanceKm(prev, curr);

    if (prev.ele !== undefined && curr.ele !== undefined) {
      const diff = curr.ele - prev.ele;
      if (diff > 0) {
        elevationGain += diff;
      }
    }
  }

  // Kalkulasi durasi dari timestamp pertama dan terakhir
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