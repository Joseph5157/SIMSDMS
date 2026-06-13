import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const _require = createRequire(import.meta.url);

const passwordLib = _require('../lib/password');

describe('password helper functions', () => {
  it('generateTempPassword returns 12-character alphanumeric string', () => {
    const password = passwordLib.generateTempPassword();
    expect(password).toMatch(/^[23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ]{12}$/);
    expect(password.length).toBe(12);
  });

  it('generateTempPassword excludes ambiguous characters (0, O, 1, l, I)', () => {
    // Generate many passwords to statistically verify exclusion
    for (let i = 0; i < 100; i++) {
      const password = passwordLib.generateTempPassword();
      expect(password).not.toMatch(/[0O1lI]/);
    }
  });

  it('hashPassword returns bcrypt hash with correct format', async () => {
    const password = 'TestPassword123';
    const hash = await passwordLib.hashPassword(password);
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash.length).toBeGreaterThan(50);
  });

  it('different calls to generateTempPassword return different values', () => {
    const password1 = passwordLib.generateTempPassword();
    const password2 = passwordLib.generateTempPassword();
    expect(password1).not.toBe(password2);
  });
});
