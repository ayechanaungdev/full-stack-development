import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository } from '../common/base.repository';

/**
 * Drivers Repository
 * Handles all database operations for Driver entity
 */
@Injectable()
export class DriversRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma, 'driver');
  }

  // Custom methods specific to Drivers
  async findByOwnerId(ownerId: number) {
    return this.prisma.driver.findMany({
      where: { ownerId },
      include: { bookings: true },
    });
  }

  async findByStatus(status: string) {
    return this.prisma.driver.findMany({
      where: { status },
      include: { bookings: true },
    });
  }

  async findAvailable() {
    return this.prisma.driver.findMany({
      where: { status: 'available' },
      include: { bookings: true },
    });
  }

  async findWithBookings(driverId: number) {
    return this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { bookings: true, owner: true },
    });
  }

  async findByLicenseNumber(licenseNumber: string) {
    return this.prisma.driver.findFirst({
      where: { license_number: licenseNumber },
    });
  }
}
