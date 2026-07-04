import React, { useEffect, useState } from "react";
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useXpNotification } from "@/context/xp-context";
import { useTheme } from "@/lib/theme-provider";

// Swap this single reference to change the hero art without touching layout code.
const HERO_SOURCE = require("../assets/daily_login_image.png");
const COUNT_UP_DURATION = 800;

export function DailyBonusScreen() {
  const { dailyBonus, claimDailyBonus } = useXpNotification();
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;

  const awardedPoints = dailyBonus?.awardedPoints ?? 0;

  // Initialized to awardedPoints so the static value shows before Claim is pressed.
  const [displayPoints, setDisplayPoints] = useState(awardedPoints);
  const [claiming, setClaiming] = useState(false);

  // Re-sync when the modal re-appears (e.g. dismissed then re-shown by persistence).
  useEffect(() => {
    if (dailyBonus?.shouldShow) {
      setDisplayPoints(dailyBonus.awardedPoints ?? 0);
      setClaiming(false);
    }
  }, [dailyBonus?.shouldShow]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!dailyBonus?.shouldShow) return null;

  const { streakDays, milestoneHit, tomorrowPoints, nextMilestone } = dailyBonus;

  const handleClaim = () => {
    if (claiming) return;

    if (awardedPoints <= 0) {
      claimDailyBonus();
      return;
    }

    setClaiming(true);

    const steps = Math.min(awardedPoints, 20);
    const stepInterval = Math.round(COUNT_UP_DURATION / steps);
    let current = 1;
    // Start from the first step value instead of 0 so the number never flashes to zero.
    setDisplayPoints(Math.round((awardedPoints / steps) * current));

    const timer = setInterval(() => {
      current += 1;
      if (current >= steps) {
        setDisplayPoints(awardedPoints);
        clearInterval(timer);
        claimDailyBonus();
      } else {
        setDisplayPoints(Math.round((awardedPoints / steps) * current));
      }
    }, stepInterval);
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={handleClaim}
      testID="daily-bonus-modal"
    >
      <View style={styles.backdrop}>
        <View
          style={[styles.card, { backgroundColor: c.brand800 }]}
          testID="daily-bonus-card"
        >
          <Image
            source={HERO_SOURCE}
            style={styles.hero}
            testID="daily-bonus-hero"
            resizeMode="contain"
          />

          <Text style={[styles.heading, { color: c.accentAmber }]}>
            Daily Bonus
          </Text>

          <Text style={[styles.points, { color: c.brand100 }]}>
            +{displayPoints} Barrel Points
          </Text>

          {milestoneHit ? (
            <Text style={[styles.milestone, { color: c.accentAmber }]}>
              {streakDays}-Day Streak Milestone!
            </Text>
          ) : nextMilestone ? (
            <Text style={[styles.progress, { color: c.brand400 }]}>
              Day {streakDays} of {nextMilestone.day} — reach Day{" "}
              {nextMilestone.day} for a +{nextMilestone.bonusXp} bonus!
            </Text>
          ) : null}

          {tomorrowPoints != null && tomorrowPoints > 0 && (
            <Text style={[styles.tomorrow, { color: c.brand400 }]}>
              +{tomorrowPoints} tomorrow
            </Text>
          )}

          <TouchableOpacity
            style={[styles.claimBtn, { backgroundColor: c.brand500 }]}
            onPress={handleClaim}
            testID="claim-btn"
          >
            <Text style={[styles.claimText, { color: c.white }]}>Claim</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: "80%",
  },
  hero: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
  points: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 12,
  },
  milestone: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  progress: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
  },
  tomorrow: {
    fontSize: 14,
    marginBottom: 28,
    textAlign: "center",
  },
  claimBtn: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  claimText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
