import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class BookingsService {
    constructor(private prisma: PrismaService, private firebaseService: FirebaseService) { }

    async create(createBookingDto: CreateBookingDto) {
        const { carId, startDate, endDate } = createBookingDto;
        // 1. Check if the car is already booked during these dates
        const existingBooking = await this.prisma.booking.findFirst({
            where: {
                carId: carId,
                // Overlap logic: (StartA <= EndB) AND (EndA >= StartB)
                AND: [
                    { startDate: { lte: new Date(endDate) } },
                    { endDate: { gte: new Date(startDate) } },
                ],
            },
        });
        if (existingBooking) {
            throw new ConflictException('This car is already booked for the selected dates! 🚫');
        }
        // 2. Create the booking (return အစား variable ထဲ အရင်ထည့်ပါမယ်)
        const newBooking = await this.prisma.booking.create({
            data: createBookingDto,
            include: { car: true, user: true },
        });
        // 👈 3. User မှာ fcmToken ရှိရင် Notification လှမ်းပို့ပါမယ်
        if (newBooking.user && newBooking.user.fcmToken) {
            const title = 'Booking Confirmed! 🎉';
            const body = `Your booking for ${newBooking.car.brand} ${newBooking.car.model} is successful.`;

            // Notification ပို့တာကို စောင့်မနေဘဲ (await မပါဘဲ) နောက်ကွယ်ကနေ ပို့ခိုင်းလိုက်ပါမယ်
            this.firebaseService.sendPushNotification(
                newBooking.user.fcmToken,
                title,
                body
            );
        }
        return newBooking; // နောက်ဆုံးမှ newBooking ကို return ပြန်ပါမယ်
    }

    async findAll(user: { userId: number; role: string }) {
        // RBAC: Regular USERs can only see their own bookings. ADMINs see everything.
        if (user.role === 'ADMIN') {
            return this.prisma.booking.findMany({
                include: { car: true, user: true },
            });
        }
        return this.prisma.booking.findMany({
            where: {
                userId: user.userId, // 👈 Filter by the authenticated user's ID
            },
            include: { car: true, user: true },
        });
    }

    // bookings.service.ts ထဲတွင် ထည့်သွင်းရန် method
    async updateStatus(id: number, status: string) {
        // Database တွင် Status အား Update လုပ်ပါမည်
        const updatedBooking = await this.prisma.booking.update({
            where: { id },
            data: { status: status as any }, // Enum type သို့ cast လုပ်ခြင်း
            include: { user: true, car: true },
        });

        // User တွင် FCM Token ရှိပါက Notification ချက်ချင်း ပို့ပါမည်
        if (updatedBooking.user && updatedBooking.user.fcmToken) {
            const title = `Booking Status Updated! 🔔`;
            const body = `Your booking for ${updatedBooking.car.brand} ${updatedBooking.car.model} has been updated to ${status}.`;

            // Push Notification ပို့ပါမည်
            this.firebaseService.sendPushNotification(
                updatedBooking.user.fcmToken,
                title,
                body,
            );

            // Database Notification Table ထဲတွင် မှတ်တမ်းတင်ပါမည်
            await this.prisma.notification.create({
                data: {
                    title,
                    body,
                    type: `STATUS_CHANGED_${status}`, // ဥပမာ - STATUS_CHANGED_APPROVED
                    userId: updatedBooking.userId,
                    bookingId: updatedBooking.id,
                },
            });
        }

        return updatedBooking;
    }

}
