import { Module } from '@nestjs/common';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { DriversRepository } from './drivers.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DriversController],
  providers: [DriversService, DriversRepository],
  exports: [DriversService],
})
export class DriversModule {}
