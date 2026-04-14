/**
 * Unit tests for useFriendTastedBourbonIds.
 *
 * Pattern: renderHook + QueryClientProvider wrapper, supabase mocked.
 */

import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useFriendTastedBourbonIds } from "./use-friend-tasted-bourbon-ids";

// ── Supabase mock ─────────────────────────────────────────────────────────────

// We need per-table control so each from() call can return different data.
// The mock tracks which table was last queried and resolves accordingly.

let mockFollows: { following_id: string }[] = [];
let mockMyGroups: { group_id: string }[] = [];
let mockGroupMembers: { user_id: string }[] = [];
let mockTastings: { bourbon_id: string }[] = [];

// Track which table is being queried so select() can route to the right data.
let currentTable = "";

const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
};

// Override then() to resolve based on currentTable + mock data.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(mockQueryBuilder as any).then = (resolve: (v: any) => void) => {
  let data: unknown[] = [];
  if (currentTable === "user_follows") data = mockFollows;
  else if (currentTable === "group_members_my") data = mockMyGroups;
  else if (currentTable === "group_members_others") data = mockGroupMembers;
  else if (currentTable === "tastings") data = mockTastings;

  // Rotate group_members through two phases
  if (currentTable === "group_members_my") currentTable = "group_members_others";

  return Promise.resolve({ data, error: null }).then(resolve);
};

// We need a stateful from() because group_members is called twice.
let groupMembersCallCount = 0;

const mockFrom = jest.fn((table: string) => {
  if (table === "user_follows") {
    currentTable = "user_follows";
  } else if (table === "group_members") {
    groupMembersCallCount += 1;
    currentTable =
      groupMembersCallCount % 2 === 1 ? "group_members_my" : "group_members_others";
  } else if (table === "tastings") {
    currentTable = "tastings";
  }
  return mockQueryBuilder;
});

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
    },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  }
  return { Wrapper };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockFollows = [];
  mockMyGroups = [];
  mockGroupMembers = [];
  mockTastings = [];
  currentTable = "";
  groupMembersCallCount = 0;
});

describe("useFriendTastedBourbonIds", () => {
  // Slice 1 — core wiring: empty set when no follows and no groups
  it("returns an empty Set when user follows nobody and is in no groups", async () => {
    // mockFollows, mockMyGroups, mockTastings are all []
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useFriendTastedBourbonIds("user-1"),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(new Set());
  });

  // Slice 2 — followed user tastings: bourbon tasted by a followed user appears in Set
  it("includes bourbon_id tasted by a followed user", async () => {
    mockFollows = [{ following_id: "friend-1" }];
    mockMyGroups = [];
    mockTastings = [{ bourbon_id: "bourbon-abc" }];

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useFriendTastedBourbonIds("user-1"),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(new Set(["bourbon-abc"]));
  });

  // Slice 3 — group tastings: bourbon tasted in a group the user belongs to
  it("includes bourbon_id tasted by a group member", async () => {
    mockFollows = [];
    mockMyGroups = [{ group_id: "group-1" }];
    mockGroupMembers = [{ user_id: "member-1" }];
    mockTastings = [{ bourbon_id: "bourbon-xyz" }];

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useFriendTastedBourbonIds("user-1"),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(new Set(["bourbon-xyz"]));
  });

  // Slice 4 — union: bourbon tasted by both a friend and a group member appears once
  it("deduplicates bourbon_ids tasted by both a followed user and a group member", async () => {
    mockFollows = [{ following_id: "friend-1" }];
    mockMyGroups = [{ group_id: "group-1" }];
    mockGroupMembers = [{ user_id: "member-1" }];
    // Both friend-1 and member-1 tasted the same bourbon
    mockTastings = [
      { bourbon_id: "bourbon-dup" },
      { bourbon_id: "bourbon-dup" },
    ];

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useFriendTastedBourbonIds("user-1"),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Set deduplicates automatically
    expect(result.current.data).toEqual(new Set(["bourbon-dup"]));
    expect(result.current.data?.size).toBe(1);
  });

  // Slice 5 — not followed: bourbon tasted only by a non-followed user does not appear
  it("does not include bourbon_id when tasted only by a non-followed user", async () => {
    // User follows nobody and is in no groups, so no tastings are queried at all
    mockFollows = [];
    mockMyGroups = [];
    mockTastings = [{ bourbon_id: "bourbon-stranger" }];

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useFriendTastedBourbonIds("user-1"),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(new Set());
    expect(result.current.data?.has("bourbon-stranger")).toBe(false);
  });
});
