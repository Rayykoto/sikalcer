import { createClient } from "@supabase/supabase-js";
import { toBlob } from "html-to-image";
import type {
  ActivityData,
  ActivityType,
  CardTheme,
  TrackPoint,
} from "@/types/activity";
import type { AvatarConfig } from "@/types/avatar";
import type { CardAspectRatio } from "@/components/ShareCardPreview";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export interface SharedPayload {
  id: string;
  title: string;
  mood_tag: string;
  activity_type: ActivityType;
  theme: CardTheme;
  aspect_ratio: CardAspectRatio;
  milestone_interval: number;
  image_url: string;
  activity_data: ActivityData;
  avatar_config: AvatarConfig;
}

function generateShortId(length = 7): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Meringkas titik GPS GPX yang ribuan menjadi maksimal ~180 titik agar ringan disimpan
 */
function downsampleActivity(
  activity: ActivityData,
  maxPoints = 180
): ActivityData {
  if (activity.points.length <= maxPoints) return activity;

  const step = Math.ceil(activity.points.length / maxPoints);
  const sampled: TrackPoint[] = activity.points.filter(
    (_, idx) =>
      idx === 0 || idx === activity.points.length - 1 || idx % step === 0
  );

  return {
    ...activity,
    points: sampled,
    geoJson: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: sampled.map((p) => [p.lon, p.lat]),
          },
        },
      ],
    },
  };
}

export async function createShareableLink(params: {
  cardElement: HTMLElement;
  activity: ActivityData;
  activityType: ActivityType;
  title: string;
  moodTag: string;
  theme: CardTheme;
  aspectRatio: CardAspectRatio;
  milestoneInterval: number;
  avatarConfig: AvatarConfig;
}): Promise<string> {
  if (!supabase) {
    throw new Error(
      "Konfigurasi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY belum diisi."
    );
  }

  const id = generateShortId();

  // 1. Render kartu menjadi PNG Blob
  const blob = await toBlob(params.cardElement, {
    pixelRatio: 2,
    cacheBust: true,
  });

  if (!blob || blob.size === 0) {
    throw new Error("Gagal memotret kartu preview.");
  }

  // 2. Upload gambar meta preview ke Supabase Storage (upsert: false agar lolos policy INSERT)
  const filePath = `${id}.png`;
  const { error: uploadError } = await supabase.storage
    .from("share-cards")
    .upload(filePath, blob, {
      contentType: "image/png",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Gagal mengunggah gambar: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from("share-cards")
    .getPublicUrl(filePath);

  // 3. Simpan metadata & rute ringkas ke database
  const compactActivity = downsampleActivity(params.activity);

  const { error: insertError } = await supabase
    .from("shared_activities")
    .insert({
      id,
      title: params.title.trim() || params.activity.title,
      mood_tag: params.moodTag,
      activity_type: params.activityType,
      theme: params.theme,
      aspect_ratio: params.aspectRatio,
      milestone_interval: params.milestoneInterval,
      image_url: publicUrlData.publicUrl,
      activity_data: compactActivity,
      avatar_config: params.avatarConfig,
    });

  if (insertError) {
    throw new Error(`Gagal menyimpan data share: ${insertError.message}`);
  }

  return `${window.location.origin}/s/${id}`;
}

export async function fetchSharedActivity(
  id: string
): Promise<SharedPayload | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("shared_activities")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as SharedPayload;
}