import {
    Injectable,
    ConflictException,
    InternalServerErrorException
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

/**
 * Users Service
 * Business logic layer - uses Repository for data access
 */
@Injectable()
export class UsersService {
    constructor(private usersRepository: UsersRepository) { }

    // create a user
    async create(createUserDto: CreateUserDto) {
        try {
            // 1. Hash the password before saving! (10 is the "salt rounds" - security level)
            const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
            // 2. Save the user with the hashed password instead of the real one
            const newUser = await this.usersRepository.create({
                ...createUserDto,
                password: hashedPassword, // 👈 Override the plain text password
            });
            // 3. Security: Separate the password from the rest of the user data for security reasons
            const { password, ...userWithoutPassword } = newUser;

            // 4. Return the user data without the password (clean object)
            return userWithoutPassword;

        } catch (error) {
            // ... (Keep your existing P2002 error handling here) ...
            if (error.code === 'P2002') {
                const target = error.meta?.target as string[];
                const fieldName = target ? target.join(', ') : 'field';
                throw new ConflictException(`The ${fieldName} is already taken! Please use another one.`);
            }
            console.error('Database Error:', error);
            throw new InternalServerErrorException('Something went wrong on our side.');
        }
    }

    // find all users (SECURITY LEAK FIXED)
    async findAll() {
        const users = await this.usersRepository.findAll();
        // Remove password from every user before sending
        return users.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });
    }

    // find one user by id (SECURITY LEAK FIXED)
    async findOne(id: number) {
        const user = await this.usersRepository.findOne(id);
        if (!user) return null; // Handle if user doesn't exist

        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    // find user by email for auth
    async findByEmailForAuth(email: string) {
        return this.usersRepository.findByEmailForAuth(email);
    }

    // update a user by id (HASHING ADDED)
    async update(id: number, updateUserDto: UpdateUserDto) {
        try {
            // 1. If they are trying to update their password, we must hash the new one!
            if (updateUserDto.password) {
                updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
            }
            // 2. Perform the update
            const updatedUser = await this.usersRepository.update(id, updateUserDto);
            // 3. Security: Separate the password before returning
            const { password, ...userWithoutPassword } = updatedUser;
            return userWithoutPassword;
        } catch (error) {
            if (error.code === 'P2002') {
                const target = error.meta?.target as string[];
                const fieldName = target ? target.join(', ') : 'field';
                throw new ConflictException(`The ${fieldName} is already taken! Please use another one.`);
            }
            console.error('Database Error:', error);
            throw new InternalServerErrorException('Something went wrong on our side.');
        }
    }

    // update the refresh token
    async updateRefreshToken(userId: number, refreshToken: string) {
        return this.usersRepository.updateRefreshToken(userId, refreshToken);
    }

    // Delete the refresh token the db (for Logout)
    async removeRefreshToken(userId: number) {
        return this.usersRepository.removeRefreshToken(userId);
    }

    // remove a user by id
    async remove(id: number) {
        return this.usersRepository.remove(id);
    }

    // Additional business logic methods using repository
    async findByEmail(email: string) {
        return this.usersRepository.findByEmail(email);
    }

    async updateFcmToken(userId: number, fcmToken: string) {
        return this.usersRepository.updateFcmToken(userId, fcmToken);
    }

    async findByRole(role: string) {
        return this.usersRepository.findByRole(role);
    }

    async findWithBookings(userId: number) {
        return this.usersRepository.findWithBookings(userId);
    }
}
