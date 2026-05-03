import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/use-auth";
import { useUserXp } from "@/hooks/use-user-xp";
import { useTheme } from "@/lib/theme-provider";
import { useDojoDuel } from "@/hooks/use-dojo-duel";
import {
  type Difficulty,
  type IdentificationRound,
  type StatBattleRound,
  type FakeNoteRound,
} from "@/lib/duel-question-generator";
import { colors } from "@/lib/colors";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_DIFFICULTIES: Difficulty[] = ["training", "standard", "challenge"];

function isValidDifficulty(v: unknown): v is Difficulty {
  return VALID_DIFFICULTIES.includes(v as Difficulty);
}

function getRoundIndex(state: string): 0 | 1 | 2 {
  if (state === "round_1") return 0;
  if (state === "round_2") return 1;
  return 2;
}

function getRoundLabel(state: string): string {
  if (state === "round_1") return "Round 1 · Identification";
  if (state === "round_2") return "Round 2 · Stat Battle";
  return "Round 3 · Spot the Fake";
}

// ---------------------------------------------------------------------------
// HealthBar
// ---------------------------------------------------------------------------

function HealthBar({
  label,
  health,
  isPlayer,
}: {
  label: string;
  health: number;
  isPlayer: boolean;
}) {
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;
  const barColor = isPlayer ? c.tabActive : "#dc2626";

  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          color: c.brand400,
          fontSize: 11,
          fontWeight: "600",
          marginBottom: 4,
          textAlign: isPlayer ? "left" : "right",
        }}
      >
        {label}
      </Text>
      <View
        style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: c.brand700,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${Math.max(0, health)}%`,
            borderRadius: 4,
            backgroundColor: barColor,
          }}
        />
      </View>
      <Text
        style={{
          color: c.brand300,
          fontSize: 12,
          fontWeight: "700",
          marginTop: 3,
          textAlign: isPlayer ? "left" : "right",
        }}
      >
        {Math.max(0, health)}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ChoiceButton
// ---------------------------------------------------------------------------

function ChoiceButton({
  text,
  onPress,
  state,
}: {
  text: string;
  onPress: () => void;
  state: "idle" | "correct" | "wrong" | "disabled";
}) {
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;

  const bgColor =
    state === "correct"
      ? "#16a34a"
      : state === "wrong"
      ? "#dc2626"
      : c.brand800;

  const borderColor =
    state === "correct"
      ? "#16a34a"
      : state === "wrong"
      ? "#dc2626"
      : c.brand600;

  const textColor =
    state === "correct" || state === "wrong" ? c.white : c.brand100;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={state === "disabled" || state === "correct" || state === "wrong"}
      style={{
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor,
        backgroundColor: bgColor,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 10,
      }}
      accessibilityRole="button"
    >
      <Text style={{ color: textColor, fontSize: 15, fontWeight: "500", textAlign: "center" }}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Round 1 — Identification
// ---------------------------------------------------------------------------

function IdentificationRoundView({
  round,
  onAnswer,
  answered,
  selectedAnswer,
}: {
  round: IdentificationRound;
  onAnswer: (answer: string) => void;
  answered: boolean;
  selectedAnswer: string | null;
}) {
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;

  function getChoiceState(choice: string): "idle" | "correct" | "wrong" | "disabled" {
    if (!answered) return "idle";
    if (choice === round.correctAnswer) return "correct";
    if (choice === selectedAnswer) return "wrong";
    return "disabled";
  }

  return (
    <View>
      <View
        style={{
          backgroundColor: c.brand800,
          borderRadius: 20,
          padding: 24,
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🥃</Text>
        <Text style={{ color: c.brand400, fontSize: 13, marginBottom: 6 }}>
          Which bourbon is this?
        </Text>
        <Text
          style={{
            color: c.brand100,
            fontSize: 18,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          ??? Bourbon
        </Text>
      </View>

      {round.choices.map((choice) => (
        <ChoiceButton
          key={choice}
          text={choice}
          onPress={() => onAnswer(choice)}
          state={getChoiceState(choice)}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Round 2 — Stat Battle
// ---------------------------------------------------------------------------

function StatBattleRoundView({
  round,
  onAnswer,
  answered,
  selectedAnswer,
}: {
  round: StatBattleRound;
  onAnswer: (answer: string) => void;
  answered: boolean;
  selectedAnswer: string | null;
}) {
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;

  const statEmoji =
    round.statType === "proof" ? "💪" : round.statType === "age" ? "⏳" : "🌽";

  function getChoiceState(choice: string): "idle" | "correct" | "wrong" | "disabled" {
    if (!answered) return "idle";
    if (choice === round.correctAnswer) return "correct";
    if (choice === selectedAnswer) return "wrong";
    return "disabled";
  }

  return (
    <View>
      <View
        style={{
          backgroundColor: c.brand800,
          borderRadius: 20,
          padding: 24,
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 40, marginBottom: 12 }}>{statEmoji}</Text>
        <Text
          style={{
            color: c.brand100,
            fontSize: 17,
            fontWeight: "600",
            textAlign: "center",
            lineHeight: 24,
          }}
        >
          {round.question}
        </Text>
      </View>

      {round.choices.map((choice) => (
        <ChoiceButton
          key={choice}
          text={choice}
          onPress={() => onAnswer(choice)}
          state={getChoiceState(choice)}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Round 3 — Fake Note
// ---------------------------------------------------------------------------

function FakeNoteRoundView({
  round,
  onAnswer,
  answered,
  selectedAnswer,
}: {
  round: FakeNoteRound;
  onAnswer: (answer: string) => void;
  answered: boolean;
  selectedAnswer: string | null;
}) {
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;

  function getNoteState(note: {
    text: string;
    isFake: boolean;
  }): "idle" | "correct" | "wrong" | "disabled" {
    if (!answered) return "idle";
    if (note.isFake && selectedAnswer === note.text) return "correct";
    if (!note.isFake && selectedAnswer === note.text) return "wrong";
    if (note.isFake) return "correct";
    return "disabled";
  }

  return (
    <View>
      <View
        style={{
          backgroundColor: c.brand800,
          borderRadius: 20,
          padding: 20,
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 36, marginBottom: 8 }}>🕵️</Text>
        <Text
          style={{ color: c.brand100, fontSize: 17, fontWeight: "700", marginBottom: 4 }}
        >
          Spot the Fake
        </Text>
        <Text style={{ color: c.brand400, fontSize: 13, textAlign: "center" }}>
          Two of these tasting notes are real. One is made up. Which is fake?
        </Text>
      </View>

      {round.notes.map((note, i) => {
        const noteState = getNoteState(note);
        const bgColor =
          noteState === "correct"
            ? "#16a34a"
            : noteState === "wrong"
            ? "#dc2626"
            : c.brand800;
        const borderColor =
          noteState === "correct"
            ? "#16a34a"
            : noteState === "wrong"
            ? "#dc2626"
            : c.brand600;

        return (
          <TouchableOpacity
            key={i}
            onPress={() => onAnswer(note.text)}
            disabled={answered}
            style={{
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor,
              backgroundColor: bgColor,
              padding: 16,
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                color:
                  noteState === "correct" || noteState === "wrong"
                    ? "#ffffff"
                    : c.brand100,
                fontSize: 14,
                lineHeight: 21,
              }}
            >
              {note.text}
            </Text>
            {answered && noteState === "correct" && (
              <Text style={{ color: "#86efac", fontSize: 12, marginTop: 6, fontWeight: "600" }}>
                This was the fake ✓
              </Text>
            )}
            {answered && noteState === "wrong" && (
              <Text style={{ color: "#fca5a5", fontSize: 12, marginTop: 6, fontWeight: "600" }}>
                Real note — not the fake ✗
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Verdict screen
// ---------------------------------------------------------------------------

function VerdictScreen({
  verdict,
  onPlayAgain,
  onBack,
}: {
  verdict: NonNullable<ReturnType<typeof useDojoDuel>["verdict"]>;
  onPlayAgain: () => void;
  onBack: () => void;
}) {
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;

  const outcomeEmoji =
    verdict.outcome === "sweep" ? "🏆" : verdict.outcome === "win" ? "⚔️" : "💀";
  const outcomeLabel =
    verdict.outcome === "sweep"
      ? "Perfect Sweep!"
      : verdict.outcome === "win"
      ? "Victory!"
      : "Defeated";
  const outcomeColor =
    verdict.outcome === "loss" ? "#dc2626" : "#16a34a";

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 24, alignItems: "center" }}
    >
      <Text style={{ fontSize: 72, marginBottom: 12 }}>{outcomeEmoji}</Text>
      <Text
        style={{
          fontSize: 28,
          fontWeight: "800",
          color: outcomeColor,
          marginBottom: 8,
        }}
      >
        {outcomeLabel}
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
        <Text
          style={{ color: c.tabActive, fontSize: 22, fontWeight: "800" }}
        >
          +{verdict.xpEarned} XP
        </Text>
      </View>

      {/* Sensei quote */}
      {verdict.senseiQuote && (
        <View
          style={{
            backgroundColor: c.brand800,
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            width: "100%",
          }}
        >
          <Text style={{ color: c.brand400, fontSize: 12, marginBottom: 6 }}>
            Sensei says:
          </Text>
          <Text
            style={{
              color: c.brand200,
              fontSize: 15,
              fontStyle: "italic",
              lineHeight: 22,
            }}
          >
            "{verdict.senseiQuote}"
          </Text>
        </View>
      )}

      {/* Round breakdown */}
      <View
        style={{
          backgroundColor: c.brand800,
          borderRadius: 16,
          padding: 20,
          width: "100%",
          marginBottom: 32,
        }}
      >
        <Text
          style={{
            color: c.brand400,
            fontSize: 12,
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 14,
          }}
        >
          Round Results
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
          {verdict.roundResults.map((r) => {
            const label =
              r.round === 1
                ? "ID"
                : r.round === 2
                ? "Stats"
                : "Fake";
            return (
              <View key={r.round} style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 24,
                    marginBottom: 4,
                  }}
                >
                  {r.playerWon ? "✅" : "❌"}
                </Text>
                <Text style={{ color: c.brand400, fontSize: 12 }}>{label}</Text>
              </View>
            );
          })}
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            marginTop: 16,
          }}
        >
          <Text style={{ color: c.brand300, fontSize: 13 }}>
            You {verdict.playerRoundWins} — Ghost {verdict.ghostRoundWins}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <TouchableOpacity
        onPress={onPlayAgain}
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
          Play Again
        </Text>
      </TouchableOpacity>

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
// Main screen
// ---------------------------------------------------------------------------

export default function DojoDuelScreen() {
  const { difficulty: rawDifficulty } = useLocalSearchParams<{ difficulty: string }>();
  const difficulty: Difficulty = isValidDifficulty(rawDifficulty) ? rawDifficulty : "standard";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;
  const { currentBelt } = useUserXp(user?.id);

  const duel = useDojoDuel({
    userId: user?.id ?? null,
    beltLevel: currentBelt,
    difficulty,
  });

  // Local UI state for answer feedback
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset UI state when the round changes
  useEffect(() => {
    setSelectedAnswer(null);
    setAnswered(false);
  }, [duel.state]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  function handleAnswer(answer: string) {
    if (answered) return;
    setSelectedAnswer(answer);
    setAnswered(true);
    advanceTimerRef.current = setTimeout(() => {
      duel.submitAnswer(answer);
    }, 900);
  }

  function handlePlayAgain() {
    setSelectedAnswer(null);
    setAnswered(false);
    duel.reset();
  }

  const isRoundState =
    duel.state === "round_1" ||
    duel.state === "round_2" ||
    duel.state === "round_3";

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
            Dojo Duel
          </Text>
          <Text style={{ color: c.brand400, fontSize: 12, textTransform: "capitalize" }}>
            {difficulty}
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Loading */}
      {(duel.state === "loading" || duel.state === "difficulty_select") && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.spinnerDefault} size="large" />
          <Text style={{ color: c.brand400, marginTop: 16, fontSize: 14 }}>
            Finding your opponent…
          </Text>
        </View>
      )}

      {/* Error */}
      {duel.error && (
        <View className="flex-1 items-center justify-center px-6">
          <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
          <Text style={{ color: c.brand100, fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
            Couldn't start the duel
          </Text>
          <Text
            style={{ color: c.brand400, fontSize: 14, textAlign: "center", marginBottom: 24 }}
          >
            {duel.error}
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

      {/* Round UI */}
      {isRoundState && !duel.error && duel.questions && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Health bars */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <HealthBar label="You" health={duel.playerHealth} isPlayer />
            <Text style={{ color: c.brand500, fontSize: 13, marginTop: 16 }}>vs</Text>
            <HealthBar label="Ghost" health={duel.ghostHealth} isPlayer={false} />
          </View>

          {/* Round label */}
          <View
            style={{
              backgroundColor: c.brand800,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 6,
              alignSelf: "center",
              marginBottom: 20,
            }}
          >
            <Text style={{ color: c.brand300, fontSize: 13, fontWeight: "600" }}>
              {getRoundLabel(duel.state)}
            </Text>
          </View>

          {/* Round content */}
          {duel.state === "round_1" && (
            <IdentificationRoundView
              round={duel.questions.rounds[0]}
              onAnswer={handleAnswer}
              answered={answered}
              selectedAnswer={selectedAnswer}
            />
          )}
          {duel.state === "round_2" && (
            <StatBattleRoundView
              round={duel.questions.rounds[1]}
              onAnswer={handleAnswer}
              answered={answered}
              selectedAnswer={selectedAnswer}
            />
          )}
          {duel.state === "round_3" && (
            <FakeNoteRoundView
              round={duel.questions.rounds[2]}
              onAnswer={handleAnswer}
              answered={answered}
              selectedAnswer={selectedAnswer}
            />
          )}
        </ScrollView>
      )}

      {/* Verdict */}
      {duel.state === "verdict" && duel.verdict && (
        <VerdictScreen
          verdict={duel.verdict}
          onPlayAgain={handlePlayAgain}
          onBack={() => router.back()}
        />
      )}
    </View>
  );
}
