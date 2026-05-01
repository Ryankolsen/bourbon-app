/**
 * AchievementShareSheet — bottom sheet presenting platform share buttons.
 *
 * Thin UI wrapper over useShareAchievement. Owns presentation and dismissal;
 * share logic lives in the hook. The hidden AchievementShareCard is rendered
 * off-screen (opacity 0) so react-native-view-shot can capture it.
 *
 * Usage:
 *   <AchievementShareSheet visible={shareOpen} belt={belt} onClose={closeShare} />
 */

import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BeltConfig } from '@/lib/belt-config';
import { useShareAchievement } from '@/hooks/use-share-achievement';
import { AchievementShareCard } from '@/components/AchievementShareCard';
import { colors } from '@/lib/colors';

export interface AchievementShareSheetProps {
  visible: boolean;
  belt: BeltConfig;
  onClose: () => void;
}

const PLATFORMS: { key: string; label: string; emoji: string }[] = [
  { key: 'instagram', label: 'Instagram Stories', emoji: '📸' },
  { key: 'facebook', label: 'Facebook', emoji: '👥' },
  { key: 'bluesky', label: 'Bluesky', emoji: '🦋' },
  { key: 'more', label: 'More', emoji: '⬆️' },
];

export function AchievementShareSheet({
  visible,
  belt,
  onClose,
}: AchievementShareSheetProps) {
  const { cardRef, share, isSharing } = useShareAchievement(belt.level);

  const cardPlatform: 'ios' | 'android' =
    Platform.OS === 'ios' ? 'ios' : 'android';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      testID="achievement-share-sheet"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Share Your Achievement</Text>
          <TouchableOpacity
            onPress={onClose}
            testID="achievement-share-sheet-close"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Belt name subtitle */}
        <Text style={styles.beltName}>{belt.name} Belt</Text>

        {/* Loading indicator */}
        {isSharing && (
          <View style={styles.loadingRow} testID="share-loading-indicator">
            <ActivityIndicator color={colors.spinnerDefault} size="small" />
            <Text style={styles.loadingText}>Preparing your card…</Text>
          </View>
        )}

        {/* Platform buttons */}
        <View style={styles.buttonList}>
          {PLATFORMS.map(({ key, label, emoji }) => (
            <TouchableOpacity
              key={key}
              style={[styles.platformButton, isSharing && styles.platformButtonDisabled]}
              onPress={share}
              disabled={isSharing}
              accessibilityState={{ disabled: isSharing }}
              testID={`share-platform-${key}`}
            >
              <Text style={styles.platformEmoji}>{emoji}</Text>
              <Text style={[styles.platformLabel, isSharing && styles.platformLabelDisabled]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Off-screen card for react-native-view-shot capture */}
        <View ref={cardRef} style={styles.offScreen} pointerEvents="none">
          <AchievementShareCard belt={belt} platform={cardPlatform} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#374151',
  },
  title: {
    color: '#F9FAFB',
    fontSize: 17,
    fontWeight: '700',
  },
  closeIcon: {
    color: '#9CA3AF',
    fontSize: 18,
    fontWeight: '600',
  },
  beltName: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  buttonList: {
    marginTop: 8,
    paddingHorizontal: 16,
    gap: 10,
  },
  platformButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  platformButtonDisabled: {
    opacity: 0.5,
  },
  platformEmoji: {
    fontSize: 22,
  },
  platformLabel: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
  },
  platformLabelDisabled: {
    color: '#9CA3AF',
  },
  offScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0,
    pointerEvents: 'none',
  },
});
