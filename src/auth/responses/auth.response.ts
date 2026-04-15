import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponse } from './user.response';

export class AuthResponse {
  @ApiPropertyOptional({
    nullable: true,
    description:
      'Session token. Null when email verification is required — session is created after the user verifies.',
  })
  token: string | null;

  @ApiProperty({ type: UserResponse })
  user: UserResponse;
}

export class SignOutResponse {
  @ApiProperty({ example: true })
  success: boolean;
}

export class MessageResponse {
  @ApiProperty({ example: 'Password reset email sent' })
  message: string;
}