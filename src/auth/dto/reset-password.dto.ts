import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token from the password-reset email' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'newpassword123', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiPropertyOptional({
    description: 'URL to redirect to after successful reset',
  })
  @IsOptional()
  @IsString()
  callbackURL?: string;
}
