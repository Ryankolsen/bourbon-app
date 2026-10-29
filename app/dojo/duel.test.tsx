import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import DojoDuelScreen from "./duel";

const mockSubmitAnswer = jest.fn();
let mockDuel: any;

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ difficulty: "standard" }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
jest.mock("@/hooks/use-user-xp", () => ({ useUserXp: () => ({ currentBelt: 1 }) }));
jest.mock("@/hooks/use-dojo-duel", () => ({ useDojoDuel: () => mockDuel }));
const mockAnnounce = jest.fn();
jest.mock("@/lib/announce", () => ({ announce: (m: string) => mockAnnounce(m) }));

const questions = {
  rounds: [
    {
      type: "identification",
      bourbonId: "b1",
      bourbonName: "Buffalo Trace",
      correctAnswer: "Buffalo Trace",
      choices: ["Buffalo Trace", "Wild Turkey", "Four Roses"],
      dossier: { bourbonType: "Bourbon", distillery: "BT", state: "KY", proof: 90 },
    },
    { type: "stat_battle", statType: "proof", question: "Q?", correctAnswer: "90", choices: ["90", "86"] },
    {
      type: "fake_note",
      bourbonId: "b1",
      notes: [
        { text: "Vanilla", isFake: false },
        { text: "Roomba", isFake: true },
      ],
    },
  ],
};

function setDuel(state: string) {
  mockDuel = {
    state,
    questions,
    playerHealth: 100,
    ghostHealth: 100,
    verdict: null,
    error: null,
    submitAnswer: mockSubmitAnswer,
    reset: jest.fn(),
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  setDuel("round_1");
});
afterEach(() => jest.useRealTimers());

describe("DojoDuelScreen answer flow", () => {
  it("correct answer announces, shows Next, and waits for Next press", () => {
    render(<DojoDuelScreen />);
    fireEvent.press(screen.getByRole("button", { name: "Buffalo Trace" }));
    expect(mockAnnounce).toHaveBeenCalledWith("Correct");
    expect(screen.getByText("✓ Correct")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next" })).toBeTruthy();
    expect(mockSubmitAnswer).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockSubmitAnswer).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole("button", { name: "Next" }));
    expect(mockSubmitAnswer).toHaveBeenCalledTimes(1);
    expect(mockSubmitAnswer).toHaveBeenCalledWith("Buffalo Trace");
  });

  it("wrong answer announces the right answer and marks both choices", () => {
    render(<DojoDuelScreen />);
    fireEvent.press(screen.getByRole("button", { name: "Wild Turkey" }));
    expect(mockAnnounce).toHaveBeenCalledWith("Wrong. The answer was Buffalo Trace");
    expect(screen.getByText("✗ Your answer")).toBeTruthy();
    expect(screen.getByText("✓ Correct")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Next" }));
    expect(mockSubmitAnswer).toHaveBeenCalledWith("Wild Turkey");
  });

  it("round 3 keeps its copy and announces the fake", () => {
    setDuel("round_3");
    render(<DojoDuelScreen />);
    fireEvent.press(screen.getByRole("button", { name: "Vanilla" }));
    expect(mockAnnounce).toHaveBeenCalledWith("Wrong. The fake was: Roomba");
    expect(screen.getByText("Real note — not the fake ✗")).toBeTruthy();
    expect(screen.getByText("This was the fake ✓")).toBeTruthy();
  });
});
