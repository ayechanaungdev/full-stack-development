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
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CronModule } from './cron/cron.module';
import { UploadsModule } from './uploads/uploads.module';
import { DriversModule } from './drivers/drivers.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    PrismaModule,
    CarsModule,
    UsersModule,
    BookingsModule,
    AuthModule,
    ChatModule,
    FirebaseModule,
    CloudinaryModule,
    UploadsModule,
    DriversModule,
    WishlistModule,
    MailModule,
    InquiriesModule,
    ScheduleModule.forRoot(),
    CronModule, // 👈 Schedule စနစ်ကို ဖွင့်လိုက်ပါပြီ
  ],
  controllers: [AppController], // Routes go here
  providers: [AppService], // Business logic goes here
})
export class AppModule {}
