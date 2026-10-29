import React from "react";
import { render, screen } from "@testing-library/react-native";

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "u1", email: "admin@example.com" } }),
}));
jest.mock("@/lib/admin", () => ({ isAdmin: () => true }));
jest.mock("@/hooks/use-bourbon-suggestions", () => ({
  useBourbonSuggestions: () => ({ data: [], isLoading: false }),
  useApproveSuggestion: () => ({ mutate: jest.fn() }),
  useRejectSuggestion: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/lib/theme-provider", () => ({
  useTheme: () => ({ activeTheme: { colors: { tabBorder: "#374151" } } }),
}));
jest.mock("@/lib/toast-provider", () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn() }) }));

import SuggestionsScreen from "./suggestions";

describe("SuggestionsScreen accessibility", () => {
  it("renders the screen title as a heading", () => {
    render(<SuggestionsScreen />);
    expect(screen.getByRole("header", { name: "Pending Suggestions" })).toBeTruthy();
  });
});
