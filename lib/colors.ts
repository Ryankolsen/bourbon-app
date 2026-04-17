/**
 * Color constants for imperative style props (ActivityIndicator, tab bar, sliders, etc.).
 * All values mirror the active default theme (Charcoal) from lib/themes.ts.
 * This is the ONLY file outside of tailwind.config.js where hex strings are permitted.
 */

export const colors = {
  // Brand palette — mirrors Charcoal brand-* tokens
  brand50:  "#f0f9ff",
  brand100: "#e0f2fe",
  brand200: "#bae6fd",
  brand300: "#7dd3fc",
  brand400: "#38bdf8",
  brand500: "#0ea5e9",
  brand600: "#0284c7",
  brand700: "#0369a1",
  brand800: "#1a1a1a",
  brand900: "#0a0a0a",

  // Tab bar / header
  tabBar:      "#0a0a0a",
  tabBorder:   "#2a2a2a",
  tabActive:   "#38bdf8",
  tabInactive: "#4a4a4a",
  headerTint:  "#e0f2fe",

  // Feedback / alerts
  badgeError:   "#dc2626",
  toastSuccess: "#0284c7",
  toastError:   "#b91c1c",
  toastAction:  "#bae6fd",
  errorDefault: "#ef4444",

  // Sliders / toggles
  sliderThumb:        "#38bdf8",
  sliderTrackFilled:  "#0ea5e9",
  sliderTrackEmpty:   "#2a2a2a",

  // Accent / spinners
  accentAmber:    "#f59e0b",
  spinnerDefault: "#38bdf8",
  spinnerAmber:   "#7dd3fc",

  // Input placeholders
  placeholderDark:   "#8a8aaa",
  placeholderMuted:  "#7a7a8a",
  placeholderGroup:  "#7ab4d4",
  placeholderSearch: "#5a5a9a",

  // Picker overlay
  pickerBg:     "#0a0a0a",
  pickerBorder: "#0369a1",

  // Basics
  white: "#ffffff",
  black: "#000000",
} as const;

export type ColorKey = keyof typeof colors;
