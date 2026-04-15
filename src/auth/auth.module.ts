import { Module } from '@nestjs/common';
import { IdentityController } from './controllers/identity.controller';
import { PasswordController } from './controllers/password.controller';
import { VerificationController } from './controllers/verification.controller';
import { OAuthController } from './controllers/oauth.controller';
import { UserController } from './controllers/user.controller';

@Module({
  controllers: [
    IdentityController,      // POST /api/auth/sign-up, sign-in, sign-out | GET /api/auth/session
    PasswordController,      // POST /api/auth/forget-password, reset-password, change-password
    VerificationController,  // POST /api/auth/verify-email, send-verification-email
    OAuthController,         // GET  /api/auth/sign-in/social, callback/:provider + internal catch-all
    UserController,          // GET  /api/users/me
  ],
})
export class AuthModule {}
