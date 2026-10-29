import React from "react";
import { Text, View, type AccessibilityActionEvent } from "react-native";
import { AccessiblePressable } from "@/components/AccessiblePressable";

const RATING_STEPS = [1, 2, 3, 4, 5];

export const STAR_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Great",
  5: "Exceptional",
};

type Props = {
  value: number | null;
  onChange: (value: number | null) => void;
  labels: Record<number, string>;
};

export function StarRatingInput({ value, onChange, labels }: Props) {
  function handleAction(e: AccessibilityActionEvent) {
    switch (e.nativeEvent.actionName) {
      case "increment":
        onChange(value === null ? 1 : Math.min(5, value + 1));
        break;
      case "decrement":
        onChange(value === null || value <= 1 ? null : value - 1);
        break;
      case "clear":
        onChange(null);
        break;
    }
  }

  return (
    <View>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Rating"
        accessibilityValue={{
          min: 0,
          max: 5,
          now: value ?? 0,
          text: value ? `${value} of 5, ${labels[value]}` : "Not rated",
        }}
        accessibilityActions={[
          { name: "increment" },
          { name: "decrement" },
          { name: "clear", label: "Clear rating" },
        ]}
        onAccessibilityAction={handleAction}
        className="flex-row gap-3 justify-center"
      >
        {RATING_STEPS.map((r) => (
          <AccessiblePressable
            key={r}
            testID={`rating-star-${r}`}
            accessibilityLabel={`${r} star${r === 1 ? "" : "s"}`}
            accessible={false}
            importantForAccessibility="no"
            onPress={() => onChange(value === r ? null : r)}
            className="items-center"
          >
            <Text
              className={`text-3xl ${value !== null && r <= value ? "text-star-filled" : "text-star-empty"}`}
            >
              ★
            </Text>
          </AccessiblePressable>
        ))}
      </View>
      {value !== null && (
        <Text className="text-brand-300 text-sm mt-3 text-center">
          {value}/5 — {labels[value]}
        </Text>
      )}
    </View>
  );
}
