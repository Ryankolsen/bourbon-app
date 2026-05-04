import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/lib/theme-provider";
import { usePourOrFaker } from "@/hooks/use-pour-or-faker";
import { type Difficulty } from "@/lib/faker-names";
import { colors } from "@/lib/colors";
import { useGameDailySession } from "@/hooks/use-game-daily-session";

const VALID_DIFFICULTIES: Difficulty[] = ["training", "standard", "challenge"];

function isValidDifficulty(v: unknown): v is Difficulty {
  return VALID_DIFFICULTIES.includes(v as Difficulty);
}

// ---------------------------------------------------------------------------
// GameOverScreen
// ---------------------------------------------------------------------------

function GameOverScreen({
  verdict,
  canRetry,
  onRetry,
  onBack,
}: {
  verdict: NonNullable<ReturnType<typeof usePourOrFaker>["verdict"]>;
  canRetry: boolean;
  onRetry: () => void;
  onBack: () => void;
}) {
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;

  const streakEmoji = verdict.streak >= 20 ? "🏆" : verdict.streak >= 10 ? "🔥" : verdict.streak >= 5 ? "⚡" : "💀";

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 24, alignItems: "center" }}
    >
      <Text style={{ fontSize: 72, marginBottom: 12 }}>{streakEmoji}</Text>

      <Text
        style={{ color: c.brand100, fontSize: 28, fontWeight: "800", marginBottom: 4 }}
      >
        {verdict.streak === 0 ? "No Streak" : `Streak: ${verdict.streak}`}
      </Text>

      {/* XP badge */}
      <View
        style={{
          backgroundColor: c.brand800,
          borderRadius: 20,
          paddingHorizontal: 20,
          paddingVertical: 10,
          marginBottom: 20,
        }}
      >
        <Text style={{ color: c.tabActive, fontSize: 22, fontWeight: "800" }}>
          +{verdict.xpEarned} XP
        </Text>
      </View>

      {/* Last card reveal */}
      <View
        style={{
          backgroundColor: c.brand800,
          borderRadius: 16,
          padding: 20,
          width: "100%",
          marginBottom: 24,
        }}
      >
        <Text
          style={{
            color: c.brand400,
            fontSize: 12,
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 8,
          }}
        >
          The card that got you
        </Text>
        <Text
          style={{ color: c.brand100, fontSize: 16, fontWeight: "700", marginBottom: 4 }}
        >
          {verdict.cardName}
        </Text>
        <Text style={{ color: verdict.wasReal ? "#16a34a" : "#dc2626", fontSize: 14, fontWeight: "600" }}>
          {verdict.wasReal ? "✓ Real bourbon" : "✗ Fake name"}
        </Text>
      </View>

      {/* Action buttons */}
      {canRetry && (
        <TouchableOpacity
          onPress={onRetry}
          style={{
            backgroundColor: c.tabActive,
            borderRadius: 16,
            paddingVertical: 14,
            width: "100%",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ color: c.white, fontSize: 16, fontWeight: "700" }}>
            Retry
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={onBack}
        style={{
          borderRadius: 16,
          paddingVertical: 14,
          width: "100%",
          alignItems: "center",
          borderWidth: 1,
          borderColor: c.brand600,
        }}
      >
        <Text style={{ color: c.brand300, fontSize: 16, fontWeight: "600" }}>
          Back to Dojo
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// PlayingScreen
// ---------------------------------------------------------------------------

function PlayingScreen({
  cardName,
  streak,
  onGuess,
}: {
  cardName: string;
  streak: number;
  onGuess: (answer: "real" | "fake") => void;
}) {
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;

  return (
    <View className="flex-1 px-6">
      {/* Streak counter */}
      <View className="items-center py-4">
        <Text style={{ color: c.brand400, fontSize: 13, fontWeight: "600" }}>
          STREAK
        </Text>
        <Text style={{ color: c.brand100, fontSize: 36, fontWeight: "800" }}>
          {streak}
        </Text>
      </View>

      {/* Card */}
      <View className="flex-1 items-center justify-center">
        <View
          style={{
            backgroundColor: c.brand800,
            borderRadius: 24,
            padding: 32,
            width: "100%",
            alignItems: "center",
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🃏</Text>
          <Text
            style={{
              color: c.brand100,
              fontSize: 22,
              fontWeight: "700",
              textAlign: "center",
              lineHeight: 30,
            }}
          >
            {cardName}
          </Text>
          <Text style={{ color: c.brand500, fontSize: 13, marginTop: 12 }}>
            Real bourbon or fake name?
          </Text>
        </View>
      </View>

      {/* Answer buttons */}
      <View style={{ paddingBottom: 24, gap: 12 }}>
        <TouchableOpacity
          onPress={() => onGuess("real")}
          style={{
            backgroundColor: "#16a34a",
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
          }}
          accessibilityRole="button"
        >
          <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "700" }}>
            Real
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onGuess("fake")}
          style={{
            backgroundColor: "#dc2626",
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
          }}
          accessibilityRole="button"
        >
          <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "700" }}>
            Fake
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function PourOrFakerScreen() {
  const { difficulty: rawDifficulty } = useLocalSearchParams<{ difficulty: string }>();
  const difficulty: Difficulty = isValidDifficulty(rawDifficulty) ? rawDifficulty : "standard";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;

  const game = usePourOrFaker({ userId: user?.id ?? null });
  const session = useGameDailySession(user?.id, "pour_or_faker");

  // Kick off game load immediately if idle (difficulty comes from route param)
  if (game.state === "idle") {
    game.selectDifficulty(difficulty);
  }

  function handleRetry() {
    game.reset();
    game.selectDifficulty(difficulty);
  }

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
            Pour or Faker
          </Text>
          <Text style={{ color: c.brand400, fontSize: 12, textTransform: "capitalize" }}>
            {difficulty}
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Loading */}
      {game.state === "loading" && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.spinnerDefault} size="large" />
          <Text style={{ color: c.brand400, marginTop: 16, fontSize: 14 }}>
            Shuffling the deck…
          </Text>
        </View>
      )}

      {/* Error */}
      {game.error && (
        <View className="flex-1 items-center justify-center px-6">
          <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
          <Text style={{ color: c.brand100, fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
            Couldn't load the game
          </Text>
          <Text
            style={{ color: c.brand400, fontSize: 14, textAlign: "center", marginBottom: 24 }}
          >
            {game.error}
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
        </View>
      )}

      {/* Playing */}
      {game.state === "playing" && game.currentCard && !game.error && (
        <PlayingScreen
          cardName={game.currentCard.name}
          streak={game.streak}
          onGuess={game.guess}
        />
      )}

      {/* Game over */}
      {game.state === "game_over" && game.verdict && (
        <GameOverScreen
          verdict={game.verdict}
          canRetry={session.canPlay}
          onRetry={handleRetry}
          onBack={() => router.back()}
        />
      )}
    </View>
  );
}
