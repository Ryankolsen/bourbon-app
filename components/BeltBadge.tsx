import React from "react";
import { View, Text } from "react-native";
import { getBeltConfig } from "@/lib/belt-config";

export interface BeltBadgeProps {
  level: number;
  /** Diameter in points. Defaults to 20 (inline badge). Use 60 for modal display. */
  size?: number;
}

/**
 * Small circular badge representing a Bourbon Dojo belt level (1–10).
 * Renders the belt icon on a colored background. Invalid levels fall back
 * to the level-1 (White Dog) style.
 */
export function BeltBadge({ level, size = 20 }: BeltBadgeProps) {
  const safeLevel = level >= 1 && level <= 10 ? level : 1;
  const belt = getBeltConfig(safeLevel);
  const fontSize = Math.round(size * 0.5);
  const lineHeight = Math.round(size * 0.6);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: belt.bgColor,
        alignItems: "center",
        justifyContent: "center",
      }}
      accessibilityLabel={`${belt.name} belt`}
      testID={`belt-badge-${safeLevel}`}
    >
      <Text
        style={{
          color: belt.iconColor,
          fontSize,
          lineHeight,
          includeFontPadding: false,
        }}
        aria-hidden
      >
        {belt.icon}
      </Text>
    </View>
  );
}
