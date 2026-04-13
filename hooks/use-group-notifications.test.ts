/**
 * Unit tests for useGroupNotifications and useDismissGroupNotification.
 *
 * Pattern: renderHook + QueryClientProvider wrapper, supabase mocked,
 * one test per observable behavior.
 */

import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useGroupNotifications,
  useDismissGroupNotification,
} from "./use-group-notifications";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockEq = jest.fn().mockReturnThis();
const mockIs = jest.fn().mockReturnThis();
const mockOrder = jest.fn().mockReturnThis();
const mockSelect = jest.fn().mockReturnThis();
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
  upsert: jest.fn().mockReturnThis(),
  eq: mockEq,
  neq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  is: mockIs,
  ilike: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  order: mockOrder,
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

// ── useGroupNotifications ─────────────────────────────────────────────────────

describe("useGroupNotifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockThen.mockImplementation((resolve: (v: any) => void) =>
      Promise.resolve({ data: [], error: null }).then(resolve)
    );
  });

  // Slice 1 — does not fire when ownerId is undefined (query disabled)
  it("does not query supabase when ownerId is undefined", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useGroupNotifications(undefined),
      { wrapper: Wrapper }
    );
    // With enabled:false the query stays pending and never fires
    expect(result.current.isPending).toBe(true);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // Slice 2 — returns parsed notification rows on success
  it("returns notification rows with joiner profile and group on success", async () => {
    const mockRows = [
      {
        id: "notif-1",
        owner_id: "owner-1",
        joiner_id: "joiner-1",
        group_id: "group-1",
        created_at: "2024-01-20T10:00:00Z",
        dismissed_at: null,
        profiles: { display_name: "Alice", username: "alice" },
        groups: { id: "group-1", name: "Friday Pours" },
      },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockThen.mockImplementation((resolve: (v: any) => void) =>
      Promise.resolve({ data: mockRows, error: null }).then(resolve)
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useGroupNotifications("owner-1"),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockRows);
    expect(mockFrom).toHaveBeenCalledWith("group_notifications");
  });

  // Slice 3 — queries only non-dismissed rows (dismissed_at IS NULL)
  it("filters out dismissed rows via is('dismissed_at', null)", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useGroupNotifications("owner-1"),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockIs).toHaveBeenCalledWith("dismissed_at", null);
  });

  // Slice 4 — uses ownerId as part of the query key (re-fetches on change)
  it("uses ownerId in the query key so different owners get separate caches", async () => {
    const { Wrapper, qc } = createWrapper();
    const { result, rerender } = renderHook(
      ({ ownerId }: { ownerId: string }) => useGroupNotifications(ownerId),
      { wrapper: Wrapper, initialProps: { ownerId: "owner-1" } }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const firstCallCount = mockFrom.mock.calls.length;

    // Simulate a different ownerId
    rerender({ ownerId: "owner-2" });
    await waitFor(() =>
      expect(mockFrom.mock.calls.length).toBeGreaterThan(firstCallCount)
    );

    // Both query keys should exist in the cache
    expect(qc.getQueryData(["group-notifications", "owner-1"])).toBeDefined();
  });
});

// ── useDismissGroupNotification ───────────────────────────────────────────────

describe("useDismissGroupNotification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockThen.mockImplementation((resolve: (v: any) => void) =>
      Promise.resolve({ data: null, error: null }).then(resolve)
    );
  });

  // Slice 1 — returns idle before mutation fires
  it("returns idle status before mutation is called", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useDismissGroupNotification("owner-1"),
      { wrapper: Wrapper }
    );
    expect(result.current.status).toBe("idle");
  });

  // Slice 2 — calls supabase update with dismissed_at on the correct row
  it("updates dismissed_at on the target notification row", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useDismissGroupNotification("owner-1"),
      { wrapper: Wrapper }
    );

    await act(async () => {
      result.current.mutate({ notificationId: "notif-1" });
    });

    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith("group_notifications"));
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ dismissed_at: expect.any(String) })
    );
    expect(mockEq).toHaveBeenCalledWith("id", "notif-1");
  });

  // Slice 3 — invalidates ['group-notifications', ownerId] on success
  it("invalidates ['group-notifications', ownerId] on success", async () => {
    const { Wrapper, qc } = createWrapper();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(
      () => useDismissGroupNotification("owner-1"),
      { wrapper: Wrapper }
    );

    await act(async () => {
      result.current.mutate({ notificationId: "notif-1" });
    });

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["group-notifications", "owner-1"] })
      )
    );
  });

  // Slice 4 — propagates supabase error on failure
  it("propagates supabase error on failure", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockThen.mockImplementation((resolve: (v: any) => void) =>
      Promise.resolve({ data: null, error: { message: "update failed" } }).then(resolve)
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useDismissGroupNotification("owner-1"),
      { wrapper: Wrapper }
    );

    await act(async () => {
      result.current.mutate({ notificationId: "notif-1" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  // Slice 5 — optimistic update removes the row immediately
  it("applies optimistic update removing the dismissed notification from the list", async () => {
    const existingNotifications = [
      {
        id: "notif-1",
        owner_id: "owner-1",
        joiner_id: "joiner-1",
        group_id: "group-1",
        created_at: "2024-01-20T10:00:00Z",
        dismissed_at: null,
        profiles: { display_name: "Alice", username: "alice" },
        groups: { id: "group-1", name: "Friday Pours" },
      },
      {
        id: "notif-2",
        owner_id: "owner-1",
        joiner_id: "joiner-2",
        group_id: "group-2",
        created_at: "2024-01-20T11:00:00Z",
        dismissed_at: null,
        profiles: { display_name: "Bob", username: "bob" },
        groups: { id: "group-2", name: "Saturday Sips" },
      },
    ];

    const { Wrapper, qc } = createWrapper();

    // Pre-populate cache
    qc.setQueryData(["group-notifications", "owner-1"], existingNotifications);

    const { result } = renderHook(
      () => useDismissGroupNotification("owner-1"),
      { wrapper: Wrapper }
    );

    await act(async () => {
      result.current.mutate({ notificationId: "notif-1" });
    });

    // Optimistic: notif-1 should be removed immediately from the cache
    const cached = qc.getQueryData<typeof existingNotifications>(
      ["group-notifications", "owner-1"]
    );
    expect(cached?.find((n) => n.id === "notif-1")).toBeUndefined();
    expect(cached?.find((n) => n.id === "notif-2")).toBeDefined();
  });
});
