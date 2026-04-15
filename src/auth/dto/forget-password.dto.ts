import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class ForgetPasswordDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'URL in your frontend that accepts the reset token, e.g. /reset-password',
    example: 'http://localhost:5173/reset-password',
  })
  @IsOptional()
  @IsString()
  redirectTo?: string;
}
