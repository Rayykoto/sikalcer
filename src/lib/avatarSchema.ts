import { Style } from "@dicebear/core";
import avataaars from "@dicebear/styles/avataaars.json" with { type: "json" };
import type { AvatarConfig } from "@/types/avatar";

export const avataaarsStyle = new Style(avataaars);

interface RawStyleJson {
  components?: Record<
    string,
    {
      variants?: Record<string, unknown>;
    }
  >;
  colors?: Record<string, unknown>;
}

export interface VariantOption {
  label: string;
  value: string;
}

const LABELS_ID: Record<string, string> = {
  // Rambut & Topi
  shortFlat: "Pendek Rapi",
  "short-flat": "Pendek Rapi",
  shortCurly: "Ikal Pendek",
  "short-curly": "Ikal Pendek",
  shortRound: "Pendek Bulat",
  "short-round": "Pendek Bulat",
  shortWaved: "Ikal Bergelombang",
  "short-waved": "Ikal Bergelombang",
  bun: "Cepol (Bun)",
  longButNotTooLong: "Panjang",
  "long-but-not-too-long": "Panjang",
  bob: "Bob",
  fro: "Kribo / Fro",
  hat: "Topi",
  hijab: "Hijab",
  turban: "Turban",
  winterHat1: "Beanie",
  "winter-hat-1": "Beanie",

  // Outfit / Jersey
  shirtCrewNeck: "Kaos Lari (Crew)",
  "shirt-crew-neck": "Kaos Lari (Crew)",
  shirtVNeck: "Jersey V-Neck",
  "shirt-v-neck": "Jersey V-Neck",
  shirtScoopNeck: "Singlet / Scoop",
  "shirt-scoop-neck": "Singlet / Scoop",
  graphicShirt: "Graphic Tee",
  "graphic-shirt": "Graphic Tee",
  hoodie: "Hoodie",
  collarAndSweater: "Sweater",
  "collar-and-sweater": "Sweater",
  blazerAndShirt: "Jaket Formal",
  "blazer-and-shirt": "Jaket Formal",
  overall: "Overall",

  // Kacamata
  sunglasses: "Sunglasses",
  wayfarers: "Wayfarers",
  round: "Bulat",
  kurt: "Sporty",
  prescription01: "Kacamata Baca 1",
  "prescription-01": "Kacamata Baca 1",
  prescription02: "Kacamata Baca 2",
  "prescription-02": "Kacamata Baca 2",

  // Mata & Mulut
  happy: "Semangat",
  default: "Normal",
  squint: "Sipit / Silau",
  wink: "Kedip",
  winkWacky: "Kedip Lucu",
  "wink-wacky": "Kedip Lucu",
  side: "Melirik",
  smile: "Senyum",
  twinkle: "Senyum Tipis",
  grimace: "Ngos-ngosan",
  tongue: "Melet",
  serious: "Serius",
  eating: "Ngunyah",
};

function toReadableLabel(key: string): string {
  if (LABELS_ID[key]) return LABELS_ID[key];
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildOptions(
  variantsObj?: Record<string, unknown>,
  limit = 12
): VariantOption[] {
  if (!variantsObj) return [];
  return Object.keys(variantsObj)
    .slice(0, limit)
    .map((key) => ({
      label: toReadableLabel(key),
      value: key,
    }));
}

const rawJson = avataaars as unknown as RawStyleJson;
const components = rawJson.components ?? {};
const componentKeys = Object.keys(components);
const colorKeys = Object.keys(rawJson.colors ?? {});

// Deteksi kunci komponen mata, mulut, dan warna baju langsung dari JSON
const eyesKey =
  componentKeys.find(
    (k) =>
      k.toLowerCase().includes("eye") && !k.toLowerCase().includes("brow")
  ) ?? null;

const mouthKey =
  componentKeys.find((k) => k.toLowerCase().includes("mouth")) ?? null;

const rawClothesColorKey =
  colorKeys.find((k) => k.toLowerCase().includes("cloth")) ?? "clothes";

const clothesColorKey = rawClothesColorKey.endsWith("Color")
  ? rawClothesColorKey
  : `${rawClothesColorKey}Color`;

const clothingKey =
  componentKeys.find((k) => k.toLowerCase().includes("cloth")) ?? "clothes";

// Lalu perbarui objek AVATAR_SCHEMA menjadi:
export const AVATAR_SCHEMA = {
  eyesKey,
  mouthKey,
  clothingKey,
  clothesColorKey,
  topOptions: [
    ...buildOptions(components.top?.variants, 10),
    { label: "Plontos", value: "noHair" },
  ],
  accessoriesOptions: [
    { label: "Tanpa Kacamata", value: "none" },
    ...buildOptions(components.accessories?.variants, 6),
  ],
  clothingOptions: buildOptions(components[clothingKey]?.variants, 10),
  eyesOptions: eyesKey ? buildOptions(components[eyesKey]?.variants, 8) : [],
  mouthOptions: mouthKey ? buildOptions(components[mouthKey]?.variants, 8) : [],
};

// Memastikan konfigurasi (termasuk data lama di localStorage) selalu memakai kunci valid
export function sanitizeAvatarConfig(config: AvatarConfig): AvatarConfig {
  const validTop =
    config.top === "noHair" ||
    AVATAR_SCHEMA.topOptions.some((o) => o.value === config.top)
      ? config.top
      : (AVATAR_SCHEMA.topOptions[0]?.value ?? "noHair");

  const validAcc =
    config.accessories === "none" ||
    AVATAR_SCHEMA.accessoriesOptions.some((o) => o.value === config.accessories)
      ? config.accessories
      : "none";

  const validClothing = AVATAR_SCHEMA.clothingOptions.some(
    (o) => o.value === config.clothing
  )
    ? config.clothing
    : (AVATAR_SCHEMA.clothingOptions[0]?.value ?? "");

  const validEyes = AVATAR_SCHEMA.eyesOptions.some(
    (o) => o.value === config.eyes
  )
    ? config.eyes
    : (AVATAR_SCHEMA.eyesOptions[0]?.value ?? "");

  const validMouth = AVATAR_SCHEMA.mouthOptions.some(
    (o) => o.value === config.mouth
  )
    ? config.mouth
    : (AVATAR_SCHEMA.mouthOptions[0]?.value ?? "");

  return {
    ...config,
    top: validTop,
    accessories: validAcc,
    clothing: validClothing,
    eyes: validEyes,
    mouth: validMouth,
  };
}