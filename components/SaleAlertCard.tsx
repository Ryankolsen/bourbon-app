import React, { useState } from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/lib/theme-provider";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useRemoveSaleAlert } from "@/hooks/use-sale-alerts";
import type { SaleAlert } from "@/hooks/use-sale-alerts";

export interface SaleAlertCardProps {
  alert: SaleAlert;
  currentUserId: string | undefined;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return diffMins <= 1 ? "just now" : `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getPosterLabel(alert: SaleAlert): string {
  return alert.poster_display_name ?? alert.poster_username ?? "A member";
}

export function SaleAlertCard({ alert, currentUserId }: SaleAlertCardProps) {
  const router = useRouter();
  const { activeTheme } = useTheme();
  const removeMutation = useRemoveSaleAlert();
  const [confirmVisible, setConfirmVisible] = useState(false);

  function handleGetDirections() {
    const url = `https://www.google.com/maps/place/?q=place_id:${alert.place_id}`;
    Linking.openURL(url).catch(() => {
      // fall back to address search if place_id URL fails
      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(alert.place_address)}`);
    });
  }

  function handleRemoveConfirm() {
    if (!currentUserId) return;
    removeMutation.mutate({ alertId: alert.id, groupId: alert.group_id, userId: currentUserId });
    setConfirmVisible(false);
  }

  return (
    <TouchableOpacity
      className="rounded-2xl p-4 mx-4 mb-3 border border-amber-600/30"
      style={{ backgroundColor: activeTheme.colors.brand800 }}
      onPress={() => router.push(`/bourbon/${alert.bourbon_id}` as never)}
      testID="sale-alert-card"
    >
      {/* Sale Alert badge */}
      <View className="flex-row items-center mb-3">
        <View
          className="flex-row items-center rounded-full px-2 py-0.5 mr-2"
          style={{ backgroundColor: activeTheme.colors.accentAmber + "33" }}
          testID="sale-alert-badge"
        >
          <Text style={{ color: activeTheme.colors.accentAmber }} className="text-xs font-bold">
            🔔 SALE ALERT
          </Text>
        </View>
        <Text className="text-brand-400 text-xs ml-auto">
          {formatRelativeTime(alert.created_at)}
        </Text>
      </View>

      {/* Bourbon name + distillery */}
      <Text className="text-brand-100 font-bold text-base mb-0.5" numberOfLines={1} testID="sale-alert-bourbon-name">
        {alert.bourbon_name}
      </Text>
      {alert.bourbon_distillery ? (
        <Text className="text-brand-400 text-xs mb-2" numberOfLines={1}>
          {alert.bourbon_distillery}
        </Text>
      ) : null}

      {/* Price */}
      <Text
        className="text-2xl font-bold mb-3"
        style={{ color: activeTheme.colors.accentAmber }}
        testID="sale-alert-price"
      >
        {alert.price}
      </Text>

      {/* Store info */}
      <View className="mb-3">
        <Text className="text-brand-100 text-sm font-semibold" numberOfLines={1} testID="sale-alert-place-name">
          {alert.place_name}
        </Text>
        <Text className="text-brand-400 text-xs mt-0.5" numberOfLines={2} testID="sale-alert-place-address">
          {alert.place_address}
        </Text>
      </View>

      {/* Optional note */}
      {alert.note ? (
        <Text className="text-brand-300 text-xs italic mb-3 leading-relaxed" testID="sale-alert-note">
          "{alert.note}"
        </Text>
      ) : null}

      {/* Footer: poster + action buttons */}
      <View className="flex-row items-center">
        <Text className="text-brand-400 text-xs flex-1" numberOfLines={1}>
          Posted by{" "}
          <Text className="text-brand-300 font-semibold">{getPosterLabel(alert)}</Text>
        </Text>

        {/* Get Directions */}
        <TouchableOpacity
          className="flex-row items-center rounded-lg px-3 py-1.5 mr-2"
          style={{ backgroundColor: activeTheme.colors.brand700 }}
          onPress={(e) => {
            e?.stopPropagation();
            handleGetDirections();
          }}
          accessibilityLabel="Get directions"
          testID="sale-alert-directions"
        >
          <Text style={{ color: activeTheme.colors.surfaceText }} className="text-xs font-semibold">
            Directions
          </Text>
        </TouchableOpacity>

        {/* Remove */}
        {currentUserId ? (
          <TouchableOpacity
            className="flex-row items-center rounded-lg px-3 py-1.5 bg-red-900/60"
            onPress={(e) => {
              e?.stopPropagation();
              setConfirmVisible(true);
            }}
            accessibilityLabel="Remove sale alert"
            testID="sale-alert-remove"
          >
            <Text className="text-red-400 text-xs font-semibold">Remove</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ConfirmationModal
        visible={confirmVisible}
        title="Remove Sale Alert"
        message="Mark this sale alert as gone? This will remove it for everyone in the group."
        confirmLabel="Remove"
        destructive
        onConfirm={handleRemoveConfirm}
        onCancel={() => setConfirmVisible(false)}
      />
    </TouchableOpacity>
  );
}
