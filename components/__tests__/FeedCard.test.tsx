/**
 * Unit tests for FeedCard component — BeltBadge integration.
 *
 * Pattern: render FeedCard with a minimal FeedItem, assert BeltBadge renders.
 */

import React from "react";
import { render } from "@testing-library/react-native";

// ── Mock dependencies ─────────────────────────────────────────────────────────

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/theme-provider", () => ({
  useTheme: () => ({ activeTheme: { colors: { avatarText: "#fff" } } }),
}));

jest.mock("@/hooks/use-tasting-likes", () => ({
  useIsLiked: () => ({ data: false }),
  useLikeCount: () => ({ data: 0 }),
  useLikeTasting: () => ({ mutate: jest.fn(), isPending: false }),
  useUnlikeTasting: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/use-tasting-comments", () => ({
  useCommentCount: () => ({ data: 0 }),
}));

jest.mock("@/components/CommentSheet", () => ({
  CommentSheet: () => null,
}));

jest.mock("@/components/ShareToGroupSheet", () => ({
  ShareToGroupSheet: () => null,
}));

import { FeedCard } from "@/components/FeedCard";
import type { FeedItem } from "@/hooks/use-following-feed";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFeedItem(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    id: "tasting-1",
    user_id: "user-1",
    bourbon_id: "bourbon-1",
    rating: 8,
    tasted_at: "2024-01-01T00:00:00Z",
    created_at: "2024-01-01T00:00:00Z",
    nose: null,
    palate: null,
    finish: null,
    overall_notes: null,
    collection_id: null,
    bourbon_name: "Buffalo Trace",
    display_name: "Test User",
    username: "testuser",
    avatar_url: null,
    current_belt: 1,
    like_count: 0,
    comment_count: 0,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("FeedCard — BeltBadge", () => {
  // 1 — core wiring: BeltBadge renders for level 5 (Single Barrel)
  it("renders BeltBadge with 'Single Barrel belt' label when current_belt is 5", () => {
    const item = makeFeedItem({ current_belt: 5 });
    const { getByLabelText } = render(
      <FeedCard item={item} currentUserId="current-user" />
    );
    expect(getByLabelText("Single Barrel belt")).toBeTruthy();
  });

  // 2 — content details: level 10 = Pappy
  it("renders BeltBadge with 'Pappy belt' label when current_belt is 10", () => {
    const item = makeFeedItem({ current_belt: 10 });
    const { getByLabelText } = render(
      <FeedCard item={item} currentUserId="current-user" />
    );
    expect(getByLabelText("Pappy belt")).toBeTruthy();
  });

  // 3 — edge case: null current_belt falls back to level 1 (White Dog)
  it("renders level-1 BeltBadge without throwing when current_belt is null", () => {
    const item = makeFeedItem({ current_belt: null });
    const { getByLabelText } = render(
      <FeedCard item={item} currentUserId="current-user" />
    );
    expect(getByLabelText("White Dog belt")).toBeTruthy();
  });
});
