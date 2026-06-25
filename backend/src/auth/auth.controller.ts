import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';
import { JwtAuthGuard } from './jwt.guard';
import { JwtRefreshAuthGuard } from './jwt-refresh.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  googleLogin(@Body() googleLoginDto: GoogleLoginDto) {
    return this.authService.googleLogin(googleLoginDto);
  }

  @Post('signup')
  async signup(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    // Auto-send verification email after signup
    await this.authService.sendVerificationCode(createUserDto.email, 'signup').catch(() => null);
    return user;
  }

  @Post('send-verification')
  @HttpCode(HttpStatus.OK)
  sendVerification(@Body() body: { email: string; type?: 'signup' | 'password_reset' }) {
    return this.authService.sendVerificationCode(body.email, body.type || 'signup');
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  // 1. Refresh Route (Protected by the Second Bouncer!)
  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refreshTokens(@Request() req: any) {
    // The Guard automatically extracts the user's ID from the Refresh Token
    const userId = req.user.userId;

    // We also need the raw token string from the header to compare it
    const refreshToken = req.headers.authorization.replace('Bearer ', '');

    return this.authService.refreshTokens(userId, refreshToken);
  }

  // 2. Logout Route (Protected by the standard Access Token Bouncer)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Request() req: any) {
    // Delete the refresh token from the database
    return this.authService.logout(req.user.userId);
  }
}
