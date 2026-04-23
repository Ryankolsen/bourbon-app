import React from "react";
import { View, Text } from "react-native";
import { getBeltConfig } from "@/lib/belt-config";

export interface BeltBadgeProps {
  level: number;
}

/**
 * Small circular badge representing a Bourbon Dojo belt level (1–10).
 * Renders the belt icon on a colored background. Invalid levels fall back
 * to the level-1 (White Dog) style.
 */
export function BeltBadge({ level }: BeltBadgeProps) {
  const safeLevel = level >= 1 && level <= 10 ? level : 1;
  const belt = getBeltConfig(safeLevel);

  return (
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 10,
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
          fontSize: 10,
          lineHeight: 12,
          includeFontPadding: false,
        }}
        aria-hidden
      >
        {belt.icon}
      </Text>
    </View>
  );
}
