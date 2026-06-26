import { IsEmail, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email to verify' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  @IsString()
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  token: string;

  @ApiPropertyOptional({ example: 'signup', description: 'Verification type' })
  @IsString()
  @IsOptional()
  type?: 'signup' | 'password_reset';
}
