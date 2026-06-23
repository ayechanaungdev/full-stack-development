import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository } from '../common/base.repository';
import { Prisma } from '@prisma/client';
import { QueryCarDto } from './dto/query-car.dto';

@Injectable()
export class CarsRepository extends BaseRepository<any> {
  constructor(prisma: PrismaService) {
    super(prisma, 'car');
  }

  async findAvailable(): Promise<any[]> {
    return this.prisma.car.findMany({
      where: { status: 'Available' },
      include: { carImages: true, reviews: true },
    });
  }

  async findByBrand(brand: string): Promise<any[]> {
    return this.prisma.car.findMany({
      where: { brand },
      include: { carImages: true, reviews: true },
    });
  }

  async findByModel(model: string): Promise<any[]> {
    return this.prisma.car.findMany({
      where: { model },
    });
  }

  async findByYear(year: number): Promise<any[]> {
    return this.prisma.car.findMany({
      where: { year },
    });
  }

  async findWithBookings(carId: number): Promise<any | null> {
    return this.prisma.car.findUnique({
      where: { id: carId },
      include: { bookings: true },
    });
  }

  async findMinPrice(): Promise<number | null> {
    const result = await this.prisma.car.findFirst({
      where: { status: 'Available' },
      orderBy: { pricePerDay: 'asc' },
      select: { pricePerDay: true },
    });
    return result?.pricePerDay ?? null;
  }

  async findMaxPrice(): Promise<number | null> {
    const result = await this.prisma.car.findFirst({
      where: { status: 'Available' },
      orderBy: { pricePerDay: 'desc' },
      select: { pricePerDay: true },
    });
    return result?.pricePerDay ?? null;
  }

  async findAllPaginated(query: QueryCarDto) {
    const {
      page = 0,
      limit = 10,
      status,
      search,
      brand,
      postal_code,
      car_type,
      seats,
      priceMin,
      priceMax,
      ownerId,
      startDate,
      endDate,
    } = query;

    const where: Prisma.CarWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (brand) {
      where.brand = { equals: brand, mode: 'insensitive' };
    }

    if (postal_code) {
      where.postal_code = postal_code;
    }

    if (car_type) {
      where.car_type = { equals: car_type, mode: 'insensitive' };
    }

    if (seats) {
      where.seats = seats;
    }

    if (priceMin !== undefined || priceMax !== undefined) {
      where.pricePerDay = {};
      if (priceMin !== undefined) where.pricePerDay.gte = priceMin;
      if (priceMax !== undefined) where.pricePerDay.lte = priceMax;
    }

    if (ownerId !== undefined) {
      where.ownerId = ownerId;
    }

    if (search) {
      const searchStr = search.trim();
      where.OR = [
        { brand: { contains: searchStr, mode: 'insensitive' } },
        { model: { contains: searchStr, mode: 'insensitive' } },
        { car_number: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      where.bookings = {
        none: {
          status: { in: ['APPROVED', 'PENDING'] },
          startDate: { lte: end },
          endDate: { gte: start },
        },
      };
    }

    const skip = page * limit;

    const [data, total] = await Promise.all([
      this.prisma.car.findMany({
        where,
        include: {
          carImages: { select: { image_url: true } },
          reviews: { select: { rating: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.car.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
