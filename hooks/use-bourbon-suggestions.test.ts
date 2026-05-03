/**
 * Unit tests for useSubmitBourbonSuggestion, useBourbonSuggestions,
 * useApproveSuggestion, and useRejectSuggestion.
 *
 * Pattern: renderHook + QueryClientProvider wrapper, supabase and expo-crypto
 * mocked, one test per observable behavior.
 */

import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useSubmitBourbonSuggestion,
  useBourbonSuggestions,
  useApproveSuggestion,
  useRejectSuggestion,
} from "./use-bourbon-suggestions";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const FIXED_UUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => FIXED_UUID),
}));

// Shared chainable query builder spies. All chain methods return `builder`
// so that arbitrary call chains resolve via `builder.then`.
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockFrom = jest.fn();
const mockRpc = jest.fn();

function makeQueryBuilder(resolveValue: { data: unknown; error: unknown }) {
  const builder = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    eq: mockEq,
    order: mockOrder,
    then: jest.fn((resolve: (v: typeof resolveValue) => void) =>
      Promise.resolve(resolveValue).then(resolve)
    ),
  };

  // Every chain method returns builder so arbitrary chains resolve via .then
  mockSelect.mockReturnValue(builder);
  mockInsert.mockReturnValue(builder);
  mockUpdate.mockReturnValue(builder);
  mockEq.mockReturnValue(builder);
  mockOrder.mockReturnValue(builder);

  return builder;
}

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (...args: unknown[]) => mockRpc(...args),
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

// ── useSubmitBourbonSuggestion ────────────────────────────────────────────────

describe("useSubmitBourbonSuggestion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(makeQueryBuilder({ data: null, error: null }));
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  // Slice 1 — core wiring: returns idle before mutation fires
  it("returns idle status before mutation is called", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSubmitBourbonSuggestion(), {
      wrapper: Wrapper,
    });
    expect(result.current.status).toBe("idle");
  });

  // Slice 1 — core wiring: one suggestion → insert called once on correct table
  it("calls supabase.from('bourbon_edit_suggestions').insert exactly once for one suggestion", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSubmitBourbonSuggestion(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({
        bourbonId: "bourbon-1",
        submittedBy: "user-1",
        suggestions: [{ fieldName: "proof", oldValue: null, newValue: "90" }],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith("bourbon_edit_suggestions");
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  // Slice 2 — content details: inserted row has correct field values
  it("inserts a row with correct bourbon_id, submitted_by, field_name, old_value, new_value", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSubmitBourbonSuggestion(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({
        bourbonId: "bourbon-42",
        submittedBy: "user-99",
        suggestions: [
          { fieldName: "distillery", oldValue: null, newValue: "Buffalo Trace" },
        ],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        bourbon_id: "bourbon-42",
        submitted_by: "user-99",
        field_name: "distillery",
        old_value: null,
        new_value: "Buffalo Trace",
      })
    );
  });

  // Slice 2 — content details: submission_id is a non-empty string
  it("sets submission_id to a non-empty string on the inserted row", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSubmitBourbonSuggestion(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({
        bourbonId: "bourbon-1",
        submittedBy: "user-1",
        suggestions: [{ fieldName: "proof", oldValue: null, newValue: "90" }],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const insertedRow = mockInsert.mock.calls[0][0];
    expect(typeof insertedRow.submission_id).toBe("string");
    expect(insertedRow.submission_id.length).toBeGreaterThan(0);
  });

  // Slice 2 — content details: two suggestions → two insert calls, same submission_id
  it("makes two insert calls sharing the same submission_id when given two suggestions", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSubmitBourbonSuggestion(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({
        bourbonId: "bourbon-1",
        submittedBy: "user-1",
        suggestions: [
          { fieldName: "proof", oldValue: null, newValue: "90" },
          { fieldName: "age_statement", oldValue: null, newValue: "12" },
        ],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockInsert).toHaveBeenCalledTimes(2);

    const firstRow = mockInsert.mock.calls[0][0];
    const secondRow = mockInsert.mock.calls[1][0];
    expect(firstRow.submission_id).toBe(FIXED_UUID);
    expect(secondRow.submission_id).toBe(FIXED_UUID);
    expect(firstRow.submission_id).toBe(secondRow.submission_id);
  });

  // Slice 3 — edge case: Supabase error → mutation status is 'error'
  it("sets mutation status to 'error' when Supabase returns an error", async () => {
    const supabaseError = { message: "RLS violation", code: "42501" };
    mockFrom.mockReturnValue(
      makeQueryBuilder({ data: null, error: supabaseError })
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSubmitBourbonSuggestion(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({
        bourbonId: "bourbon-1",
        submittedBy: "user-1",
        suggestions: [{ fieldName: "proof", oldValue: null, newValue: "90" }],
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(supabaseError);
  });

  // Slice 3 — edge case: empty suggestions array → no insert calls
  it("makes no insert calls when suggestions array is empty", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSubmitBourbonSuggestion(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({
        bourbonId: "bourbon-1",
        submittedBy: "user-1",
        suggestions: [],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockInsert).not.toHaveBeenCalled();
  });
});

// ── useBourbonSuggestions ─────────────────────────────────────────────────────

describe("useBourbonSuggestions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(makeQueryBuilder({ data: [], error: null }));
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  // Slice 1 — core wiring: calls the correct table
  it("calls supabase.from('bourbon_edit_suggestions')", async () => {
    const { Wrapper } = createWrapper();
    renderHook(() => useBourbonSuggestions(), { wrapper: Wrapper });

    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith("bourbon_edit_suggestions"));
  });

  // Slice 2 — content details: filters by status = 'pending'
  it("filters by status = 'pending'", async () => {
    const { Wrapper } = createWrapper();
    renderHook(() => useBourbonSuggestions(), { wrapper: Wrapper });

    await waitFor(() =>
      expect(mockEq).toHaveBeenCalledWith("status", "pending")
    );
  });

  // Slice 2 — content details: orders by created_at ascending
  it("orders by created_at ascending", async () => {
    const { Wrapper } = createWrapper();
    renderHook(() => useBourbonSuggestions(), { wrapper: Wrapper });

    await waitFor(() =>
      expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: true })
    );
  });

  // Slice 2 — content details: returns data from query
  it("returns data from query", async () => {
    const mockData = [
      {
        id: "sug-1",
        bourbon_id: "bou-1",
        field_name: "proof",
        old_value: null,
        new_value: "90",
        status: "pending",
        created_at: "2026-01-01T00:00:00Z",
        bourbons: { name: "Eagle Rare" },
        profiles: { display_name: "Alice" },
      },
    ];
    mockFrom.mockReturnValue(makeQueryBuilder({ data: mockData, error: null }));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBourbonSuggestions(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });

  // Slice 3 — edge case: empty array when no pending suggestions
  it("returns an empty array when no pending suggestions exist", async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: [], error: null }));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBourbonSuggestions(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

// ── useApproveSuggestion ──────────────────────────────────────────────────────

describe("useApproveSuggestion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(makeQueryBuilder({ data: null, error: null }));
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  // Slice 1 — core wiring: calls rpc with correct name and argument
  it("calls supabase.rpc('apply_bourbon_suggestion', { p_suggestion_id }) with correct arg", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApproveSuggestion(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({ suggestionId: "sug-abc" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRpc).toHaveBeenCalledWith("apply_bourbon_suggestion", {
      p_suggestion_id: "sug-abc",
    });
  });

  // Slice 3 — edge case: Supabase error surfaces to caller
  it("sets mutation status to 'error' when rpc returns an error", async () => {
    const rpcError = { message: "Not found", code: "PGRST116" };
    mockRpc.mockResolvedValue({ data: null, error: rpcError });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApproveSuggestion(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({ suggestionId: "sug-bad" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(rpcError);
  });
});

// ── useRejectSuggestion ───────────────────────────────────────────────────────

describe("useRejectSuggestion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(makeQueryBuilder({ data: null, error: null }));
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  // Slice 1 — core wiring: calls update on correct table
  it("calls supabase.from('bourbon_edit_suggestions').update(...).eq('id', suggestionId)", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRejectSuggestion(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({
        suggestionId: "sug-xyz",
        reviewedBy: "admin-1",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith("bourbon_edit_suggestions");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "rejected", reviewed_by: "admin-1" })
    );
    expect(mockEq).toHaveBeenCalledWith("id", "sug-xyz");
  });

  // Slice 2 — content details: review_note included when provided
  it("includes review_note in the update payload when provided", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRejectSuggestion(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({
        suggestionId: "sug-xyz",
        reviewedBy: "admin-1",
        reviewNote: "Incorrect value",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ review_note: "Incorrect value" })
    );
  });

  // Slice 3 — edge case: review_note omitted from payload when not provided
  it("omits review_note from the update payload when not provided", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRejectSuggestion(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({
        suggestionId: "sug-xyz",
        reviewedBy: "admin-1",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload).not.toHaveProperty("review_note");
  });

  // Slice 3 — edge case: Supabase error surfaces to caller
  it("sets mutation status to 'error' when Supabase returns an error", async () => {
    const supabaseError = { message: "Forbidden", code: "42501" };
    mockFrom.mockReturnValue(
      makeQueryBuilder({ data: null, error: supabaseError })
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRejectSuggestion(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({
        suggestionId: "sug-xyz",
        reviewedBy: "admin-1",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(supabaseError);
  });
});
