import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AvatarPreview } from "@/components/AvatarPreview";
import { AVATAR_SCHEMA, sanitizeAvatarConfig } from "@/lib/avatarSchema";
import { HAIR_COLORS, OUTFIT_COLORS, SKIN_COLORS } from "@/types/avatar";
import type { AvatarConfig } from "@/types/avatar";

interface AvatarCustomizerProps {
  config: AvatarConfig;
  onChange: (next: AvatarConfig) => void;
}

function pickRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

export function AvatarCustomizer({ config, onChange }: AvatarCustomizerProps) {
  const safeConfig = sanitizeAvatarConfig(config);

  const updateField = <K extends keyof AvatarConfig>(
    key: K,
    value: AvatarConfig[K]
  ) => {
    onChange({ ...safeConfig, [key]: value });
  };

  const handleRandomize = () => {
    onChange({
      skinColor: pickRandom(SKIN_COLORS)?.value ?? safeConfig.skinColor,
      top: pickRandom(AVATAR_SCHEMA.topOptions)?.value ?? safeConfig.top,
      hairColor: pickRandom(HAIR_COLORS)?.value ?? safeConfig.hairColor,
      accessories:
        pickRandom(AVATAR_SCHEMA.accessoriesOptions)?.value ??
        safeConfig.accessories,
      clothing:
        pickRandom(AVATAR_SCHEMA.clothingOptions)?.value ?? safeConfig.clothing,
      clothesColor:
        pickRandom(OUTFIT_COLORS)?.value ?? safeConfig.clothesColor,
      eyes: pickRandom(AVATAR_SCHEMA.eyesOptions)?.value ?? safeConfig.eyes,
      mouth: pickRandom(AVATAR_SCHEMA.mouthOptions)?.value ?? safeConfig.mouth,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Preview Mini + Tombol Random */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 overflow-hidden rounded-full border border-zinc-200 bg-white shadow-xs">
            <AvatarPreview config={safeConfig} className="h-full w-full" />
          </div>
          <div>
            <p className="text-sm font-semibold">Karakter Kamu</p>
            <p className="text-xs text-zinc-500">
              Otomatis tersimpan di browser
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRandomize}
        >
          <Shuffle className="mr-1.5 h-3.5 w-3.5" />
          Acak Gaya
        </Button>
      </div>

      {/* Warna Kulit */}
      <div className="space-y-1.5">
        <Label className="text-xs">Warna Kulit</Label>
        <div className="flex flex-wrap gap-2">
          {SKIN_COLORS.map((skin) => (
            <button
              key={skin.value}
              type="button"
              title={skin.label}
              onClick={() => updateField("skinColor", skin.value)}
              style={{ backgroundColor: `#${skin.value}` }}
              className={`h-7 w-7 rounded-full border-2 transition ${
                safeConfig.skinColor === skin.value
                  ? "scale-110 border-zinc-900 ring-2 ring-zinc-900/20"
                  : "border-white shadow-xs"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Ekspresi Mata */}
      {AVATAR_SCHEMA.eyesOptions.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs">Mata</Label>
          <div className="flex flex-wrap gap-1.5">
            {AVATAR_SCHEMA.eyesOptions.map((eye) => (
              <Button
                key={eye.value}
                type="button"
                size="sm"
                variant={safeConfig.eyes === eye.value ? "default" : "outline"}
                className="h-7 px-2.5 text-xs"
                onClick={() => updateField("eyes", eye.value)}
              >
                {eye.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Ekspresi Mulut */}
      {AVATAR_SCHEMA.mouthOptions.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs">Mulut / Ekspresi</Label>
          <div className="flex flex-wrap gap-1.5">
            {AVATAR_SCHEMA.mouthOptions.map((m) => (
              <Button
                key={m.value}
                type="button"
                size="sm"
                variant={safeConfig.mouth === m.value ? "default" : "outline"}
                className="h-7 px-2.5 text-xs"
                onClick={() => updateField("mouth", m.value)}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Gaya Rambut / Penutup Kepala */}
      <div className="space-y-1.5">
        <Label className="text-xs">Rambut & Topi</Label>
        <div className="flex flex-wrap gap-1.5">
          {AVATAR_SCHEMA.topOptions.map((hair) => (
            <Button
              key={hair.value}
              type="button"
              size="sm"
              variant={safeConfig.top === hair.value ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => updateField("top", hair.value)}
            >
              {hair.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Warna Rambut */}
      <div className="space-y-1.5">
        <Label className="text-xs">Warna Rambut</Label>
        <div className="flex flex-wrap gap-2">
          {HAIR_COLORS.map((hc) => (
            <button
              key={hc.value}
              type="button"
              title={hc.label}
              onClick={() => updateField("hairColor", hc.value)}
              style={{ backgroundColor: `#${hc.value}` }}
              className={`h-6 w-6 rounded-full border-2 transition ${
                safeConfig.hairColor === hc.value
                  ? "scale-110 border-zinc-900 ring-2 ring-zinc-900/20"
                  : "border-white shadow-xs"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Kacamata */}
      <div className="space-y-1.5">
        <Label className="text-xs">Kacamata</Label>
        <div className="flex flex-wrap gap-1.5">
          {AVATAR_SCHEMA.accessoriesOptions.map((acc) => (
            <Button
              key={acc.value}
              type="button"
              size="sm"
              variant={
                safeConfig.accessories === acc.value ? "default" : "outline"
              }
              className="h-7 px-2.5 text-xs"
              onClick={() => updateField("accessories", acc.value)}
            >
              {acc.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Gaya Baju */}
      <div className="space-y-1.5">
        <Label className="text-xs">Outfit / Jersey</Label>
        <div className="flex flex-wrap gap-1.5">
          {AVATAR_SCHEMA.clothingOptions.map((outfit) => (
            <Button
              key={outfit.value}
              type="button"
              size="sm"
              variant={
                safeConfig.clothing === outfit.value ? "default" : "outline"
              }
              className="h-7 px-2.5 text-xs"
              onClick={() => updateField("clothing", outfit.value)}
            >
              {outfit.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Warna Baju */}
      <div className="space-y-1.5">
        <Label className="text-xs">Warna Outfit</Label>
        <div className="flex flex-wrap gap-2">
          {OUTFIT_COLORS.map((oc) => (
            <button
              key={oc.value}
              type="button"
              title={oc.label}
              onClick={() => updateField("clothesColor", oc.value)}
              style={{ backgroundColor: `#${oc.value}` }}
              className={`h-6 w-6 rounded-full border-2 transition ${
                safeConfig.clothesColor === oc.value
                  ? "scale-110 border-zinc-900 ring-2 ring-zinc-900/20"
                  : "border-zinc-300 shadow-xs"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}