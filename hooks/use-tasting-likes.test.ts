/**
 * Unit tests for useTastingLikes hooks.
 *
 * Pattern: renderHook + QueryClientProvider wrapper, supabase mocked,
 * one slice at a time (red → green → next slice).
 */

import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useIsLiked, useLikeCount, useLikeTasting, useUnlikeTasting } from "./use-tasting-likes";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeBuilder(data: unknown, error: null | object = null) {
  const builder: Record<string, jest.Mock> = {};
  for (const m of ["select", "eq", "maybeSingle", "insert", "delete"]) {
    builder[m] = jest.fn().mockReturnThis();
  }
  builder["then"] = jest.fn((resolve: (v: unknown) => void) =>
    Promise.resolve({ data, error, count: typeof data === "number" ? data : null }).then(resolve)
  );
  return builder;
}

const mockFrom = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

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

// ── Slice 3a: useIsLiked returns false when no rows ───────────────────────────

describe("useIsLiked", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns false when the mock returns no row (null)", async () => {
    const builder = makeBuilder(null);
    mockFrom.mockReturnValue(builder);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useIsLiked("user-1", "tasting-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(false);
  });

  it("is disabled when userId is undefined", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useIsLiked(undefined, "tasting-1"), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.status).toBe("pending");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("is disabled when tastingId is undefined", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useIsLiked("user-1", undefined), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.status).toBe("pending");
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ── Slice 3b: useLikeCount returns 0 when count is null ──────────────────────

describe("useLikeCount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 0 when count is null", async () => {
    const builder: Record<string, jest.Mock> = {};
    for (const m of ["select", "eq"]) {
      builder[m] = jest.fn().mockReturnThis();
    }
    builder["then"] = jest.fn((resolve: (v: unknown) => void) =>
      Promise.resolve({ data: null, error: null, count: null }).then(resolve)
    );
    mockFrom.mockReturnValue(builder);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLikeCount("tasting-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(0);
  });
});

// ── Slice 3c: useLikeTasting / useUnlikeTasting mutation wiring ───────────────

describe("useLikeTasting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls supabase insert and resolves without error", async () => {
    const builder: Record<string, jest.Mock> = {};
    builder["insert"] = jest.fn().mockReturnThis();
    builder["then"] = jest.fn((resolve: (v: unknown) => void) =>
      Promise.resolve({ data: null, error: null }).then(resolve)
    );
    mockFrom.mockReturnValue(builder);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLikeTasting(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ userId: "user-1", tastingId: "tasting-1" });
    });

    expect(mockFrom).toHaveBeenCalledWith("tasting_likes");
    expect(builder.insert).toHaveBeenCalledWith({ user_id: "user-1", tasting_id: "tasting-1" });
  });
});

describe("useUnlikeTasting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls supabase delete with correct match and resolves without error", async () => {
    const builder: Record<string, jest.Mock> = {};
    builder["delete"] = jest.fn().mockReturnThis();
    builder["eq"] = jest.fn().mockReturnThis();
    builder["then"] = jest.fn((resolve: (v: unknown) => void) =>
      Promise.resolve({ data: null, error: null }).then(resolve)
    );
    mockFrom.mockReturnValue(builder);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUnlikeTasting(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ userId: "user-1", tastingId: "tasting-1" });
    });

    expect(mockFrom).toHaveBeenCalledWith("tasting_likes");
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
  });
});
