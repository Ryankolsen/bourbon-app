/**
 * Unit tests for CommentSheet component — BeltBadge integration.
 *
 * Pattern: render CommentSheet with mocked useTastingComments data,
 * assert BeltBadge renders per comment row.
 */

import React from "react";
import { render } from "@testing-library/react-native";

// ── Mock dependencies ─────────────────────────────────────────────────────────

jest.mock("@/lib/theme-provider", () => ({
  useTheme: () => ({ activeTheme: { colors: { avatarText: "#fff" } } }),
}));

const mockServerComments: unknown[] = [];

jest.mock("@/hooks/use-tasting-comments", () => ({
  useTastingComments: () => ({ data: mockServerComments }),
  useCommentCount: () => ({ data: 0 }),
  usePostComment: () => ({ mutate: jest.fn(), isPending: false }),
  useTastingCommentsRealtime: () => undefined,
}));

jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");
  return {
    SafeAreaView: View,
  };
});

import { CommentSheet } from "@/components/CommentSheet";
import type { TastingComment } from "@/hooks/use-tasting-comments";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeComment(overrides: Partial<TastingComment> = {}): TastingComment {
  return {
    id: `comment-${Math.random()}`,
    tasting_id: "tasting-1",
    user_id: "user-1",
    body: "Great bourbon!",
    created_at: "2024-01-01T00:00:00Z",
    display_name: "Test User",
    username: "testuser",
    avatar_url: null,
    current_belt: 1,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("CommentSheet — BeltBadge", () => {
  beforeEach(() => {
    mockServerComments.length = 0;
  });

  // 1 — core wiring: comment with current_belt 3 renders 'New Oak belt'
  it("renders BeltBadge with 'New Oak belt' label when comment current_belt is 3", () => {
    mockServerComments.push(makeComment({ current_belt: 3 }));
    const { getByLabelText } = render(
      <CommentSheet
        tastingId="tasting-1"
        currentUserId="current-user"
        visible={true}
        onClose={jest.fn()}
      />
    );
    expect(getByLabelText("New Oak belt")).toBeTruthy();
  });

  // 2 — content details: two comments with different belt levels
  it("renders two BeltBadges with correct labels for two comments with different belts", () => {
    mockServerComments.push(makeComment({ id: "c1", current_belt: 2 }));
    mockServerComments.push(makeComment({ id: "c2", current_belt: 7 }));
    const { getByLabelText } = render(
      <CommentSheet
        tastingId="tasting-1"
        currentUserId="current-user"
        visible={true}
        onClose={jest.fn()}
      />
    );
    // Belt 2 = Corn Whiskey, Belt 7 = Barrel Proof
    expect(getByLabelText("Corn Whiskey belt")).toBeTruthy();
    expect(getByLabelText("Barrel Proof belt")).toBeTruthy();
  });

  // 3a — edge case: null current_belt falls back to level 1 badge without error
  it("renders level-1 BeltBadge without throwing when current_belt is null", () => {
    mockServerComments.push(makeComment({ current_belt: null }));
    const { getByLabelText } = render(
      <CommentSheet
        tastingId="tasting-1"
        currentUserId="current-user"
        visible={true}
        onClose={jest.fn()}
      />
    );
    expect(getByLabelText("White Dog belt")).toBeTruthy();
  });

  // 3b — edge case: empty comment list renders no badges
  it("renders no BeltBadge when comment list is empty", () => {
    // mockServerComments is empty (cleared in beforeEach)
    const { queryByLabelText } = render(
      <CommentSheet
        tastingId="tasting-1"
        currentUserId="current-user"
        visible={true}
        onClose={jest.fn()}
      />
    );
    expect(queryByLabelText(/belt/)).toBeNull();
  });
});
