import { isCallbackUrlSafe, assertCallbackUrl } from './callback-url.util';
import { BadRequestException } from '@nestjs/common';

// Patch env for tests
beforeEach(() => {
  process.env['CORS_ORIGINS'] = 'http://localhost:5173,https://myapp.com';
  process.env['ALLOWED_CALLBACK_SCHEMES'] = 'myapp';
});

afterEach(() => {
  delete process.env['CORS_ORIGINS'];
  delete process.env['ALLOWED_CALLBACK_SCHEMES'];
});

describe('isCallbackUrlSafe', () => {
  it('returns true for undefined / null', () => {
    expect(isCallbackUrlSafe(undefined)).toBe(true);
    expect(isCallbackUrlSafe(null)).toBe(true);
  });

  it('returns true for relative paths', () => {
    expect(isCallbackUrlSafe('/dashboard')).toBe(true);
  });

  it('returns true for allowed CORS origins', () => {
    expect(isCallbackUrlSafe('http://localhost:5173/callback')).toBe(true);
    expect(isCallbackUrlSafe('https://myapp.com/auth')).toBe(true);
  });

  it('returns false for disallowed origins', () => {
    expect(isCallbackUrlSafe('https://evil.com/steal')).toBe(false);
  });

  it('returns true for allowed custom scheme (deep link)', () => {
    expect(isCallbackUrlSafe('myapp://auth/callback')).toBe(true);
  });

  it('returns false for unknown custom scheme', () => {
    expect(isCallbackUrlSafe('otherscheme://callback')).toBe(false);
  });

  it('returns false for a non-URL string', () => {
    expect(isCallbackUrlSafe('not a url at all')).toBe(false);
  });
});

describe('assertCallbackUrl', () => {
  it('does not throw for safe URLs', () => {
    expect(() => assertCallbackUrl('/safe')).not.toThrow();
    expect(() => assertCallbackUrl('http://localhost:5173')).not.toThrow();
  });

  it('throws BadRequestException for unsafe URLs', () => {
    expect(() => assertCallbackUrl('https://evil.com')).toThrow(BadRequestException);
  });
});
