import {
  Injectable,
  Logger,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest(
    err: Error | null,
    user: Record<string, unknown> | false,
    info: { message?: string } | null,
    context: ExecutionContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _status?: unknown,
  ) {
    const req = context
      .switchToHttp()
      .getRequest<{ headers?: { authorization?: string } }>();
    const authHeader = req.headers?.authorization;

    if (err || !user) {
      this.logger.warn(
        `401 — Auth header present: ${!!authHeader}, info: ${info?.message || err?.message}`,
      );
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
