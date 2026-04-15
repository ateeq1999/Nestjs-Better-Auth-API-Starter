import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { auth } from '../../auth/auth.config';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<FastifyRequest & { user?: unknown; session?: unknown }>();

    const session = await auth.api.getSession({
      headers: new Headers({ cookie: req.headers.cookie ?? '' }),
    });

    if (!session) {
      throw new UnauthorizedException('No active session');
    }

    // Attach to request so @CurrentUser() and @CurrentSession() can read them
    req.user = session.user;
    req.session = session.session;

    return true;
  }
}
