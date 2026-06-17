import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository } from '../common/base.repository';

/**
 * Cars Repository
 * Handles all database operations for Car entity
 */
@Injectable()
export class CarsRepository extends BaseRepository<any> {
  constructor(prisma: PrismaService) {
    super(prisma, 'car');
  }

  // Custom methods specific to Cars
  async findAvailable(): Promise<any[]> {
    return this.prisma.car.findMany({
      where: { isAvailable: true },
    });
  }

  async findByBrand(brand: string): Promise<any[]> {
    return this.prisma.car.findMany({
      where: { brand },
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
}
