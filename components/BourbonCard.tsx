import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { StarRating } from "@/components/StarRating";

export interface BourbonCardProps {
  name: string;
  distillery?: string | null;
  type?: string | null;
  proof?: number | null;
  age?: number | null;
  personalRating?: number | null;
  communityRating?: number | null;
  onPress: () => void;
  children?: React.ReactNode;
}

/**
 * Shared list card for bourbon entries across Collection, Explore, and Wishlist.
 * Null fields are omitted — no placeholder text.
 * Optional children render below the card details (for page-specific controls).
 */
export function BourbonCard({
  name,
  distillery,
  type,
  proof,
  age,
  personalRating,
  communityRating,
  onPress,
  children,
}: BourbonCardProps) {
  const hasRow1 = distillery || type;
  const hasRow2 = proof != null || age != null;

  return (
    <TouchableOpacity
      className="bg-brand-800 rounded-2xl p-4"
      onPress={onPress}
      testID="bourbon-card"
    >
      {/* Bourbon name */}
      <Text className="text-brand-100 font-bold text-base">{name}</Text>

      {/* Row 1: distillery and type */}
      {hasRow1 && (
        <View className="flex-row gap-2 mt-0.5">
          {distillery ? (
            <Text className="text-brand-400 text-sm">{distillery}</Text>
          ) : null}
          {type ? (
            <Text className="text-brand-400 text-sm">{type}</Text>
          ) : null}
        </View>
      )}

      {/* Row 2: proof and age */}
      {hasRow2 && (
        <View className="flex-row gap-4 mt-1">
          {proof != null ? (
            <Text className="text-brand-400 text-xs">{proof} proof</Text>
          ) : null}
          {age != null ? (
            <Text className="text-brand-400 text-xs">{age} yr</Text>
          ) : null}
        </View>
      )}

      {/* Row 3: ratings */}
      <View className="flex-row justify-between items-center mt-2">
        <View className="flex-row items-center gap-1">
          <Text className="text-brand-500 text-xs">You</Text>
          <StarRating value={personalRating ?? null} variant="personal" size="sm" />
        </View>
        <View className="flex-row items-center gap-1">
          <Text className="text-brand-500 text-xs">Community</Text>
          <StarRating value={communityRating ?? null} variant="community" size="sm" />
        </View>
      </View>

      {/* Page-specific controls */}
      {children}
    </TouchableOpacity>
  );
}
