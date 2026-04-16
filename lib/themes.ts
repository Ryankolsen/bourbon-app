/**
 * Theme definitions for the BourbonVault app.
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
 *   brand-700  → medium tint of accent (~3:1 contrast on white) — visible buttons
 *   brand-600  → vivid/saturated accent (active chips, icons)
 *   brand-300  → dark shade (~10:1 on white AND ~4:1 on brand-700) — works in both roles
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

  sliderThumb: string;
  sliderTrackFilled: string;
  sliderTrackEmpty: string;

  accentAmber: string;
  spinnerDefault: string;
  spinnerAmber: string;

  placeholderDark: string;
  placeholderMuted: string;
  placeholderGroup: string;
  placeholderSearch: string;

  pickerBg: string;
  pickerBorder: string;

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
    brand300: "#7dd3fc",
    brand400: "#38bdf8",
    brand500: "#0ea5e9",
    brand600: "#0284c7",
    brand700: "#0369a1",
    brand800: "#1a1a1a",
    brand900: "#0a0a0a",
    tabBar:       "#0a0a0a",
    tabBorder:    "#2a2a2a",
    tabActive:    "#38bdf8",
    tabInactive:  "#4a4a4a",
    headerTint:   "#e0f2fe",
    badgeError:   "#dc2626",
    toastSuccess: "#0284c7",
    toastError:   "#b91c1c",
    toastAction:  "#bae6fd",
    errorDefault: "#ef4444",
    sliderThumb:       "#38bdf8",
    sliderTrackFilled: "#0ea5e9",
    sliderTrackEmpty:  "#2a2a2a",
    accentAmber:    "#f59e0b",
    spinnerDefault: "#38bdf8",
    spinnerAmber:   "#7dd3fc",
    placeholderDark:   "#4a4a4a",
    placeholderMuted:  "#5a5a5a",
    placeholderGroup:  "#4a4a4a",
    placeholderSearch: "#5a5a9a",
    pickerBg:     "#0a0a0a",
    pickerBorder: "#0369a1",
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
    brand700: "#ffd700",  // yellow secondary surfaces — textOnBg gives black text ✓
    brand800: "#0a0a0a",
    brand900: "#000000",
    tabBar:       "#000000",
    tabBorder:    "#3a3a00",
    tabActive:    "#ffd700",
    tabInactive:  "#666600",
    headerTint:   "#fff176",
    badgeError:   "#ff4444",
    toastSuccess: "#ccac00",
    toastError:   "#cc0000",
    toastAction:  "#fff176",
    errorDefault: "#ff4444",
    sliderThumb:       "#ffd700",
    sliderTrackFilled: "#ccac00",
    sliderTrackEmpty:  "#1a1a1a",
    accentAmber:    "#ffd700",
    spinnerDefault: "#ffd700",
    spinnerAmber:   "#ffec40",
    placeholderDark:   "#666600",
    placeholderMuted:  "#555500",
    placeholderGroup:  "#666600",
    placeholderSearch: "#666600",
    pickerBg:     "#000000",
    pickerBorder: "#1a1a1a",
    white: "#ffffff",
    black: "#000000",
  },
};

// ---------------------------------------------------------------------------
// Light themes — 8 variations of the Navy & Cream aesthetic
//
// For each theme:
//   brand-700 = medium tint (~3:1 on white) → visible button backgrounds
//   brand-300 = dark shade (~10:1 on white, ~4:1 on brand-700) → readable everywhere
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
    brand300: "#1c2e54",  // dark navy: 11:1 on white ✓, ~4:1 on brand-700 ✓
    brand400: "#2a4470",  // secondary text: 8:1 on white ✓
    brand500: "#3a5a96",
    brand600: "#1e4080",  // vivid accent — active chips
    brand700: "#6a84aa",  // button bg: 3.1:1 on white ✓
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
    toastAction:  "#1c2e54",
    errorDefault: "#b91c1c",
    sliderThumb:       "#1e4080",
    sliderTrackFilled: "#2a4470",
    sliderTrackEmpty:  "#d0cac0",
    accentAmber:    "#b8691a",
    spinnerDefault: "#1e4080",
    spinnerAmber:   "#2a4470",
    placeholderDark:   "#4a6080",
    placeholderMuted:  "#5a7090",
    placeholderGroup:  "#4a6080",
    placeholderSearch: "#3a5070",
    pickerBg:     "#eae6de",
    pickerBorder: "#d0cac0",
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
    "--slider-thumb":        c.sliderThumb,
    "--slider-track-filled": c.sliderTrackFilled,
    "--slider-track-empty":  c.sliderTrackEmpty,
    "--accent-amber":    c.accentAmber,
    "--spinner-default": c.spinnerDefault,
    "--spinner-amber":   c.spinnerAmber,
    "--placeholder-dark":   c.placeholderDark,
    "--placeholder-muted":  c.placeholderMuted,
    "--placeholder-group":  c.placeholderGroup,
    "--placeholder-search": c.placeholderSearch,
    "--picker-bg":     c.pickerBg,
    "--picker-border": c.pickerBorder,
  };
}

