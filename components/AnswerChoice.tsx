import React from "react";
import { Text } from "react-native";
import { AccessiblePressable } from "@/components/AccessiblePressable";
import { useTheme } from "@/lib/theme-provider";

export type AnswerChoiceState = "idle" | "correct" | "wrong" | "disabled";

type Props = {
  text: string;
  state: AnswerChoiceState;
  onPress: () => void;
  correctNote?: string;
  wrongNote?: string;
};

export function AnswerChoice({ text, state, onPress, correctNote, wrongNote }: Props) {
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;

  const feedback =
    state === "correct"
      ? (correctNote ?? "✓ Correct")
      : state === "wrong"
      ? (wrongNote ?? "✗ Your answer")
      : null;

  const filled = state === "correct" || state === "wrong";
  const bg = state === "correct" ? c.answerCorrect : state === "wrong" ? c.answerWrong : c.brand800;
  const border = filled ? bg : c.brand600;
  const textColor = filled ? c.white : c.brand100;

  // Spoken label: drop the glyphs from the visible feedback line.
  const spokenFeedback =
    state === "correct" && !correctNote
      ? "Correct"
      : state === "wrong" && !wrongNote
      ? "Your answer"
      : feedback;
  const label = spokenFeedback ? `${text}, ${spokenFeedback}` : text;

  return (
    <AccessiblePressable
      accessibilityLabel={label}
      onPress={onPress}
      disabled={state !== "idle"}
      style={{
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: border,
        backgroundColor: bg,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 10,
      }}
    >
      <Text style={{ color: textColor, fontSize: 15, fontWeight: "500", textAlign: "center" }}>
        {text}
      </Text>
      {feedback && (
        <Text
          style={{
            color: c.white,
            fontSize: 12,
            fontWeight: "600",
            marginTop: 6,
            textAlign: "center",
          }}
        >
          {feedback}
        </Text>
      )}
    </AccessiblePressable>
  );
}
