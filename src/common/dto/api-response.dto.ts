import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────

export class PaginationMetaDto {
  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: true })
  hasNextPage!: boolean;

  @ApiPropertyOptional({ example: 'clxyz123', nullable: true })
  nextCursor!: string | null;
}

export class ResponseMetaDto {
  @ApiProperty({ example: '2026-04-16T12:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '018f2a3b-4c5d-6e7f-8a9b-0c1d2e3f4a5b' })
  requestId!: string;

  @ApiPropertyOptional({ type: () => PaginationMetaDto })
  pagination?: PaginationMetaDto;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error body
// ─────────────────────────────────────────────────────────────────────────────

export class ApiErrorDto {
  /** Machine-readable error code — matches the HTTP status name or a domain code */
  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code!: string;

  @ApiProperty({ example: 'email must be a valid email address' })
  message!: string | string[];

  /** Detailed validation errors — present for 400 responses from ValidationPipe */
  @ApiPropertyOptional({ type: 'array', items: { type: 'string' } })
  details?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Response wrappers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Typed success response. `data` holds the handler's return value.
 *
 * Generic version — used in TypeScript. For Swagger use @ApiDataResponse().
 */
export class ApiSuccessResponse<T> {
  @ApiProperty({ example: true })
  success!: true;

  data!: T;

  @ApiProperty({ type: () => ResponseMetaDto })
  meta!: ResponseMetaDto;
}

export class ApiFailureResponse {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ type: () => ApiErrorDto })
  error!: ApiErrorDto;

  @ApiProperty({ type: () => ResponseMetaDto })
  meta!: ResponseMetaDto;
}

/** Union type for complete type safety in typed clients / test assertions */
export type ApiResponse<T> =
  | { success: true;  data: T;             meta: ResponseMeta }
  | { success: false; error: ApiErrorShape; meta: ResponseMeta };

export type ResponseMeta = {
  timestamp: string;
  requestId: string;
  pagination?: {
    limit: number;
    hasNextPage: boolean;
    nextCursor: string | null;
  };
};

export type ApiErrorShape = {
  code: string;
  message: string | string[];
  details?: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Zod schemas — for client-side parsing (TanStack Query, mobile, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export const paginationMetaSchema = z.object({
  limit: z.number(),
  hasNextPage: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const responseMetaSchema = z.object({
  timestamp: z.string(),
  requestId: z.string(),
  pagination: paginationMetaSchema.optional(),
});

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.union([z.string(), z.array(z.string())]),
  details: z.array(z.string()).optional(),
});

/**
 * Wrap any Zod schema in the API success envelope.
 *
 * Usage:
 *   const userResponseSchema = apiResponseSchema(selectUserSchema);
 *   type UserApiResponse = z.infer<typeof userResponseSchema>;
 *   // → { success: true, data: SelectUser, meta: ResponseMeta }
 *
 *   const listResponseSchema = apiResponseSchema(z.array(selectUserSchema));
 */
export function apiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.discriminatedUnion('success', [
    z.object({
      success: z.literal(true),
      data: dataSchema,
      meta: responseMetaSchema,
    }),
    z.object({
      success: z.literal(false),
      error: apiErrorSchema,
      meta: responseMetaSchema,
    }),
  ]);
}
