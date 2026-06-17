import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateDriverDto & { ownerId: number }) {
    return this.prisma.driver.create({
      data,
    });
  }

  async findAll(user: { userId: number; role: string }) {
    if (user.role === 'ADMIN') {
      return this.prisma.driver.findMany();
    }

    return this.prisma.driver.findMany({
      where: { ownerId: user.userId },
    });
  }

  async findOne(id: number, user: { userId: number; role: string }) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
    });

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
  ) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (user.role !== 'ADMIN' && driver.ownerId !== user.userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.driver.update({
      where: { id },
      data: updateDriverDto,
    });
  }

  async remove(id: number, user: { userId: number; role: string }) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (user.role !== 'ADMIN' && driver.ownerId !== user.userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.driver.delete({
      where: { id },
    });
  }
}
