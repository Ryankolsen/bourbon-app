import { validateUsername, generateAvatarPath } from './profile';

// ---------------------------------------------------------------------------
// validateUsername
// ---------------------------------------------------------------------------

describe('validateUsername', () => {
  describe('valid usernames', () => {
    it('accepts a simple lowercase username', () => {
      expect(validateUsername('alice')).toBeNull();
    });

    it('accepts a username with numbers', () => {
      expect(validateUsername('user123')).toBeNull();
    });

    it('accepts a username with underscores', () => {
      expect(validateUsername('bourbon_fan')).toBeNull();
    });

    it('accepts exactly 3 characters (min length)', () => {
      expect(validateUsername('abc')).toBeNull();
    });

    it('accepts exactly 20 characters (max length)', () => {
      expect(validateUsername('a'.repeat(20))).toBeNull();
    });
  });

  describe('too short', () => {
    it('rejects an empty string', () => {
      expect(validateUsername('')).not.toBeNull();
    });

    it('rejects a 1-character username', () => {
      expect(validateUsername('a')).not.toBeNull();
    });

    it('rejects a 2-character username', () => {
      expect(validateUsername('ab')).not.toBeNull();
    });

    it('returns an error message mentioning the minimum length', () => {
      const msg = validateUsername('ab');
      expect(msg).toMatch(/3/);
    });
  });

  describe('too long', () => {
    it('rejects a 21-character username', () => {
      expect(validateUsername('a'.repeat(21))).not.toBeNull();
    });

    it('returns an error message mentioning the maximum length', () => {
      const msg = validateUsername('a'.repeat(21));
      expect(msg).toMatch(/20/);
    });
  });

  describe('invalid characters', () => {
    it('rejects uppercase letters', () => {
      expect(validateUsername('Alice')).not.toBeNull();
    });

    it('rejects spaces', () => {
      expect(validateUsername('hello world')).not.toBeNull();
    });

    it('rejects hyphens', () => {
      expect(validateUsername('hello-world')).not.toBeNull();
    });

    it('rejects special characters', () => {
      expect(validateUsername('user@name')).not.toBeNull();
    });

    it('returns a descriptive error for invalid characters', () => {
      const msg = validateUsername('Hello!');
      expect(msg).toMatch(/lowercase/i);
    });
  });

  describe('reserved words', () => {
    it('rejects "admin"', () => {
      expect(validateUsername('admin')).not.toBeNull();
    });

    it('rejects "root"', () => {
      expect(validateUsername('root')).not.toBeNull();
    });

    it('rejects "support"', () => {
      expect(validateUsername('support')).not.toBeNull();
    });

    it('returns a message indicating the username is reserved', () => {
      const msg = validateUsername('admin');
      expect(msg).toMatch(/reserved/i);
    });
  });
});

// ---------------------------------------------------------------------------
// generateAvatarPath
// ---------------------------------------------------------------------------

describe('generateAvatarPath', () => {
  it('produces the correct path for a jpg extension', () => {
    const path = generateAvatarPath('user-abc-123', 'jpg');
    expect(path).toBe('user-abc-123/avatar.jpg');
  });

  it('produces the correct path for a png extension', () => {
    const path = generateAvatarPath('user-abc-123', 'png');
    expect(path).toBe('user-abc-123/avatar.png');
  });

  it('strips a leading dot from the extension', () => {
    const path = generateAvatarPath('user-abc-123', '.jpg');
    expect(path).toBe('user-abc-123/avatar.jpg');
  });

  it('includes the userId as the first path segment', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    const path = generateAvatarPath(userId, 'jpg');
    expect(path.startsWith(userId + '/')).toBe(true);
  });

  it('always names the file "avatar"', () => {
    const path = generateAvatarPath('uid', 'jpg');
    expect(path).toMatch(/\/avatar\./);
  });
});
