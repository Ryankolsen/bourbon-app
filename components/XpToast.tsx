/**
 * XpToast — slides up from the bottom when an XP notification is pending.
 *
 * Reads from XpContext, renders "+{n} Barrel Points · {label}", auto-dismisses
 * after 2500ms, then advances the queue. Non-blocking via pointerEvents="none".
 *
 * For daily_checkin events, renders a secondary streak context line below the
 * points line showing current streak and tomorrow's XP preview.
 *
 * Also triggers XpBurst (sparkle animation) at the moment the toast appears.
 */

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useXpNotification } from "@/context/xp-context";
import { XpBurst, XpBurstHandle } from "@/components/XpBurst";
import { TomorrowXp } from "@/lib/streak-utils";

const AUTO_DISMISS_MS = 2500;

function buildStreakLine(
  streakDays: number | undefined,
  isReset: boolean | undefined,
  tomorrowXp: TomorrowXp | null | undefined
): string | null {
  if (isReset) {
    return "Streak reset — back to Day 1 · Tomorrow: +1 pt";
  }
  if (streakDays === undefined || streakDays === null || !tomorrowXp) return null;

  const base = `Day ${streakDays} streak · Tomorrow: +${tomorrowXp.base} pts`;
  if (tomorrowXp.milestoneLabel && tomorrowXp.bonusXp > 0) {
    return `${base} + ${tomorrowXp.bonusXp} bonus — ${tomorrowXp.milestoneLabel}!`;
  }
  return base;
}

export function XpToast() {
  const { current, advance } = useXpNotification();
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstRef = useRef<XpBurstHandle>(null);

  useEffect(() => {
    if (!current || current.xpAwarded === 0) return;

    burstRef.current?.trigger();

    // Slide in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss: advance the queue after the display window, then animate out
    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 80,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      translateY.setValue(80);
      opacity.setValue(0);
      advance();
    }, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current || current.xpAwarded === 0) return null;

  const streakLine =
    current.eventType === "daily_checkin"
      ? buildStreakLine(current.streakDays, current.isReset, current.tomorrowXp)
      : null;

  return (
    <>
      <XpBurst ref={burstRef} />
      <Animated.View
        style={[styles.container, { transform: [{ translateY }], opacity }]}
        pointerEvents="none"
      >
        <View style={styles.toastBubble}>
          <Text style={styles.text}>
            +{current.xpAwarded} Barrel Points · {current.label}
          </Text>
          {streakLine && (
            <Text style={styles.streakText} testID="streak-line">
              {streakLine}
            </Text>
          )}
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 110,
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 10000,
  },
  toastBubble: {
    backgroundColor: "#1e4080",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  streakText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
});
