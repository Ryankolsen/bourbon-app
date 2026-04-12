import { resolveCommentScope, buildCommentPayload } from './comments';

// ---------------------------------------------------------------------------
// resolveCommentScope
// ---------------------------------------------------------------------------

describe('resolveCommentScope', () => {
  it('returns "public" when groupId is null', () => {
    expect(resolveCommentScope(null)).toBe('public');
  });

  it('returns "public" when groupId is undefined', () => {
    expect(resolveCommentScope(undefined)).toBe('public');
  });

  it('returns "group" when a groupId is provided', () => {
    expect(resolveCommentScope('group-abc')).toBe('group');
  });
});

// ---------------------------------------------------------------------------
// buildCommentPayload
// ---------------------------------------------------------------------------

describe('buildCommentPayload', () => {
  const userId = 'user-1';
  const bourbonId = 'bourbon-1';
  const body = 'Lovely finish.';

  it('builds a public comment payload when no groupId is given', () => {
    const payload = buildCommentPayload(userId, bourbonId, body);
    expect(payload.user_id).toBe(userId);
    expect(payload.bourbon_id).toBe(bourbonId);
    expect(payload.body).toBe(body);
    expect(payload.visibility).toBe('public');
    expect(payload.group_id).toBeNull();
  });

  it('builds a public comment payload when groupId is null', () => {
    const payload = buildCommentPayload(userId, bourbonId, body, null);
    expect(payload.visibility).toBe('public');
    expect(payload.group_id).toBeNull();
  });

  it('builds a group comment payload when groupId is provided', () => {
    const groupId = 'group-xyz';
    const payload = buildCommentPayload(userId, bourbonId, body, groupId);
    expect(payload.visibility).toBe('group');
    expect(payload.group_id).toBe(groupId);
  });

  it('group payload includes all required fields', () => {
    const groupId = 'group-xyz';
    const payload = buildCommentPayload(userId, bourbonId, body, groupId);
    expect(payload.user_id).toBe(userId);
    expect(payload.bourbon_id).toBe(bourbonId);
    expect(payload.body).toBe(body);
  });
});
