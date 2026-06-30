import { Test, TestingModule } from '@nestjs/testing';
import { CarsService } from './cars.service';
import { CarsRepository } from './cars.repository';
import { PrismaService } from '../prisma/prisma.service';

describe('CarsService', () => {
  let service: CarsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarsService,
        { provide: CarsRepository, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<CarsService>(CarsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
