import { buildCommentPayload } from './tasting-comments';

// ---------------------------------------------------------------------------
// buildCommentPayload — Slice 1: core wiring
// ---------------------------------------------------------------------------

describe('buildCommentPayload', () => {
  it('trims body and returns correct shape', () => {
    const payload = buildCommentPayload('user-1', 'tasting-1', '  Great pour!  ');
    expect(payload.user_id).toBe('user-1');
    expect(payload.tasting_id).toBe('tasting-1');
    expect(payload.body).toBe('Great pour!');
  });

  it('throws when body is whitespace-only', () => {
    expect(() => buildCommentPayload('user-1', 'tasting-1', '   ')).toThrow();
  });

  it('throws when body is empty string', () => {
    expect(() => buildCommentPayload('user-1', 'tasting-1', '')).toThrow();
  });
});
