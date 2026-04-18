import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/connection'; // raw connection — auth.config lives outside DI
import * as schema from '../db/schema';
import { sendEmail } from './email.service';
import { renderEmail } from '../email/template.service';
import { features } from '../config/features';

// ── Conditional plugin imports ────────────────────────────────────────────────
// Loaded lazily so disabled plugins add zero runtime cost.
const twoFactorPlugin = features.twoFactor ? require('better-auth/plugins').twoFactor : null;
const magicLinkPlugin = features.magicLink ? require('better-auth/plugins').magicLink : null;
const organizationPlugin = features.organization ? require('better-auth/plugins').organization : null;

// ── Auth plugins array (always includes bearer for mobile support) ────────────
const plugins = [
  bearer(),

  ...(twoFactorPlugin
    ? [twoFactorPlugin({ issuer: process.env.APP_NAME ?? 'NestJS Better-Auth' })]
    : []),

  ...(magicLinkPlugin
    ? [
      magicLinkPlugin({
        sendMagicLink: async (data: { email: string; url: string }) => {
          const { html, text } = renderEmail({
            template: 'magic-link',
            subject: 'Your sign-in link',
            data: { url: data.url },
          });
          await sendEmail({ to: data.email, subject: 'Your sign-in link', html, text });
        },
      }),
    ]
    : []),

  ...(organizationPlugin ? [organizationPlugin()] : []),
];

// ── Schema tables for drizzle adapter ────────────────────────────────────────
const adapterSchema: Record<string, unknown> = {
  user: schema.user,
  session: schema.session,
  account: schema.account,
  verification: schema.verification,
};
if (features.twoFactor) adapterSchema['twoFactor'] = schema.twoFactor;
if (features.organization) {
  adapterSchema['organization'] = schema.organization;
  adapterSchema['member'] = schema.member;
  adapterSchema['invitation'] = schema.invitation;
}

// ── Social providers (only wired when env vars are present AND feature is on) ─
const socialProviders: Record<string, unknown> = {};
if (features.socialAuth) {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    socialProviders['google'] = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
    socialProviders['apple'] = {
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
    };
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema: adapterSchema }),

  plugins,

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }: { user: { name?: string | null; email: string }; url: string }) => {
      const { html, text } = renderEmail({
        template: 'password-reset',
        subject: 'Reset your password',
        data: { name: user.name ?? user.email, email: user.email, url },
      });
      await sendEmail({ to: user.email, subject: 'Reset your password', html, text });
    },
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }: { user: { name?: string | null; email: string }; url: string }) => {
      const { html, text } = renderEmail({
        template: 'email-verification',
        subject: 'Verify your email address',
        data: { name: user.name ?? user.email, url },
      });
      await sendEmail({ to: user.email, subject: 'Verify your email address', html, text });
    },
  },

  socialProviders,

  advanced: {
    crossSubDomainCookies: { enabled: false },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,  // 7 days
    updateAge: 60 * 60 * 24,        // refresh if older than 1 day
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  trustedOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((o) => o.trim()),
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
});

export type Auth = typeof auth;
