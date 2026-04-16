import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiCreatedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ResponseMetaDto, PaginationMetaDto } from '../dto/api-response.dto';

/**
 * Documents a success response wrapped in the API envelope.
 *
 * Without this decorator Swagger shows the raw return type of the handler (T).
 * With it, Swagger shows the actual HTTP response shape: { success, data: T, meta }.
 *
 * Usage:
 *   @ApiDataResponse(UserProfileDto)
 *   @Get('me')
 *   async getMe(): Promise<UserProfile> { ... }
 *
 *   @ApiDataResponse(UserProfileDto, { isArray: true })
 *   @Get()
 *   async list(): Promise<CursorPage<UserProfile>> { ... }
 *
 *   @ApiDataResponse(UserProfileDto, { status: 201 })
 *   @Post()
 *   async create(): Promise<UserProfile> { ... }
 */
export const ApiDataResponse = <TModel extends Type<unknown>>(
  model: TModel,
  options: { isArray?: boolean; status?: 201 | 200; description?: string } = {},
) => {
  const { isArray = false, status = 200, description } = options;

  const dataSchema = isArray
    ? { type: 'array', items: { $ref: getSchemaPath(model) } }
    : { $ref: getSchemaPath(model) };

  const responseDecorator =
    status === 201 ? ApiCreatedResponse : ApiOkResponse;

  return applyDecorators(
    ApiExtraModels(model, ResponseMetaDto),
    responseDecorator({
      description,
      schema: {
        properties: {
          success: { type: 'boolean', example: true },
          data: dataSchema,
          meta: { $ref: getSchemaPath(ResponseMetaDto) },
        },
        required: ['success', 'data', 'meta'],
      },
    }),
  );
};

/**
 * Documents a cursor-paginated response wrapped in the API envelope.
 * Pagination info is hoisted into meta (not nested inside data).
 *
 * Usage:
 *   @ApiPaginatedResponse(UserProfileDto)
 *   @Get()
 *   async list(@Query() query: CursorPaginationDto): Promise<CursorPage<UserProfile>> { ... }
 */
export const ApiPaginatedResponse = <TModel extends Type<unknown>>(
  model: TModel,
  options: { description?: string } = {},
) =>
  applyDecorators(
    ApiExtraModels(model, ResponseMetaDto, PaginationMetaDto),
    ApiOkResponse({
      description: options.description,
      schema: {
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'array', items: { $ref: getSchemaPath(model) } },
          meta: {
            allOf: [
              { $ref: getSchemaPath(ResponseMetaDto) },
              {
                properties: {
                  pagination: { $ref: getSchemaPath(PaginationMetaDto) },
                },
                required: ['pagination'],
              },
            ],
          },
        },
        required: ['success', 'data', 'meta'],
      },
    }),
  );
