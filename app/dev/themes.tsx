/**
 * Dev Theme Picker — hidden developer screen for previewing all themes.
 *
 * NOT linked from any navigation tab. Access it in dev builds by navigating to
 * the route "/dev/themes" (e.g. via Expo Go URL or the DevUserSwitcher gesture).
 *
 * Cleanup: once a final theme is chosen, delete this file and its import in
 * DevUserSwitcher (if added). The ThemeProvider and profile selector remain.
 */

import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/lib/theme-provider";
import { THEMES, type Theme } from "@/lib/themes";

/** Returns black or white depending on which has better contrast against the given hex bg.
 *  Uses gamma-corrected relative luminance (WCAG formula). */
function textOnBg(hex: string): string {
  const toLinear = (v: number) =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const r = toLinear(parseInt(hex.slice(1, 3), 16) / 255);
  const g = toLinear(parseInt(hex.slice(3, 5), 16) / 255);
  const b = toLinear(parseInt(hex.slice(5, 7), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.35 ? "#000000" : "#ffffff";
}

export default function DevThemePickerScreen() {
  const router = useRouter();
  const { activeTheme, setDevThemeId } = useTheme();

  return (
    <View className="flex-1 bg-brand-900">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-14 pb-4 border-b border-brand-700">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2">
          <Text className="text-brand-300 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="text-brand-100 font-bold text-lg flex-1">
          Dev: Theme Picker
        </Text>
        <Text className="text-brand-400 text-xs">
          {THEMES.length} themes
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12 }}
      >
        <Text className="text-brand-400 text-xs uppercase tracking-widest mb-1">
          Active: {activeTheme.name}
        </Text>

        {THEMES.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={activeTheme.id === theme.id}
            onApply={() => setDevThemeId(theme.id)}
          />
        ))}

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}

function ThemeCard({
  theme,
  isActive,
  onApply,
}: {
  theme: Theme;
  isActive: boolean;
  onApply: () => void;
}) {
  const c = theme.colors;

  return (
    <View
      style={{
        backgroundColor: c.brand800,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: isActive ? c.brand500 : c.brand700,
        overflow: "hidden",
      }}
    >
      {/* Theme name + variant badge */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 12,
          paddingBottom: 8,
        }}
      >
        <Text style={{ color: c.brand100, fontWeight: "700", fontSize: 15 }}>
          {theme.name}
        </Text>
        <View
          style={{
            backgroundColor: c.brand700,
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text style={{ color: c.brand300, fontSize: 11 }}>
            {theme.variant}
          </Text>
        </View>
      </View>

      {/* Color swatch row */}
      <View style={{ flexDirection: "row", paddingHorizontal: 12, gap: 4, marginBottom: 12 }}>
        {(["brand900", "brand800", "brand700", "brand500", "brand400", "brand300", "brand100"] as const).map(
          (key) => (
            <View
              key={key}
              style={{
                flex: 1,
                height: 24,
                borderRadius: 4,
                backgroundColor: c[key],
              }}
            />
          )
        )}
      </View>

      {/* Semantic preview */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 12,
          gap: 6,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        {/* Tab bar swatch */}
        <View
          style={{
            backgroundColor: c.tabBar,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <Text style={{ color: c.tabActive, fontSize: 11, fontWeight: "600" }}>
            Tab
          </Text>
        </View>
        {/* Interactive button swatch */}
        <View
          style={{
            backgroundColor: c.brand500,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <Text style={{ color: c.white, fontSize: 11, fontWeight: "600" }}>
            Button
          </Text>
        </View>
        {/* Accent swatch */}
        <View
          style={{
            backgroundColor: c.sliderThumb,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <Text style={{ color: textOnBg(c.sliderThumb), fontSize: 11, fontWeight: "600" }}>
            Accent
          </Text>
        </View>
      </View>

      {/* Apply button */}
      <TouchableOpacity
        onPress={onApply}
        style={{
          margin: 12,
          marginTop: 0,
          backgroundColor: isActive ? c.brand500 : c.brand700,
          borderRadius: 10,
          paddingVertical: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ color: theme.id === "high-contrast" ? c.black : c.white, fontWeight: "600" }}>
          {isActive ? "✓ Active" : "Apply"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
