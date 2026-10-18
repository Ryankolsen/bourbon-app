/**
 * Characterization tests for the login screen's sign-in flows.
 *
 * Pins the Google OAuth redirect and token handling, the Apple sign-in
 * request, and email sign-in, so that Expo SDK / expo-auth-session /
 * supabase-js upgrades cannot silently change them.
 */

import React from "react";
import { Platform, Linking } from "react-native";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAuth = {
  signInWithOAuth: jest.fn(),
  setSession: jest.fn(),
  exchangeCodeForSession: jest.fn(),
  signInWithIdToken: jest.fn(),
  signInWithPassword: jest.fn(),
};

// Getters, because the hoisted `import LoginScreen` loads these mocks before
// the consts above are initialised.
jest.mock("@/lib/supabase", () => ({
  supabase: {
    get auth() {
      return mockAuth;
    },
  },
}));

const mockOpenAuthSessionAsync = jest.fn();
jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: (...args: unknown[]) => mockOpenAuthSessionAsync(...args),
}));

const REDIRECT = "bourbonvault://auth/callback";
const mockMakeRedirectUri = jest.fn((_options: unknown) => REDIRECT);
jest.mock("expo-auth-session", () => ({
  makeRedirectUri: (options: unknown) => mockMakeRedirectUri(options),
}));

const mockAppleSignInAsync = jest.fn();
jest.mock("expo-apple-authentication", () => {
  const { TouchableOpacity, Text } = require("react-native");
  return {
    signInAsync: (...args: unknown[]) => mockAppleSignInAsync(...args),
    AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
    AppleAuthenticationButtonType: { SIGN_IN: 0 },
    AppleAuthenticationButtonStyle: { WHITE: 0 },
    AppleAuthenticationButton: ({ onPress }: { onPress: () => void }) => (
      <TouchableOpacity onPress={onPress}>
        <Text>Sign in with Apple</Text>
      </TouchableOpacity>
    ),
  };
});

const mockDevice = { isDevice: false };
jest.mock("expo-device", () => ({
  get isDevice() {
    return mockDevice.isDevice;
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import LoginScreen from "./login";
import { PRIVACY_POLICY_URL, WEBSITE_URL } from "@/lib/public-links";

// ── Helpers ──────────────────────────────────────────────────────────────────

const originalOS = Platform.OS;

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = "ios";
  mockDevice.isDevice = false;
  mockAuth.signInWithOAuth.mockResolvedValue({
    data: { url: "https://auth.example/authorize" },
    error: null,
  });
  mockAuth.setSession.mockResolvedValue({ error: null });
  mockAuth.exchangeCodeForSession.mockResolvedValue({ error: null });
  mockAuth.signInWithIdToken.mockResolvedValue({ error: null });
  mockAuth.signInWithPassword.mockResolvedValue({ error: null });
});

afterAll(() => {
  Platform.OS = originalOS;
});

function pressGoogle() {
  render(<LoginScreen />);
  fireEvent.press(screen.getByText("Continue with Google"));
}

// ── Google ────────────────────────────────────────────────────────────────────

describe("Google sign-in", () => {
  it("builds the redirect URI from the bourbonvault scheme and auth/callback path", () => {
    render(<LoginScreen />);
    expect(mockMakeRedirectUri).toHaveBeenCalledWith({
      scheme: "bourbonvault",
      path: "auth/callback",
    });
  });

  it("requests the Google OAuth URL without auto-redirect and opens it in an auth session", async () => {
    mockOpenAuthSessionAsync.mockResolvedValue({ type: "cancel" });
    pressGoogle();
    await waitFor(() =>
      expect(mockOpenAuthSessionAsync).toHaveBeenCalledWith(
        "https://auth.example/authorize",
        REDIRECT
      )
    );
    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: REDIRECT, skipBrowserRedirect: true },
    });
  });

  it("sets the session from tokens in the redirect URL fragment", async () => {
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: `${REDIRECT}#access_token=at&refresh_token=rt`,
    });
    pressGoogle();
    await waitFor(() =>
      expect(mockAuth.setSession).toHaveBeenCalledWith({
        access_token: "at",
        refresh_token: "rt",
      })
    );
    expect(mockAuth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("exchanges a PKCE code from the redirect URL query", async () => {
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: `${REDIRECT}?code=abc123`,
    });
    pressGoogle();
    await waitFor(() => expect(mockAuth.exchangeCodeForSession).toHaveBeenCalledWith("abc123"));
    expect(mockAuth.setSession).not.toHaveBeenCalled();
  });

  it("shows an error when the redirect carries neither tokens nor a code", async () => {
    mockOpenAuthSessionAsync.mockResolvedValue({ type: "success", url: REDIRECT });
    pressGoogle();
    expect(
      await screen.findByText("No auth tokens in redirect — check Supabase config")
    ).toBeTruthy();
  });

  it("does nothing when the user cancels the auth session", async () => {
    mockOpenAuthSessionAsync.mockResolvedValue({ type: "cancel" });
    pressGoogle();
    await waitFor(() => expect(mockOpenAuthSessionAsync).toHaveBeenCalled());
    expect(mockAuth.setSession).not.toHaveBeenCalled();
    expect(mockAuth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("shows the OAuth error message when Supabase rejects the request", async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({
      data: {},
      error: new Error("Unsupported provider"),
    });
    pressGoogle();
    expect(await screen.findByText("Unsupported provider")).toBeTruthy();
    expect(mockOpenAuthSessionAsync).not.toHaveBeenCalled();
  });

  it("shows a disabled placeholder instead of the button on the Android emulator", () => {
    Platform.OS = "android";
    render(<LoginScreen />);
    expect(screen.getByText("Google (disabled in local dev)")).toBeTruthy();
    expect(screen.queryByText("Continue with Google")).toBeNull();
  });

  it("shows the Google button on an Android device", () => {
    Platform.OS = "android";
    mockDevice.isDevice = true;
    render(<LoginScreen />);
    expect(screen.getByText("Continue with Google")).toBeTruthy();
  });
});

// ── Apple ─────────────────────────────────────────────────────────────────────

describe("Apple sign-in", () => {
  it("requests full name and email and signs in with the identity token", async () => {
    mockAppleSignInAsync.mockResolvedValue({ identityToken: "apple-id-token" });
    render(<LoginScreen />);
    fireEvent.press(screen.getByText("Sign in with Apple"));
    await waitFor(() =>
      expect(mockAuth.signInWithIdToken).toHaveBeenCalledWith({
        provider: "apple",
        token: "apple-id-token",
      })
    );
    expect(mockAppleSignInAsync).toHaveBeenCalledWith({ requestedScopes: [0, 1] });
  });

  it("stays silent when the user cancels Apple sign-in", async () => {
    mockAppleSignInAsync.mockRejectedValue(
      Object.assign(new Error("canceled"), { code: "ERR_REQUEST_CANCELED" })
    );
    render(<LoginScreen />);
    fireEvent.press(screen.getByText("Sign in with Apple"));
    await waitFor(() => expect(mockAppleSignInAsync).toHaveBeenCalled());
    expect(screen.queryByText("canceled")).toBeNull();
    expect(mockAuth.signInWithIdToken).not.toHaveBeenCalled();
  });

  it("shows other Apple sign-in errors", async () => {
    mockAppleSignInAsync.mockRejectedValue(new Error("Apple unavailable"));
    render(<LoginScreen />);
    fireEvent.press(screen.getByText("Sign in with Apple"));
    expect(await screen.findByText("Apple unavailable")).toBeTruthy();
  });

  it("is not offered on Android", () => {
    Platform.OS = "android";
    render(<LoginScreen />);
    expect(screen.queryByText("Sign in with Apple")).toBeNull();
  });
});

// ── Email ─────────────────────────────────────────────────────────────────────

describe("email sign-in", () => {
  it("signs in with the trimmed email and the password", async () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByText("Sign in with email"));
    fireEvent.changeText(screen.getByPlaceholderText("Email"), "  reviewer@example.com ");
    fireEvent.changeText(screen.getByPlaceholderText("Password"), "secret");
    fireEvent.press(screen.getByText("Sign In"));
    await waitFor(() =>
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "reviewer@example.com",
        password: "secret",
      })
    );
  });
});

// ── Wordmark and links ───────────────────────────────────────────────────────

describe("wordmark and links", () => {
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  });
  afterEach(() => {
    openURL.mockRestore();
    Platform.OS = originalOS;
  });

  it("opens the privacy policy when the link is pressed", () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByText("Privacy Policy"));
    expect(openURL).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
  });

  it("shows the Bourbon Dojo wordmark and the privacy notice", () => {
    render(<LoginScreen />);
    expect(screen.getByText("Bourbon Dojo")).toBeTruthy();
    expect(screen.queryByText("BourbonVault")).toBeNull();
    expect(screen.getByText("By continuing, you agree to our Privacy Policy")).toBeTruthy();
  });

  it("opens the website when Made by RKO Design is pressed", () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByText("Made by RKO Design"));
    expect(openURL).toHaveBeenCalledWith(WEBSITE_URL);
  });

  it("does not mention Terms of Service and exposes both links by role", () => {
    render(<LoginScreen />);
    expect(screen.queryByText(/Terms of Service/)).toBeNull();
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Made by RKO Design" })).toBeTruthy();
  });

  it.each(["ios", "android"] as const)("shows the privacy link on %s", (os) => {
    Platform.OS = os;
    render(<LoginScreen />);
    expect(screen.getByText("Privacy Policy")).toBeTruthy();
  });
});
