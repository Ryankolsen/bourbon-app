/**
 * PendingDeletionModal — full-screen intercept shown when the user's account
 * is scheduled for deletion (pending_deletion_at is set).
 *
 * Mounted in the root layout so it appears immediately after login.
 * Cannot be dismissed by tapping the backdrop or navigating away — the user
 * must either cancel the deletion or sign out.
 */

import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { usePendingDeletion } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";

function formatDeletionDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function PendingDeletionModal() {
  const { session, signOut } = useAuth();
  const userId = session?.user?.id;
  const { isPendingDeletion, pendingDeletionAt, cancelDeletion } =
    usePendingDeletion(userId);

  const [cancelling, setCancelling] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const visible = !!session && isPendingDeletion && !dismissed;

  const deletionDate =
    pendingDeletionAt ? addDays(pendingDeletionAt, 30) : null;

  const handleCancelDeletion = async () => {
    setCancelling(true);
    try {
      await cancelDeletion();
      setDismissed(true);
    } finally {
      setCancelling(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        // Block hardware back button — user must take an action
      }}
      testID="pending-deletion-modal"
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.icon}>⚠️</Text>

          <Text style={styles.headline} testID="pending-deletion-headline">
            Account Scheduled for Deletion
          </Text>

          <Text style={styles.body} testID="pending-deletion-body">
            Your account is scheduled to be permanently deleted on{" "}
            <Text style={styles.dateText}>
              {deletionDate ? formatDeletionDate(deletionDate) : "…"}
            </Text>
            . After that date all your data will be gone forever.
          </Text>

          <Text style={styles.subtext}>
            You can cancel the deletion now to keep your account.
          </Text>

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancelDeletion}
            disabled={cancelling || signingOut}
            testID="pending-deletion-cancel-btn"
            activeOpacity={0.85}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.cancelButtonText}>Cancel Deletion</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.signOutButton]}
            onPress={handleSignOut}
            disabled={cancelling || signingOut}
            testID="pending-deletion-signout-btn"
            activeOpacity={0.85}
          >
            {signingOut ? (
              <ActivityIndicator size="small" color="#9CA3AF" />
            ) : (
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            )}
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
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#1F2937",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    gap: 16,
    borderWidth: 1,
    borderColor: "#7F1D1D",
  },
  icon: {
    fontSize: 40,
  },
  headline: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FCA5A5",
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    color: "#D1D5DB",
    textAlign: "center",
    lineHeight: 22,
  },
  dateText: {
    fontWeight: "700",
    color: "#F87171",
  },
  subtext: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#166534",
    borderWidth: 1,
    borderColor: "#15803D",
    marginTop: 4,
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  signOutButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#374151",
  },
  signOutButtonText: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "500",
  },
});
