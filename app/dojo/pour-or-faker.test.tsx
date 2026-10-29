import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import PourOrFakerScreen from "./pour-or-faker";
import { usePourOrFaker } from "@/hooks/use-pour-or-faker";
import { announce } from "@/lib/announce";

jest.mock("@/hooks/use-pour-or-faker", () => ({ usePourOrFaker: jest.fn() }));
jest.mock("@/hooks/use-game-daily-session", () => ({
  useGameDailySession: () => ({ canPlay: true }),
}));
jest.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
jest.mock("@/lib/announce", () => ({ announce: jest.fn() }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ difficulty: "standard" }),
  useRouter: () => ({ back: jest.fn() }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@/lib/theme-provider", () => ({
  useTheme: () => ({ activeTheme: { colors: new Proxy({}, { get: () => "#123456" }) } }),
}));

const mockHook = usePourOrFaker as jest.Mock;

function setGame(overrides: Record<string, unknown>) {
  mockHook.mockReturnValue({
    state: "playing",
    error: null,
    currentCard: { name: "Pappy Van Winkle" },
    streak: 0,
    verdict: null,
    guess: jest.fn(),
    selectDifficulty: jest.fn(),
    reset: jest.fn(),
    ...overrides,
  });
}

beforeEach(() => jest.clearAllMocks());

describe("PourOrFakerScreen", () => {
  it("presses Real and calls guess('real'); Real and Fake are named buttons", () => {
    const guess = jest.fn();
    setGame({ guess });
    const { getByRole } = render(<PourOrFakerScreen />);
    getByRole("button", { name: "Fake" });
    fireEvent.press(getByRole("button", { name: "Real" }));
    expect(guess).toHaveBeenCalledWith("real");
  });

  it("announces 'Correct. Streak 4' when the streak rises to 4", () => {
    setGame({ streak: 3 });
    const { rerender } = render(<PourOrFakerScreen />);
    expect(announce).not.toHaveBeenCalled();
    setGame({ streak: 4 });
    rerender(<PourOrFakerScreen />);
    expect(announce).toHaveBeenCalledWith("Correct. Streak 4");
  });

  it("game over: title is a header and is announced once", () => {
    setGame({
      state: "game_over",
      currentCard: null,
      verdict: { streak: 7, xpEarned: 10, cardName: "Fake Name", wasReal: false },
    });
    const { getByRole, rerender } = render(<PourOrFakerScreen />);
    expect(getByRole("header").props.children).toBe("Streak: 7");
    rerender(<PourOrFakerScreen />);
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith("Streak: 7");
  });
});
