import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { twoFactor } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';
import { sendEmail } from './email.service';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  plugins: [
    /**
     * Bearer token plugin — enables Authorization: Bearer <token> flow.
     * Mobile clients (Flutter, React Native) that cannot reliably persist
     * cookies use this instead of the default cookie-based session.
     *
     * Adds endpoints:
     *   POST /api/auth/token          — exchange credentials for a bearer token
     *   POST /api/auth/token/refresh  — refresh an expiring access token
     *
     * Clients can also pass the token directly in sign-in/sign-up responses
     * by adding `?token=true` to the request URL.
     */
    bearer(),

    /**
     * Two-factor authentication (TOTP) plugin.
     * Adds endpoints:
     *   POST /api/auth/two-factor/enable       — enable 2FA, returns QR code URI
     *   POST /api/auth/two-factor/disable      — disable 2FA
     *   POST /api/auth/two-factor/verify-totp  — verify a TOTP code on sign-in
     *   GET  /api/auth/two-factor/get-uri      — get the TOTP provisioning URI
     */
    twoFactor({
      issuer: 'NestJS Better-Auth',
    }),
  ],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendVerificationEmail: async (user, url) => {
      await sendEmail({
        to: user.email,
        subject: 'Verify your email',
        html: `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
      });
    },
    sendResetPasswordEmail: async (user, url) => {
      await sendEmail({
        to: user.email,
        subject: 'Reset your password',
        html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
      });
    },
  },

  /**
   * Google OAuth — only active when both env vars are present.
   * Callback URL to register in Google Cloud Console:
   *   {BETTER_AUTH_URL}/api/auth/callback/google
   *
   * Apple Sign-In — only active when APPLE_CLIENT_ID + APPLE_CLIENT_SECRET are set.
   * Callback URL to register in Apple Developer Console:
   *   {BETTER_AUTH_URL}/api/auth/callback/apple
   */
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
      ? {
          apple: {
            clientId: process.env.APPLE_CLIENT_ID,
            clientSecret: process.env.APPLE_CLIENT_SECRET,
          },
        }
      : {}),
  },

  /**
   * CSRF protection — enabled for cookie-based flows.
   * better-auth generates and validates a CSRF token tied to the session.
   * Bearer token requests are exempt (they are stateless by design).
   */
  advanced: {
    crossSubDomainCookies: {
      enabled: false,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,   // 7 days
    updateAge: 60 * 60 * 24,         // refresh if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,                // 5 minutes
    },
  },

  trustedOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((o) => o.trim()),
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:5555',
});

export type Auth = typeof auth;
