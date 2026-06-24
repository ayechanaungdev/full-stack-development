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
          OR: [
            { userId },
            { ownerId: userId },
          ],
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

  async markNotificationsBySenderAsRead(userId: number, senderId: number, type?: string) {
    const where: any = {
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

  async findAll(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
