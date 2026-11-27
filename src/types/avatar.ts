export interface AvatarConfig {
  skinColor: string;
  top: string;
  hairColor: string;
  accessories: string;
  clothing: string;
  clothesColor: string;
  eyes: string;
  mouth: string;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skinColor: "edb98a",
  top: "shortFlat",
  hairColor: "2c1b18",
  accessories: "sunglasses",
  clothing: "shirtCrewNeck",
  clothesColor: "ff5c5c",
  eyes: "happy",
  mouth: "smile",
};

export const SKIN_COLORS = [
  { label: "Terang", value: "ffdbb4" },
  { label: "Kuning Langsat", value: "edb98a" },
  { label: "Sawo Matang", value: "d08b5b" },
  { label: "Cokelat", value: "ae5d29" },
  { label: "Gelap", value: "614335" },
];

export const HAIR_STYLES = [
  { label: "Pendek Rapi", value: "shortFlat" },
  { label: "Ikal Pendek", value: "shortCurly" },
  { label: "Cepol (Bun)", value: "bun" },
  { label: "Panjang", value: "longButNotTooLong" },
  { label: "Bob", value: "bob" },
  { label: "Kribo / Fro", value: "fro" },
  { label: "Topi", value: "hat" },
  { label: "Hijab", value: "hijab" },
  { label: "Plontos", value: "noHair" },
];

export const HAIR_COLORS = [
  { label: "Hitam", value: "2c1b18" },
  { label: "Cokelat Tua", value: "4a312c" },
  { label: "Cokelat", value: "724133" },
  { label: "Pirang", value: "d6b370" },
  { label: "Merah", value: "c93305" },
  { label: "Silver", value: "e8e1e1" },
];

export const EYEWEAR_OPTIONS = [
  { label: "Tanpa Kacamata", value: "none" },
  { label: "Sunglasses", value: "sunglasses" },
  { label: "Wayfarers", value: "wayfarers" },
  { label: "Bulat", value: "round" },
  { label: "Sporty", value: "kurt" },
];

export const OUTFIT_STYLES = [
  { label: "Kaos Lari (Crew)", value: "shirtCrewNeck" },
  { label: "Jersey V-Neck", value: "shirtVNeck" },
  { label: "Graphic Tee", value: "graphicShirt" },
  { label: "Hoodie", value: "hoodie" },
  { label: "Sweater", value: "collarAndSweater" },
];

export const OUTFIT_COLORS = [
  { label: "Coral", value: "ff5c5c" },
  { label: "Hitam", value: "262e33" },
  { label: "Biru Langit", value: "5199e4" },
  { label: "Mint", value: "a7ffc4" },
  { label: "Kuning", value: "ffffb1" },
  { label: "Putih", value: "ffffff" },
  { label: "Pink", value: "ff488e" },
];

export const EXPRESSION_PRESETS = [
  { label: "Semangat", eyes: "happy", mouth: "smile" },
  { label: "Santai", eyes: "default", mouth: "twinkle" },
  { label: "Ngos-ngosan", eyes: "squint", mouth: "grimace" },
  { label: "Melet", eyes: "wink", mouth: "tongue" },
  { label: "Serius", eyes: "default", mouth: "serious" },
];