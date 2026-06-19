import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

/**
 * Auth Service
 * Business logic layer - uses UsersService (which uses Repository) for data access
 */
@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private prisma: PrismaService,
    ) { }

    // Helper method to generate tokens
    async generateTokens(userId: number, email: string, role: string) {
        const payload = { sub: userId, email: email, role: role };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: 'MY_SUPER_SECRET_KEY_123',
                // expiresIn: '20s', // 👈 Very First Expired Token For Testing
                expiresIn: '15m', // 👈 Real Setting
            }),
            this.jwtService.signAsync(payload, {
                secret: 'MY_SUPER_REFRESH_KEY_123', // 👈 Different secret!
                expiresIn: '7d', // 👈 Long expiration
            }),
        ]);
        return { accessToken, refreshToken };
    }

    async login(loginDto: LoginDto) {
        // 1. Find the user by email
        const user = await this.usersService.findByEmailForAuth(loginDto.email);

        // 2. If user doesn't exist, kick them out
        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // 3. Compare the typed password with the scrambled hash in the DB
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

        // 4. If wrong password, kick them out
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // 5. Generate BOTH tokens using our new helper method
        const tokens = await this.generateTokens(user.id, user.email, user.role);

        // 6. Save the refresh token hash to the database
        await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

        // 7. Fetch full user data with profile and flatten into the old combined shape
        const fullUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            include: { profile: true },
        });

        if (!fullUser) {
            throw new UnauthorizedException('User not found');
        }

        const { password, refreshToken, profile, ...userData } = fullUser;
        const { id: _pid, createdAt: _pca, updatedAt: _pua, ...profileData } = profile || {};
        const flattenedUser = { ...userData, ...profileData };

        return {
            ...tokens,
            user: flattenedUser,
        };
    }

    // New method: Exchange a valid refresh token for a new access token
    async refreshTokens(userId: number, providedRefreshToken: string) {
        // 1. Find the user by ID (auth query — includes refreshToken)
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                password: true,
                role: true,
                refreshToken: true,
            },
        });

        // 2. If user doesn't exist, or doesn't have a token in the DB, reject
        if (!user || !user.refreshToken) {
            throw new ForbiddenException('Access Denied');
        }

        // 3. Compare the provided token with the hashed token in the DB
        const refreshTokenMatches = await bcrypt.compare(providedRefreshToken, user.refreshToken);
        if (!refreshTokenMatches) {
            throw new ForbiddenException('Access Denied');
        }

        // 4. Generate new tokens
        const tokens = await this.generateTokens(user.id, user.email, user.role);

        // 5. Update the DB with the new refresh token
        await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

        return tokens;
    }

    // New method: Logout (Deletes the refresh token from the DB)
    async logout(userId: number) {
        await this.usersService.removeRefreshToken(userId);
        return { message: 'Logged out successfully' };
    }

}
