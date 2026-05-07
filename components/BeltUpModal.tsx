/**
 * BeltUpModal — full-screen celebration overlay fired on belt promotion.
 *
 * Subscribes to XpContext. When a notification arrives with `promoted: true`
 * the modal captures that promotion data into local state and shows itself.
 * It stays visible until the user taps the CTA or the backdrop; it does NOT
 * call `advance()` so the accompanying XpToast still plays normally.
 *
 * A second promotion event after dismissal will re-show the modal with the
 * new belt details.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useXpNotification } from "@/context/xp-context";
import { BeltBadge } from "@/components/BeltBadge";
import { getBeltConfig, getBeltPromotionCopy } from "@/lib/belt-config";
import { AchievementShareSheet } from "@/components/AchievementShareSheet";

export function BeltUpModal() {
  const { latestPromotion } = useXpNotification();
  const [visible, setVisible] = useState(false);
  const [promotion, setPromotion] = useState<{ belt: number; id: string } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  // Track the last promotion ID we've shown so we don't re-show on re-renders
  const lastShownIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (latestPromotion && latestPromotion.id !== lastShownIdRef.current) {
      lastShownIdRef.current = latestPromotion.id;
      setPromotion(latestPromotion);
      setVisible(true);
    }
  }, [latestPromotion?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => {
    setShareOpen(false);
    setVisible(false);
  };

  if (!visible || !promotion) return null;

  const belt = getBeltConfig(promotion.belt);
  const copy = getBeltPromotionCopy(promotion.belt);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
      testID="belt-up-modal"
    >
      <TouchableWithoutFeedback onPress={dismiss} testID="belt-up-backdrop">
        <View style={styles.backdrop}>
          {/* Inner card — taps here do NOT propagate to the backdrop */}
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <BeltBadge level={promotion.belt} size={60} />

              <Text style={styles.headline} testID="belt-up-headline">
                {belt.senpai
                  ? `Senpai · ${belt.name}`
                  : belt.sensei
                    ? `Sensei · ${belt.name}`
                    : belt.name}
              </Text>

              <Text style={styles.flavor} testID="belt-up-flavor">
                {belt.flavor}
              </Text>

              <Text style={styles.copy} testID="belt-up-copy">
                {copy}
              </Text>

              <TouchableOpacity
                style={[styles.ctaButton, { backgroundColor: belt.bgColor }]}
                onPress={dismiss}
                testID="belt-up-cta"
                activeOpacity={0.85}
              >
                <Text style={[styles.ctaText, { color: belt.iconColor }]}>
                  Let&apos;s go!
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareButton}
                onPress={() => setShareOpen(true)}
                testID="belt-up-share"
                activeOpacity={0.75}
              >
                <Text style={styles.shareText}>Share Your Achievement</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      <AchievementShareSheet
        visible={shareOpen}
        belt={belt}
        onClose={() => setShareOpen(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    gap: 16,
  },
  headline: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  flavor: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  copy: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    textAlign: "center",
    lineHeight: 24,
  },
  ctaButton: {
    marginTop: 8,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 999,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
  },
  shareButton: {
    paddingVertical: 8,
  },
  shareText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    textDecorationLine: "underline",
  },
});
