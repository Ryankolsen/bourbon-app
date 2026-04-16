/**
 * Color constants for imperative style props (ActivityIndicator, tab bar, sliders, etc.).
 * All values mirror the tokens in tailwind.config.js.
 * This is the ONLY file outside of tailwind.config.js where hex strings are permitted.
 */

export const colors = {
  // Brand palette — mirrors brand-* in tailwind.config.js
  brand50:  "#f0f0ff",
  brand100: "#e0e0ff",
  brand200: "#c0c4f8",
  brand300: "#9ca3f0",
  brand400: "#7c7de8",
  brand500: "#6060d6",
  brand600: "#4848c0",
  brand700: "#2d2b8a",
  brand800: "#1a1860",
  brand900: "#0d0c38",

  // Tab bar / header
  tabBar:      "#0d0a2e",
  tabBorder:   "#2a1f6e",
  tabActive:   "#818cf8",
  tabInactive: "#4a4580",
  headerTint:  "#e0e7ff",

  // Feedback / alerts
  badgeError:   "#dc2626",
  toastSuccess: "#4848c0",
  toastError:   "#b91c1c",
  toastAction:  "#c8c8e8",
  errorDefault: "#ef4444",

  // Sliders / toggles
  sliderThumb:        "#e39e38",
  sliderTrackFilled:  "#c47b2a",
  sliderTrackEmpty:   "#3a2a1a",

  // Accent / spinners
  accentAmber:   "#f59e0b",
  spinnerDefault: "#e39e38",
  spinnerAmber:   "#c8a96e",

  // Input placeholders
  placeholderDark:   "#7a3c19",
  placeholderMuted:  "#6b5c45",
  placeholderGroup:  "#7c6a50",
  placeholderSearch: "#5a5a9a",

  // Picker overlay
  pickerBg:     "#0f0e4a",
  pickerBorder: "#2d2b8a",

  // Basics
  white: "#ffffff",
  black: "#000000",
} as const;

export type ColorKey = keyof typeof colors;
