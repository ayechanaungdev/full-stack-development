import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';

// This matches our Prisma Enum
enum UserRole {
    USER = 'USER',
    ADMIN = 'ADMIN',
}

export class CreateUserDto {
    @IsEmail() // 👈 Checks if it looks like "test@test.com"
    email: string;

    @IsString()
    @MinLength(8, { message: 'Password is too weak! Must be at least 8 characters.' }) // 👈 Custom error message!
    password: string;

    @IsString()
    @IsOptional()
    name?: string;

    @IsEnum(UserRole) // 👈 Only allows 'USER' or 'ADMIN'
    @IsOptional()
    role?: UserRole;
}
