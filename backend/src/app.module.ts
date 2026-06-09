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

@Module({
    imports: [PrismaModule, CarsModule, UsersModule, BookingsModule, AuthModule, ChatModule, FirebaseModule], // We will add other modules here later
    controllers: [AppController], // Routes go here
    providers: [AppService], // Business logic goes here
})
export class AppModule { }
