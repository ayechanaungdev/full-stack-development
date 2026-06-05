import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            // 1. Tell it where to look for the token (the Authorization Header)
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,

            // 2. This MUST match the secret key we put in auth.module.ts!
            secretOrKey: 'MY_SUPER_SECRET_KEY_123',
        });
    }

    // 3. If the token is valid, this method runs.
    // The 'payload' is the decoded data we put in the token during login (sub, email, role).
    async validate(payload: any) {
        // This attaches { userId, email, role } to the request object (req.user)
        return { userId: payload.sub, email: payload.email, role: payload.role };
    }
}
