/**
 * StreakCard — displays streak headline, 7-day rolling calendar, and tomorrow's XP preview.
 *
 * Pure presentational component — no Supabase dependency. All data passed via props.
 *
 * Calendar derivation logic:
 * - Shows last 7 days as filled/empty dots (index 0 = today, 6 = 6 days ago).
 * - A cell at index N is filled if it falls within the continuous streak ending on lastCheckinDate.
 * - lastCheckinDate must be today or yesterday for the streak to be considered active.
 * - If today: cells 0..streakDays-1 are filled (capped at 6).
 * - If yesterday: cells 1..streakDays are filled (capped at 6).
 * - Otherwise: no cells filled.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { TomorrowXp } from "@/lib/streak-utils";
import { useTheme } from "@/lib/theme-provider";

export interface StreakCardProps {
  streakDays: number;
  lastCheckinDate: string | null;
  tomorrowXp: TomorrowXp;
  isReset: boolean;
}

/**
 * Compute which of the 7 calendar cells are filled.
 * Index 0 = today, 6 = 6 days ago.
 */
function computeCalendarCells(streakDays: number, lastCheckinDate: string | null): boolean[] {
  if (!lastCheckinDate || streakDays <= 0) {
    return Array(7).fill(false);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Parse as local midnight — bare "YYYY-MM-DD" strings are interpreted as UTC
  // by the Date constructor, which shifts the date by the local UTC offset.
  const [cy, cm, cd] = lastCheckinDate.split("-").map(Number);
  const checkin = new Date(cy, cm - 1, cd);

  const todayTime = today.getTime();
  const yesterdayTime = yesterday.getTime();
  const checkinTime = checkin.getTime();

  let offset: number;
  if (checkinTime === todayTime) {
    offset = 0;
  } else if (checkinTime === yesterdayTime) {
    offset = 1;
  } else {
    // lastCheckinDate is neither today nor yesterday — streak expired
    return Array(7).fill(false);
  }

  return Array.from({ length: 7 }, (_, n) => n >= offset && n < streakDays + offset);
}

function buildTomorrowLine(tomorrowXp: TomorrowXp): string {
  const base = `Tomorrow: +${tomorrowXp.base} pts`;
  if (tomorrowXp.milestoneLabel && tomorrowXp.bonusXp > 0) {
    return `${base} + ${tomorrowXp.bonusXp} bonus — ${tomorrowXp.milestoneLabel}!`;
  }
  return base;
}

export function StreakCard({ streakDays, lastCheckinDate, tomorrowXp, isReset }: StreakCardProps) {
  const cells = computeCalendarCells(streakDays, lastCheckinDate);
  const headline = isReset ? "Streak reset" : `${streakDays}-day streak`;
  const { activeTheme } = useTheme();

  return (
    <View style={styles.card}>
      {/* Headline */}
      <Text style={[styles.headline, { color: activeTheme.colors.brand100 }]} testID="streak-headline">
        {"🔥"} {headline}
      </Text>

      {/* 7-day rolling calendar */}
      <View style={styles.calendar} testID="streak-calendar">
        {cells.map((filled, i) => (
          <View
            key={i}
            testID={filled ? "streak-day-filled" : "streak-day-empty"}
            style={[styles.dot, filled ? styles.dotFilled : styles.dotEmpty]}
          />
        ))}
      </View>

      {/* Tomorrow's XP preview */}
      <Text style={[styles.tomorrow, { color: activeTheme.colors.brand400 }]} testID="streak-tomorrow">
        {buildTomorrowLine(tomorrowXp)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    paddingVertical: 8,
  },
  headline: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  calendar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  dotFilled: {
    backgroundColor: "#F59E0B",
  },
  dotEmpty: {
    backgroundColor: "#374151",
  },
  tomorrow: {
    fontSize: 13,
    textAlign: "center",
  },
});
