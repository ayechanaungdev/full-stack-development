import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // This makes it available everywhere without importing it again and again!
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
