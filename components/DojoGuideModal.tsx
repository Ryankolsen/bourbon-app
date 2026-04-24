/**
 * DojoGuideModal — full-screen guide explaining the Bourbon Dojo leveling system.
 *
 * Contains two tabs:
 *   - Belts: vertical progression ladder showing all 10 belts, with the user's
 *     current belt highlighted and their current XP displayed inline.
 *   - How to Earn: stub (implemented in the next slice).
 *
 * Props:
 *   totalXp   — user's current total XP (from useUserXp hook at the call site)
 *   visible   — controls modal visibility
 *   onClose   — called when the user taps the close button
 */

import React, { useRef, useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BELTS, getBeltForXp, XP_AWARD_AMOUNTS, STREAK_MILESTONE_BONUSES } from "@/lib/belt-config";
import { useTheme } from "@/lib/theme-provider";

export interface DojoGuideModalProps {
  totalXp: number;
  visible: boolean;
  onClose: () => void;
}

type Tab = "belts" | "howToEarn";

export function DojoGuideModal({ totalXp, visible, onClose }: DojoGuideModalProps) {
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;
  const [activeTab, setActiveTab] = useState<Tab>("belts");
  const scrollRef = useRef<ScrollView>(null);
  const currentBeltLevel = getBeltForXp(totalXp);

  // Auto-scroll to current belt row on open
  useEffect(() => {
    if (!visible) return;
    const rowHeight = 100; // approximate row + connector height in px
    const targetIndex = currentBeltLevel - 1;
    const offset = Math.max(0, targetIndex * rowHeight - 80);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: offset, animated: false });
    }, 50);
  }, [visible, currentBeltLevel]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      testID="dojo-guide-modal"
    >
      <SafeAreaView style={[styles.container, { backgroundColor: c.brand900 }]}>
        {/* ── Header ── */}
        <View style={[styles.header, { borderBottomColor: c.brand700 }]}>
          <Text style={[styles.headerTitle, { color: c.brand100 }]}>
            Bourbon Dojo Guide
          </Text>
          <TouchableOpacity
            onPress={onClose}
            testID="dojo-guide-close"
            style={styles.closeButton}
            accessibilityLabel="Close"
          >
            <Text style={[styles.closeIcon, { color: c.brand100 }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* ── Tab bar ── */}
        <View style={[styles.tabBar, { borderBottomColor: c.brand700 }]}>
          {(["belts", "howToEarn"] as Tab[]).map((tab) => {
            const label = tab === "belts" ? "Belts" : "How to Earn";
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tabButton,
                  isActive && { borderBottomColor: c.brand400, borderBottomWidth: 2 },
                ]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isActive ? c.brand100 : c.brand400 },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Tab content ── */}
        {activeTab === "belts" ? (
          <BeltsTab
            totalXp={totalXp}
            currentBeltLevel={currentBeltLevel}
            scrollRef={scrollRef}
            c={c}
          />
        ) : (
          <HowToEarnTab c={c} />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ── Belts tab ─────────────────────────────────────────────────────────────────

interface BeltsTabProps {
  totalXp: number;
  currentBeltLevel: number;
  scrollRef: React.RefObject<ScrollView | null>;
  c: Record<string, string>;
}

function BeltsTab({ totalXp, currentBeltLevel, scrollRef, c }: BeltsTabProps) {
  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scrollView}
      contentContainerStyle={styles.beltList}
    >
      {BELTS.map((belt, idx) => {
        const isCurrent = belt.level === currentBeltLevel;
        const isLast = idx === BELTS.length - 1;
        const xpToNext =
          !isLast ? BELTS[idx + 1].minXp - totalXp : null;

        return (
          <View key={belt.level}>
            {/* Belt row */}
            <View
              testID={isCurrent ? "belt-row-current" : `belt-row-${belt.level}`}
              style={[
                styles.beltRow,
                {
                  backgroundColor: isCurrent ? c.brand800 : "transparent",
                  borderColor: isCurrent ? c.brand600 : "transparent",
                  borderWidth: isCurrent ? 1 : 0,
                },
              ]}
            >
              {/* Icon */}
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: belt.bgColor },
                ]}
              >
                <Text style={[styles.iconText, { color: belt.iconColor }]}>
                  {belt.icon}
                </Text>
              </View>

              {/* Text content */}
              <View style={styles.beltInfo}>
                <Text style={[styles.beltName, { color: c.brand100 }]}>
                  {belt.name}
                </Text>
                <Text style={[styles.beltFlavor, { color: c.brand400 }]}>
                  {belt.flavor}
                </Text>

                {/* Threshold (non-current rows) */}
                {!isCurrent && (
                  <Text style={[styles.xpThreshold, { color: c.brand400 }]}>
                    {belt.minXp.toLocaleString()} XP
                  </Text>
                )}

                {/* Current XP (current row only) */}
                {isCurrent && (
                  <Text
                    testID="belt-row-current-xp"
                    style={[styles.currentXp, { color: c.brand100 }]}
                  >
                    {totalXp} XP
                  </Text>
                )}

                {/* XP to next belt (current row, non-max belts) */}
                {isCurrent && belt.level < 10 && xpToNext !== null && (
                  <Text style={[styles.xpToNext, { color: c.brand400 }]}>
                    {Math.max(0, xpToNext).toLocaleString()} XP to next belt
                  </Text>
                )}

                {/* Legendary acknowledgment for Pappy */}
                {isCurrent && belt.level === 10 && (
                  <Text style={[styles.legendary, { color: c.brand100 }]}>
                    Legendary — the Dojo's highest honor
                  </Text>
                )}
              </View>
            </View>

            {/* Connector line between rows */}
            {!isLast && (
              <View
                style={[styles.connector, { backgroundColor: c.brand700 }]}
              />
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ── How to Earn tab ───────────────────────────────────────────────────────────

interface EarnCategory {
  title: string;
  actions: { label: string; xp: number | null; note?: string }[];
}

const EARN_CATEGORIES: EarnCategory[] = [
  {
    title: "Tasting",
    actions: [
      { label: "Log a tasting", xp: XP_AWARD_AMOUNTS.tasting_logged },
      { label: "First tasting of this bourbon", xp: XP_AWARD_AMOUNTS.first_tasting_bonus },
      { label: "Add to collection", xp: XP_AWARD_AMOUNTS.collection_add },
      { label: "Add to wishlist", xp: XP_AWARD_AMOUNTS.wishlist_add },
    ],
  },
  {
    title: "Social",
    actions: [
      { label: "Follow someone", xp: XP_AWARD_AMOUNTS.follow_sent },
      { label: "Gain a follower", xp: XP_AWARD_AMOUNTS.follower_gained },
      { label: "Post a comment", xp: XP_AWARD_AMOUNTS.comment_posted },
      { label: "Receive a comment", xp: XP_AWARD_AMOUNTS.comment_received },
      { label: "Tasting liked", xp: XP_AWARD_AMOUNTS.like_received },
    ],
  },
  {
    title: "Community",
    actions: [
      { label: "Create a group", xp: XP_AWARD_AMOUNTS.group_create },
      { label: "Join a group", xp: XP_AWARD_AMOUNTS.group_join },
      { label: "Share to group", xp: XP_AWARD_AMOUNTS.group_share },
    ],
  },
  {
    title: "Streaks",
    actions: [
      {
        label: "Daily check-in (streak day N)",
        xp: null,
        note: "Earn N XP on streak day N — the longer your streak, the more you earn each day.",
      },
      { label: "7-day streak milestone", xp: STREAK_MILESTONE_BONUSES[7] },
      { label: "30-day streak milestone", xp: STREAK_MILESTONE_BONUSES[30] },
    ],
  },
];

function HowToEarnTab({ c }: { c: Record<string, string> }) {
  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.earnList}>
      {EARN_CATEGORIES.map((category) => (
        <View
          key={category.title}
          testID={`earn-category-${category.title.toLowerCase()}`}
          style={styles.earnCategory}
        >
          <Text style={[styles.earnCategoryHeader, { color: c.brand100 }]}>
            {category.title}
          </Text>
          {category.actions.map((action) => (
            <View key={action.label} style={styles.earnRow}>
              <Text style={[styles.earnLabel, { color: c.brand100 }]}>
                {action.label}
              </Text>
              {action.xp !== null ? (
                <Text style={[styles.earnXp, { color: c.brand400 }]}>
                  +{action.xp} XP
                </Text>
              ) : (
                <Text style={[styles.earnNote, { color: c.brand400 }]}>
                  {action.note}
                </Text>
              )}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    padding: 8,
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: "600",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  beltList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  beltRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconText: {
    fontSize: 18,
  },
  beltInfo: {
    flex: 1,
    gap: 2,
  },
  beltName: {
    fontSize: 16,
    fontWeight: "700",
  },
  beltFlavor: {
    fontSize: 13,
    lineHeight: 18,
  },
  xpThreshold: {
    fontSize: 12,
    marginTop: 2,
  },
  currentXp: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  xpToNext: {
    fontSize: 12,
    marginTop: 2,
  },
  legendary: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  connector: {
    width: 2,
    height: 20,
    marginLeft: 42, // aligns with center of iconCircle (20 padding + 22 radius)
  },
  earnList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 24,
  },
  earnCategory: {
    gap: 8,
  },
  earnCategoryHeader: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  earnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  earnLabel: {
    fontSize: 14,
    flex: 1,
  },
  earnXp: {
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 0,
  },
  earnNote: {
    fontSize: 13,
    flex: 1,
    flexShrink: 1,
  },
});
