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
const WHITE_DOG_LEVEL = 1;

/** Scrim over the belt background behind small white text (blend toward black). */
export const SHARE_SCRIM_ALPHA = 0.4;

export function AchievementShareCard({ belt }: AchievementShareCardProps) {
  const isPappy = belt.level === PAPPY_LEVEL;
  const textColor = belt.shareTextColor ?? '#FFFFFF';
  // Light-background belts define shareTextColor and need no scrim; the rest
  // keep white text on a dark scrim panel.
  const hasScrim = belt.shareTextColor === undefined;
  const filledIcon = belt.level === WHITE_DOG_LEVEL || isPappy;

  const smallText = (
    <>
      {/* Belt flavor text */}
      <Text allowFontScaling={false} style={[styles.flavor, { color: textColor }]}>
        {belt.flavor}
      </Text>

      {/* Wordmark */}
      <Text allowFontScaling={false} style={[styles.wordmark, { color: textColor }]}>
        Bourbon Dojo
      </Text>

      {/* Share copy */}
      <Text allowFontScaling={false} style={[styles.shareCopy, { color: textColor }]}>
        {BELT_SHARE_COPY[belt.level]}
      </Text>

      {/* Landing page URL */}
      <Text
        testID="landing-url"
        allowFontScaling={false}
        style={[styles.landingUrl, { color: textColor }]}
      >
        {LANDING_PAGE_URL}
      </Text>
    </>
  );

  return (
    <View style={[styles.card, { backgroundColor: belt.bgColor }]}>
      {/* Legendary border for Pappy (belt 10) */}
      {isPappy && (
        <View
          testID="legendary-border"
          style={styles.legendaryBorder}
          pointerEvents="none"
        />
      )}

      {/* Belt icon — White Dog and Pappy sit in a solid circle so they never look empty */}
      {filledIcon ? (
        <View
          testID="share-icon-circle"
          style={[styles.iconCircle, { backgroundColor: textColor }]}
        >
          <Text
            allowFontScaling={false}
            style={[styles.circleGlyph, { color: belt.bgColor }]}
            accessibilityLabel={`${belt.name} belt icon`}
          >
            {isPappy ? belt.icon : '●'}
          </Text>
        </View>
      ) : (
        <Text
          allowFontScaling={false}
          style={[styles.icon, { color: textColor }]}
          accessibilityLabel={`${belt.name} belt icon`}
        >
          {belt.icon}
        </Text>
      )}

      {/* Belt name */}
      <Text allowFontScaling={false} style={[styles.beltName, { color: textColor }]}>
        {belt.name}
      </Text>

      {hasScrim ? (
        <View testID="share-scrim" style={styles.scrim}>
          {smallText}
        </View>
      ) : (
        <View style={styles.plainBlock}>{smallText}</View>
      )}
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
    borderColor: '#78350F',
  },
  icon: {
    fontSize: 72,
    marginBottom: 16,
    textAlign: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  circleGlyph: {
    fontSize: 48,
    textAlign: 'center',
  },
  scrim: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: `rgba(0,0,0,${SHARE_SCRIM_ALPHA})`,
    borderRadius: 12,
    padding: 16,
  },
  plainBlock: {
    alignSelf: 'stretch',
    alignItems: 'center',
    padding: 16,
  },
  beltName: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  flavor: {
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  wordmark: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 24,
  },
  shareCopy: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 21,
  },
  landingUrl: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
