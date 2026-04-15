import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { DeviceTokenController } from './device-token.controller';
import { UploadController } from './upload.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [
    DeviceTokenController,  // POST /v1/api/users/me/device-tokens
    UploadController,       // POST /v1/api/users/me/avatar
  ],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
