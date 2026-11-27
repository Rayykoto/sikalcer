import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { toPng } from "html-to-image";
import {
  Bike,
  Download,
  Footprints,
  Sparkles,
  Upload,
} from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShareCardPreview } from "@/components/ShareCardPreview";
import type { CardAspectRatio } from "@/components/ShareCardPreview";
import { parseGpxFile } from "@/lib/gpxParser";
import type { ActivityData, ActivityType, CardTheme } from "@/types/activity";

const SAMPLE_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ProjectRunningMap">
  <trk>
    <name>Loop Pagi GBK Senayan</name>
    <type>running</type>
    <trkseg>
      <trkpt lat="-6.2185" lon="106.8018"><ele>12</ele><time>2026-11-27T06:00:00Z</time></trkpt>
      <trkpt lat="-6.2162" lon="106.8035"><ele>14</ele><time>2026-11-27T06:04:10Z</time></trkpt>
      <trkpt lat="-6.2155" lon="106.8062"><ele>15</ele><time>2026-11-27T06:08:30Z</time></trkpt>
      <trkpt lat="-6.2182" lon="106.8075"><ele>13</ele><time>2026-11-27T06:13:00Z</time></trkpt>
      <trkpt lat="-6.2212" lon="106.8058"><ele>11</ele><time>2026-11-27T06:17:45Z</time></trkpt>
      <trkpt lat="-6.2215" lon="106.8025"><ele>12</ele><time>2026-11-27T06:22:15Z</time></trkpt>
      <trkpt lat="-6.2186" lon="106.8018"><ele>12</ele><time>2026-11-27T06:26:40Z</time></trkpt>
    </trkseg>
  </trk>
</gpx>`;

const MOOD_PRESETS = [
  "Lari cari sarapan",
  "Pace keong santai",
  "Gowes anti-stres",
  "Keringetan dikit",
];

export function App() {
  const [activity, setActivity] = useState<ActivityData>(() =>
    parseGpxFile(SAMPLE_GPX, "run")
  );
  const [activityType, setActivityType] = useState<ActivityType>("run");
  const [customTitle, setCustomTitle] = useState<string>("Loop Pagi GBK Senayan");
  const [moodTag, setMoodTag] = useState<string>("Lari cari sarapan");
  const [theme, setTheme] = useState<CardTheme>("light");
  const [aspectRatio, setAspectRatio] = useState<CardAspectRatio>("square");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processFile = async (file: File) => {
    setErrorMsg(null);
    if (!file.name.toLowerCase().endsWith(".gpx")) {
      setErrorMsg("Mohon unggah file dengan format .gpx");
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseGpxFile(text, activityType);
      setActivity(parsed);
      setActivityType(parsed.type);
      setCustomTitle(parsed.title);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal membaca file GPX."
      );
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleLoadSample = () => {
    setErrorMsg(null);
    const parsed = parseGpxFile(SAMPLE_GPX, "run");
    setActivity(parsed);
    setActivityType("run");
    setCustomTitle(parsed.title);
  };

  const handleExportPng = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `${customTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") || "activity"}-card.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setErrorMsg("Gagal mengekspor gambar. Coba ulangi beberapa saat lagi.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100/80 text-zinc-900">
      {/* Top Navbar */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white font-bold text-sm">
              RM
            </div>
            <span className="font-bold tracking-tight">
              Project Running Map
            </span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
              V1 Standard
            </span>
          </div>

          <Button
            onClick={() => void handleExportPng()}
            disabled={isExporting}
            size="sm"
          >
            <Download className="mr-1.5 h-4 w-4" />
            {isExporting ? "Menyimpan..." : "Download PNG"}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-12">
        {/* Panel Kiri: Upload & Kontrol */}
        <div className="space-y-6 lg:col-span-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">1. Upload Rute (.GPX)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50/70 px-4 py-6 text-center transition hover:border-zinc-400 hover:bg-zinc-100/70"
              >
                <Upload className="mb-2 h-6 w-6 text-zinc-500" />
                <p className="text-sm font-medium">
                  Klik atau seret file <span className="font-bold">.gpx</span> ke sini
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Ekspor dari Strava, Garmin Connect, atau Apple Health
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".gpx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  Belum punya file GPX?
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleLoadSample}
                >
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Muat Rute Contoh
                </Button>
              </div>

              {errorMsg && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                  {errorMsg}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">2. Detail & Gaya Kartu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Jenis Olahraga */}
              <div className="space-y-1.5">
                <Label className="text-xs">Jenis Aktivitas</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={activityType === "run" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActivityType("run")}
                  >
                    <Footprints className="mr-1.5 h-4 w-4" />
                    Lari (Pace)
                  </Button>
                  <Button
                    type="button"
                    variant={activityType === "ride" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActivityType("ride")}
                  >
                    <Bike className="mr-1.5 h-4 w-4" />
                    Sepeda (Speed)
                  </Button>
                </div>
              </div>

              {/* Judul Aktivitas */}
              <div className="space-y-1.5">
                <Label htmlFor="activity-title" className="text-xs">
                  Judul Aktivitas
                </Label>
                <Input
                  id="activity-title"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Contoh: Lari Pagi Sudirman"
                />
              </div>

              {/* Stiker Mood */}
              <div className="space-y-1.5">
                <Label htmlFor="mood-tag" className="text-xs">
                  Label Mood / Konteks
                </Label>
                <Input
                  id="mood-tag"
                  value={moodTag}
                  onChange={(e) => setMoodTag(e.target.value)}
                  placeholder="Kosongkan jika tidak perlu"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {MOOD_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setMoodTag(preset)}
                      className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[11px] text-zinc-600 transition hover:bg-zinc-200/70"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tema Warna */}
              <div className="space-y-1.5">
                <Label className="text-xs">Tema Kartu</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["light", "dark", "mint"] as CardTheme[]).map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant={theme === t ? "default" : "outline"}
                      size="sm"
                      className="capitalize"
                      onClick={() => setTheme(t)}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Rasio Gambar */}
              <div className="space-y-1.5">
                <Label className="text-xs">Ukuran Export</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={aspectRatio === "square" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAspectRatio("square")}
                  >
                    1:1 (Feed / Post)
                  </Button>
                  <Button
                    type="button"
                    variant={aspectRatio === "story" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAspectRatio("story")}
                  >
                    9:16 (IG Story / TikTok)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel Kanan: Live Preview */}
        <div className="flex flex-col items-center justify-start lg:col-span-7">
          <div className="sticky top-8 flex w-full flex-col items-center">
            <ShareCardPreview
              ref={cardRef}
              activity={activity}
              overrideType={activityType}
              customTitle={customTitle}
              moodTag={moodTag}
              theme={theme}
              aspectRatio={aspectRatio}
            />
            <p className="mt-3 text-xs text-zinc-500">
              Preview langsung — klik tombol <strong>Download PNG</strong> di pojok kanan atas untuk menyimpan.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;