import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Matches Prisma Role enum (renter, car_owner, admin)
enum UserRole {
  renter = 'renter',
  car_owner = 'car_owner',
  admin = 'admin',
}

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password (min 8 chars)' })
  @IsString()
  @MinLength(8, {
    message: 'Password is too weak! Must be at least 8 characters.',
  })
  password: string;

  @ApiPropertyOptional({ example: 'John Doe', description: 'Display name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'John William Doe', description: 'Full legal name' })
  @IsString()
  @IsOptional()
  full_name?: string;

  @ApiPropertyOptional({ example: '+959123456789', description: 'Phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg', description: 'Profile avatar URL' })
  @IsString()
  @IsOptional()
  avatar_url?: string;

  @ApiPropertyOptional({ example: '12/XXXXX(N)123456', description: 'National Registration Card number' })
  @IsString()
  @IsOptional()
  nrc?: string;

  @ApiPropertyOptional({ example: 'https://example.com/nrc.jpg', description: 'NRC image URL' })
  @IsString()
  @IsOptional()
  nrc_url?: string;

  @ApiPropertyOptional({ example: 'male', description: 'Gender' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ example: '11012', description: 'Postal code' })
  @IsString()
  @IsOptional()
  postal_code?: string;

  @ApiPropertyOptional({ example: 'Yangon, Myanmar', description: 'Location/address' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether the user is active' })
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Whether the user is blacklisted' })
  @IsOptional()
  is_blacklist?: boolean;

  @ApiPropertyOptional({ example: 'renter', description: 'User role: renter, car_owner, or admin' })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
