import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';

@Injectable()
export class CarsService {
  constructor(private prisma: PrismaService) { }

  // 1. Create a car
  async create(createCarDto: CreateCarDto) {
    return this.prisma.car.create({
      data: createCarDto,
    });
  }

  // 2. Get all cars
  async findAll() {
    return this.prisma.car.findMany();
  }

  // 3. Get one car by ID
  async findOne(id: number) {
    return this.prisma.car.findUnique({
      where: { id },
    });
  }

  // 4. Update a car
  async update(id: number, updateCarDto: UpdateCarDto) {
    return this.prisma.car.update({
      where: { id },
      data: updateCarDto,
    });
  }

  // 5. Delete a car
  async remove(id: number) {
    return this.prisma.car.delete({
      where: { id },
    });
  }
}
