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
            +{dailyBonus.awardedPoints} Barrel Points
          </Text>
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
    marginBottom: 28,
  },
  claimBtn: {
    backgroundColor: "#0ea5e9",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
  },
  claimText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
