/**
 * AchievementShareCard — stateless branded card for belt achievement sharing.
 *
 * Sized at 9:16 aspect ratio. Captured as a PNG via react-native-view-shot
 * by the parent useShareAchievement hook. Receives all display data as props.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BeltConfig, BELT_SHARE_COPY } from '@/lib/belt-config';
import { LANDING_PAGE_URL } from '@/lib/public-links';

export interface AchievementShareCardProps {
  belt: BeltConfig;
}

const CARD_WIDTH = 360;
const CARD_HEIGHT = 640; // 9:16 ratio

const PAPPY_LEVEL = 10;

export function AchievementShareCard({ belt }: AchievementShareCardProps) {
  const isPappy = belt.level === PAPPY_LEVEL;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: belt.bgColor },
      ]}
    >
      {/* Legendary gold border for Pappy (belt 10) */}
      {isPappy && (
        <View
          testID="legendary-border"
          style={styles.legendaryBorder}
          pointerEvents="none"
        />
      )}

      {/* Belt icon */}
      <Text
        style={[
          styles.icon,
          { color: belt.iconColor },
          isPappy && styles.legendaryIcon,
        ]}
        accessibilityLabel={`${belt.name} belt icon`}
      >
        {belt.icon}
      </Text>

      {/* Belt name */}
      <Text style={[styles.beltName, { color: belt.iconColor }]}>
        {belt.name}
      </Text>

      {/* Belt flavor text */}
      <Text style={[styles.flavor, { color: belt.iconColor }]}>
        {belt.flavor}
      </Text>

      {/* Wordmark */}
      <Text style={[styles.wordmark, { color: belt.iconColor }]}>
        Bourbon Dojo
      </Text>

      {/* Share copy */}
      <Text style={[styles.shareCopy, { color: belt.iconColor }]}>
        {BELT_SHARE_COPY[belt.level]}
      </Text>

      {/* Landing page URL */}
      <Text
        testID="app-store-url"
        style={[styles.appStoreUrl, { color: belt.iconColor }]}
      >
        {LANDING_PAGE_URL}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    overflow: 'hidden',
  },
  legendaryBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 6,
    borderColor: '#FFD700',
  },
  icon: {
    fontSize: 72,
    marginBottom: 16,
    textAlign: 'center',
  },
  legendaryIcon: {
    fontSize: 96,
  },
  beltName: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  flavor: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.85,
    fontStyle: 'italic',
  },
  wordmark: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 24,
    opacity: 0.9,
  },
  shareCopy: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    opacity: 0.8,
    lineHeight: 18,
  },
  appStoreUrl: {
    fontSize: 11,
    textAlign: 'center',
    opacity: 0.65,
  },
});
