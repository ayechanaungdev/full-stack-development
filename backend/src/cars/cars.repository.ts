/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository } from '../common/base.repository';
import { Prisma } from '@prisma/client';
import { QueryCarDto } from './dto/query-car.dto';

@Injectable()
export class CarsRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma, 'car');
  }

  override async findOne(id: number) {
    return this.prisma.car.findUnique({
      where: { id },
      include: {
        carImages: { select: { id: true, image_url: true, is_primary: true } },
        reviews: { select: { rating: true } },
        bookings: {
          where: { status: { in: ['PENDING', 'APPROVED', 'COMPLETED'] } },
          select: { startDate: true, endDate: true, status: true },
        },
      },
    });
  }

  override async create(data: any) {
    const { images, ...carData } = data;
    if (carData.year === undefined || carData.year === null) {
      carData.year = new Date().getFullYear();
    }

    return this.prisma.$transaction(async (tx) => {
      const newCar = await tx.car.create({
        data: carData,
      });

      if (images && images.length > 0) {
        await tx.carImage.createMany({
          data: images.map(
            (img: {
              image_url: string;
              is_primary?: boolean;
              id?: number;
            }) => ({
              carId: newCar.id,
              image_url: img.image_url,
              is_primary: img.is_primary ?? false,
            }),
          ),
        });
      }

      return tx.car.findUnique({
        where: { id: newCar.id },
        include: {
          carImages: {
            select: { id: true, image_url: true, is_primary: true },
          },
          reviews: { select: { rating: true } },
        },
      });
    });
  }

  override async update(id: number, data: any) {
    const { images, ...carData } = data;

    return this.prisma.$transaction(async (tx) => {
      await tx.car.update({
        where: { id },
        data: carData,
      });

      if (images) {
        const existingImages = await tx.carImage.findMany({
          where: { carId: id },
        });

        const imageIdsToKeep = images
          .map(
            (img: { id?: number; image_url?: string; is_primary?: boolean }) =>
              img.id,
          )
          .filter(
            (imgId: number | undefined) =>
              imgId !== undefined && imgId !== null,
          );

        const imagesToDelete = existingImages.filter(
          (img) => !imageIdsToKeep.includes(img.id),
        );

        if (imagesToDelete.length > 0) {
          await tx.carImage.deleteMany({
            where: {
              id: { in: imagesToDelete.map((img) => img.id) },
            },
          });
        }

        for (const img of images as Array<{
          id?: number;
          image_url?: string;
          is_primary?: boolean;
        }>) {
          if (img.id) {
            await tx.carImage.update({
              where: { id: img.id },
              data: { is_primary: img.is_primary ?? false },
            });
          } else {
            await tx.carImage.create({
              data: {
                carId: id,
                image_url: img.image_url,
                is_primary: img.is_primary ?? false,
              },
            });
          }
        }
      }

      return tx.car.findUnique({
        where: { id },
        include: {
          carImages: {
            select: { id: true, image_url: true, is_primary: true },
          },
          reviews: { select: { rating: true } },
        },
      });
    });
  }

  async findAvailable() {
    return this.prisma.car.findMany({
      where: { status: 'Available' },
      include: { carImages: true, reviews: true },
    });
  }

  async findByBrand(brand: string) {
    return this.prisma.car.findMany({
      where: { brand },
      include: { carImages: true, reviews: true },
    });
  }

  async findByModel(model: string) {
    return this.prisma.car.findMany({
      where: { model },
    });
  }

  async findByYear(year: number) {
    return this.prisma.car.findMany({
      where: { year },
    });
  }

  async findWithBookings(carId: number) {
    return this.prisma.car.findUnique({
      where: { id: carId },
      include: { bookings: true },
    });
  }

  async findMinPrice() {
    const result = await this.prisma.car.findFirst({
      where: { status: 'Available' },
      orderBy: { pricePerDay: 'asc' },
      select: { pricePerDay: true },
    });
    return result?.pricePerDay ?? null;
  }

  async findMaxPrice() {
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
