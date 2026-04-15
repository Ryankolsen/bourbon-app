import React from "react";
import { View, Text } from "react-native";

export type StarRatingVariant = "personal" | "community";

export interface StarRatingProps {
  value: number | null;
  variant: StarRatingVariant;
  /** Number of stars (default 5) */
  count?: number;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS: Record<NonNullable<StarRatingProps["size"]>, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-3xl",
};

// Filled-star color per variant (Tailwind classes — no hardcoded hex)
const FILLED_CLASS: Record<StarRatingVariant, string> = {
  personal: "text-amber-400",
  community: "text-bourbon-400",
};

const EMPTY_CLASS: Record<StarRatingVariant, string> = {
  personal: "text-amber-200",
  community: "text-bourbon-200",
};

/**
 * Pure display component: renders N stars with half-star precision.
 * No interaction — display only.
 */
export function StarRating({
  value,
  variant,
  count = 5,
  size = "md",
}: StarRatingProps) {
  const sizeClass = SIZE_CLASS[size];
  const filledClass = FILLED_CLASS[variant];
  const emptyClass = EMPTY_CLASS[variant];

  return (
    <View className="flex-row">
      {Array.from({ length: count }, (_, i) => {
        const starState = getStarState(value, i);
        if (starState === "filled") {
          return (
            <Text
              key={i}
              testID={`star-${i}-filled`}
              className={`${sizeClass} ${filledClass}`}
            >
              ★
            </Text>
          );
        }
        if (starState === "half") {
          return (
            <HalfStar
              key={i}
              index={i}
              sizeClass={sizeClass}
              filledClass={filledClass}
              emptyClass={emptyClass}
            />
          );
        }
        return (
          <Text
            key={i}
            testID={`star-${i}-empty`}
            className={`${sizeClass} ${emptyClass}`}
          >
            ☆
          </Text>
        );
      })}
    </View>
  );
}

/** Determine filled / half / empty state for star at position `index`. */
function getStarState(
  value: number | null,
  index: number
): "filled" | "half" | "empty" {
  if (value === null) return "empty";
  if (value >= index + 1) return "filled";
  if (value >= index + 0.5) return "half";
  return "empty";
}

/**
 * Half-star: renders an empty star with a filled star clipped to 50% width
 * layered on top, giving a half-filled visual.
 */
function HalfStar({
  index,
  sizeClass,
  filledClass,
  emptyClass,
}: {
  index: number;
  sizeClass: string;
  filledClass: string;
  emptyClass: string;
}) {
  return (
    <View testID={`star-${index}-half`} className="relative">
      {/* Empty star base */}
      <Text className={`${sizeClass} ${emptyClass}`}>☆</Text>
      {/* Filled star clipped to left half */}
      <View
        className="absolute top-0 left-0 overflow-hidden"
        style={{ width: "50%" }}
      >
        <Text className={`${sizeClass} ${filledClass}`}>★</Text>
      </View>
    </View>
  );
}
