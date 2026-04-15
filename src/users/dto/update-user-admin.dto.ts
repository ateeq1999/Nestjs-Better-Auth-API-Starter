import { IsEnum, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { UserRole } from '../../db/schema';

export class UpdateUserAdminDto {
  @ApiPropertyOptional({ enum: ['user', 'admin', 'moderator'], description: 'New role for the user' })
  @IsOptional()
  @IsEnum(['user', 'admin', 'moderator'])
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Reason for banning the user (triggers ban)' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  banReason?: string;

  @ApiPropertyOptional({ description: 'Set to true to unban the user' })
  @IsOptional()
  @IsIn([true])
  unban?: true;

  @ApiPropertyOptional({ description: 'Set to true to force-verify the user email' })
  @IsOptional()
  @IsIn([true])
  forceVerifyEmail?: true;
}
