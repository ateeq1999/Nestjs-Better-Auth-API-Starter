import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponse } from './user.response';

export class SessionObject {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ description: 'Opaque session token stored in the cookie' })
  token: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt: Date;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;

  @ApiPropertyOptional({ nullable: true })
  ipAddress: string | null;

  @ApiPropertyOptional({ nullable: true })
  userAgent: string | null;
}

export class SessionResponse {
  @ApiProperty({ type: SessionObject })
  session: SessionObject;

  @ApiProperty({ type: UserResponse })
  user: UserResponse;
}
