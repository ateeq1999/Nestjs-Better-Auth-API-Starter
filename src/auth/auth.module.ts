import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UserController, VerificationController } from './user.controller';

@Module({
  controllers: [AuthController, UserController, VerificationController],
})
export class AuthModule {}
