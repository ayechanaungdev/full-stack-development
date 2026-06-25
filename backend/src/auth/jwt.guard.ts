import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    private readonly logger = new Logger(JwtAuthGuard.name);

    handleRequest(err: any, user: any, info: any, context: any, _status?: any) {
        const req = context.switchToHttp().getRequest();
        const authHeader = req.headers?.authorization;

        if (err || !user) {
            const prefix = authHeader
                ? `Bearer ...${authHeader.substring(authHeader.length - 20)}`
                : '(none)';
            this.logger.warn(`401 — Auth header present: ${!!authHeader}, info: ${info?.message || err?.message}`);
            throw err || new UnauthorizedException();
        }
        return user;
    }
}