import { betterAuth } from 'better-auth';
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
   * Flow (handled automatically by the catch-all AuthController):
   *   GET /api/auth/sign-in/social?provider=google  →  redirects to Google
   *   GET /api/auth/callback/google                 →  exchanges code, creates session
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
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  trustedOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((o) => o.trim()),
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:5555',
});

export type Auth = typeof auth;
