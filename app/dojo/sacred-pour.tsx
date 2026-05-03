import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/use-auth";
import { useUserXp } from "@/hooks/use-user-xp";
import { useTheme } from "@/lib/theme-provider";
import { useSacredPour } from "@/hooks/use-sacred-pour";
import { type Difficulty } from "@/lib/duel-question-generator";
import { colors } from "@/lib/colors";

const VALID_DIFFICULTIES: Difficulty[] = ["training", "standard", "challenge"];

function isValidDifficulty(v: unknown): v is Difficulty {
  return VALID_DIFFICULTIES.includes(v as Difficulty);
}

export default function SacredPourScreen() {
  const { difficulty: rawDifficulty } = useLocalSearchParams<{ difficulty: string }>();
  const difficulty: Difficulty = isValidDifficulty(rawDifficulty) ? rawDifficulty : "standard";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;
  const { currentBelt } = useUserXp(user?.id);

  const pour = useSacredPour({
    userId: user?.id ?? null,
    beltLevel: currentBelt,
    difficulty,
  });

  return (
    <View
      className="flex-1 bg-brand-900"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {/* Header */}
      <View
        className="flex-row items-center px-4 py-3"
        style={{ borderBottomWidth: 1, borderBottomColor: c.brand800 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ color: c.brand400, fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text style={{ color: c.brand100, fontSize: 17, fontWeight: "700" }}>
            The Sacred Pour
          </Text>
          <Text style={{ color: c.brand400, fontSize: 12, textTransform: "capitalize" }}>
            {difficulty}
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Body */}
      <View className="flex-1 items-center justify-center px-6">
        {(pour.state === "loading" || pour.state === "difficulty_select") && (
          <>
            <ActivityIndicator color={colors.spinnerDefault} size="large" />
            <Text style={{ color: c.brand400, marginTop: 16, fontSize: 14 }}>
              Preparing your sequence…
            </Text>
          </>
        )}

        {pour.error && (
          <>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
            <Text style={{ color: c.brand100, fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
              Couldn't start the pour
            </Text>
            <Text
              style={{ color: c.brand400, fontSize: 14, textAlign: "center", marginBottom: 24 }}
            >
              {pour.error}
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                backgroundColor: c.tabActive,
                borderRadius: 14,
                paddingHorizontal: 24,
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: c.white, fontWeight: "700" }}>Back to Dojo</Text>
            </TouchableOpacity>
          </>
        )}

        {(pour.state === "reveal" ||
          pour.state === "playback" ||
          pour.state === "grid" ||
          pour.state === "scoring") &&
          !pour.error && (
            <>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🫗</Text>
              <Text
                style={{ color: c.brand100, fontSize: 20, fontWeight: "700", marginBottom: 8 }}
              >
                The Sacred Pour
              </Text>
              <Text
                style={{ color: c.brand400, fontSize: 14, textAlign: "center", marginBottom: 8 }}
              >
                Game screens coming in the next build.
              </Text>
              <Text style={{ color: c.brand500, fontSize: 12 }}>
                Difficulty: {difficulty} · State: {pour.state}
              </Text>
            </>
          )}
      </View>
    </View>
  );
}
