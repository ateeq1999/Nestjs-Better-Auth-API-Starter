import { HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './http-exception.filter';

// Minimal Fastify reply mock
function makeReply() {
  const headers: Record<string, string> = {};
  let sentBody: unknown;
  let statusCode = 200;
  return {
    status: jest.fn((code: number) => { statusCode = code; return reply; }),
    header: jest.fn((k: string, v: string) => { headers[k] = v; return reply; }),
    send: jest.fn((body: unknown) => { sentBody = body; return reply; }),
    get statusCode() { return statusCode; },
    get body() { return sentBody; },
  } as unknown as ReturnType<typeof makeReply>;
}

// Minimal execution context mock
function makeCtx(reply: ReturnType<typeof makeReply>) {
  return {
    switchToHttp: () => ({
      getResponse: () => reply,
    }),
  };
}

const reply = makeReply();

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    jest.clearAllMocks();
  });

  it('returns the correct shape for an HttpException', () => {
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);
    filter.catch(exception, makeCtx(reply) as never);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        error: 'NOT_FOUND',
        message: 'Not found',
      }),
    );
  });

  it('maps unknown errors to 500 with a generic message', () => {
    filter.catch(new Error('boom'), makeCtx(reply) as never);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'INTERNAL_SERVER_ERROR',
      }),
    );
  });

  it('includes a timestamp in the response', () => {
    filter.catch(new HttpException('bad', 400), makeCtx(reply) as never);
    const body = (reply.send as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
    expect(typeof body['timestamp']).toBe('string');
  });
});
