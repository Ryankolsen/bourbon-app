/**
 * useShareAchievement — captures AchievementShareCard as PNG, awards XP via
 * the award_achievement_share_xp RPC, and opens the native share sheet.
 *
 * Usage:
 *   const { cardRef, share, isSharing, xpAwarded, alreadyClaimed, error } =
 *     useShareAchievement(belt.level);
 *
 *   // Attach cardRef to the AchievementShareCard View, then call share().
 */

import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { shareAsync } from 'expo-sharing';
import { supabase } from '@/lib/supabase';

export interface ShareAchievementResult {
  /** Attach to the AchievementShareCard View so captureRef can snapshot it. */
  cardRef: React.RefObject<View | null>;
  /** Trigger the full share flow: capture → award XP → open share sheet. */
  share: () => Promise<void>;
  /** True while the share flow is in progress. */
  isSharing: boolean;
  /** XP awarded by this share (0 if already claimed). */
  xpAwarded: number;
  /** True when the RPC signals this belt's XP was already claimed. */
  alreadyClaimed: boolean;
  /** Set when any step in the share flow throws. */
  error: Error | null;
}

export function useShareAchievement(beltLevel: number): ShareAchievementResult {
  const cardRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const share = useCallback(async () => {
    if (isSharing) return;

    setIsSharing(true);
    setError(null);

    try {
      // Step 1: capture the card as a PNG
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });

      // Step 2: award XP via idempotent RPC (once per belt level)
      const { data, error: rpcError } = await supabase.rpc(
        'award_achievement_share_xp',
        { key: String(beltLevel) },
      );

      if (rpcError) {
        throw new Error(rpcError.message ?? 'Failed to award XP');
      }

      const row = data?.[0];
      const awarded = row?.xp_awarded ?? 0;
      const claimed = row?.already_claimed ?? false;
      setXpAwarded(awarded);
      setAlreadyClaimed(claimed);

      // Step 3: open native share sheet
      await shareAsync(uri, { mimeType: 'image/png' });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsSharing(false);
    }
  }, [beltLevel, isSharing]);

  return { cardRef, share, isSharing, xpAwarded, alreadyClaimed, error };
}
