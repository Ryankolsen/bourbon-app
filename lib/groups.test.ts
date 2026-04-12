import { isValidInviteTransition, buildRecommendationPayload } from './groups';

// ---------------------------------------------------------------------------
// isValidInviteTransition — slice 1: core wiring (pending → accepted is valid)
// ---------------------------------------------------------------------------

describe('isValidInviteTransition', () => {
  it('returns true for pending → accepted', () => {
    expect(isValidInviteTransition('pending', 'accepted')).toBe(true);
  });

  // slice 2: other valid transition
  it('returns true for pending → declined', () => {
    expect(isValidInviteTransition('pending', 'declined')).toBe(true);
  });

  // slice 3: invalid transitions
  it('returns false for accepted → declined', () => {
    expect(isValidInviteTransition('accepted', 'declined')).toBe(false);
  });

  it('returns false for declined → accepted', () => {
    expect(isValidInviteTransition('declined', 'accepted')).toBe(false);
  });

  it('returns false for same-state transition (pending → pending)', () => {
    expect(isValidInviteTransition('pending', 'pending')).toBe(false);
  });

  it('returns false for accepted → accepted', () => {
    expect(isValidInviteTransition('accepted', 'accepted')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildRecommendationPayload — slice 1: core wiring (correct IDs in payload)
// ---------------------------------------------------------------------------

describe('buildRecommendationPayload', () => {
  const groupId = 'group-aaa';
  const bourbonId = 'bourbon-bbb';
  const userId = 'user-ccc';

  it('returns group_id, bourbon_id, and recommended_by', () => {
    const payload = buildRecommendationPayload(groupId, bourbonId, userId);
    expect(payload.group_id).toBe(groupId);
    expect(payload.bourbon_id).toBe(bourbonId);
    expect(payload.recommended_by).toBe(userId);
  });

  // slice 2: note handling
  it('includes the note when provided', () => {
    const payload = buildRecommendationPayload(groupId, bourbonId, userId, 'Try this one!');
    expect(payload.note).toBe('Try this one!');
  });

  it('sets note to null when omitted', () => {
    const payload = buildRecommendationPayload(groupId, bourbonId, userId);
    expect(payload.note).toBeNull();
  });
});
