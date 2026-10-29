import React from "react";
import { Text, View } from "react-native";
import { AccessiblePressable } from "@/components/AccessiblePressable";

interface FilterButtonProps {
  activeFilterCount: number;
  onPress: () => void;
  className?: string;
}

/** Gear button that opens the filter sheet; shows a numeric badge when filters are active. */
export function FilterButton({ activeFilterCount, onPress, className = "px-3 py-2" }: FilterButtonProps) {
  const active = activeFilterCount > 0;
  return (
    <AccessiblePressable
      accessibilityLabel={active ? `Filters, ${activeFilterCount} active` : "Filters"}
      onPress={onPress}
      className={`rounded-xl items-center justify-center ${className} ${
        active ? "bg-brand-600" : "bg-brand-800"
      }`}
    >
      <Text className="text-xl">⚙️</Text>
      {active && (
        <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-accent-amber rounded-full items-center justify-center">
          <Text className="text-black text-xs font-bold">{activeFilterCount}</Text>
        </View>
      )}
    </AccessiblePressable>
  );
}
