/**
 * Unit tests for useUserRatings.
 *
 * Pattern: renderHook + QueryClientProvider wrapper, supabase mocked.
 */

import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useUserRatings } from "./use-ratings";

// ── Supabase mock ─────────────────────────────────────────────────────────────

type TastingRow = { bourbon_id: string; rating: number | null };
let mockTastings: TastingRow[] = [];
let mockError: { message: string } | null = null;

const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  not: jest.fn(),
};

(mockQueryBuilder.not as jest.Mock).mockImplementation(() =>
  Promise.resolve({ data: mockTastings, error: mockError })
);

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(() => mockQueryBuilder),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  }
  return { Wrapper };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockTastings = [];
  mockError = null;

  // Re-wire not() after clearAllMocks
  (mockQueryBuilder.not as jest.Mock).mockImplementation(() =>
    Promise.resolve({ data: mockTastings, error: mockError })
  );
  mockQueryBuilder.select.mockReturnThis();
  mockQueryBuilder.eq.mockReturnThis();
});

describe("useUserRatings", () => {
  // Slice 1 — core wiring: returns a Map (not an array)
  it("returns a Map", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUserRatings("user-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeInstanceOf(Map);
  });

  // Slice 2 — empty state: returns empty Map when user has no rated tastings
  it("returns empty Map when user has no rated tastings", async () => {
    mockTastings = [];
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUserRatings("user-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(new Map());
    expect(result.current.data?.size).toBe(0);
  });

  // Slice 3 — correct entries: Map contains bourbonId → rating for each rated tasting
  it("returns Map with correct bourbonId → rating entries", async () => {
    mockTastings = [
      { bourbon_id: "bourbon-a", rating: 88 },
      { bourbon_id: "bourbon-b", rating: 72.5 },
    ];
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUserRatings("user-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.get("bourbon-a")).toBe(88);
    expect(result.current.data?.get("bourbon-b")).toBe(72.5);
    expect(result.current.data?.size).toBe(2);
  });

  // Slice 4 — null exclusion: tastings with null rating are not included
  it("excludes tastings where rating is null", async () => {
    // The query uses .not("rating", "is", null) so DB filters these out,
    // but we also guard in the map-building loop.
    mockTastings = [
      { bourbon_id: "bourbon-rated", rating: 90 },
      { bourbon_id: "bourbon-unrated", rating: null },
    ];
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUserRatings("user-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.has("bourbon-rated")).toBe(true);
    expect(result.current.data?.has("bourbon-unrated")).toBe(false);
    expect(result.current.data?.size).toBe(1);
  });
});
