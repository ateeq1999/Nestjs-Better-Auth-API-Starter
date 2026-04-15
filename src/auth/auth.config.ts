import { betterAuth } from 'better-auth';
import { bearer, magicLink, organization, twoFactor } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';
import { sendEmail } from './email.service';
import { renderEmail } from '../email/template.service';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      twoFactor: schema.twoFactor,
      organization: schema.organization,
      member: schema.member,
      invitation: schema.invitation,
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

    /**
     * Magic link — passwordless email sign-in (P10).
     * Adds endpoints:
     *   POST /api/auth/magic-link/send-magic-link   — send login link to email
     *   GET  /api/auth/magic-link/verify-magic-link — verify token from email
     */
    magicLink({
      sendMagicLink: async (data) => {
        const { html, text } = renderEmail({
          template: 'magic-link',
          subject: 'Your sign-in link',
          data: { url: data.url },
        });
        await sendEmail({ to: data.email, subject: 'Your sign-in link', html, text });
      },
    }),

    /**
     * Organization / multi-tenancy (P12).
     * Adds endpoints for creating and managing workspaces, inviting members,
     * and managing member roles.
     */
    organization(),
  ],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendVerificationEmail: async (user, url) => {
      const { html, text } = renderEmail({
        template: 'email-verification',
        subject: 'Verify your email address',
        data: { name: user.name ?? user.email, url },
      });
      await sendEmail({ to: user.email, subject: 'Verify your email address', html, text });
    },
    sendResetPasswordEmail: async (user, url) => {
      const { html, text } = renderEmail({
        template: 'password-reset',
        subject: 'Reset your password',
        data: { name: user.name ?? user.email, email: user.email, url },
      });
      await sendEmail({ to: user.email, subject: 'Reset your password', html, text });
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
