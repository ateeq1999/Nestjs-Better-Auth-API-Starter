import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDeviceTokenDto {
  @ApiProperty({
    description: 'FCM (Android/Web) or APNs (iOS) device push token',
    example: 'dXNlcjEyMzQ1Njc4OTAxMjM0NTY3ODk...',
  })
  @IsString()
  @MinLength(10)
  token: string;

  @ApiProperty({
    enum: ['ios', 'android', 'web'],
    description: 'Target platform for the push notification provider',
  })
  @IsIn(['ios', 'android', 'web'])
  platform: 'ios' | 'android' | 'web';

  @ApiPropertyOptional({
    description: 'Human-readable device label (e.g. "Jane\'s iPhone 15")',
    example: "Jane's iPhone 15",
  })
  @IsOptional()
  @IsString()
  deviceName?: string;
}
