import { buildFollowPayload, buildUnfollowTarget } from './follows';

// ---------------------------------------------------------------------------
// buildFollowPayload
// ---------------------------------------------------------------------------

describe('buildFollowPayload', () => {
  it('returns the correct follower_id and following_id', () => {
    const payload = buildFollowPayload('user-a', 'user-b');
    expect(payload.follower_id).toBe('user-a');
    expect(payload.following_id).toBe('user-b');
  });

  it('does not add extraneous fields', () => {
    const payload = buildFollowPayload('user-a', 'user-b');
    const keys = Object.keys(payload);
    expect(keys).toContain('follower_id');
    expect(keys).toContain('following_id');
  });
});

// ---------------------------------------------------------------------------
// buildUnfollowTarget
// ---------------------------------------------------------------------------

describe('buildUnfollowTarget', () => {
  it('returns the correct follower_id and following_id', () => {
    const target = buildUnfollowTarget('user-a', 'user-b');
    expect(target.follower_id).toBe('user-a');
    expect(target.following_id).toBe('user-b');
  });

  it('follower and following are not swapped', () => {
    const target = buildUnfollowTarget('follower', 'following');
    expect(target.follower_id).toBe('follower');
    expect(target.following_id).toBe('following');
  });
});
