import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UserController } from './user.controller';

@Module({
  controllers: [AuthController, UserController],
})
export class AuthModule {}
