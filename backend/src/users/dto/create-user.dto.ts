import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';

// This matches our Prisma Enum
enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export class CreateUserDto {
  @IsEmail() // 👈 Checks if it looks like "test@test.com"
  email: string;

  @IsString()
  @MinLength(8, {
    message: 'Password is too weak! Must be at least 8 characters.',
  }) // 👈 Custom error message!
  password: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  full_name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  avatar_url?: string;

  @IsString()
  @IsOptional()
  nrc?: string;

  @IsString()
  @IsOptional()
  nrc_url?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  postal_code?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsOptional()
  is_active?: boolean;

  @IsOptional()
  is_blacklist?: boolean;

  @IsEnum(UserRole) // 👈 Only allows 'USER' or 'ADMIN'
  @IsOptional()
  role?: UserRole;
}
