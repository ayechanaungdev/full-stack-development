import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule], // 👈 Database သုံးလို့ရအောင် Import ထဲ ထည့်ပါမည်
  providers: [CronService],
})
export class CronModule {}
