import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt.guard';
import { JwtRefreshAuthGuard } from './jwt-refresh.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
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
