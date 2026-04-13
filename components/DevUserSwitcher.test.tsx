/**
 * Unit tests for DevUserSwitcher component.
 *
 * Mocks:
 *  - @/lib/supabase  — prevents real network calls
 *  - @tanstack/react-query — useQueryClient().clear() spy
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import { DevUserSwitcher } from "./DevUserSwitcher";
import { DEV_USERS } from "@/lib/dev-users";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  },
}));

const mockQueryClientClear = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ clear: mockQueryClientClear }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderSwitcher() {
  return render(<DevUserSwitcher />);
}

function openPanel() {
  fireEvent.press(screen.getByLabelText("Open dev user switcher"));
}

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockSignInWithPassword.mockResolvedValue({ error: null });
  mockSignOut.mockResolvedValue({});
});

describe("DevUserSwitcher — closed state", () => {
  it("renders the floating toggle button", () => {
    renderSwitcher();
    expect(screen.getByLabelText("Open dev user switcher")).toBeTruthy();
  });

  it("does not show the modal panel when closed", () => {
    renderSwitcher();
    expect(screen.queryByText("Dev: Switch User")).toBeNull();
  });
});

describe("DevUserSwitcher — open state", () => {
  it("opens the panel when the toggle button is pressed", () => {
    renderSwitcher();
    openPanel();
    expect(screen.getByText("Dev: Switch User")).toBeTruthy();
  });

  it("renders all DEV_USERS in the panel", () => {
    renderSwitcher();
    openPanel();
    for (const user of DEV_USERS) {
      expect(screen.getByText(user.name)).toBeTruthy();
    }
  });

  it("closes the panel when the ✕ button is pressed", () => {
    renderSwitcher();
    openPanel();
    fireEvent.press(screen.getByLabelText("Close switcher"));
    expect(screen.queryByText("Dev: Switch User")).toBeNull();
  });

  it("renders a Sign Out button", () => {
    renderSwitcher();
    openPanel();
    expect(screen.getByLabelText("Sign out and return to admin login")).toBeTruthy();
  });
});

describe("DevUserSwitcher — switching user", () => {
  it("calls signInWithPassword with the correct email and DEV_PASSWORD", async () => {
    renderSwitcher();
    openPanel();

    const target = DEV_USERS[0];
    fireEvent.press(screen.getByText(target.name));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: target.email,
        password: "BourbonDev2024!",
      });
    });
  });

  it("clears the query cache on successful switch", async () => {
    renderSwitcher();
    openPanel();

    fireEvent.press(screen.getByText(DEV_USERS[0].name));

    await waitFor(() => {
      expect(mockQueryClientClear).toHaveBeenCalledTimes(1);
    });
  });

  it("closes the panel after a successful switch", async () => {
    renderSwitcher();
    openPanel();

    fireEvent.press(screen.getByText(DEV_USERS[0].name));

    await waitFor(() => {
      expect(screen.queryByText("Dev: Switch User")).toBeNull();
    });
  });

  it("displays an error message when sign-in fails", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: "Invalid credentials" } });

    renderSwitcher();
    openPanel();

    fireEvent.press(screen.getByText(DEV_USERS[0].name));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeTruthy();
    });
  });

  it("does not close the panel or clear cache when sign-in fails", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: "Invalid credentials" } });

    renderSwitcher();
    openPanel();

    fireEvent.press(screen.getByText(DEV_USERS[0].name));

    await waitFor(() => {
      expect(screen.getByText("Dev: Switch User")).toBeTruthy();
      expect(mockQueryClientClear).not.toHaveBeenCalled();
    });
  });
});

describe("DevUserSwitcher — production guard", () => {
  const originalDev = __DEV__;

  afterEach(() => {
    // Restore the global after each test in this suite.
    (global as any).__DEV__ = originalDev;
  });

  it("renders nothing when __DEV__ is false", () => {
    (global as any).__DEV__ = false;
    renderSwitcher();
    expect(screen.queryByLabelText("Open dev user switcher")).toBeNull();
  });

  it("renders the toggle button when __DEV__ is true", () => {
    (global as any).__DEV__ = true;
    renderSwitcher();
    expect(screen.getByLabelText("Open dev user switcher")).toBeTruthy();
  });
});

describe("DevUserSwitcher — sign out", () => {
  it("calls supabase.auth.signOut", async () => {
    renderSwitcher();
    openPanel();

    fireEvent.press(screen.getByLabelText("Sign out and return to admin login"));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  it("clears the query cache on sign out", async () => {
    renderSwitcher();
    openPanel();

    fireEvent.press(screen.getByLabelText("Sign out and return to admin login"));

    await waitFor(() => {
      expect(mockQueryClientClear).toHaveBeenCalledTimes(1);
    });
  });

  it("closes the panel after sign out", async () => {
    renderSwitcher();
    openPanel();

    fireEvent.press(screen.getByLabelText("Sign out and return to admin login"));

    await waitFor(() => {
      expect(screen.queryByText("Dev: Switch User")).toBeNull();
    });
  });
});
