/**
 * Unit tests for StarRating component.
 * TDD tracer-bullet: one test → red → green before next.
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";
import { StarRating } from "./StarRating";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("StarRating", () => {
  // Slice 1 — core wiring: renders exactly 5 star elements
  it("renders 5 star elements given any value", () => {
    render(<StarRating value={3} variant="personal" />);
    // Stars are identified by testID pattern star-{index}-{state}
    const filled = screen.queryAllByTestId(/^star-\d+-filled$/);
    const half = screen.queryAllByTestId(/^star-\d+-half$/);
    const empty = screen.queryAllByTestId(/^star-\d+-empty$/);
    expect(filled.length + half.length + empty.length).toBe(5);
  });

  // Slice 2 — null value: all 5 stars empty for both variants
  it("renders all 5 stars empty when value is null (personal)", () => {
    render(<StarRating value={null} variant="personal" />);
    expect(screen.queryAllByTestId(/^star-\d+-empty$/).length).toBe(5);
    expect(screen.queryAllByTestId(/^star-\d+-filled$/).length).toBe(0);
    expect(screen.queryAllByTestId(/^star-\d+-half$/).length).toBe(0);
  });

  it("renders all 5 stars empty when value is null (community)", () => {
    render(<StarRating value={null} variant="community" />);
    expect(screen.queryAllByTestId(/^star-\d+-empty$/).length).toBe(5);
    expect(screen.queryAllByTestId(/^star-\d+-filled$/).length).toBe(0);
  });

  // Slice 3 — whole-number rating: correct filled vs. empty split
  it("renders 3 filled and 2 empty stars for value=3", () => {
    render(<StarRating value={3} variant="personal" />);
    expect(screen.queryAllByTestId(/^star-\d+-filled$/).length).toBe(3);
    expect(screen.queryAllByTestId(/^star-\d+-empty$/).length).toBe(2);
    expect(screen.queryAllByTestId(/^star-\d+-half$/).length).toBe(0);
  });

  // Slice 4 — half-star: 3.5 → 3 filled + 1 half + 1 empty
  it("renders 3 filled, 1 half, 1 empty star for value=3.5", () => {
    render(<StarRating value={3.5} variant="personal" />);
    expect(screen.queryAllByTestId(/^star-\d+-filled$/).length).toBe(3);
    expect(screen.queryAllByTestId(/^star-\d+-half$/).length).toBe(1);
    expect(screen.queryAllByTestId(/^star-\d+-empty$/).length).toBe(1);
  });

  // Slice 5 — boundary values
  it("renders all 5 stars filled for value=5", () => {
    render(<StarRating value={5} variant="personal" />);
    expect(screen.queryAllByTestId(/^star-\d+-filled$/).length).toBe(5);
    expect(screen.queryAllByTestId(/^star-\d+-empty$/).length).toBe(0);
  });

  it("renders all 5 stars empty for value=0", () => {
    render(<StarRating value={0} variant="personal" />);
    expect(screen.queryAllByTestId(/^star-\d+-empty$/).length).toBe(5);
    expect(screen.queryAllByTestId(/^star-\d+-filled$/).length).toBe(0);
  });

  // Slice 6 — variant colors: personal and community apply different classes
  it("personal variant applies amber color class to filled stars", () => {
    const { getByTestId } = render(<StarRating value={1} variant="personal" />);
    const filledStar = getByTestId("star-0-filled");
    expect(filledStar.props.className).toMatch(/amber/);
  });

  it("community variant applies brand color class to filled stars", () => {
    const { getByTestId } = render(<StarRating value={1} variant="community" />);
    const filledStar = getByTestId("star-0-filled");
    expect(filledStar.props.className).toMatch(/brand/);
  });
});
