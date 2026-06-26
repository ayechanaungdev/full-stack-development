import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

export interface CheckPhoneResult {
  exists: boolean;
}

export type FlattenedUser = Record<string, any>;

@Injectable()
export class UsersService {
  constructor(
    private usersRepository: UsersRepository,
    private prisma: PrismaService,
  ) {}

  // Fields that go on User (auth) vs Profile (details)
  private readonly userFields = [
    'name',
    'password',
    'role',
    'fcmToken',
    'refreshToken',
  ];
  private readonly profileFields = [
    'full_name',
    'phone',
    'avatar_url',
    'nrc',
    'nrc_url',
    'gender',
    'postal_code',
    'location',
    'is_active',
    'is_blacklist',
    'expo_push_token',
  ];

  private isUserField(key: string): boolean {
    return this.userFields.includes(key);
  }

  private isProfileField(key: string): boolean {
    return this.profileFields.includes(key);
  }

  // Flatten a Prisma result (user + included profile) into the old combined shape
  private flatten(user: any): FlattenedUser | null {
    if (!user) return null;
    /* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment */
    const {
      profile,
      password: _password,
      refreshToken: _refreshToken,
      ...userData
    } = user;
    /* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment */
    if (!profile) return { ...userData } as FlattenedUser;
    /* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment */
    const {
      id: _pid,
      createdAt: _pca,
      updatedAt: _pua,
      ...profileData
    } = profile;
    /* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment */
    return { ...userData, ...profileData } as FlattenedUser;
  }

  // create a user + profile
  async create(createUserDto: CreateUserDto) {
    try {
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      const result = await this.prisma.$transaction(async (tx) => {
        const userData: Record<string, unknown> = {
          email: createUserDto.email,
          password: hashedPassword,
        };
        userData.name = createUserDto.name ?? createUserDto.full_name ?? null;
        if (createUserDto.role !== undefined)
          userData.role = createUserDto.role;

        const newUser = await tx.user.create({ data: userData });

        const profileData: Record<string, unknown> = {};
        for (const field of this.profileFields) {
          if ((createUserDto as Record<string, unknown>)[field] !== undefined) {
            profileData[field] = (createUserDto as Record<string, unknown>)[
              field
            ];
          }
        }
        if (Object.keys(profileData).length > 0) {
          profileData.id = newUser.id;
          await tx.profile.create({ data: profileData });
        }

        return tx.user.findUnique({
          where: { id: newUser.id },
          include: { profile: true },
        });
      });

      return this.flatten(result);
    } catch (error: unknown) {
      const prismaError = error as {
        code?: string;
        meta?: { target?: string[] };
      };
      if (prismaError.code === 'P2002') {
        const target = prismaError.meta?.target as string[];
        const fieldName = target ? target.join(', ') : 'field';
        throw new ConflictException(
          `The ${fieldName} is already taken! Please use another one.`,
        );
      }
      console.error('Database Error:', error);
      throw new InternalServerErrorException(
        'Something went wrong on our side.',
      );
    }
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { profile: true },
    });
    return users
      .map((u) => this.flatten(u))
      .filter((u): u is FlattenedUser => u !== null);
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
    return this.flatten(user);
  }

  async findByEmailForAuth(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        profile: {
          select: { is_active: true, is_blacklist: true },
        },
      },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const userUpdate: Record<string, unknown> = {};
        for (const key of Object.keys(updateUserDto)) {
          if (this.isUserField(key)) {
            if (key === 'password') {
              userUpdate[key] = await bcrypt.hash(
                (updateUserDto as Record<string, unknown>)[key] as string,
                10,
              );
            } else {
              userUpdate[key] = (updateUserDto as Record<string, unknown>)[key];
            }
          }
        }
        if (Object.keys(userUpdate).length > 0) {
          await tx.user.update({ where: { id }, data: userUpdate });
        }

        if (!updateUserDto.password) {
          const profileUpdate: Record<string, unknown> = {};
          for (const key of Object.keys(updateUserDto)) {
            if (this.isProfileField(key)) {
              profileUpdate[key] = (updateUserDto as Record<string, unknown>)[
                key
              ];
            }
          }
          if (Object.keys(profileUpdate).length > 0) {
            await tx.profile.upsert({
              where: { id },
              create: { id, ...profileUpdate },
              update: profileUpdate,
            });
          }
        }
      });

      const updated = await this.prisma.user.findUnique({
        where: { id },
        include: { profile: true },
      });
      return this.flatten(updated);
    } catch (error: unknown) {
      const prismaError = error as {
        code?: string;
        meta?: { target?: string[] };
      };
      if (prismaError.code === 'P2002') {
        const target = prismaError.meta?.target as string[];
        const fieldName = target ? target.join(', ') : 'field';
        throw new ConflictException(
          `The ${fieldName} is already taken! Please use another one.`,
        );
      }
      console.error('Database Error:', error);
      throw new InternalServerErrorException(
        'Something went wrong on our side.',
      );
    }
  }

  async updateRefreshToken(userId: number, refreshToken: string): Promise<any> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    return this.usersRepository.updateRefreshToken(userId, hashedRefreshToken);
  }

  async removeRefreshToken(userId: number): Promise<any> {
    return this.usersRepository.removeRefreshToken(userId);
  }

  remove(id: number): Promise<any> {
    return this.usersRepository.remove(id);
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });
    return this.flatten(user);
  }

  async checkPhone(
    phone: string,
    excludeId?: number,
  ): Promise<CheckPhoneResult> {
    const profile = await this.usersRepository.findByPhone(phone);
    if (!profile) return { exists: false };
    if (excludeId && profile.id === excludeId) return { exists: false };
    return { exists: true };
  }

  async updateFcmToken(userId: number, fcmToken: string): Promise<any> {
    return this.usersRepository.updateFcmToken(userId, fcmToken);
  }

  async updatePushToken(userId: number, expoPushToken: string | null) {
    const token = expoPushToken?.trim() || null;
    await this.prisma.profile.upsert({
      where: { id: userId },
      create: { id: userId, expo_push_token: token },
      update: { expo_push_token: token },
    });
    return { success: true };
  }

  async findByRole(role: string): Promise<any> {
    const users = await this.prisma.user.findMany({
      where: { role },
      include: { profile: true },
    });
    return users
      .map((u) => this.flatten(u))
      .filter((u): u is FlattenedUser => u !== null);
  }

  async findWithBookings(userId: number) {
    const user = await this.usersRepository.findWithBookings(userId);
    return this.flatten(user);
  }
}
