import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Verification token from the email link' })
  @IsString()
  token: string;

  @ApiPropertyOptional({
    description: 'URL to redirect to after successful verification',
    example: 'http://localhost:5173/dashboard',
  })
  @IsOptional()
  @IsString()
  callbackURL?: string;
}

export class SendVerificationEmailDto {
  @ApiPropertyOptional({
    description: 'URL to redirect to after the user clicks the link in the email',
    example: 'http://localhost:5173/dashboard',
  })
  @IsOptional()
  @IsString()
  callbackURL?: string;
}
