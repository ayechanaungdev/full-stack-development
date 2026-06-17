import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository } from '../common/base.repository';

/**
 * Users Repository
 * Handles all database operations for User entity
 */
@Injectable()
export class UsersRepository extends BaseRepository<any> {
  constructor(prisma: PrismaService) {
    super(prisma, 'user');
  }

  // Custom methods specific to Users
  async findByEmail(email: string): Promise<any | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByEmailForAuth(email: string): Promise<any | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        refreshToken: true,
        is_active: true,
      },
    });
  }

  async updateRefreshToken(userId: number, refreshToken: string): Promise<any> {
    const hashedRefreshToken = await this.hashToken(refreshToken);
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefreshToken },
    });
  }

  async removeRefreshToken(userId: number): Promise<any> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async updateFcmToken(userId: number, fcmToken: string): Promise<any> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });
  }

  async findByRole(role: string): Promise<any[]> {
    return this.prisma.user.findMany({
      where: { role: role as any },
    });
  }

  async findWithBookings(userId: number): Promise<any | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { bookings: true },
    });
  }

  async findActiveUsers(): Promise<any[]> {
    return this.prisma.user.findMany({
      where: { is_active: true },
    });
  }

  // Helper method to hash tokens
  private async hashToken(token: string): Promise<string> {
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    return await bcrypt.hash(token, saltRounds);
  }
}
