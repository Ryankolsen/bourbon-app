import React from "react";
import { View, Text } from "react-native";
import { getBeltConfig } from "@/lib/belt-config";

export interface XpProgressBarProps {
  totalXp: number;
  currentBelt: number;
  /** Show a loading skeleton instead of real data */
  isLoading?: boolean;
}

/**
 * Horizontal progress bar showing XP progress within the current belt range.
 *
 * - Displays "{totalXp} / {nextBelt.minXp} Barrel Points" for belts 1–9.
 * - Displays "MAX — Legendary status achieved" for belt 10 (Pappy).
 * - Renders a loading skeleton when isLoading is true.
 */
export function XpProgressBar({ totalXp, currentBelt, isLoading }: XpProgressBarProps) {
  if (isLoading) {
    return (
      <View testID="xp-progress-loading">
        <View
          style={{
            height: 8,
            backgroundColor: "#374151",
            borderRadius: 4,
          }}
        />
        <View
          style={{
            height: 12,
            width: 160,
            backgroundColor: "#374151",
            borderRadius: 4,
            marginTop: 6,
          }}
        />
      </View>
    );
  }

  const safeLevel = Math.max(1, Math.min(10, currentBelt));
  const isMax = safeLevel >= 10;
  const currentBeltConfig = getBeltConfig(safeLevel);
  const nextBeltConfig = !isMax ? getBeltConfig(safeLevel + 1) : null;

  const progressPercent = isMax
    ? 100
    : nextBeltConfig
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ((totalXp - currentBeltConfig.minXp) /
              (nextBeltConfig.minXp - currentBeltConfig.minXp)) *
              100
          )
        )
      )
    : 0;

  return (
    <View>
      {/* Track */}
      <View
        style={{
          height: 8,
          backgroundColor: "#374151",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        {/* Fill */}
        <View
          testID="xp-progress-fill"
          style={{
            height: "100%",
            width: `${progressPercent}%`,
            backgroundColor: currentBeltConfig.bgColor,
            borderRadius: 4,
          }}
        />
      </View>

      {/* Label */}
      {isMax ? (
        <Text
          testID="xp-max-label"
          style={{ color: "#F59E0B", fontSize: 12, marginTop: 4, fontWeight: "600" }}
        >
          MAX — Legendary status achieved
        </Text>
      ) : (
        <Text
          testID="xp-progress-label"
          style={{ color: "#9CA3AF", fontSize: 12, marginTop: 4 }}
        >
          {totalXp.toLocaleString("en-US")} / {nextBeltConfig!.minXp.toLocaleString("en-US")} Barrel Points
        </Text>
      )}
    </View>
  );
}
