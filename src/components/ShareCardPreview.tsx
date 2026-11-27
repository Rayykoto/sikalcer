import { forwardRef } from "react";
import { Bike, Footprints, Mountain } from "lucide-react";
import { RouteMap } from "@/components/RouteMap";
import type { ActivityData, ActivityType, CardTheme } from "@/types/activity";

export type CardAspectRatio = "square" | "story";

interface ShareCardPreviewProps {
  activity: ActivityData;
  overrideType: ActivityType;
  customTitle: string;
  moodTag: string;
  theme: CardTheme;
  aspectRatio: CardAspectRatio;
}

const CARD_STYLES: Record<
  CardTheme,
  {
    wrapper: string;
    subtext: string;
    pill: string;
    divider: string;
    mapBorder: string;
  }
> = {
  light: {
    wrapper: "bg-white text-zinc-900 border-zinc-200",
    subtext: "text-zinc-500",
    pill: "bg-orange-100 text-orange-700",
    divider: "border-zinc-100",
    mapBorder: "border-zinc-200/80",
  },
  dark: {
    wrapper: "bg-zinc-950 text-zinc-50 border-zinc-800",
    subtext: "text-zinc-400",
    pill: "bg-lime-400/15 text-lime-300",
    divider: "border-zinc-800/80",
    mapBorder: "border-zinc-800",
  },
  mint: {
    wrapper: "bg-emerald-50/90 text-emerald-950 border-emerald-200",
    subtext: "text-emerald-700/80",
    pill: "bg-emerald-600 text-white",
    divider: "border-emerald-200/70",
    mapBorder: "border-emerald-200",
  },
};

export const ShareCardPreview = forwardRef<
  HTMLDivElement,
  ShareCardPreviewProps
>(function ShareCardPreview(
  { activity, overrideType, customTitle, moodTag, theme, aspectRatio },
  ref
) {
  const styles = CARD_STYLES[theme];
  const isRun = overrideType === "run";

  return (
    <div
      ref={ref}
      className={`flex flex-col justify-between overflow-hidden rounded-3xl border p-5 shadow-xl transition-all duration-200 ${
        styles.wrapper
      } ${
        aspectRatio === "square"
          ? "aspect-square w-full max-w-[440px]"
          : "aspect-[9/16] w-full max-w-[360px]"
      }`}
    >
      {/* Header Kartu */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${styles.pill}`}
          >
            {isRun ? (
              <Footprints className="h-3.5 w-3.5" />
            ) : (
              <Bike className="h-3.5 w-3.5" />
            )}
            {isRun ? "Run" : "Ride"}
          </span>
          <span className={`text-xs font-medium ${styles.subtext}`}>
            {activity.date}
          </span>
        </div>

        {moodTag.trim() && (
          <span
            className={`max-w-[160px] truncate rounded-full px-2.5 py-1 text-xs font-medium ${styles.pill}`}
          >
            {moodTag}
          </span>
        )}
      </div>

      {/* Area Peta Utama */}
      <div
        className={`relative my-3.5 flex-1 overflow-hidden rounded-2xl border ${styles.mapBorder}`}
      >
        <RouteMap
          geoJson={activity.geoJson}
          bounds={activity.bounds}
          theme={theme}
        />

        {/* Badge Elevasi di pojok peta */}
        {activity.elevationGain > 0 && (
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            <Mountain className="h-3 w-3" />
            <span>+{activity.elevationGain} m</span>
          </div>
        )}
      </div>

      {/* Footer Judul & Statistik */}
      <div>
        <h3 className="truncate text-lg font-bold tracking-tight">
          {customTitle.trim() || activity.title}
        </h3>

        <div
          className={`mt-3 grid grid-cols-3 gap-2 border-t pt-3 ${styles.divider}`}
        >
          <div>
            <p className={`text-[11px] uppercase tracking-wider ${styles.subtext}`}>
              Jarak
            </p>
            <p className="text-lg font-extrabold tabular-nums">
              {activity.distanceKm}
              <span className="ml-0.5 text-xs font-normal">km</span>
            </p>
          </div>

          <div>
            <p className={`text-[11px] uppercase tracking-wider ${styles.subtext}`}>
              {isRun ? "Avg Pace" : "Avg Speed"}
            </p>
            <p className="text-lg font-extrabold tabular-nums">
              {isRun ? activity.paceFormatted : activity.speedFormatted}
              <span className="ml-0.5 text-xs font-normal">
                {isRun ? "/km" : "km/j"}
              </span>
            </p>
          </div>

          <div>
            <p className={`text-[11px] uppercase tracking-wider ${styles.subtext}`}>
              Waktu
            </p>
            <p className="text-lg font-extrabold tabular-nums">
              {activity.durationFormatted}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});