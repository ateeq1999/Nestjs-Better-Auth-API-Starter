import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponse {
  @ApiProperty({ example: 'abc123xyz' })
  id: string;

  @ApiProperty({ example: 'Jane Doe' })
  name: string;

  @ApiProperty({ example: 'jane@example.com', format: 'email' })
  email: string;

  @ApiProperty({ description: 'Whether the email address has been verified' })
  emailVerified: boolean;

  @ApiPropertyOptional({ format: 'uri', nullable: true })
  image: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}
