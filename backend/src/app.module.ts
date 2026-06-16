import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CarsModule } from './cars/cars.module';
import { UsersModule } from './users/users.module';
import { BookingsModule } from './bookings/bookings.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { FirebaseModule } from './firebase/firebase.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CronModule } from './cron/cron.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    PrismaModule,
    CarsModule,
    UsersModule,
    BookingsModule,
    AuthModule,
    ChatModule,
    FirebaseModule,
    UploadsModule,
    InquiriesModule,
    ScheduleModule.forRoot(),
    CronModule, // 👈 Schedule စနစ်ကို ဖွင့်လိုက်ပါပြီ
  ],
  controllers: [AppController], // Routes go here
  providers: [AppService], // Business logic goes here
})
export class AppModule {}
