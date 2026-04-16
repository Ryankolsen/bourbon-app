/**
 * Unit tests for useRemoveFromCollection.
 *
 * Pattern: renderHook + QueryClientProvider wrapper, supabase mocked,
 * one test per observable behavior.
 */

import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useRemoveFromCollection } from "./use-collection";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockEq = jest.fn().mockReturnThis();
const mockDelete = jest.fn().mockReturnThis();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockThen = jest.fn((resolve: (v: any) => void) =>
  Promise.resolve({ data: null, error: null }).then(resolve)
);

const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  delete: mockDelete,
  eq: mockEq,
  then: mockThen,
};

const mockFrom = jest.fn((_table: string) => mockQueryBuilder);

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
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

// ── useRemoveFromCollection ───────────────────────────────────────────────────

describe("useRemoveFromCollection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: successful delete
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockThen.mockImplementation((resolve: (v: any) => void) =>
      Promise.resolve({ data: null, error: null }).then(resolve)
    );
    mockDelete.mockReturnThis();
    mockEq.mockReturnThis();
  });

  // Slice 1 — core wiring: hook returns idle before mutation fires
  it("returns idle status before mutation is called", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRemoveFromCollection(), {
      wrapper: Wrapper,
    });
    expect(result.current.status).toBe("idle");
  });

  // Slice 2 — core wiring: calls Supabase delete on user_collection with correct id
  it("calls supabase delete on user_collection with the entry id", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRemoveFromCollection(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({ id: "entry-123", userId: "user-abc" });
    });

    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith("user_collection"));
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("id", "entry-123");
  });

  // Slice 3 — content details: invalidates ["collection", userId] on success
  it("invalidates ['collection', userId] on success", async () => {
    const { Wrapper, qc } = createWrapper();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useRemoveFromCollection(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({ id: "entry-123", userId: "user-abc" });
    });

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["collection", "user-abc"] })
      )
    );
  });

  // Slice 4 — error path: Supabase returns an error → mutation enters error state
  it("propagates supabase error on failure", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockThen.mockImplementation((resolve: (v: any) => void) =>
      Promise.resolve({ data: null, error: { message: "delete failed" } }).then(resolve)
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRemoveFromCollection(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({ id: "entry-123", userId: "user-abc" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  // Slice 5 — no cascade: only targets user_collection, not other tables
  it("only deletes from user_collection, not other tables", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRemoveFromCollection(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({ id: "entry-123", userId: "user-abc" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const tables = mockFrom.mock.calls.map(([t]: [string]) => t);
    expect(tables).toEqual(["user_collection"]);
    expect(tables).not.toContain("user_ratings");
    expect(tables).not.toContain("user_wishlist");
  });
});
