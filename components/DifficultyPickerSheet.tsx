import { View, Text, Modal, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { useTheme } from "@/lib/theme-provider";
import { type Difficulty } from "@/lib/duel-question-generator";
import { AccessiblePressable } from "@/components/AccessiblePressable";
import { Heading } from "@/components/Heading";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface DifficultyOption {
  value: Difficulty;
  label: string;
  subtitle: string;
  xpLabel: string;
  multiplier: number;
  emoji: string;
}

const DIFFICULTIES: DifficultyOption[] = [
  {
    value: "training",
    label: "Training",
    subtitle: "Familiar bourbons, more time, shorter sequences",
    xpLabel: "0.5× XP",
    multiplier: 0.5,
    emoji: "🌱",
  },
  {
    value: "standard",
    label: "Standard",
    subtitle: "Your belt level. The intended challenge.",
    xpLabel: "1× XP",
    multiplier: 1,
    emoji: "⚡",
  },
  {
    value: "challenge",
    label: "Challenge",
    subtitle: "Harder bourbons, tighter timing, bonus XP",
    xpLabel: "1.5× XP",
    multiplier: 1.5,
    emoji: "🔥",
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DifficultyPickerSheetProps {
  visible: boolean;
  gameTitle: string;
  onSelect: (difficulty: Difficulty) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DifficultyPickerSheet({
  visible,
  gameTitle,
  onSelect,
  onClose,
}: DifficultyPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;
  const [selected, setSelected] = useState<Difficulty>("standard");

  function handleStart() {
    onSelect(selected);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <AccessiblePressable
          accessibilityLabel="Close"
          activeOpacity={1}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={{
            backgroundColor: c.brand900,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: insets.bottom + 16,
          }}
        >
          {/* Handle bar */}
          <View className="items-center pt-3 pb-1">
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: c.brand700,
              }}
            />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4">
            <View>
              <Heading style={{ color: c.brand100, fontSize: 20, fontWeight: "700" }}>
                Choose Difficulty
              </Heading>
              <Text style={{ color: c.brand400, fontSize: 13, marginTop: 2 }}>
                {gameTitle}
              </Text>
            </View>
            <AccessiblePressable
              onPress={onClose}
              accessibilityLabel="Close"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ color: c.brand400, fontSize: 20 }}>✕</Text>
            </AccessiblePressable>
          </View>

          {/* Options */}
          <View className="px-4 gap-3">
            {DIFFICULTIES.map((opt) => {
              const isSelected = selected === opt.value;
              return (
                <AccessiblePressable
                  key={opt.value}
                  accessibilityLabel={`${opt.label}, ${opt.xpLabel}. ${opt.subtitle}`}
                  onPress={() => setSelected(opt.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected, selected: isSelected }}
                  style={{
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: isSelected ? c.tabActive : c.brand700,
                    backgroundColor: isSelected ? c.brand800 : "transparent",
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <Text style={{ fontSize: 28 }}>{opt.emoji}</Text>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text
                        style={{
                          color: c.brand100,
                          fontSize: 16,
                          fontWeight: "700",
                        }}
                      >
                        {opt.label}
                      </Text>
                      <View
                        style={{
                          backgroundColor: isSelected ? c.tabActive : c.brand700,
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                        }}
                      >
                        <Text
                          style={{
                            color: isSelected ? c.white : c.brand300,
                            fontSize: 11,
                            fontWeight: "700",
                          }}
                        >
                          {opt.xpLabel}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={{
                        color: c.brand400,
                        fontSize: 13,
                        marginTop: 3,
                      }}
                    >
                      {opt.subtitle}
                    </Text>
                  </View>

                  {/* Selection indicator */}
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: isSelected ? c.tabActive : c.brand600,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isSelected && (
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: c.tabActive,
                        }}
                      />
                    )}
                  </View>
                </AccessiblePressable>
              );
            })}
          </View>

          {/* Start button */}
          <AccessiblePressable
            onPress={handleStart}
            accessibilityLabel="Start"
            className="mx-4 mt-5 rounded-2xl py-4 items-center"
            style={{ backgroundColor: c.tabActive }}
          >
            <Text style={{ color: c.white, fontSize: 16, fontWeight: "700" }}>
              Start
            </Text>
          </AccessiblePressable>
        </View>
      </View>
    </Modal>
  );
}
