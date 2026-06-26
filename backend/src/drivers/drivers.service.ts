import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DriversRepository } from './drivers.repository';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

/**
 * Drivers Service
 * Business logic layer - uses Repository for data access
 */
@Injectable()
export class DriversService {
  constructor(private readonly driversRepository: DriversRepository) {}

  async create(data: CreateDriverDto & { ownerId: number }): Promise<any> {
    return this.driversRepository.create(data);
  }

  async findAll(user: { userId: number; role: string }): Promise<any> {
    if (user.role === 'ADMIN') {
      return this.driversRepository.findAll();
    }

    return this.driversRepository.findByOwnerId(user.userId);
  }

  async findOne(
    id: number,
    user: { userId: number; role: string },
  ): Promise<any> {
    const driver = (await this.driversRepository.findOne(id)) as {
      ownerId: number;
    } | null;

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (user.role !== 'ADMIN' && driver.ownerId !== user.userId) {
      throw new ForbiddenException('Access denied');
    }

    return driver;
  }

  async update(
    id: number,
    updateDriverDto: UpdateDriverDto,
    user: { userId: number; role: string },
  ): Promise<any> {
    const driver = (await this.driversRepository.findOne(id)) as {
      ownerId: number;
    } | null;

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (user.role !== 'ADMIN' && driver.ownerId !== user.userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.driversRepository.update(id, updateDriverDto);
  }

  async remove(
    id: number,
    user: { userId: number; role: string },
  ): Promise<any> {
    const driver = (await this.driversRepository.findOne(id)) as {
      ownerId: number;
    } | null;

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (user.role !== 'ADMIN' && driver.ownerId !== user.userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.driversRepository.remove(id);
  }

  // Additional business logic methods using repository
  async findByStatus(status: string): Promise<any> {
    return this.driversRepository.findByStatus(status);
  }

  async findAvailable(): Promise<any> {
    return this.driversRepository.findAvailable();
  }
}
