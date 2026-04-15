import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsBoolean, IsUrl, MinLength } from 'class-validator';

export class SignUpDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'supersecret123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  @IsOptional()
  @IsUrl()
  image?: string;

  @ApiPropertyOptional({
    description: 'URL to redirect to after email verification',
    example: 'http://localhost:5173/dashboard',
  })
  @IsOptional()
  @IsString()
  callbackURL?: string;

  @ApiPropertyOptional({
    description: 'Keep the session alive after the browser closes. Default: true',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
