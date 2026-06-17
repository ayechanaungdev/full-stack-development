import { Injectable } from '@nestjs/common';
import { CarsRepository } from './cars.repository';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';

/**
 * Cars Service
 * Business logic layer - uses Repository for data access
 */
@Injectable()
export class CarsService {
  constructor(private carsRepository: CarsRepository) { }

  // 1. Create a car
  async create(createCarDto: CreateCarDto) {
    return this.carsRepository.create(createCarDto);
  }

  // 2. Get all cars
  async findAll() {
    return this.carsRepository.findAll();
  }

  // 3. Get one car by ID
  async findOne(id: number) {
    return this.carsRepository.findOne(id);
  }

  // 4. Update a car
  async update(id: number, updateCarDto: UpdateCarDto) {
    return this.carsRepository.update(id, updateCarDto);
  }

  // 5. Delete a car
  async remove(id: number) {
    return this.carsRepository.remove(id);
  }

  // Additional business logic methods using repository
  async findAvailable() {
    return this.carsRepository.findAvailable();
  }

  async findByBrand(brand: string) {
    return this.carsRepository.findByBrand(brand);
  }

  async findWithBookings(carId: number) {
    return this.carsRepository.findWithBookings(carId);
  }
}
