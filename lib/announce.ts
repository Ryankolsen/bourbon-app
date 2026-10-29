import { AccessibilityInfo } from 'react-native';

/** Make the screen reader speak a message. Empty/whitespace-only messages are ignored. */
export function announce(message: string): void {
  const trimmed = message.trim();
  if (!trimmed) return;
  AccessibilityInfo.announceForAccessibility(trimmed);
}
