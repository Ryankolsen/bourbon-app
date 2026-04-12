import {
  bourbonFactory,
  profileFactory,
  tastingFactory,
  groupFactory,
  groupMemberFactory,
  commentFactory,
  userCollectionFactory,
  userWishlistFactory,
} from './factories';
import { createMockSupabaseClient } from './supabase';

describe('factories', () => {
  describe('bourbonFactory', () => {
    it('returns a bourbon with default values', () => {
      const bourbon = bourbonFactory();
      expect(bourbon.id).toBeTruthy();
      expect(bourbon.name).toBe('Test Bourbon');
      expect(bourbon.proof).toBe(90);
    });

    it('applies overrides', () => {
      const bourbon = bourbonFactory({ name: 'Pappy Van Winkle', proof: 107 });
      expect(bourbon.name).toBe('Pappy Van Winkle');
      expect(bourbon.proof).toBe(107);
    });

    it('generates unique ids', () => {
      const a = bourbonFactory();
      const b = bourbonFactory();
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('profileFactory', () => {
    it('returns a profile with default values', () => {
      const profile = profileFactory();
      expect(profile.id).toBeTruthy();
      expect(profile.username).toBeTruthy();
      expect(profile.display_name).toBe('Test User');
    });

    it('applies overrides', () => {
      const profile = profileFactory({ username: 'bourbonlover' });
      expect(profile.username).toBe('bourbonlover');
    });
  });

  describe('tastingFactory', () => {
    it('returns a tasting with a default rating', () => {
      const tasting = tastingFactory();
      expect(tasting.rating).toBe(8);
    });

    it('links to provided bourbon_id', () => {
      const bourbon = bourbonFactory();
      const tasting = tastingFactory({ bourbon_id: bourbon.id });
      expect(tasting.bourbon_id).toBe(bourbon.id);
    });
  });

  describe('groupFactory', () => {
    it('returns a group with a name', () => {
      const group = groupFactory();
      expect(group.name).toBe('Test Group');
    });
  });

  describe('groupMemberFactory', () => {
    it('defaults to accepted member role', () => {
      const member = groupMemberFactory();
      expect(member.role).toBe('member');
      expect(member.status).toBe('accepted');
    });
  });

  describe('commentFactory', () => {
    it('defaults to public visibility', () => {
      const comment = commentFactory();
      expect(comment.visibility).toBe('public');
      expect(comment.body).toBe('Great bourbon!');
    });
  });

  describe('userCollectionFactory', () => {
    it('returns a collection entry', () => {
      const entry = userCollectionFactory();
      expect(entry.id).toBeTruthy();
      expect(entry.user_id).toBeTruthy();
      expect(entry.bourbon_id).toBeTruthy();
    });
  });

  describe('userWishlistFactory', () => {
    it('returns a wishlist entry with priority 0', () => {
      const entry = userWishlistFactory();
      expect(entry.priority).toBe(0);
    });
  });
});

describe('createMockSupabaseClient', () => {
  it('returns a chainable mock client', () => {
    const { client } = createMockSupabaseClient();
    const qb = client.from('bourbons');
    expect(qb.select).toBeDefined();
    expect(qb.insert).toBeDefined();
    expect(qb.eq).toBeDefined();
  });

  it('from() returns independent query builders per call', () => {
    const { client } = createMockSupabaseClient();
    const qb1 = client.from('bourbons');
    const qb2 = client.from('tastings');
    expect(qb1).not.toBe(qb2);
  });

  it('single() resolves to { data: null, error: null } by default', async () => {
    const { client } = createMockSupabaseClient();
    const result = await client.from('bourbons').single();
    expect(result).toEqual({ data: null, error: null });
  });

  it('rpc() resolves to { data: null, error: null } by default', async () => {
    const { client } = createMockSupabaseClient();
    const result = await client.rpc('get_user_public_stats', { p_user_id: 'abc' });
    expect(result).toEqual({ data: null, error: null });
  });

  it('storage.from().getPublicUrl() returns a mock URL', () => {
    const { client } = createMockSupabaseClient();
    const { data } = client.storage.from('avatars').getPublicUrl('path/to/file.jpg');
    expect(data.publicUrl).toContain('mock.supabase.co');
  });
});
