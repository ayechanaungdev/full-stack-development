import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBadgeCounts(userId: number) {
    const [notifications, messages, bookings, reports] = await Promise.all([
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
      this.prisma.message.count({
        where: { receiverId: userId, isRead: false },
      }),
      this.prisma.booking.count({
        where: {
          isRead: false,
          OR: [{ userId }, { ownerId: userId }],
        },
      }),
      this.prisma.dailyReport.count({
        where: { ownerId: userId, isRead: false },
      }),
    ]);

    return { notifications, messages, bookings, reports };
  }

  async markAsRead(notificationId: number) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markManyAsRead(ids: number[]) {
    return this.prisma.notification.updateMany({
      where: { id: { in: ids } },
      data: { isRead: true },
    });
  }

  async markNotificationsBySenderAsRead(
    userId: number,
    senderId: number,
    type?: string,
  ): Promise<any> {
    const where: Record<string, unknown> = {
      userId,
      senderId,
      isRead: false,
    };
    if (type) {
      where.type = type;
    }
    return this.prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });
  }

  async findAll(userId: number, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { data, total, page, limit };
  }

  async deleteMany(userId: number, ids: number[]) {
    return this.prisma.notification.deleteMany({
      where: { id: { in: ids }, userId },
    });
  }
}
