import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useGameDailySession, DAILY_CAP, type GameType } from "@/hooks/use-game-daily-session";
import { useTheme } from "@/lib/theme-provider";
import { DifficultyPickerSheet } from "@/components/DifficultyPickerSheet";
import { type Difficulty } from "@/lib/duel-question-generator";

// ---------------------------------------------------------------------------
// Reset countdown
// ---------------------------------------------------------------------------

function useCountdown(resetTime: Date): string {
  const now = new Date();
  const diffMs = resetTime.getTime() - now.getTime();
  if (diffMs <= 0) return "now";
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ---------------------------------------------------------------------------
// GameCard
// ---------------------------------------------------------------------------

interface GameCardProps {
  emoji: string;
  title: string;
  tagline: string;
  gameType: GameType;
  userId: string | null | undefined;
  onPlay: () => void;
}

function GameCard({ emoji, title, tagline, gameType, userId, onPlay }: GameCardProps) {
  const session = useGameDailySession(userId, gameType);
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;
  const countdown = useCountdown(session.resetTime);

  const playsLabel =
    session.isLoading
      ? "Loading…"
      : `${session.playsRemaining} / ${DAILY_CAP} plays left`;

  const playable = session.canPlay && !session.isLoading && !!userId;

  return (
    <View
      className="rounded-2xl p-5 mb-4"
      style={{ backgroundColor: c.brand800 }}
    >
      <View className="flex-row items-center mb-3">
        <Text style={{ fontSize: 36, marginRight: 12 }}>{emoji}</Text>
        <View className="flex-1">
          <Text className="text-brand-100 text-xl font-bold">{title}</Text>
          <Text className="text-brand-400 text-sm mt-0.5">{tagline}</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text
            className="text-sm font-semibold"
            style={{ color: session.playsRemaining > 0 ? c.brand300 : c.tabInactive }}
          >
            {playsLabel}
          </Text>
          {session.playsRemaining === 0 && !session.isLoading && (
            <Text className="text-brand-500 text-xs mt-0.5">
              Resets in {countdown}
            </Text>
          )}
        </View>

        <PlaysIndicator
          playsRemaining={session.playsRemaining}
          total={DAILY_CAP}
          isLoading={session.isLoading}
        />
      </View>

      <TouchableOpacity
        onPress={onPlay}
        disabled={!playable}
        className="rounded-xl py-3 items-center"
        style={{
          backgroundColor: playable ? c.tabActive : c.brand800,
          borderWidth: playable ? 0 : 1,
          borderColor: c.tabInactive,
          opacity: session.isLoading ? 0.5 : 1,
        }}
        accessibilityRole="button"
        accessibilityState={{ disabled: !playable }}
      >
        <Text
          className="font-bold text-base"
          style={{ color: playable ? c.white : c.tabInactive }}
        >
          {!userId
            ? "Sign in to play"
            : session.canPlay
            ? "Play"
            : "Come back tomorrow"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// PlaysIndicator — small pip row
// ---------------------------------------------------------------------------

function PlaysIndicator({
  playsRemaining,
  total,
  isLoading,
}: {
  playsRemaining: number;
  total: number;
  isLoading: boolean;
}) {
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;

  if (isLoading) return null;

  return (
    <View className="flex-row gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i < playsRemaining ? c.tabActive : c.tabInactive,
          }}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// DojoScreen
// ---------------------------------------------------------------------------

type PendingGame = { gameType: GameType; title: string } | null;

export default function DojoScreen() {
  const { user } = useAuth();
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;
  const router = useRouter();
  const [pendingGame, setPendingGame] = useState<PendingGame>(null);

  function openPicker(gameType: GameType, title: string) {
    setPendingGame({ gameType, title });
  }

  function handleDifficultySelect(difficulty: Difficulty) {
    if (!pendingGame) return;
    setPendingGame(null);

    if (pendingGame.gameType === "dojo_duel") {
      router.push(`/dojo/duel?difficulty=${difficulty}` as never);
    } else {
      router.push(`/dojo/pour-or-faker?difficulty=${difficulty}` as never);
    }
  }

  return (
    <>
      <ScrollView className="flex-1 bg-brand-900" contentContainerStyle={{ padding: 16 }}>
        <View className="mb-6 mt-2">
          <Text className="text-brand-100 text-3xl font-bold">The Dojo</Text>
          <Text className="text-brand-400 text-sm mt-1">
            Sharpen your bourbon knowledge. Two games, five plays each, every day.
          </Text>
        </View>

        <GameCard
          emoji="⚔️"
          title="Dojo Duel"
          tagline="3 rounds of bourbon knowledge against a ghost opponent"
          gameType="dojo_duel"
          userId={user?.id}
          onPlay={() => openPicker("dojo_duel", "Dojo Duel")}
        />

        <GameCard
          emoji="🃏"
          title="Pour or Faker"
          tagline="Real bourbon or faker? Build your streak."
          gameType="pour_or_faker"
          userId={user?.id}
          onPlay={() => openPicker("pour_or_faker", "Pour or Faker")}
        />

        <View
          className="rounded-2xl p-4 mt-2"
          style={{ backgroundColor: c.brand800 }}
        >
          <Text className="text-brand-400 text-xs text-center leading-5">
            Win or lose, the Dojo rewards showing up.{"\n"}XP is earned on every attempt.
          </Text>
        </View>
      </ScrollView>

      <DifficultyPickerSheet
        visible={!!pendingGame}
        gameTitle={pendingGame?.title ?? ""}
        onSelect={handleDifficultySelect}
        onClose={() => setPendingGame(null)}
      />
    </>
  );
}
