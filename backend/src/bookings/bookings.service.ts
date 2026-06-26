import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { BookingsRepository } from './bookings.repository';
import { CreateBookingDto } from './dto/create-booking.dto';
import { FirebaseService } from 'src/firebase/firebase.service';
import { ChatGateway } from 'src/chat/chat.gateway';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BookingsService {
  constructor(
    private bookingsRepository: BookingsRepository,
    private firebaseService: FirebaseService,
    private chatGateway: ChatGateway,
    private prisma: PrismaService,
  ) {}

  async create(createBookingDto: CreateBookingDto) {
    const { carId, startDate, endDate } = createBookingDto;

    const start = new Date(startDate);
    const end = new Date(endDate);

    const existingBooking =
      await this.bookingsRepository.findOverlappingBooking(carId, start, end);

    if (existingBooking) {
      throw new ConflictException(
        'This car is already booked for the selected dates!',
      );
    }

    // Get ownerId from car if not provided
    if (!createBookingDto.ownerId) {
      const car = await this.prisma.car.findUnique({
        where: { id: carId },
        select: { ownerId: true },
      });
      if (car && car.ownerId !== null) {
        createBookingDto.ownerId = car.ownerId;
      }
    }

    // Convert date strings to Date objects for Prisma
    const bookingData = {
      ...createBookingDto,
      startDate: start,
      endDate: end,
    };

    const newBooking =
      await this.bookingsRepository.createWithRelations(bookingData);
    const carOwnerId = newBooking.car?.ownerId;

    // Create notification + Socket.IO emit for car owner
    if (carOwnerId) {
      const ownerNotiTitle = 'New Booking Received!';
      const ownerNotiBody = `${newBooking.user?.name || 'A user'} booked your ${newBooking.car.brand} ${newBooking.car.model}.`;

      const notification = await this.prisma.notification.create({
        data: {
          title: ownerNotiTitle,
          body: ownerNotiBody,
          type: 'NEW_BOOKING',
          userId: carOwnerId,
          senderId: newBooking.userId,
          bookingId: newBooking.id,
        },
      });

      void this.chatGateway.emitToUser(carOwnerId, 'newBooking', {
        booking: newBooking,
        notification,
      });

      // Emit badge update to owner
      const ownerBadgeCounts = await this.getBadgeCounts(carOwnerId);
      void this.chatGateway.emitToUser(
        carOwnerId,
        'badgeUpdate',
        ownerBadgeCounts,
      );

      // Send push to owner if they have expo push token
      if (newBooking.car.owner?.profile?.expo_push_token) {
        void this.firebaseService.sendPushNotification(
          newBooking.car.owner.profile.expo_push_token,
          ownerNotiTitle,
          ownerNotiBody,
        );
      }
    }

    return newBooking;
  }

  async findAll(
    user: { userId: number; role: string },
    filters?: {
      status?: string;
      page?: number;
      limit?: number;
      month?: number;
      year?: number;
      search?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (user.role === 'car_owner') {
      where.ownerId = user.userId;
    } else if (user.role !== 'admin') {
      where.userId = user.userId;
    }

    if (filters?.status) {
      where.status = filters.status.toUpperCase();
    }

    if (filters?.month !== undefined && filters?.year !== undefined) {
      const startDate = new Date(filters.year, filters.month, 1);
      const endDate = new Date(filters.year, filters.month + 1, 0, 23, 59, 59);
      where.startDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (filters?.startDate || filters?.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (filters?.startDate) {
        dateFilter.gte = new Date(filters.startDate);
      }
      if (filters?.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.startDate = dateFilter;
    }

    if (filters?.search) {
      where.OR = [
        {
          id: {
            equals: isNaN(Number(filters.search))
              ? undefined
              : Number(filters.search),
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.bookingsRepository.findAllPaginated(where, skip, limit),
      this.bookingsRepository.count(where),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: number, user: { userId: number; role: string }) {
    const booking = await this.bookingsRepository.findWithDetails(id);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (
      user.role !== 'ADMIN' &&
      booking.userId !== user.userId &&
      booking.car?.ownerId !== user.userId
    ) {
      throw new ForbiddenException('Access denied');
    }

    return booking;
  }

  async markAsRead(id: number, userId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      select: { userId: true, ownerId: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId && booking.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.booking.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async updateStatus(id: number, status: string, driverId?: number) {
    const normalizedStatus = status.toUpperCase();
    const updatedBooking = await this.bookingsRepository.updateStatus(
      id,
      normalizedStatus,
      driverId,
    );

    // Notify the customer
    if (updatedBooking.user) {
      const title = `Booking Status Updated!`;
      const body = `Your booking for ${updatedBooking.car.brand} ${updatedBooking.car.model} has been updated to ${status}.`;

      // Create DB notification record
      const notification = await this.prisma.notification.create({
        data: {
          title,
          body,
          type: `STATUS_CHANGED_${status}`,
          userId: updatedBooking.userId,
          senderId: updatedBooking.car.ownerId,
          bookingId: updatedBooking.id,
        },
      });

      // Emit via Socket.IO
      void this.chatGateway.emitToUser(updatedBooking.userId, 'bookingUpdate', {
        booking: updatedBooking,
        notification,
      });

      // Emit badge update to customer
      const customerBadgeCounts = await this.getBadgeCounts(
        updatedBooking.userId,
      );
      void this.chatGateway.emitToUser(
        updatedBooking.userId,
        'badgeUpdate',
        customerBadgeCounts,
      );

      // Send push notification if expo push token exists
      if (updatedBooking.user?.profile?.expo_push_token) {
        void this.firebaseService.sendPushNotification(
          updatedBooking.user.profile.expo_push_token,
          title,
          body,
          {
            url: `carrentalv2://booking/${updatedBooking.id}`,
            notification_id: String(notification.id),
          },
        );
      }
    }

    // Also notify the car owner about the status change
    const carOwnerId = updatedBooking.car?.ownerId;
    if (carOwnerId && carOwnerId !== updatedBooking.userId) {
      const ownerTitle = `Booking #${updatedBooking.id} ${status}`;
      const ownerBody = `Booking for ${updatedBooking.car.brand} ${updatedBooking.car.model} by ${updatedBooking.user?.name || 'customer'} is now ${status}.`;

      const ownerNoti = await this.prisma.notification.create({
        data: {
          title: ownerTitle,
          body: ownerBody,
          type: `OWNER_STATUS_CHANGED_${status}`,
          userId: carOwnerId,
          senderId: updatedBooking.userId,
          bookingId: updatedBooking.id,
        },
      });

      void this.chatGateway.emitToUser(carOwnerId, 'bookingUpdate', {
        booking: updatedBooking,
        notification: ownerNoti,
      });

      const ownerBadgeCounts = await this.getBadgeCounts(carOwnerId);
      void this.chatGateway.emitToUser(
        carOwnerId,
        'badgeUpdate',
        ownerBadgeCounts,
      );

      if (updatedBooking.car.owner?.profile?.expo_push_token) {
        void this.firebaseService.sendPushNotification(
          updatedBooking.car.owner.profile.expo_push_token,
          ownerTitle,
          ownerBody,
          {
            url: `carrentalv2://booking/${updatedBooking.id}`,
            notification_id: String(ownerNoti.id),
          },
        );
      }
    }

    return updatedBooking;
  }

  async findByCarId(carId: number) {
    return this.bookingsRepository.findByCarId(carId);
  }

  async findByStatus(status: string) {
    return this.bookingsRepository.findByStatus(status);
  }

  async findPendingBookings() {
    return this.bookingsRepository.findPendingBookings();
  }

  async findActiveBookings() {
    return this.bookingsRepository.findActiveBookings();
  }

  async getOwnerDashboard(ownerId: number) {
    const now = new Date();
    const localYear = now.getFullYear();
    const localMonth = now.getMonth();
    const localDay = now.getDate();
    const startOfYear = new Date(localYear, 0, 1);

    const lastMonthYear = localMonth === 0 ? localYear - 1 : localYear;
    const lastMonthIndex = localMonth === 0 ? 11 : localMonth - 1;

    const bookings = await this.prisma.booking.findMany({
      where: {
        car: { ownerId },
        status: 'COMPLETED',
        endDate: { gte: startOfYear },
      },
      select: {
        totalPrice: true,
        endDate: true,
      },
    });

    const earnings = bookings.reduce(
      (acc, b) => {
        const bookingTotal = Number(b.totalPrice) || 0;
        const bDate = new Date(b.endDate);
        const bYear = bDate.getFullYear();
        const bMonth = bDate.getMonth();
        const bDay = bDate.getDate();

        acc.total += bookingTotal;
        acc.thisYear += bookingTotal;
        if (bYear === localYear && bMonth === localMonth && bDay === localDay)
          acc.today += bookingTotal;
        if (bYear === localYear && bMonth === localMonth)
          acc.thisMonth += bookingTotal;
        if (bYear === lastMonthYear && bMonth === lastMonthIndex)
          acc.lastMonth += bookingTotal;

        return acc;
      },
      { total: 0, today: 0, thisMonth: 0, lastMonth: 0, thisYear: 0 },
    );

    const carCount = await this.prisma.car.count({
      where: { ownerId },
    });

    const activeCount = await this.prisma.booking.count({
      where: {
        car: { ownerId },
        status: 'APPROVED',
      },
    });

    const driverCount = await this.prisma.driver.count({
      where: { ownerId },
    });

    const overview = {
      cars: carCount || 0,
      activeRentals: activeCount || 0,
      drivers: driverCount || 0,
    };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayTrips = await this.prisma.booking.findMany({
      where: {
        car: { ownerId },
        status: 'APPROVED',
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
      select: {
        id: true,
        pickupLocation: true,
        status: true,
        startDate: true,
        endDate: true,
        car: {
          select: {
            id: true,
            brand: true,
            model: true,
            ownerId: true,
            carImages: {
              select: {
                image_url: true,
              },
            },
          },
        },
        driver: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    const trips = todayTrips.map((trip) => ({
      id: trip.id,
      pickupLocation: trip.pickupLocation,
      status: trip.status,
      startDate: trip.startDate,
      endDate: trip.endDate,
      Car: {
        id: trip.car.id,
        brand: trip.car.brand,
        model: trip.car.model,
        ownerId: trip.car.ownerId,
        CarImage: trip.car.carImages.map((img) => ({
          image_url: img.image_url,
        })),
      },
      Driver: trip.driver ? { name: trip.driver.name } : null,
    }));

    const cars = await this.prisma.car.findMany({
      where: { ownerId },
      select: { status: true },
    });

    const availableCount = cars.filter(
      (car) => car.status?.toLowerCase() === 'available',
    ).length;

    const fleet = {
      available: availableCount,
      unavailable: cars.length - availableCount,
    };

    return { earnings, overview, trips, fleet };
  }

  private async getBadgeCounts(userId: number) {
    const [notifications, messages, bookings, reports] = await Promise.all([
      this.prisma.notification.count({ where: { userId, isRead: false } }),
      this.prisma.message.count({
        where: { receiverId: userId, isRead: false },
      }),
      this.prisma.booking.count({
        where: { isRead: false, OR: [{ userId }, { ownerId: userId }] },
      }),
      this.prisma.dailyReport.count({
        where: { ownerId: userId, isRead: false },
      }),
    ]);
    return { notifications, messages, bookings, reports };
  }
}
