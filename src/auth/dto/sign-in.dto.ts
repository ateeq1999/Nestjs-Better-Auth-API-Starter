import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsBoolean, MinLength } from 'class-validator';

export class SignInDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'supersecret123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: 'Keep the session alive after the browser closes. Default: true',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @ApiPropertyOptional({
    description: 'Redirect to this URL after successful sign-in (used by OAuth)',
  })
  @IsOptional()
  @IsString()
  callbackURL?: string;
}
