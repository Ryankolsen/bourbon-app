/**
 * Unit tests for useUpdateBourbon.
 *
 * Pattern: renderHook + QueryClientProvider wrapper, supabase mocked,
 * one test per observable behavior.
 */

import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useUpdateBourbon } from "./use-bourbons";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockEq = jest.fn().mockReturnThis();
const mockSelect = jest.fn().mockReturnThis();
const mockSingle = jest.fn().mockResolvedValue({ data: { id: "bourbon-123", name: "Updated" }, error: null });
const mockUpdate = jest.fn().mockReturnThis();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockThen = jest.fn((resolve: (v: any) => void) =>
  Promise.resolve({ data: null, error: null }).then(resolve)
);

const mockQueryBuilder = {
  select: mockSelect,
  insert: jest.fn().mockReturnThis(),
  update: mockUpdate,
  delete: jest.fn().mockReturnThis(),
  eq: mockEq,
  single: mockSingle,
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

// ── useUpdateBourbon ──────────────────────────────────────────────────────────

describe("useUpdateBourbon", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockReturnThis();
    mockEq.mockReturnThis();
    mockSelect.mockReturnThis();
    mockSingle.mockResolvedValue({
      data: { id: "bourbon-123", name: "Updated" },
      error: null,
    });
  });

  // Slice 1 — core wiring: hook returns idle before mutation fires
  it("returns idle status before mutation is called", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateBourbon(), { wrapper: Wrapper });
    expect(result.current.status).toBe("idle");
  });

  // Slice 2 — core wiring: calls supabase update on bourbons with the payload
  it("calls supabase update on bourbons table with payload including updated_by", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateBourbon(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        id: "bourbon-123",
        updatedBy: "admin-user",
        fields: { name: "New Name" },
      });
    });

    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith("bourbons"));
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New Name", updated_by: "admin-user" })
    );
    expect(mockEq).toHaveBeenCalledWith("id", "bourbon-123");
  });

  // Slice 3 — cache invalidation: invalidates ['bourbon', id] on success
  it("invalidates ['bourbon', id] on success", async () => {
    const { Wrapper, qc } = createWrapper();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useUpdateBourbon(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        id: "bourbon-123",
        updatedBy: "admin-user",
        fields: { name: "New Name" },
      });
    });

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["bourbon", "bourbon-123"] })
      )
    );
  });

  // Slice 4 — error path: Supabase returns an error → mutation enters error state, no cache invalidation
  it("enters error state and does NOT invalidate cache when supabase returns an error", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    const { Wrapper, qc } = createWrapper();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useUpdateBourbon(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        id: "bourbon-123",
        updatedBy: "admin-user",
        fields: { name: "Denied" },
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
