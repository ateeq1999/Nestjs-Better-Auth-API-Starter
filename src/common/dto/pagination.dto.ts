import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Cursor-based pagination query parameters.
 *
 * Usage in controllers:
 *   @Get()
 *   async list(@Query() query: CursorPaginationDto) { ... }
 */
export class CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Opaque cursor from previous page (nextCursor value)', example: 'clxyz123' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Number of records per page', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * Strongly-typed cursor-paginated response envelope.
 *
 * Usage in services:
 *   return buildCursorPage(rows, query.limit, (row) => row.id);
 */
export interface CursorPage<T> {
  data: T[];
  meta: {
    limit: number;
    hasNextPage: boolean;
    nextCursor: string | null;
  };
}

/**
 * Build a CursorPage from a query result.
 *
 * Pattern: fetch (limit + 1) rows. If you get (limit + 1), there is a next
 * page — slice off the extra row and set nextCursor to the last visible row's ID.
 *
 * @param rows      Result rows — fetch (limit + 1) in your query
 * @param limit     Page size requested by the client
 * @param cursorFn  Extract the cursor value from a row (usually row.id)
 */
export function buildCursorPage<T>(
  rows: T[],
  limit: number,
  cursorFn: (row: T) => string,
): CursorPage<T> {
  const hasNextPage = rows.length > limit;
  const data = hasNextPage ? rows.slice(0, limit) : rows;
  const nextCursor = hasNextPage ? cursorFn(data[data.length - 1]) : null;

  return {
    data,
    meta: { limit, hasNextPage, nextCursor },
  };
}
