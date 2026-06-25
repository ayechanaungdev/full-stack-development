import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository } from '../common/base.repository';

/**
 * Bookings Repository
 * Handles all database operations for Booking entity
 */
@Injectable()
export class BookingsRepository extends BaseRepository<any> {
  constructor(prisma: PrismaService) {
    super(prisma, 'booking');
  }

  private carInclude = {
    include: {
      carImages: {
        select: { image_url: true, is_primary: true },
      },
    },
  };

  // Custom methods specific to Bookings
  async findByUserId(userId: number): Promise<any[]> {
    return this.prisma.booking.findMany({
      where: { userId },
      include: { car: { ...this.carInclude }, user: true },
    });
  }

  async findByCarId(carId: number): Promise<any[]> {
    return this.prisma.booking.findMany({
      where: { carId },
      include: { user: true, car: { ...this.carInclude } },
    });
  }

  async findByStatus(status: string): Promise<any[]> {
    return this.prisma.booking.findMany({
      where: { status: status as any },
      include: { car: { ...this.carInclude }, user: true },
    });
  }

  async findOverlappingBooking(carId: number, startDate: Date, endDate: Date): Promise<any | null> {
    return this.prisma.booking.findFirst({
      where: {
        carId,
        status: { in: ['PENDING', 'APPROVED'] },
        AND: [
          { startDate: { lte: new Date(endDate) } },
          { endDate: { gte: new Date(startDate) } },
        ],
      },
    });
  }

  async createWithRelations(data: any): Promise<any> {
    return this.prisma.booking.create({
      data,
      include: {
        car: { include: { owner: { include: { profile: true } } } },
        user: { include: { profile: true } },
      },
    });
  }

  async updateStatus(id: number, status: string): Promise<any> {
    return this.prisma.booking.update({
      where: { id },
      data: { status: status as any },
      include: {
        user: { include: { profile: true } },
        car: { include: { owner: { include: { profile: true } } } },
      },
    });
  }

  async findWithDetails(id: number): Promise<any | null> {
    return this.prisma.booking.findUnique({
      where: { id },
      include: {
        car: {
          include: {
            carImages: {
              select: { image_url: true, is_primary: true },
            },
          },
        },
        user: true,
      },
    });
  }

  async findAllPaginated(where: any, skip: number, take: number): Promise<any[]> {
    return this.prisma.booking.findMany({
      where,
      skip,
      take,
      orderBy: { startDate: 'desc' },
      include: {
        car: {
          include: {
            carImages: {
              select: { image_url: true, is_primary: true },
            },
          },
        },
        user: true,
      },
    });
  }

  async count(where: any): Promise<number> {
    return this.prisma.booking.count({ where });
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    return this.prisma.booking.findMany({
      where: {
        AND: [
          { startDate: { lte: endDate } },
          { endDate: { gte: startDate } },
        ],
      },
      include: { car: { ...this.carInclude }, user: true },
    });
  }

  async findPendingBookings(): Promise<any[]> {
    return this.prisma.booking.findMany({
      where: { status: 'PENDING' },
      include: { car: { ...this.carInclude }, user: true },
    });
  }

  async findActiveBookings(): Promise<any[]> {
    return this.prisma.booking.findMany({
      where: {
        status: { in: ['APPROVED', 'COMPLETED'] },
      },
      include: { car: { ...this.carInclude }, user: true },
    });
  }
}
