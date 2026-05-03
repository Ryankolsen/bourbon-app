/**
 * Unit tests for useSubmitBourbonSuggestion.
 *
 * Pattern: renderHook + QueryClientProvider wrapper, supabase and expo-crypto
 * mocked, one test per observable behavior.
 */

import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useSubmitBourbonSuggestion } from "./use-bourbon-suggestions";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const FIXED_UUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => FIXED_UUID),
}));

const mockInsert = jest.fn();
const mockFrom = jest.fn();

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

function makeQueryBuilder(resolveValue: { data: unknown; error: unknown }) {
  return {
    insert: mockInsert.mockReturnValue(Promise.resolve(resolveValue)),
  };
}

// ── useSubmitBourbonSuggestion ────────────────────────────────────────────────

describe("useSubmitBourbonSuggestion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(makeQueryBuilder({ data: null, error: null }));
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
    mockFrom.mockReturnValue(makeQueryBuilder({ data: null, error: null }));
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
