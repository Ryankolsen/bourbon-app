/**
 * Theme definitions for the BourbonVault app.
 *
 * Each theme provides hex values for every brand-* Tailwind token and every
 * imperative color key used in lib/colors.ts. The ThemeProvider maps these
 * values to CSS custom properties so Tailwind class names never need to change.
 *
 * Adding a theme: append one object to THEMES.
 * Removing a theme: delete that object.
 * Cleanup after final theme is chosen: delete this file's unused entries and
 * delete app/dev/themes.tsx.
 */

export type ThemeMode = "system" | "light" | "dark" | "accessible";

export type ThemeColors = {
  // Brand palette (mirrors brand-50…brand-900 Tailwind tokens)
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

  // Tab bar / header
  tabBar: string;
  tabBorder: string;
  tabActive: string;
  tabInactive: string;
  headerTint: string;

  // Feedback / alerts
  badgeError: string;
  toastSuccess: string;
  toastError: string;
  toastAction: string;
  errorDefault: string;

  // Sliders / toggles
  sliderThumb: string;
  sliderTrackFilled: string;
  sliderTrackEmpty: string;

  // Accent / spinners
  accentAmber: string;
  spinnerDefault: string;
  spinnerAmber: string;

  // Input placeholders
  placeholderDark: string;
  placeholderMuted: string;
  placeholderGroup: string;
  placeholderSearch: string;

  // Picker overlay
  pickerBg: string;
  pickerBorder: string;

  // Basics
  white: string;
  black: string;
};

export type Theme = {
  id: string;
  name: string;
  /** Intrinsic light/dark character of the theme */
  variant: "light" | "dark";
  colors: ThemeColors;
};

// ---------------------------------------------------------------------------
// Dark themes
// ---------------------------------------------------------------------------

const midnightPurple: Theme = {
  id: "midnight-purple",
  name: "Midnight Purple",
  variant: "dark",
  colors: {
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
    tabBar:       "#0d0a2e",
    tabBorder:    "#2a1f6e",
    tabActive:    "#818cf8",
    tabInactive:  "#4a4580",
    headerTint:   "#e0e7ff",
    badgeError:   "#dc2626",
    toastSuccess: "#4848c0",
    toastError:   "#b91c1c",
    toastAction:  "#c8c8e8",
    errorDefault: "#ef4444",
    sliderThumb:       "#e39e38",
    sliderTrackFilled: "#c47b2a",
    sliderTrackEmpty:  "#3a2a1a",
    accentAmber:    "#f59e0b",
    spinnerDefault: "#e39e38",
    spinnerAmber:   "#c8a96e",
    placeholderDark:   "#7a3c19",
    placeholderMuted:  "#6b5c45",
    placeholderGroup:  "#7c6a50",
    placeholderSearch: "#5a5a9a",
    pickerBg:     "#0f0e4a",
    pickerBorder: "#2d2b8a",
    white: "#ffffff",
    black: "#000000",
  },
};

const obsidian: Theme = {
  id: "obsidian",
  name: "Obsidian",
  variant: "dark",
  colors: {
    brand50:  "#fffce8",
    brand100: "#fdf0c0",
    brand200: "#f5d470",
    brand300: "#e6b830",
    brand400: "#d4a017",
    brand500: "#c8960c",
    brand600: "#a07a08",
    brand700: "#7a5c05",
    brand800: "#2a2000",
    brand900: "#111000",
    tabBar:       "#080808",
    tabBorder:    "#2a2200",
    tabActive:    "#f5c518",
    tabInactive:  "#6b5800",
    headerTint:   "#fdf0c0",
    badgeError:   "#dc2626",
    toastSuccess: "#a07a08",
    toastError:   "#b91c1c",
    toastAction:  "#e6b830",
    errorDefault: "#ef4444",
    sliderThumb:       "#f5c518",
    sliderTrackFilled: "#c8960c",
    sliderTrackEmpty:  "#2a2000",
    accentAmber:    "#f5c518",
    spinnerDefault: "#f5c518",
    spinnerAmber:   "#e6b830",
    placeholderDark:   "#6b5800",
    placeholderMuted:  "#5a4c00",
    placeholderGroup:  "#6b5800",
    placeholderSearch: "#6b5800",
    pickerBg:     "#111000",
    pickerBorder: "#7a5c05",
    white: "#ffffff",
    black: "#000000",
  },
};

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

const forest: Theme = {
  id: "forest",
  name: "Forest",
  variant: "dark",
  colors: {
    brand50:  "#fffbeb",
    brand100: "#fef3c7",
    brand200: "#fcd34d",
    brand300: "#fbbf24",
    brand400: "#f59e0b",
    brand500: "#d97706",
    brand600: "#b45309",
    brand700: "#1a3a1a",
    brand800: "#0f2a0f",
    brand900: "#071207",
    tabBar:       "#071207",
    tabBorder:    "#1a3a1a",
    tabActive:    "#f59e0b",
    tabInactive:  "#2a5a2a",
    headerTint:   "#fef3c7",
    badgeError:   "#dc2626",
    toastSuccess: "#b45309",
    toastError:   "#b91c1c",
    toastAction:  "#fcd34d",
    errorDefault: "#ef4444",
    sliderThumb:       "#f59e0b",
    sliderTrackFilled: "#d97706",
    sliderTrackEmpty:  "#1a3a1a",
    accentAmber:    "#f59e0b",
    spinnerDefault: "#f59e0b",
    spinnerAmber:   "#fbbf24",
    placeholderDark:   "#2a5a2a",
    placeholderMuted:  "#3a6a3a",
    placeholderGroup:  "#2a5a2a",
    placeholderSearch: "#4a7a4a",
    pickerBg:     "#071207",
    pickerBorder: "#1a3a1a",
    white: "#ffffff",
    black: "#000000",
  },
};

/** WCAG AAA: #FFD700 on #000000 achieves ~19.6:1 contrast ratio */
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
    brand600: "#ccac00",
    brand700: "#1a1a1a",
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
// Light themes
// ---------------------------------------------------------------------------

const classicCream: Theme = {
  id: "classic-cream",
  name: "Classic Cream",
  variant: "light",
  colors: {
    brand50:  "#fef6ec",
    brand100: "#f5ddbf",
    brand200: "#eab887",
    brand300: "#e09060",
    brand400: "#d4782a",
    brand500: "#b8601a",
    brand600: "#9a4e22",
    brand700: "#7a3c19",
    brand800: "#5c2a10",
    brand900: "#3d1a0a",
    tabBar:       "#f5ebe0",
    tabBorder:    "#e0c9b0",
    tabActive:    "#7a3c19",
    tabInactive:  "#b89070",
    headerTint:   "#3d1a0a",
    badgeError:   "#dc2626",
    toastSuccess: "#7a3c19",
    toastError:   "#b91c1c",
    toastAction:  "#5c2a10",
    errorDefault: "#ef4444",
    sliderThumb:       "#b8601a",
    sliderTrackFilled: "#9a4e22",
    sliderTrackEmpty:  "#e0c9b0",
    accentAmber:    "#c47b2a",
    spinnerDefault: "#b8601a",
    spinnerAmber:   "#d4782a",
    placeholderDark:   "#b89070",
    placeholderMuted:  "#c0a080",
    placeholderGroup:  "#b89070",
    placeholderSearch: "#a88060",
    pickerBg:     "#fef6ec",
    pickerBorder: "#e0c9b0",
    white: "#ffffff",
    black: "#000000",
  },
};

const slateLight: Theme = {
  id: "slate",
  name: "Slate",
  variant: "light",
  colors: {
    brand50:  "#eef2ff",
    brand100: "#c7d2fe",
    brand200: "#a5b4fc",
    brand300: "#818cf8",
    brand400: "#6366f1",
    brand500: "#4f46e5",
    brand600: "#4338ca",
    brand700: "#3730a3",
    brand800: "#334155",
    brand900: "#1e293b",
    tabBar:       "#f1f5f9",
    tabBorder:    "#e2e8f0",
    tabActive:    "#4f46e5",
    tabInactive:  "#94a3b8",
    headerTint:   "#1e293b",
    badgeError:   "#dc2626",
    toastSuccess: "#4338ca",
    toastError:   "#b91c1c",
    toastAction:  "#334155",
    errorDefault: "#ef4444",
    sliderThumb:       "#4f46e5",
    sliderTrackFilled: "#4338ca",
    sliderTrackEmpty:  "#e2e8f0",
    accentAmber:    "#f59e0b",
    spinnerDefault: "#4f46e5",
    spinnerAmber:   "#6366f1",
    placeholderDark:   "#94a3b8",
    placeholderMuted:  "#a0aec0",
    placeholderGroup:  "#94a3b8",
    placeholderSearch: "#7a83b0",
    pickerBg:     "#f1f5f9",
    pickerBorder: "#e2e8f0",
    white: "#ffffff",
    black: "#000000",
  },
};

const sage: Theme = {
  id: "sage",
  name: "Sage",
  variant: "light",
  colors: {
    brand50:  "#f0fdf4",
    brand100: "#ccfbf1",
    brand200: "#99f6e4",
    brand300: "#2dd4bf",
    brand400: "#14b8a6",
    brand500: "#0d9488",
    brand600: "#0f766e",
    brand700: "#115e59",
    brand800: "#134a30",
    brand900: "#0f2a1a",
    tabBar:       "#f0fdf4",
    tabBorder:    "#ccfbf1",
    tabActive:    "#0d9488",
    tabInactive:  "#6db8b2",
    headerTint:   "#0f2a1a",
    badgeError:   "#dc2626",
    toastSuccess: "#0f766e",
    toastError:   "#b91c1c",
    toastAction:  "#115e59",
    errorDefault: "#ef4444",
    sliderThumb:       "#0d9488",
    sliderTrackFilled: "#0f766e",
    sliderTrackEmpty:  "#ccfbf1",
    accentAmber:    "#f59e0b",
    spinnerDefault: "#0d9488",
    spinnerAmber:   "#14b8a6",
    placeholderDark:   "#6db8b2",
    placeholderMuted:  "#7ac8c0",
    placeholderGroup:  "#6db8b2",
    placeholderSearch: "#5a9a94",
    pickerBg:     "#f0fdf4",
    pickerBorder: "#ccfbf1",
    white: "#ffffff",
    black: "#000000",
  },
};

const rose: Theme = {
  id: "rose",
  name: "Rose",
  variant: "light",
  colors: {
    brand50:  "#fdf2f8",
    brand100: "#fce7f3",
    brand200: "#f9a8d4",
    brand300: "#ec4899",
    brand400: "#db2777",
    brand500: "#be185d",
    brand600: "#9d174d",
    brand700: "#831843",
    brand800: "#6b1028",
    brand900: "#4a0a1a",
    tabBar:       "#fff0f5",
    tabBorder:    "#fce7f3",
    tabActive:    "#be185d",
    tabInactive:  "#d890b8",
    headerTint:   "#4a0a1a",
    badgeError:   "#dc2626",
    toastSuccess: "#9d174d",
    toastError:   "#b91c1c",
    toastAction:  "#831843",
    errorDefault: "#ef4444",
    sliderThumb:       "#be185d",
    sliderTrackFilled: "#9d174d",
    sliderTrackEmpty:  "#fce7f3",
    accentAmber:    "#f59e0b",
    spinnerDefault: "#be185d",
    spinnerAmber:   "#db2777",
    placeholderDark:   "#d890b8",
    placeholderMuted:  "#e0a0c8",
    placeholderGroup:  "#d890b8",
    placeholderSearch: "#c880a8",
    pickerBg:     "#fdf2f8",
    pickerBorder: "#fce7f3",
    white: "#ffffff",
    black: "#000000",
  },
};

const pure: Theme = {
  id: "pure",
  name: "Pure",
  variant: "light",
  colors: {
    brand50:  "#f9fafb",
    brand100: "#f3f4f6",
    brand200: "#e5e7eb",
    brand300: "#9ca3af",
    brand400: "#6b7280",
    brand500: "#374151",
    brand600: "#4b5563",
    brand700: "#374151",
    brand800: "#1f2937",
    brand900: "#111827",
    tabBar:       "#ffffff",
    tabBorder:    "#e5e7eb",
    tabActive:    "#111827",
    tabInactive:  "#9ca3af",
    headerTint:   "#111827",
    badgeError:   "#dc2626",
    toastSuccess: "#374151",
    toastError:   "#b91c1c",
    toastAction:  "#4b5563",
    errorDefault: "#ef4444",
    sliderThumb:       "#374151",
    sliderTrackFilled: "#1f2937",
    sliderTrackEmpty:  "#e5e7eb",
    accentAmber:    "#f59e0b",
    spinnerDefault: "#374151",
    spinnerAmber:   "#6b7280",
    placeholderDark:   "#9ca3af",
    placeholderMuted:  "#a0a8b0",
    placeholderGroup:  "#9ca3af",
    placeholderSearch: "#8090a0",
    pickerBg:     "#ffffff",
    pickerBorder: "#e5e7eb",
    white: "#ffffff",
    black: "#000000",
  },
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const THEMES: Theme[] = [
  // Dark themes first
  midnightPurple,
  obsidian,
  charcoal,
  forest,
  highContrast,
  // Light themes
  classicCream,
  slateLight,
  sage,
  rose,
  pure,
];

export const DEFAULT_DARK_THEME_ID  = "midnight-purple";
export const DEFAULT_LIGHT_THEME_ID = "classic-cream";
export const ACCESSIBLE_THEME_ID    = "high-contrast";

export function getThemeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? midnightPurple;
}

/** Map ThemeColors keys to CSS custom property names used in tailwind.config.js */
export function themeColorsToCssVars(
  c: ThemeColors
): Record<string, string> {
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
