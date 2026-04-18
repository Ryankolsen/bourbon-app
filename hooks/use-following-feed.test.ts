/**
 * Unit tests for useFollowingFeed.
 *
 * Pattern: renderHook + QueryClientProvider wrapper, supabase mocked,
 * one slice at a time (red → green → next slice).
 */

import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useFollowingFeed } from "./use-following-feed";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeBuilder(data: unknown, error: null | object = null) {
  const builder: Record<string, jest.Mock> = {};
  for (const m of ["select", "eq", "in", "order"]) {
    builder[m] = jest.fn().mockReturnThis();
  }
  builder["then"] = jest.fn((resolve: (v: unknown) => void) =>
    Promise.resolve({ data, error }).then(resolve)
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
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  }
  return { Wrapper };
}

// ── Slice 1: core wiring ───────────────────────────────────────────────────────

describe("useFollowingFeed", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns two items with bourbon_name, display_name, and rating when user follows two people", async () => {
    const followsData = [{ following_id: "user-1" }, { following_id: "user-2" }];
    const tastingsData = [
      {
        id: "tasting-1",
        user_id: "user-1",
        bourbon_id: "bourbon-1",
        rating: 8,
        tasted_at: "2024-01-02T00:00:00Z",
        created_at: "2024-01-02T00:00:00Z",
        nose: null,
        palate: null,
        finish: null,
        overall_notes: null,
        collection_id: null,
        profiles: { display_name: "User One", username: "userone", avatar_url: null },
        bourbons: { name: "Pappy Van Winkle" },
        tasting_likes: [{ count: 2 }],
        tasting_comments: [{ count: 1 }],
      },
      {
        id: "tasting-2",
        user_id: "user-2",
        bourbon_id: "bourbon-2",
        rating: 9,
        tasted_at: "2024-01-01T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        nose: null,
        palate: null,
        finish: null,
        overall_notes: null,
        collection_id: null,
        profiles: { display_name: "User Two", username: "usertwo", avatar_url: null },
        bourbons: { name: "Buffalo Trace" },
        tasting_likes: [{ count: 0 }],
        tasting_comments: [{ count: 3 }],
      },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder(followsData))
      .mockReturnValueOnce(makeBuilder(tastingsData));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useFollowingFeed("current-user"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].bourbon_name).toBe("Pappy Van Winkle");
    expect(result.current.data![0].display_name).toBe("User One");
    expect(result.current.data![0].rating).toBe(8);
    expect(result.current.data![1].bourbon_name).toBe("Buffalo Trace");
    expect(result.current.data![1].display_name).toBe("User Two");
  });

  // ── Slice 2: ordering and counts ──────────────────────────────────────────────

  it("preserves tasted_at order (first item is newer) and includes like_count and comment_count", async () => {
    const followsData = [{ following_id: "user-1" }];
    const tastingsData = [
      {
        id: "tasting-newer",
        user_id: "user-1",
        bourbon_id: "bourbon-1",
        rating: 8,
        tasted_at: "2024-01-02T00:00:00Z",
        created_at: "2024-01-02T00:00:00Z",
        nose: null,
        palate: null,
        finish: null,
        overall_notes: null,
        collection_id: null,
        profiles: { display_name: "User One", username: "userone", avatar_url: null },
        bourbons: { name: "Pappy Van Winkle" },
        tasting_likes: [{ count: 3 }],
        tasting_comments: [{ count: 1 }],
      },
      {
        id: "tasting-older",
        user_id: "user-1",
        bourbon_id: "bourbon-2",
        rating: 7,
        tasted_at: "2024-01-01T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        nose: null,
        palate: null,
        finish: null,
        overall_notes: null,
        collection_id: null,
        profiles: { display_name: "User One", username: "userone", avatar_url: null },
        bourbons: { name: "Buffalo Trace" },
        tasting_likes: [{ count: 0 }],
        tasting_comments: [{ count: 0 }],
      },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder(followsData))
      .mockReturnValueOnce(makeBuilder(tastingsData));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useFollowingFeed("current-user"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [first, second] = result.current.data!;
    expect(first.tasted_at > second.tasted_at).toBe(true);
    expect(first.like_count).toBe(3);
    expect(first.comment_count).toBe(1);
    expect(second.like_count).toBe(0);
    expect(second.comment_count).toBe(0);
  });

  // ── Slice 3: edge cases ────────────────────────────────────────────────────────

  it("returns empty array when user follows nobody", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder([]));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useFollowingFeed("current-user"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
    // Should NOT call from('tastings') when follows list is empty
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("is disabled when userId is undefined", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useFollowingFeed(undefined), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.status).toBe("pending");
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
