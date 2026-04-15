import { ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

function makeCtx(method = 'GET', url = '/test', id = 'req-1', statusCode = 200) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method, url, id }),
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext;
}

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    // Silence actual output in tests
    logSpy = jest.spyOn((interceptor as any).logger, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn((interceptor as any).logger, 'warn').mockImplementation(() => {});
  });

  afterEach(() => jest.clearAllMocks());

  it('calls logger.log on successful response', (done) => {
    const handler = { handle: () => of({ ok: true }) };
    interceptor.intercept(makeCtx(), handler as never).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logSpy.mock.calls[0][0]).toMatch(/GET \/test → 200 in \d+ms/);
        done();
      },
    });
  });

  it('calls logger.warn on error response', (done) => {
    const err = Object.assign(new Error('fail'), { status: 401 });
    const handler = { handle: () => throwError(() => err) };
    interceptor.intercept(makeCtx('POST', '/secure'), handler as never).subscribe({
      error: () => {
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toMatch(/POST \/secure → 401 in \d+ms/);
        done();
      },
    });
  });
});
