import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

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
        private mailService: MailService,
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

    // Generate and send a verification code
    async sendVerificationCode(email: string, type: 'signup' | 'password_reset' = 'signup') {
        // Check if there's a recent unused code (within last 60s) to prevent spam
        const recent = await this.prisma.verificationToken.findFirst({
            where: { email, type, usedAt: null, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
        });
        if (recent) {
            const elapsed = (Date.now() - recent.createdAt.getTime()) / 1000;
            if (elapsed < 60) {
                throw new BadRequestException('Please wait before requesting a new code.');
            }
        }

        const code = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await this.prisma.verificationToken.create({
            data: { email, token: code, type, expiresAt },
        });

        await this.mailService.sendVerificationCode(email, code);

        return { message: 'Verification code sent.', email };
    }

    // Verify an OTP code
    async verifyOtp(verifyOtpDto: VerifyOtpDto) {
        const { email, token } = verifyOtpDto;

        const record = await this.prisma.verificationToken.findFirst({
            where: { email, token, type: 'signup', usedAt: null, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
        });

        if (!record) {
            throw new BadRequestException('Invalid or expired verification code.');
        }

        await this.prisma.verificationToken.update({
            where: { id: record.id },
            data: { usedAt: new Date() },
        });

        return { message: 'Email verified successfully.', email };
    }

    // New method: Logout (Deletes the refresh token from the DB)
    async logout(userId: number) {
        await this.usersService.removeRefreshToken(userId);
        return { message: 'Logged out successfully' };
    }

}
