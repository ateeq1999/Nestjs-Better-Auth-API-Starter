/**
 * Validates that a `callbackURL` or `redirectTo` value is safe to redirect to.
 *
 * Rules:
 *  - Must be a valid URL (absolute) or a relative path starting with `/`
 *  - Absolute URLs must match one of the allowedOrigins (from CORS_ORIGINS env)
 *  - Custom schemes (e.g. `myapp://`) are allowed when explicitly listed in
 *    ALLOWED_CALLBACK_SCHEMES env var (comma-separated, e.g. `myapp,oauthapp`)
 *
 * Usage:
 *   assertCallbackUrl(dto.callbackURL);   // throws BadRequestException if invalid
 *   isCallbackUrlSafe(url)                 // returns boolean
 */

import { BadRequestException } from '@nestjs/common';

function getAllowedOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((o) => o.trim().toLowerCase());
}

function getAllowedSchemes(): string[] {
  return (process.env.ALLOWED_CALLBACK_SCHEMES ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isCallbackUrlSafe(url: string | undefined | null): boolean {
  if (!url) return true; // undefined / null → let better-auth use its default

  // Relative paths are always safe
  if (url.startsWith('/')) return true;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false; // not a valid URL
  }

  const scheme = parsed.protocol.replace(':', '').toLowerCase();

  // Allow custom deep-link / universal-link schemes when explicitly configured
  const allowedSchemes = getAllowedSchemes();
  if (allowedSchemes.includes(scheme)) return true;

  // For http/https, origin must match an allowed CORS origin
  if (scheme === 'http' || scheme === 'https') {
    const origin = parsed.origin.toLowerCase();
    return getAllowedOrigins().some((allowed) => {
      // Exact match or same origin with optional trailing slash
      return origin === allowed || origin === allowed.replace(/\/$/, '');
    });
  }

  return false;
}

export function assertCallbackUrl(url: string | undefined | null): void {
  if (!isCallbackUrlSafe(url)) {
    throw new BadRequestException(
      `callbackURL "${url ?? ''}" is not in the list of allowed origins. ` +
        'Set CORS_ORIGINS or ALLOWED_CALLBACK_SCHEMES to permit it.',
    );
  }
}
