import { buildLikePayload, buildUnlikeTarget } from './tasting-likes';

// ---------------------------------------------------------------------------
// buildLikePayload
// ---------------------------------------------------------------------------

describe('buildLikePayload', () => {
  it('returns the correct user_id and tasting_id', () => {
    const payload = buildLikePayload('user-1', 'tasting-1');
    expect(payload.user_id).toBe('user-1');
    expect(payload.tasting_id).toBe('tasting-1');
  });

  it('does not add extraneous fields', () => {
    const payload = buildLikePayload('user-1', 'tasting-1');
    const keys = Object.keys(payload);
    expect(keys).toEqual(['user_id', 'tasting_id']);
  });
});

// ---------------------------------------------------------------------------
// buildUnlikeTarget
// ---------------------------------------------------------------------------

describe('buildUnlikeTarget', () => {
  it('returns the correct user_id and tasting_id', () => {
    const target = buildUnlikeTarget('user-1', 'tasting-1');
    expect(target.user_id).toBe('user-1');
    expect(target.tasting_id).toBe('tasting-1');
  });

  it('does not add extraneous fields', () => {
    const target = buildUnlikeTarget('user-1', 'tasting-1');
    const keys = Object.keys(target);
    expect(keys).toEqual(['user_id', 'tasting_id']);
  });
});
