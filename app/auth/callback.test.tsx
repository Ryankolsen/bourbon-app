/**
 * Characterization tests for the auth callback deep link
 * (bourbonvault://auth/callback).
 *
 * Uses the real expo-linking URL parser so that Expo SDK upgrades that change
 * how deep links are parsed are caught here. Only the incoming URL is mocked.
 */

import React from "react";
import { render, waitFor } from "@testing-library/react-native";

// ── Mocks ─────────────────────────────────────────────────────────────────────

let mockLinkingURL: string | null = null;
jest.mock("expo-linking", () => ({
  ...jest.requireActual("expo-linking"),
  getLinkingURL: () => mockLinkingURL,
}));

const mockExchangeCodeForSession = jest.fn();
jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
    },
  },
}));

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

import AuthCallback from "./callback";

beforeEach(() => {
  jest.clearAllMocks();
  mockExchangeCodeForSession.mockResolvedValue({ error: null });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("auth callback deep link", () => {
  it("exchanges the code from the app-scheme URL and goes to the tabs", async () => {
    mockLinkingURL = "bourbonvault://auth/callback?code=abc123";
    render(<AuthCallback />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(tabs)"));
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("abc123");
  });

  it("exchanges the code before navigating", async () => {
    const order: string[] = [];
    mockExchangeCodeForSession.mockImplementation(async () => {
      order.push("exchange");
      return { error: null };
    });
    mockReplace.mockImplementation(() => order.push("replace"));
    mockLinkingURL = "bourbonvault://auth/callback?code=abc123";
    render(<AuthCallback />);
    await waitFor(() => expect(order).toEqual(["exchange", "replace"]));
  });

  it("parses the code from a URL with additional query params", async () => {
    mockLinkingURL = "bourbonvault://auth/callback?state=xyz&code=abc123";
    render(<AuthCallback />);
    await waitFor(() => expect(mockExchangeCodeForSession).toHaveBeenCalledWith("abc123"));
  });

  it("goes to the tabs without an exchange when the URL has no code", async () => {
    mockLinkingURL = "bourbonvault://auth/callback";
    render(<AuthCallback />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(tabs)"));
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("does nothing when the app was not opened from a link", async () => {
    mockLinkingURL = null;
    render(<AuthCallback />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
