/**
 * Unit tests for useDeleteAccount and usePendingDeletion.
 *
 * Pattern: renderHook + QueryClientProvider wrapper, supabase mocked,
 * one test per observable behavior.
 */

import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useDeleteAccount, usePendingDeletion } from "./use-profile";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFunctionsInvoke = jest.fn();
const mockSignOut = jest.fn();
const mockEq = jest.fn().mockReturnThis();
const mockUpdate = jest.fn().mockReturnThis();
const mockSingle = jest.fn();
const mockSelect = jest.fn().mockReturnThis();
const mockFrom = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockFunctionsInvoke(...args) },
    auth: { signOut: () => mockSignOut() },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  }
  return { Wrapper, qc };
}

// ── useDeleteAccount ──────────────────────────────────────────────────────────

describe("useDeleteAccount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFunctionsInvoke.mockResolvedValue({ data: { success: true }, error: null });
    mockSignOut.mockResolvedValue({});
  });

  // Slice 1 — core wiring: hook returns idle before mutation fires
  it("returns idle status before mutation is called", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteAccount(), { wrapper: Wrapper });
    expect(result.current.status).toBe("idle");
  });

  // Slice 2 — invokes edge function with correct name
  it("invokes the delete-account edge function", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteAccount(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(mockFunctionsInvoke).toHaveBeenCalledWith("delete-account"));
  });

  // Slice 3 — signs out on success
  it("calls supabase.auth.signOut on success", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteAccount(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
  });

  // Slice 4 — error path: mutation enters error state when edge function errors
  it("enters error state when the edge function returns an error", async () => {
    mockFunctionsInvoke.mockResolvedValue({ data: null, error: { message: "unauthorized" } });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteAccount(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── usePendingDeletion ────────────────────────────────────────────────────────

describe("usePendingDeletion", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default query builder wiring
    mockSingle.mockResolvedValue({ data: { pending_deletion_at: null }, error: null });
    mockSelect.mockReturnThis();
    mockEq.mockReturnThis();
    mockUpdate.mockReturnThis();

    mockFrom.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      update: mockUpdate,
    });
  });

  // Slice 1 — returns isPendingDeletion: false when column is null
  it("returns isPendingDeletion: false when pending_deletion_at is null", async () => {
    mockSingle.mockResolvedValue({ data: { pending_deletion_at: null }, error: null });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePendingDeletion("user-123"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isPendingDeletion).toBe(false);
    expect(result.current.pendingDeletionAt).toBeNull();
  });

  // Slice 2 — returns isPendingDeletion: true and correct date when column is set
  it("returns isPendingDeletion: true and the correct date when column is set", async () => {
    mockSingle.mockResolvedValue({
      data: { pending_deletion_at: "2026-05-01T00:00:00Z" },
      error: null,
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePendingDeletion("user-123"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isPendingDeletion).toBe(true);
    expect(result.current.pendingDeletionAt).toEqual(new Date("2026-05-01T00:00:00Z"));
  });

  // Slice 3 — cancelDeletion nulls out pending_deletion_at
  it("cancelDeletion calls update with { pending_deletion_at: null }", async () => {
    // update chain: update(...).eq(...) → resolves
    const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockUpdateEq });
    mockFrom.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      update: mockUpdate,
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePendingDeletion("user-123"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => {
      await result.current.cancelDeletion();
    });

    expect(mockUpdate).toHaveBeenCalledWith({ pending_deletion_at: null });
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "user-123");
  });

  // Slice 4 — disabled when userId is undefined
  it("does not fire the query when userId is undefined", () => {
    const { Wrapper } = createWrapper();
    renderHook(() => usePendingDeletion(undefined), { wrapper: Wrapper });

    expect(mockFrom).not.toHaveBeenCalled();
  });
});
