import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { DeviceTokenController } from './device-token.controller';
import { UploadController } from './upload.controller';
import { AdminController } from './admin.controller';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [AuditModule, StorageModule],
  controllers: [
    DeviceTokenController,  // POST/DELETE /v1/api/users/me/device-tokens
    UploadController,       // POST /v1/api/users/me/avatar
    AdminController,        // GET/PATCH/DELETE /v1/api/admin/users (admin only)
  ],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
