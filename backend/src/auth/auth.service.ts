import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

/**
 * Auth Service
 * Business logic layer - uses UsersService (which uses Repository) for data access
 */
@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
  ) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    this.googleClient = new OAuth2Client(clientId);
  }

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

    // 3. If user signed up via Google, they have no password
    if (!user.password) {
      throw new UnauthorizedException(
        'This account uses Google Sign-In. Please sign in with Google.',
      );
    }

    // 4. Compare the typed password with the scrambled hash in the DB
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    // 5. If wrong password, kick them out
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, profile, ...userData } = fullUser;
    const profileSafe = profile || {};
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, createdAt, updatedAt, ...profileData } = profileSafe;
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
    const refreshTokenMatches = await bcrypt.compare(
      providedRefreshToken,
      user.refreshToken,
    );
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
  async sendVerificationCode(
    email: string,
    type: 'signup' | 'password_reset' = 'signup',
  ) {
    // For password reset, verify the user exists first
    if (type === 'password_reset') {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new NotFoundException('No account found with this email.');
      }
    }

    // Check if there's a recent unused code (within last 60s) to prevent spam
    const recent = await this.prisma.verificationToken.findFirst({
      where: { email, type, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      const elapsed = (Date.now() - recent.createdAt.getTime()) / 1000;
      if (elapsed < 60) {
        throw new BadRequestException(
          'Please wait before requesting a new code.',
        );
      }
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.verificationToken.create({
      data: { email, token: code, type, expiresAt },
    });

    if (type === 'password_reset') {
      await this.mailService.sendPasswordResetCode(email, code);
    } else {
      await this.mailService.sendVerificationCode(email, code);
    }

    return { message: 'Verification code sent.', email };
  }

  // Verify an OTP code
  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, token, type } = verifyOtpDto;
    const otpType = type || 'signup';

    const record = await this.prisma.verificationToken.findFirst({
      where: {
        email,
        token,
        type: otpType,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
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

  // Reset password using a verified OTP
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, token, newPassword } = resetPasswordDto;

    const record = await this.prisma.verificationToken.findFirst({
      where: {
        email,
        token,
        type: 'password_reset',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired reset code.');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.verificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
    ]);

    return { message: 'Password reset successfully.', email };
  }

  // New method: Logout (Deletes the refresh token from the DB)
  async logout(userId: number) {
    await this.usersService.removeRefreshToken(userId);
    return { message: 'Logged out successfully' };
  }

  async googleLogin(googleLoginDto: GoogleLoginDto) {
    const { idToken } = googleLoginDto;

    // 1. Verify the Google ID token
    let payload: {
      email?: string;
      name?: string;
      sub?: string;
      picture?: string;
    };
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: clientId,
      });
      const result = ticket.getPayload();
      if (!result) {
        throw new UnauthorizedException('Invalid Google token.');
      }
      payload = result;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Google token verification failed.');
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || email?.split('@')[0] || 'User';

    if (!googleId || !email) {
      throw new BadRequestException(
        'Google account missing required information.',
      );
    }

    // 2. Find existing user by googleId, then by email
    let user = await this.prisma.user.findUnique({
      where: { googleId },
      include: { profile: true },
    });

    if (!user) {
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingByEmail) {
        // 3a. Link Google account to existing email user
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: { googleId, provider: 'google' },
          include: { profile: true },
        });
      } else {
        // 3b. Create new user from Google profile
        const created = await this.prisma.user.create({
          data: {
            email,
            name,
            googleId,
            provider: 'google',
            password: null,
          },
        });

        await this.prisma.profile.create({
          data: {
            id: created.id,
            full_name: name,
            avatar_url: payload.picture || null,
          },
        });

        user = await this.prisma.user.findUnique({
          where: { id: created.id },
          include: { profile: true },
        });
      }
    }

    if (!user) {
      throw new InternalServerErrorException('Failed to create or find user.');
    }

    // 4. Check if user is active
    const userProfile = user.profile;
    if (
      userProfile?.is_active === false ||
      userProfile?.is_blacklist === true
    ) {
      throw new ForbiddenException('Account is deactivated or blacklisted.');
    }

    // 5. Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // 6. Save refresh token
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    // 7. Flatten user data (same format as login response)

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const {
      password,
      refreshToken,
      profile: userProfileData,
      ...userData
    } = user;
    const profileSafe = userProfileData || {};
    const { id, createdAt, updatedAt, ...profileData } = profileSafe;
    /* eslint-enable @typescript-eslint/no-unused-vars */
    const flattenedUser = { ...userData, ...profileData };

    return {
      ...tokens,
      user: flattenedUser,
    };
  }
}
