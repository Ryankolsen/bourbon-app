/**
 * Unit tests for ActiveFilterChips component.
 * Uses TDD tracer-bullet approach: one test → red → green before next test.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { DEFAULT_BOURBON_FILTERS, BourbonFilterState } from "@/lib/bourbons";

// ── Helpers ──────────────────────────────────────────────────────────────────

const noop = jest.fn();

function makeFilters(overrides: Partial<BourbonFilterState> = {}): BourbonFilterState {
  return { ...DEFAULT_BOURBON_FILTERS, ...overrides };
}

function renderChips(filters: BourbonFilterState, overrides: Record<string, jest.Mock> = {}) {
  return render(
    <ActiveFilterChips
      filters={filters}
      onClearType={overrides.onClearType ?? noop}
      onClearProof={overrides.onClearProof ?? noop}
      onClearAge={overrides.onClearAge ?? noop}
      onClearDistillery={overrides.onClearDistillery ?? noop}
      onClearSort={overrides.onClearSort ?? noop}
    />
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ActiveFilterChips", () => {
  // Slice 1 — core wiring: renders nothing when no filters are active
  it("renders nothing when all filters are at their defaults", () => {
    renderChips(DEFAULT_BOURBON_FILTERS);
    expect(screen.queryByTestId("active-filter-chips")).toBeNull();
  });

  // Slice 2 — type chip label
  it("renders one chip per active type", () => {
    renderChips(makeFilters({ types: ["Wheated"] }));
    expect(screen.getByText("Wheated")).toBeTruthy();
  });

  // Slice 3 — dismiss type chip
  it("calls onClearType with the type value when × is tapped", () => {
    const onClearType = jest.fn();
    renderChips(makeFilters({ types: ["Wheated"] }), { onClearType });
    fireEvent.press(screen.getByTestId("clear-type-Wheated"));
    expect(onClearType).toHaveBeenCalledWith("Wheated");
  });

  // Slice 4 — proof chip
  it("renders a proof range chip when proof range is non-default", () => {
    renderChips(makeFilters({ proofMin: 90, proofMax: 110 }));
    expect(screen.getByText("90–110 proof")).toBeTruthy();
  });

  // Slice 5 — distillery chip
  it("renders a distillery chip when distillery is set", () => {
    renderChips(makeFilters({ distillery: "Buffalo Trace" }));
    expect(screen.getByText("Buffalo Trace")).toBeTruthy();
  });
});
