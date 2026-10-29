/**
 * Theme definitions for the Bourbon Dojo app.
 *
 * Component token roles discovered from source:
 *   brand-900 = main app background
 *   brand-800 = card / elevated surface
 *   brand-700 = button bg (Remove from Vault, chips, avatars, input fields)
 *   brand-600 = vivid accent bg (active filter chips, selected states)
 *   brand-400 = secondary text
 *   brand-300 = dual-use text: button text ON brand-700 AND secondary labels on cards
 *   brand-100 = primary text
 *
 * Light theme rules:
 *   brand-900  → off-white tinted background (#E0–#EE, NOT #F8 — needs contrast vs white cards)
 *   brand-800  → white card (#FFFFFF)
 *   brand-700  → tint of accent, visible as a button against white cards and the tinted bg.
 *                Avoid mid-tones: no text colour reads well on them. Navy & Flax uses a pale tint (dark text ≥7:1).
 *   brand-600  → vivid/saturated accent (active chips, icons)
 *   brand-300  → dark shade (~10:1 on white AND ≥4.5:1 on brand-700) — works in both roles
 *   brand-100  → near-black primary text (~15:1 on white)
 *   tabInactive → dark enough to read on tabBar background (~5:1)
 */

export type ThemeMode = "system" | "light" | "dark" | "accessible";

export type ThemeColors = {
  brand50: string;
  brand100: string;
  brand200: string;
  brand300: string;
  brand400: string;
  brand500: string;
  brand600: string;
  brand700: string;
  brand800: string;
  brand900: string;

  tabBar: string;
  tabBorder: string;
  tabActive: string;
  tabInactive: string;
  headerTint: string;

  badgeError: string;
  toastSuccess: string;
  toastError: string;
  toastAction: string;
  errorDefault: string;
  /** Dojo quiz — correct-answer fill; white text on it must be >= 4.5:1 */
  answerCorrect: string;
  /** Dojo quiz — wrong-answer fill; white text on it must be >= 4.5:1 */
  answerWrong: string;

  sliderThumb: string;
  sliderTrackFilled: string;
  sliderTrackEmpty: string;

  accentAmber: string;
  /** Empty track of the XP progress bar (fill is delineated by a brand-100 border) */
  xpTrack: string;
  spinnerDefault: string;
  spinnerAmber: string;

  /** Filled star color for personal (amber) star ratings */
  starFilled: string;
  /** Empty / unselected star color — must be distinguishable from starFilled */
  starEmpty: string;

  placeholderDark: string;
  placeholderMuted: string;
  placeholderGroup: string;
  placeholderSearch: string;

  /** Readable text/label color for interactive elements on brand-700 surfaces (buttons, chips) */
  surfaceText: string;

  pickerBg: string;
  pickerBorder: string;

  /** Text color for user avatar circles (on bg-brand-600 backgrounds) */
  avatarText: string;

  /** Sale alert card — Directions button text */
  saleAlertDirectionsText: string;
  /** Sale alert card — +Add button text */
  saleAlertAddText: string;
  /** Sale alert card — Remove button text */
  saleAlertRemoveText: string;

  white: string;
  black: string;
};

export type Theme = {
  id: string;
  name: string;
  variant: "light" | "dark";
  colors: ThemeColors;
};

// ---------------------------------------------------------------------------
// Dark themes (keepers)
// ---------------------------------------------------------------------------

const charcoal: Theme = {
  id: "charcoal",
  name: "Charcoal",
  variant: "dark",
  colors: {
    brand50:  "#f0f9ff",
    brand100: "#e0f2fe",
    brand200: "#bae6fd",
    brand300: "#bae8fd",
    brand400: "#38bdf8",
    brand500: "#0ea5e9",
    brand600: "#0279bb",  // white text 4.7:1 on selected chips ✓
    brand700: "#0369a1",
    brand800: "#1a1a1a",
    brand900: "#0a0a0a",
    tabBar:       "#0a0a0a",
    tabBorder:    "#2a2a2a",
    tabActive:    "#38bdf8",
    tabInactive:  "#797979",
    headerTint:   "#e0f2fe",
    badgeError:   "#dc2626",
    toastSuccess: "#02689d",
    toastError:   "#b91c1c",
    toastAction:  "#bae6fd",
    errorDefault: "#ef4444",
    answerCorrect: "#15803d",
    answerWrong:   "#dc2626",
    sliderThumb:       "#38bdf8",
    sliderTrackFilled: "#0ea5e9",
    sliderTrackEmpty:  "#2a2a2a",
    accentAmber:    "#f59e0b",
    xpTrack:        "#374151",
    spinnerDefault: "#38bdf8",
    spinnerAmber:   "#7dd3fc",
    starFilled: "#f59e0b",  // amber — 9.3:1 on brand-800 #1a1a1a ✓
    starEmpty:  "#6b6b6b",  // mid gray — 3.5:1 on #1a1a1a (UI component threshold) ✓
    // Lightened — dark grey (#4a4a4a) was invisible on brand-800 #1a1a1a (near-black)
    placeholderDark:   "#8a8aaa",
    placeholderMuted:  "#7a7a8a",
    // Pale sky blue — readable on brand-700 #0369a1 (4.9:1) and brand-800 #1a1a1a (14.5:1)
    placeholderGroup:  "#d6eefa",
    placeholderSearch: "#5a5a9a",
    // White — readable on brand-700 #0369a1 (5.9:1)
    surfaceText: "#ffffff",
    pickerBg:     "#0a0a0a",
    pickerBorder: "#0369a1",
    avatarText: "#e0f2fe",
    saleAlertDirectionsText: "#bae6fd",
    saleAlertAddText: "#f59e0b",
    saleAlertRemoveText: "#f87171",
    white: "#ffffff",
    black: "#000000",
  },
};

/** WCAG AAA: #FFD700 on #000000 — ~19.6:1 contrast */
const highContrast: Theme = {
  id: "high-contrast",
  name: "High Contrast",
  variant: "dark",
  colors: {
    brand50:  "#fffff0",
    brand100: "#fffd80",
    brand200: "#fff9c4",
    brand300: "#fff176",
    brand400: "#ffec40",
    brand500: "#ffd700",
    brand600: "#000000",  // black buttons — white text gives 21:1 contrast ✓
    brand700: "#5c4d00",  // dark gold secondary surfaces — white 8.3:1, brand300 7.2:1, brand500 6.0:1 ✓
    brand800: "#0a0a0a",
    brand900: "#000000",
    tabBar:       "#000000",
    tabBorder:    "#3a3a00",
    tabActive:    "#ffd700",
    tabInactive:  "#797900",
    headerTint:   "#fff176",
    badgeError:   "#ff4444",
    toastSuccess: "#7e6b00",
    toastError:   "#cc0000",
    toastAction:  "#fff176",
    errorDefault: "#ff4444",
    answerCorrect: "#15803d",
    answerWrong:   "#dc2626",
    sliderThumb:       "#ffd700",
    sliderTrackFilled: "#ccac00",
    sliderTrackEmpty:  "#1a1a1a",
    accentAmber:    "#ffd700",
    xpTrack:        "#3a3a00",
    spinnerDefault: "#ffd700",
    spinnerAmber:   "#ffec40",
    starFilled: "#ffd700",  // gold — 19.6:1 on brand-800 #0a0a0a ✓
    starEmpty:  "#7a7a00",  // dark olive — 3.6:1 on #0a0a0a (UI component threshold) ✓
    // Brightened — dark olive was invisible on brand-800 #0a0a0a (near-black)
    placeholderDark:   "#999400",
    placeholderMuted:  "#888400",
    // Light olive — readable on brand-700 #5c4d00 (5.0:1) and brand-800 #0a0a0a (11.8:1)
    placeholderGroup:  "#d4cd00",
    placeholderSearch: "#666600",
    // White — readable on brand-700 #5c4d00 (8.3:1)
    surfaceText: "#ffffff",
    pickerBg:     "#000000",
    pickerBorder: "#1a1a1a",
    avatarText: "#fffd80",
    saleAlertDirectionsText: "#000000",
    saleAlertAddText: "#ffd700",
    saleAlertRemoveText: "#ff6666",
    white: "#ffffff",
    black: "#000000",
  },
};

// ---------------------------------------------------------------------------
// Light themes — 8 variations of the Navy & Cream aesthetic
//
// For each theme:
//   brand-700 = tint of accent → visible button backgrounds (Navy & Flax: pale tint, ~2:1 on white)
//   brand-300 = dark shade (~10:1 on white, ≥4.5:1 on brand-700) → readable everywhere
//   tabInactive = dark enough for 5:1 contrast on tabBar background
// ---------------------------------------------------------------------------

/**
 * Navy & Flax — deep navy on warm flax. The original, refined.
 * Crisp and editorial. The most "serious" light option.
 */
const navyFlax: Theme = {
  id: "navy-flax",
  name: "Navy & Flax",
  variant: "light",
  colors: {
    brand50:  "#060810",
    brand100: "#0a1624",  // near-black navy — primary text
    brand200: "#142040",
    brand300: "#101a30",  // dark navy: 17.3:1 on white ✓, 8.4:1 on brand-700 #9fb6d8 ✓
    brand400: "#2a4470",  // secondary text: 8:1 on white ✓
    brand500: "#3a5a96",
    brand600: "#1e4080",  // vivid accent — active chips
    brand700: "#9fb6d8",  // pale steel-blue button bg: 2.1:1 on white, 1.7:1 on flax; dark text 8.4-8.8:1 ✓
    brand800: "#ffffff",
    brand900: "#eae6de",  // warm flax background
    tabBar:       "#eae6de",
    tabBorder:    "#d0cac0",
    tabActive:    "#1e4080",
    tabInactive:  "#4a6080",  // 5:1 on flax bg ✓
    headerTint:   "#0a1624",
    badgeError:   "#b91c1c",
    toastSuccess: "#1e4080",
    toastError:   "#b91c1c",
    toastAction:  "#dce8f8",
    errorDefault: "#b91c1c",
    answerCorrect: "#15803d",
    answerWrong:   "#dc2626",
    sliderThumb:       "#1e4080",
    sliderTrackFilled: "#2a4470",
    sliderTrackEmpty:  "#d0cac0",
    accentAmber:    "#a65d17",  // 5.0:1 on brand-800 #ffffff (12px XP label needs 4.5)
    xpTrack:        "#d0cac0",
    spinnerDefault: "#1e4080",
    spinnerAmber:   "#2a4470",
    starFilled: "#b8691a",  // warm amber — 4.6:1 on brand-800 #ffffff ✓
    starEmpty:  "#a4927f",  // warm tan — 3.0:1 on white (icon threshold) ✓
    placeholderDark:   "#4a6080",
    placeholderMuted:  "#5a7090",
    // Mid-dark steel — 4.7:1 on brand-700 #9fb6d8 AND 9.7:1 on brand-800 #ffffff
    placeholderGroup:  "#2a4470",
    placeholderSearch: "#3a5070",
    // Dark navy (matches brand300) — 8.4:1 on brand-700 #9fb6d8
    surfaceText: "#101a30",
    pickerBg:     "#eae6de",
    pickerBorder: "#d0cac0",
    // White text on brand-600 #1e4080 (dark navy): ~8:1 contrast ✓
    avatarText: "#ffffff",
    saleAlertDirectionsText: "#ffffff",
    saleAlertAddText: "#000000",
    saleAlertRemoveText: "#ffffff",
    white: "#ffffff",
    black: "#000000",
  },
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const THEMES: Theme[] = [
  charcoal,
  highContrast,
  navyFlax,
];

export const DEFAULT_DARK_THEME_ID  = "charcoal";
export const DEFAULT_LIGHT_THEME_ID = "navy-flax";
export const ACCESSIBLE_THEME_ID    = "high-contrast";

export function getThemeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? charcoal;
}

export function themeColorsToCssVars(c: ThemeColors): Record<string, string> {
  return {
    "--brand-50":  c.brand50,
    "--brand-100": c.brand100,
    "--brand-200": c.brand200,
    "--brand-300": c.brand300,
    "--brand-400": c.brand400,
    "--brand-500": c.brand500,
    "--brand-600": c.brand600,
    "--brand-700": c.brand700,
    "--brand-800": c.brand800,
    "--brand-900": c.brand900,
    "--tab-bar":       c.tabBar,
    "--tab-border":    c.tabBorder,
    "--tab-active":    c.tabActive,
    "--tab-inactive":  c.tabInactive,
    "--header-tint":   c.headerTint,
    "--badge-error":   c.badgeError,
    "--toast-success": c.toastSuccess,
    "--toast-error":   c.toastError,
    "--toast-action":  c.toastAction,
    "--error-default": c.errorDefault,
    "--answer-correct": c.answerCorrect,
    "--answer-wrong":   c.answerWrong,
    "--slider-thumb":        c.sliderThumb,
    "--slider-track-filled": c.sliderTrackFilled,
    "--slider-track-empty":  c.sliderTrackEmpty,
    "--accent-amber":    c.accentAmber,
    "--xp-track":        c.xpTrack,
    "--spinner-default": c.spinnerDefault,
    "--spinner-amber":   c.spinnerAmber,
    "--star-filled": c.starFilled,
    "--star-empty":  c.starEmpty,
    "--placeholder-dark":   c.placeholderDark,
    "--placeholder-muted":  c.placeholderMuted,
    "--placeholder-group":  c.placeholderGroup,
    "--placeholder-search": c.placeholderSearch,
    "--surface-text":       c.surfaceText,
    "--picker-bg":     c.pickerBg,
    "--picker-border": c.pickerBorder,
  };
}

