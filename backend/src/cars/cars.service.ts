import { Injectable } from '@nestjs/common';
import { CarsRepository } from './cars.repository';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { QueryCarDto } from './dto/query-car.dto';

@Injectable()
export class CarsService {
  constructor(private carsRepository: CarsRepository) {}

  async create(createCarDto: CreateCarDto) {
    return this.carsRepository.create(createCarDto);
  }

  async findAll() {
    return this.carsRepository.findAll();
  }

  async findAllPaginated(query: QueryCarDto) {
    return this.carsRepository.findAllPaginated(query);
  }

  async findOne(id: number) {
    return this.carsRepository.findOne(id);
  }

  async update(id: number, updateCarDto: UpdateCarDto) {
    return this.carsRepository.update(id, updateCarDto);
  }

  async remove(id: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.carsRepository.remove(id);
  }

  async findAvailable() {
    return this.carsRepository.findAvailable();
  }

  async findByBrand(brand: string) {
    return this.carsRepository.findByBrand(brand);
  }

  async findWithBookings(carId: number) {
    return this.carsRepository.findWithBookings(carId);
  }

  async getPriceRange() {
    const [minResult, maxResult] = await Promise.all([
      this.carsRepository.findMinPrice(),
      this.carsRepository.findMaxPrice(),
    ]);
    return {
      min: minResult ?? 0,
      max: maxResult ?? 0,
    };
  }
}
