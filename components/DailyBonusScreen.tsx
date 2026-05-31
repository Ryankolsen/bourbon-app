import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useXpNotification } from "@/context/xp-context";

export function DailyBonusScreen() {
  const { dailyBonus, claimDailyBonus } = useXpNotification();

  if (!dailyBonus?.shouldShow) return null;

  const { awardedPoints, streakDays, milestoneHit, tomorrowPoints, nextMilestone } = dailyBonus;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={claimDailyBonus}
      testID="daily-bonus-modal"
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.heading}>Daily Bonus</Text>

          <Text style={styles.points}>
            +{awardedPoints} Barrel Points
          </Text>

          {milestoneHit ? (
            <Text style={styles.milestone}>
              {streakDays}-Day Streak Milestone!
            </Text>
          ) : nextMilestone ? (
            <Text style={styles.progress}>
              Day {streakDays} of {nextMilestone.day} — reach Day {nextMilestone.day} for a +{nextMilestone.bonusXp} bonus!
            </Text>
          ) : null}

          {tomorrowPoints != null && tomorrowPoints > 0 && (
            <Text style={styles.tomorrow}>+{tomorrowPoints} tomorrow</Text>
          )}

          <TouchableOpacity
            style={styles.claimBtn}
            onPress={claimDailyBonus}
            testID="claim-btn"
          >
            <Text style={styles.claimText}>Claim</Text>
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
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: "80%",
  },
  heading: {
    color: "#f59e0b",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
  points: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 12,
  },
  milestone: {
    color: "#f59e0b",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  progress: {
    color: "#a3a3a3",
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
  },
  tomorrow: {
    color: "#a3a3a3",
    fontSize: 14,
    marginBottom: 28,
    textAlign: "center",
  },
  claimBtn: {
    backgroundColor: "#0ea5e9",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  claimText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
