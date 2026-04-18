import { buildShareToGroupPayload } from './group-feed';

// ---------------------------------------------------------------------------
// Slice 1: core wiring
// ---------------------------------------------------------------------------

describe('buildShareToGroupPayload', () => {
  it('returns the correct tasting_id, group_id, and shared_by_user_id', () => {
    const payload = buildShareToGroupPayload('tasting-1', 'group-1', 'user-1');
    expect(payload.tasting_id).toBe('tasting-1');
    expect(payload.group_id).toBe('group-1');
    expect(payload.shared_by_user_id).toBe('user-1');
  });

  // ---------------------------------------------------------------------------
  // Slice 2: no extra keys
  // ---------------------------------------------------------------------------

  it('does not include extra keys (no id, no created_at)', () => {
    const payload = buildShareToGroupPayload('tasting-1', 'group-1', 'user-1');
    expect(Object.keys(payload)).toEqual(['tasting_id', 'group_id', 'shared_by_user_id']);
  });
});
