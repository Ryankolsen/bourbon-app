/**
 * Unit tests for useUpdateGroup and useRemoveGroupMember mutations.
 *
 * Pattern: renderHook + QueryClientProvider wrapper, supabase mocked,
 * one test per observable behavior.
 */

import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useUpdateGroup, useRemoveGroupMember } from "./use-groups";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockEq = jest.fn().mockReturnThis();
const mockUpdate = jest.fn().mockReturnThis();
const mockDelete = jest.fn().mockReturnThis();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockThen = jest.fn((resolve: (v: any) => void) =>
  Promise.resolve({ data: null, error: null }).then(resolve)
);

const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: mockUpdate,
  delete: mockDelete,
  upsert: jest.fn().mockReturnThis(),
  eq: mockEq,
  neq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  then: mockThen,
};

const mockFrom = jest.fn((_table: string) => mockQueryBuilder);

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    auth: { getUser: jest.fn() },
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── useUpdateGroup ────────────────────────────────────────────────────────────

describe("useUpdateGroup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: successful update (then resolves { data: null, error: null })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockThen.mockImplementation((resolve: (v: any) => void) =>
      Promise.resolve({ data: null, error: null }).then(resolve)
    );
  });

  // Slice 1 — core wiring: hook returns idle before mutation fires
  it("returns idle status before mutation is called", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateGroup(), { wrapper: Wrapper });
    expect(result.current.status).toBe("idle");
  });

  // Slice 2 — content: calls Supabase update with correct args
  it("calls supabase update with groupId, name, and description", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateGroup(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        groupId: "group-1",
        name: "New Name",
        description: "New desc",
      });
    });

    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith("groups"));
    expect(mockUpdate).toHaveBeenCalledWith({
      name: "New Name",
      description: "New desc",
    });
    expect(mockEq).toHaveBeenCalledWith("id", "group-1");
  });

  // Slice 3 — invalidates ['group', groupId] on success
  it("invalidates the ['group', groupId] query key on success", async () => {
    const { Wrapper, qc } = createWrapper();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useUpdateGroup(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        groupId: "group-1",
        name: "New Name",
        description: null,
      });
    });

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["group", "group-1"] })
      )
    );
  });

  // Slice 4 — error propagation
  it("propagates supabase error on failure", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockThen.mockImplementation((resolve: (v: any) => void) =>
      Promise.resolve({ data: null, error: { message: "update failed" } }).then(resolve)
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateGroup(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ groupId: "group-1", name: "X", description: null });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  // Slice 5 — trims whitespace from name
  it("trims whitespace from name before sending to supabase", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateGroup(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ groupId: "group-1", name: "  My Group  ", description: null });
    });

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "My Group" })
      )
    );
  });

  // Slice 6 — sends null for empty description
  it("sends null for description when empty string is provided", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateGroup(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ groupId: "group-1", name: "My Group", description: "" });
    });

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ description: null })
      )
    );
  });
});

// ── useRemoveGroupMember ──────────────────────────────────────────────────────

describe("useRemoveGroupMember", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockThen.mockImplementation((resolve: (v: any) => void) =>
      Promise.resolve({ data: null, error: null }).then(resolve)
    );
  });

  // Slice 1 — core wiring: hook returns idle
  it("returns idle status before mutation is called", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRemoveGroupMember(), { wrapper: Wrapper });
    expect(result.current.status).toBe("idle");
  });

  // Slice 2 — calls delete targeting correct group_id and user_id
  it("calls supabase delete with groupId and userId", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRemoveGroupMember(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ groupId: "group-1", userId: "user-2" });
    });

    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith("group_members"));
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("group_id", "group-1");
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-2");
  });

  // Slice 3 — invalidates ['group-members', groupId] on success
  it("invalidates the ['group-members', groupId] query key on success", async () => {
    const { Wrapper, qc } = createWrapper();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useRemoveGroupMember(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ groupId: "group-1", userId: "user-2" });
    });

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["group-members", "group-1"] })
      )
    );
  });

  // Slice 4 — error propagation
  it("propagates supabase error on failure", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockThen.mockImplementation((resolve: (v: any) => void) =>
      Promise.resolve({ data: null, error: { message: "delete failed" } }).then(resolve)
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRemoveGroupMember(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ groupId: "group-1", userId: "user-2" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
