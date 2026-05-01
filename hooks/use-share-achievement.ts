/**
 * useShareAchievement — captures AchievementShareCard as PNG, awards XP via
 * the award_achievement_share_xp RPC, and routes to the correct platform share.
 *
 * Platform routing (platform param):
 *   'instagram' — tries instagram-stories://share deep link; falls back to native share sheet
 *   'bluesky'   — opens bsky.app/intent/compose with URL-encoded shareText (text-only)
 *   'facebook'  — native share sheet with image (Facebook reads from it)
 *   'more'      — native share sheet via expo-sharing (default)
 *
 * Usage:
 *   const { cardRef, share, isSharing, xpAwarded, alreadyClaimed, error } =
 *     useShareAchievement(referenceKey, shareText);
 *
 *   // Attach cardRef to the AchievementShareCard View, then call share(platform).
 */

import { useCallback, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { shareAsync } from 'expo-sharing';
import { supabase } from '@/lib/supabase';

export interface ShareAchievementResult {
  /** Attach to the AchievementShareCard View so captureRef can snapshot it. */
  cardRef: React.RefObject<View | null>;
  /**
   * Trigger the full share flow: capture → award XP → route to platform.
   * Defaults to 'more' (native OS share sheet) if platform is omitted.
   */
  share: (platform?: string) => Promise<void>;
  /** True while the share flow is in progress. */
  isSharing: boolean;
  /** XP awarded by this share (0 if already claimed). */
  xpAwarded: number;
  /** True when the RPC signals this belt's XP was already claimed. */
  alreadyClaimed: boolean;
  /** Set when any step in the share flow throws. */
  error: Error | null;
}

/**
 * @param referenceKey — XP reference key (belt level as string, or 'first_tasting')
 * @param shareText    — Optional caption used for Bluesky intent URL. When
 *                       omitted the Bluesky button falls back to the native share sheet.
 */
export function useShareAchievement(
  referenceKey: string,
  shareText?: string,
): ShareAchievementResult {
  const cardRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const share = useCallback(
    async (platform: string = 'more') => {
      if (isSharing) return;

      setIsSharing(true);
      setError(null);

      try {
        // Step 1: capture the card as a PNG
        const uri = await captureRef(cardRef, { format: 'png', quality: 1 });

        // Step 2: award XP via idempotent RPC (once per reference key)
        const { data, error: rpcError } = await supabase.rpc(
          'award_achievement_share_xp',
          { key: referenceKey },
        );

        if (rpcError) {
          throw new Error(rpcError.message ?? 'Failed to award XP');
        }

        const row = data?.[0];
        const awarded = row?.xp_awarded ?? 0;
        const claimed = row?.already_claimed ?? false;
        setXpAwarded(awarded);
        setAlreadyClaimed(claimed);

        // Step 3: route to the selected platform
        await routeToPlatform(platform, uri, shareText);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsSharing(false);
      }
    },
    [referenceKey, shareText, isSharing],
  );

  return { cardRef, share, isSharing, xpAwarded, alreadyClaimed, error };
}

/**
 * Routes a captured image URI to the appropriate platform.
 *
 * - instagram: deep-links into Instagram Stories; falls back to native sheet
 *   if Instagram is not installed.
 * - bluesky:   opens bsky.app intent compose URL with pre-filled text.
 *   Falls back to native sheet when shareText is absent.
 * - facebook/more: native OS share sheet (Facebook reads the attached image).
 */
async function routeToPlatform(
  platform: string,
  uri: string,
  shareText?: string,
): Promise<void> {
  switch (platform) {
    case 'instagram': {
      const instagramURL = `instagram-stories://share?backgroundImage=${encodeURIComponent(uri)}`;
      const canOpen = await Linking.canOpenURL('instagram-stories://share');
      if (canOpen) {
        await Linking.openURL(instagramURL);
      } else {
        // Instagram not installed — fall back to native share sheet
        await shareAsync(uri, { mimeType: 'image/png' });
      }
      break;
    }

    case 'bluesky': {
      if (shareText) {
        const bskyURL = `https://bsky.app/intent/compose?text=${encodeURIComponent(shareText)}`;
        await Linking.openURL(bskyURL);
      } else {
        // No caption available — fall back to native share sheet with image
        await shareAsync(uri, { mimeType: 'image/png' });
      }
      break;
    }

    case 'facebook':
    case 'more':
    default:
      await shareAsync(uri, { mimeType: 'image/png' });
      break;
  }
}
