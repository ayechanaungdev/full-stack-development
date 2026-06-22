import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  token: string;

  @IsString()
  @IsOptional()
  type?: 'signup' | 'password_reset';
}
