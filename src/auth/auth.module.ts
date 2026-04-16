import { Module } from '@nestjs/common';
import { IdentityController } from './controllers/identity.controller';
import { PasswordController } from './controllers/password.controller';
import { VerificationController } from './controllers/verification.controller';
import { OAuthController } from './controllers/oauth.controller';
import { UserController } from './controllers/user.controller';
import { MagicLinkController } from './controllers/magic-link.controller';
import { LockoutService } from './lockout.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [
    IdentityController,      // POST /v1/api/auth/sign-up, sign-in, sign-out | GET /v1/api/auth/session
    PasswordController,      // POST /v1/api/auth/forget-password, reset-password, change-password
    VerificationController,  // POST /v1/api/auth/verify-email, send-verification-email
    OAuthController,         // GET  /api/auth/sign-in/social, callback/:provider (VERSION_NEUTRAL)
    UserController,          // GET  /v1/api/users/me
    MagicLinkController,     // POST /v1/api/auth/magic-link/send-magic-link | GET /v1/api/auth/magic-link/verify-magic-link
  ],
  providers: [LockoutService],
  exports: [LockoutService],
})
export class AuthModule {}
