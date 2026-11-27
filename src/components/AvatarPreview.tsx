import { useMemo } from "react";
import { Avatar } from "@dicebear/core";
import {
  AVATAR_SCHEMA,
  avataaarsStyle,
  sanitizeAvatarConfig,
} from "@/lib/avatarSchema";
import type { AvatarConfig } from "@/types/avatar";

interface AvatarPreviewProps {
  config: AvatarConfig;
  className?: string;
}

function toHex(color: string): string {
  return color.startsWith("#") ? color : `#${color}`;
}

export function AvatarPreview({ config, className = "" }: AvatarPreviewProps) {
  const dataUri = useMemo(() => {
    const safe = sanitizeAvatarConfig(config);
    const hasAccessories = safe.accessories !== "none";
    const isBald = safe.top === "noHair";

    const options: Record<string, unknown> = {
      skinColor: toHex(safe.skinColor),
      hairColor: toHex(safe.hairColor),
      hatColor: toHex(safe.clothesColor),
      [AVATAR_SCHEMA.clothesColorKey]: toHex(safe.clothesColor),
      facialHairProbability: 0,
    };

    if (isBald) {
      options.topProbability = 0;
    } else if (safe.top) {
      options.topVariant = safe.top;
      options.topProbability = 100;
    }

    if (!hasAccessories) {
      options.accessoriesProbability = 0;
    } else if (safe.accessories) {
      options.accessoriesVariant = safe.accessories;
      options.accessoriesProbability = 100;
    }

    if (AVATAR_SCHEMA.clothingKey && safe.clothing) {
      options[`${AVATAR_SCHEMA.clothingKey}Variant`] = safe.clothing;
      options[`${AVATAR_SCHEMA.clothingKey}Probability`] = 100;
    }

    if (AVATAR_SCHEMA.eyesKey && safe.eyes) {
      options[`${AVATAR_SCHEMA.eyesKey}Variant`] = safe.eyes;
      options[`${AVATAR_SCHEMA.eyesKey}Probability`] = 100;
    }

    if (AVATAR_SCHEMA.mouthKey && safe.mouth) {
      options[`${AVATAR_SCHEMA.mouthKey}Variant`] = safe.mouth;
      options[`${AVATAR_SCHEMA.mouthKey}Probability`] = 100;
    }

    const avatar = new Avatar(avataaarsStyle, options as never);
    const svg = avatar.toString();
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [config]);

  return (
    <img
      src={dataUri}
      alt="Avatar Pengguna"
      className={`select-none object-contain ${className}`}
    />
  );
}