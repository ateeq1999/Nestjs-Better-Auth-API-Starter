import {
  Controller,
  Inject,
  Post,
  Req,
  UseGuards,
  PayloadTooLargeException,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserService } from './user.service';
import { STORAGE_SERVICE, type StorageService } from '../storage/storage.interface';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@ApiTags('User')
@ApiCookieAuth('better-auth.session_token')
@ApiBearerAuth('bearer-token')
@UseGuards(AuthGuard)
@Controller({ version: '1', path: 'api/users/me' })
export class UploadController {
  constructor(
    private readonly users: UserService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  /**
   * POST /v1/api/users/me/avatar
   * Uploads a profile picture (multipart/form-data, field name: "file").
   * Requires @fastify/multipart to be registered (done in main.ts).
   *
   * In production, replace the `url` construction with an S3/Cloudflare R2 upload.
   * The local storage path is intentionally left simple for a starter.
   */
  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Profile image (JPEG/PNG/WebP/GIF, max 5 MB)' },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload a profile avatar (multipart/form-data)' })
  @ApiResponse({ status: 200, description: 'Avatar URL' })
  @ApiResponse({ status: 400, description: 'Invalid file type' })
  @ApiResponse({ status: 413, description: 'File exceeds 5 MB limit' })
  async uploadAvatar(
    @Req() req: FastifyRequest,
    @CurrentUser() currentUser: { id: string },
  ): Promise<{ url: string }> {
    // @fastify/multipart must be registered — the file is on req.file()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const multipartReq = req as any;
    if (typeof multipartReq.file !== 'function') {
      throw new BadRequestException('Multipart upload not supported — ensure @fastify/multipart is registered');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const part = await multipartReq.file() as {
      filename: string;
      mimetype: string;
      file: AsyncIterable<Buffer>;
    } | null;

    if (!part) throw new BadRequestException('No file provided');
    if (!ALLOWED_MIME_TYPES.includes(part.mimetype)) {
      throw new BadRequestException(`File type ${part.mimetype} not allowed. Use JPEG, PNG, WebP, or GIF.`);
    }

    // Read and size-check the stream
    const chunks: Buffer[] = [];
    let totalSize = 0;
    for await (const chunk of part.file) {
      totalSize += chunk.length;
      if (totalSize > MAX_FILE_SIZE_BYTES) {
        throw new PayloadTooLargeException('File exceeds the 5 MB limit');
      }
      chunks.push(chunk);
    }

    const ext = part.filename.split('.').pop() ?? 'jpg';
    const key = `avatars/${currentUser.id}/${Date.now()}.${ext}`;
    const url = await this.storage.upload(Buffer.concat(chunks), key, part.mimetype);

    await this.users.updateProfile(currentUser.id, { image: url });

    return { url };
  }
}
