import { Injectable, ConflictException } from '@nestjs/common';
import { BookingsRepository } from './bookings.repository';
import { CreateBookingDto } from './dto/create-booking.dto';
import { FirebaseService } from 'src/firebase/firebase.service';

/**
 * Bookings Service
 * Business logic layer - uses Repository for data access
 */
@Injectable()
export class BookingsService {
    constructor(
        private bookingsRepository: BookingsRepository,
        private firebaseService: FirebaseService
    ) { }

    async create(createBookingDto: CreateBookingDto) {
        const { carId, startDate, endDate } = createBookingDto;
        // 1. Check if the car is already booked during these dates
        const existingBooking = await this.bookingsRepository.findOverlappingBooking(
            carId,
            new Date(startDate),
            new Date(endDate)
        );

        if (existingBooking) {
            throw new ConflictException('This car is already booked for the selected dates! 🚫');
        }
        // 2. Create the booking (return အစား variable ထဲ အရင်ထည့်ပါမယ်)
        const newBooking = await this.bookingsRepository.createWithRelations(createBookingDto);

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
            return this.bookingsRepository.findAll();
        }
        return this.bookingsRepository.findByUserId(user.userId);
    }

    // bookings.service.ts ထဲတွင် ထည့်သွင်းရန် method
    async updateStatus(id: number, status: string) {
        // Database တွင် Status အား Update လုပ်ပါမည်
        const updatedBooking = await this.bookingsRepository.updateStatus(id, status);

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
            // Note: This still uses prisma directly for notification creation - could be refactored later
            await this.bookingsRepository['prisma'].notification.create({
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

    // Additional business logic methods using repository
    async findByCarId(carId: number) {
        return this.bookingsRepository.findByCarId(carId);
    }

    async findByStatus(status: string) {
        return this.bookingsRepository.findByStatus(status);
    }

    async findPendingBookings() {
        return this.bookingsRepository.findPendingBookings();
    }

    async findActiveBookings() {
        return this.bookingsRepository.findActiveBookings();
    }
}
