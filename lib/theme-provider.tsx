/**
 * ThemeProvider — runtime theme system for BourbonVault.
 *
 * Wraps the app in a View that sets all brand-* CSS custom properties via
 * NativeWind's `vars()` utility, so every Tailwind class (bg-brand-900, etc.)
 * resolves to the active theme's values without any component changes.
 *
 * User preference is persisted to AsyncStorage and survives app restarts.
 *
 * Usage:
 *   const { themeMode, setThemeMode, activeTheme } = useTheme();
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme as useRNColorScheme, View } from "react-native";
import { vars } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ACCESSIBLE_THEME_ID,
  DEFAULT_DARK_THEME_ID,
  DEFAULT_LIGHT_THEME_ID,
  THEMES,
  getThemeById,
  themeColorsToCssVars,
  type Theme,
  type ThemeMode,
} from "./themes";

const STORAGE_KEY = "@bourbon_app/theme_mode";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type ThemeContextValue = {
  /** User-chosen mode: system | light | dark | accessible */
  themeMode: ThemeMode;
  /** Persist a new mode to AsyncStorage and re-render immediately */
  setThemeMode: (mode: ThemeMode) => void;
  /** The resolved Theme object currently applied to the UI */
  activeTheme: Theme;
  /** Dev-only: apply a specific theme by ID without changing the persisted mode */
  setDevThemeId: (id: string | null) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: "system",
  setThemeMode: () => {},
  activeTheme: getThemeById(DEFAULT_DARK_THEME_ID),
  setDevThemeId: () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useRNColorScheme(); // "light" | "dark" | null
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [devThemeId, setDevThemeId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "system" || stored === "light" || stored === "dark" || stored === "accessible") {
          setThemeModeState(stored);
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
  }, []);

  const activeTheme = useMemo(
    () => devThemeId ? getThemeById(devThemeId) : resolveTheme(themeMode, systemScheme ?? "dark"),
    [themeMode, systemScheme, devThemeId]
  );

  const cssVars = useMemo(
    () => vars(themeColorsToCssVars(activeTheme.colors)),
    [activeTheme]
  );

  const contextValue = useMemo(
    () => ({ themeMode, setThemeMode, activeTheme, setDevThemeId }),
    [themeMode, setThemeMode, activeTheme, setDevThemeId]
  );

  // Don't render until the stored preference is loaded to avoid a flash
  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={contextValue}>
      <View style={[{ flex: 1 }, cssVars]}>{children}</View>
    </ThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveTheme(mode: ThemeMode, systemScheme: "light" | "dark"): Theme {
  switch (mode) {
    case "accessible":
      return getThemeById(ACCESSIBLE_THEME_ID);
    case "light":
      // First light theme in the list
      return THEMES.find((t) => t.variant === "light") ?? getThemeById(DEFAULT_LIGHT_THEME_ID);
    case "dark":
      // First dark theme in the list
      return THEMES.find((t) => t.variant === "dark") ?? getThemeById(DEFAULT_DARK_THEME_ID);
    case "system":
    default:
      return systemScheme === "light"
        ? getThemeById(DEFAULT_LIGHT_THEME_ID)
        : getThemeById(DEFAULT_DARK_THEME_ID);
  }
}
