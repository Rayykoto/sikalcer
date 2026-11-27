import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { toPng } from "html-to-image";
import {
  Bike,
  Check,
  Copy,
  Download,
  Footprints,
  MapPin,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Upload,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AvatarCustomizer } from "@/components/AvatarCustomizer";
import { ShareCardPreview } from "@/components/ShareCardPreview";
import type { CardAspectRatio } from "@/components/ShareCardPreview";
import { parseGpxFile } from "@/lib/gpxParser";
import { downloadSampleGpx } from "@/lib/sampleGpx";
import { createShareableLink, fetchSharedActivity } from "@/lib/shareService";
import type { ActivityData, ActivityType, CardTheme } from "@/types/activity";
import { DEFAULT_AVATAR_CONFIG } from "@/types/avatar";
import type { AvatarConfig } from "@/types/avatar";

const AVATAR_STORAGE_KEY = "prm_avatar_config_v1";

// Rute contoh ±5.3 km (GBK -> Sudirman -> Dukuh Atas -> kembali ke GBK)
const SAMPLE_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Sikalcer">
  <trk>
    <name>Sudirman Loop 5K Pagi</name>
    <type>running</type>
    <trkseg>
      <trkpt lat="-6.2245" lon="106.8050"><ele>12</ele><time>2026-11-27T06:00:00Z</time></trkpt>
      <trkpt lat="-6.2202" lon="106.8092"><ele>14</ele><time>2026-11-27T06:03:40Z</time></trkpt>
      <trkpt lat="-6.2150" lon="106.8145"><ele>15</ele><time>2026-11-27T06:08:10Z</time></trkpt>
      <trkpt lat="-6.2095" lon="106.8195"><ele>16</ele><time>2026-11-27T06:13:00Z</time></trkpt>
      <trkpt lat="-6.2035" lon="106.8225"><ele>14</ele><time>2026-11-27T06:17:30Z</time></trkpt>
      <trkpt lat="-6.2038" lon="106.8235"><ele>14</ele><time>2026-11-27T06:18:20Z</time></trkpt>
      <trkpt lat="-6.2098" lon="106.8204"><ele>16</ele><time>2026-11-27T06:22:50Z</time></trkpt>
      <trkpt lat="-6.2155" lon="106.8152"><ele>15</ele><time>2026-11-27T06:27:30Z</time></trkpt>
      <trkpt lat="-6.2208" lon="106.8098"><ele>13</ele><time>2026-11-27T06:31:50Z</time></trkpt>
      <trkpt lat="-6.2246" lon="106.8055"><ele>12</ele><time>2026-11-27T06:35:10Z</time></trkpt>
    </trkseg>
  </trk>
</gpx>`;

const MOOD_PRESETS = [
  "Lari cari sarapan",
  "Pace keong santai",
  "Gowes anti-stres",
  "Keringetan dikit",
];

const THEME_LABELS: Array<{ id: CardTheme; label: string }> = [
  { id: "3d-city", label: "3D Kota" },
  { id: "satellite", label: "Satelit Real" },
  { id: "dark", label: "Dark 3D" },
];

function loadSavedAvatar(): AvatarConfig {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (!raw) return DEFAULT_AVATAR_CONFIG;
    return { ...DEFAULT_AVATAR_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AVATAR_CONFIG;
  }
}

export function App() {
  const [activity, setActivity] = useState<ActivityData>(() =>
    parseGpxFile(SAMPLE_GPX, "run")
  );
  const [activityType, setActivityType] = useState<ActivityType>("run");
  const [customTitle, setCustomTitle] = useState<string>("Sudirman Loop 5K Pagi");
  const [moodTag, setMoodTag] = useState<string>("Lari cari sarapan");
  const [theme, setTheme] = useState<CardTheme>("3d-city");
  const [aspectRatio, setAspectRatio] = useState<CardAspectRatio>("square");
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(loadSavedAvatar);
  const [showAvatar, setShowAvatar] = useState<boolean>(true);

  // State untuk pergerakan interaktif avatar di peta
  const [currentKm, setCurrentKm] = useState<number>(5.0);
  const [milestoneIntervalKm, setMilestoneIntervalKm] = useState<number>(5);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(3);
  const [followAvatar, setFollowAvatar] = useState<boolean>(false);

  // State untuk export PNG & Share Link
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isViewerMode, setIsViewerMode] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(avatarConfig));
    } catch {
      // Abaikan jika storage penuh
    }
  }, [avatarConfig]);

  // Deteksi /s/<id> atau ?s=<id> saat halaman dibuka dari link yang dibagikan
  useEffect(() => {
    const pathMatch = window.location.pathname.match(/^\/s\/([a-z0-9]+)/i);
    const params = new URLSearchParams(window.location.search);
    const shareId = pathMatch?.[1] || params.get("s");
    if (!shareId) return;

    setIsViewerMode(true);
    void fetchSharedActivity(shareId).then((shared) => {
      if (!shared) {
        setErrorMsg("Data rute yang dibagikan tidak ditemukan.");
        return;
      }
      setActivity(shared.activity_data);
      setActivityType(shared.activity_type);
      setCustomTitle(shared.title);
      setMoodTag(shared.mood_tag);
      setTheme(shared.theme);
      setAspectRatio(shared.aspect_ratio);
      setMilestoneIntervalKm(shared.milestone_interval);
      setAvatarConfig(shared.avatar_config);
      setShowAvatar(true);
      setCurrentKm(0);
      setIsPlaying(true);
    });
  }, []);

  // Loop animasi pergerakan avatar sepanjang rute
  useEffect(() => {
    if (!isPlaying) return;

    let lastTimestamp = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const deltaSeconds = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      setCurrentKm((prev) => {
        const next = prev + deltaSeconds * 0.35 * playbackSpeed;
        if (next >= activity.distanceKm) {
          setIsPlaying(false);
          return activity.distanceKm;
        }
        return next;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, playbackSpeed, activity.distanceKm]);

  const handleTogglePlay = () => {
    if (currentKm >= activity.distanceKm) {
      setCurrentKm(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setShareUrl(null);
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
      setCurrentKm(0);
      setIsPlaying(true);
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
    setShareUrl(null);
    const parsed = parseGpxFile(SAMPLE_GPX, "run");
    setActivity(parsed);
    setActivityType("run");
    setCustomTitle(parsed.title);
    setCurrentKm(0);
    setIsPlaying(true);
  };

  const handleExportPng = async () => {
    if (!cardRef.current) return;
    setIsPlaying(false);
    setIsExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `${
        customTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "activity"
      }-card.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setErrorMsg("Gagal mengekspor gambar. Coba ulangi beberapa saat lagi.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareLink = async () => {
    if (!cardRef.current) return;
    setIsPlaying(false);
    setIsSharing(true);
    setErrorMsg(null);

    try {
      const url = await createShareableLink({
        cardElement: cardRef.current,
        activity,
        activityType,
        title: customTitle,
        moodTag,
        theme,
        aspectRatio,
        milestoneInterval: milestoneIntervalKm,
        avatarConfig,
      });
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal membuat link share."
      );
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100/80 text-zinc-900">
      {/* Top Navbar */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold text-white">
              RM
            </div>
            {/* <span className="font-bold tracking-tight">
              Project Running Map
            </span>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
              V3 Active 3D
            </span> */}
          </div>

          <div className="flex items-center gap-2">
            {isViewerMode ? (
              <Button
                size="sm"
                onClick={() => {
                  window.history.replaceState({}, "", "/");
                  setIsViewerMode(false);
                }}
              >
                Buat Peta Kamu Sendiri
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleShareLink()}
                  disabled={isSharing}
                >
                  <Share2 className="mr-1.5 h-4 w-4" />
                  {isSharing ? "Membuat Link..." : "Bagikan Link"}
                </Button>
                <Button
                  onClick={() => void handleExportPng()}
                  disabled={isExporting}
                  size="sm"
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  {isExporting ? "Menyimpan..." : "Download PNG"}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Banner Salin Link Share */}
      {shareUrl && (
        <div className="border-b border-orange-200 bg-orange-50 px-4 py-2.5">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-orange-900">
              Link siap dibagikan (muncul preview gambar & animasi avatar):{" "}
              <span className="font-mono font-bold underline">{shareUrl}</span>
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 bg-white text-xs"
              onClick={() => {
                void navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              }}
            >
              {copied ? (
                <>
                  <Check className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                  Tersalin!
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-3.5 w-3.5" />
                  Salin Link
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-12">
        {/* Panel Kiri: Tabs Rute & Kustom Avatar (disembunyikan saat Viewer Mode) */}
        {!isViewerMode && (
          <div className="lg:col-span-5">
            <Tabs defaultValue="route" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="route">
                  <MapPin className="mr-1.5 h-4 w-4" />
                  Rute & Peta 3D
                </TabsTrigger>
                <TabsTrigger value="avatar">
                  <UserRound className="mr-1.5 h-4 w-4" />
                  Kustom Avatar
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Upload & Gaya Kartu */}
              <TabsContent value="route" className="mt-4 space-y-5">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      1. Upload Rute (.GPX)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50/70 px-4 py-5 text-center transition hover:border-zinc-400 hover:bg-zinc-100/70"
                    >
                      <Upload className="mb-2 h-6 w-6 text-zinc-500" />
                      <p className="text-sm font-medium">
                        Klik atau seret file{" "}
                        <span className="font-bold">.gpx</span> ke sini
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
                        Ingin tes rute 5K?
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleLoadSample}
                      >
                        <Sparkles className="mr-1 h-3.5 w-3.5" />
                        Putar Rute Contoh 5.3K
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-2.5">
                      <span className="text-xs text-zinc-500">
                        Unduh file GPX uji:
                      </span>
                      <div className="flex gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => downloadSampleGpx("run")}
                        >
                          Lari 7.6K (.gpx)
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => downloadSampleGpx("ride")}
                        >
                          Sepeda 12.3K (.gpx)
                        </Button>
                      </div>
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
                    <CardTitle className="text-base">
                      2. Detail & Gaya Peta 3D
                    </CardTitle>
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
                          variant={
                            activityType === "ride" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setActivityType("ride")}
                        >
                          <Bike className="mr-1.5 h-4 w-4" />
                          Sepeda (Speed)
                        </Button>
                      </div>
                    </div>

                    {/* Tema Peta Realistis */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tampilan Peta</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {THEME_LABELS.map((t) => (
                          <Button
                            key={t.id}
                            type="button"
                            variant={theme === t.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTheme(t.id)}
                          >
                            {t.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Interval Milestone Gerakan Avatar */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Selebrasi Avatar Setiap Kelipatan
                      </Label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[1, 2, 5, 10].map((km) => (
                          <Button
                            key={km}
                            type="button"
                            variant={
                              milestoneIntervalKm === km ? "default" : "outline"
                            }
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setMilestoneIntervalKm(km)}
                          >
                            {km} KM
                          </Button>
                        ))}
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

                    {/* Rasio Gambar */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Ukuran Export</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={
                            aspectRatio === "square" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setAspectRatio("square")}
                        >
                          1:1 (Feed / Post)
                        </Button>
                        <Button
                          type="button"
                          variant={
                            aspectRatio === "story" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setAspectRatio("story")}
                        >
                          9:16 (IG Story / TikTok)
                        </Button>
                      </div>
                    </div>

                    {/* Toggle Avatar */}
                    <div className="flex items-center justify-between pt-1">
                      <Label className="text-xs">Avatar Aktif di Peta</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant={showAvatar ? "default" : "outline"}
                        className="h-7 text-xs"
                        onClick={() => setShowAvatar((prev) => !prev)}
                      >
                        {showAvatar ? "Aktif" : "Sembunyikan"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 2: Kustom Avatar */}
              <TabsContent value="avatar" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Dandani Karaktermu
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AvatarCustomizer
                      config={avatarConfig}
                      onChange={setAvatarConfig}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Panel Kanan: Live Preview + Route Player */}
        <div
          className={`flex flex-col items-center justify-start ${
            isViewerMode ? "lg:col-span-12" : "lg:col-span-7"
          }`}
        >
          <div className="sticky top-6 flex w-full flex-col items-center">
            {isViewerMode && errorMsg && (
              <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-xs font-medium text-red-600">
                {errorMsg}
              </p>
            )}

            <ShareCardPreview
              ref={cardRef}
              activity={activity}
              overrideType={activityType}
              customTitle={customTitle}
              moodTag={moodTag}
              theme={theme}
              aspectRatio={aspectRatio}
              avatarConfig={avatarConfig}
              showAvatar={showAvatar}
              currentKm={currentKm}
              milestoneIntervalKm={milestoneIntervalKm}
              followAvatar={followAvatar}
              isPlaying={isPlaying}
            />

            {/* Bar Kontrol Gerakan Avatar di Peta */}
            <div className="mt-4 w-full max-w-[440px] rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleTogglePlay}
                    className="h-8 px-3"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="mr-1.5 h-3.5 w-3.5" />
                        Jeda
                      </>
                    ) : (
                      <>
                        <Play className="mr-1.5 h-3.5 w-3.5" />
                        Gerakkan
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    title="Ulang dari 0 KM"
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentKm(0);
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Kecepatan & Camera Follow */}
                <div className="flex items-center gap-1.5">
                  {[1, 3, 8].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                        playbackSpeed === spd
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}

                  <Button
                    type="button"
                    size="sm"
                    variant={followAvatar ? "default" : "outline"}
                    className="ml-1 h-7 px-2 text-[11px]"
                    onClick={() => setFollowAvatar((prev) => !prev)}
                  >
                    <Navigation className="mr-1 h-3 w-3" />
                    Ikuti
                  </Button>
                </div>
              </div>

              {/* Slider Jarak KM */}
              <div className="mt-3 flex items-center gap-3">
                <span className="w-14 text-xs font-semibold tabular-nums text-zinc-700">
                  {currentKm.toFixed(1)} km
                </span>
                <input
                  type="range"
                  min={0}
                  max={activity.distanceKm}
                  step={0.05}
                  value={currentKm}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCurrentKm(parseFloat(e.target.value));
                  }}
                  className="h-1.5 flex-1 cursor-pointer accent-orange-500"
                />
                <span className="w-14 text-right text-xs tabular-nums text-zinc-500">
                  {activity.distanceKm} km
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;