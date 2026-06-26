import { Module } from '@nestjs/common';
import { CarsController } from './cars.controller';
import { CarsService } from './cars.service';
import { CarsRepository } from './cars.repository';

@Module({
  controllers: [CarsController],
  providers: [CarsService, CarsRepository],
  exports: [CarsService], // Export for use in other modules
})
export class CarsModule {}
