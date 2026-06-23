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

    async getOwnerDashboard(ownerId: number) {
        const now = new Date();
        const localYear = now.getFullYear();
        const localMonth = now.getMonth();
        const localDay = now.getDate();
        const startOfYear = new Date(localYear, 0, 1);

        const lastMonthYear = localMonth === 0 ? localYear - 1 : localYear;
        const lastMonthIndex = localMonth === 0 ? 11 : localMonth - 1;

        // Fetch completed bookings for owner's cars
        const bookings = await this.bookingsRepository['prisma'].booking.findMany({
            where: {
                car: { ownerId },
                status: 'COMPLETED',
                endDate: { gte: startOfYear },
            },
            select: {
                totalPrice: true,
                endDate: true,
            },
        });

        // Compute earnings
        const earnings = bookings.reduce(
            (acc, b) => {
                const bookingTotal = Number(b.totalPrice) || 0;
                const bDate = new Date(b.endDate);
                const bYear = bDate.getFullYear();
                const bMonth = bDate.getMonth();
                const bDay = bDate.getDate();

                acc.total += bookingTotal;
                acc.thisYear += bookingTotal;
                if (bYear === localYear && bMonth === localMonth && bDay === localDay)
                    acc.today += bookingTotal;
                if (bYear === localYear && bMonth === localMonth)
                    acc.thisMonth += bookingTotal;
                if (bYear === lastMonthYear && bMonth === lastMonthIndex)
                    acc.lastMonth += bookingTotal;

                return acc;
            },
            { total: 0, today: 0, thisMonth: 0, lastMonth: 0, thisYear: 0 },
        );

        // Fetch counts for Business Overview
        const carCount = await this.bookingsRepository['prisma'].car.count({
            where: { ownerId },
        });

        const activeCount = await this.bookingsRepository['prisma'].booking.count({
            where: {
                car: { ownerId },
                status: 'APPROVED',
            },
        });

        const driverCount = await this.bookingsRepository['prisma'].driver.count({
            where: { ownerId },
        });

        const overview = {
            cars: carCount || 0,
            activeRentals: activeCount || 0,
            drivers: driverCount || 0,
        };

        // Fetch today's trips
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todayTrips = await this.bookingsRepository['prisma'].booking.findMany({
            where: {
                car: { ownerId },
                status: 'APPROVED',
                startDate: { lte: todayEnd },
                endDate: { gte: todayStart },
            },
            select: {
                id: true,
                pickupLocation: true,
                status: true,
                startDate: true,
                endDate: true,
                car: {
                    select: {
                        id: true,
                        brand: true,
                        model: true,
                        ownerId: true,
                        carImages: {
                            select: {
                                image_url: true,
                            },
                        },
                    },
                },
                driver: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                startDate: 'asc',
            },
        });

        // Map today's trips to match frontend camelCase property expectations
        const trips = todayTrips.map(trip => ({
            id: trip.id,
            pickupLocation: trip.pickupLocation,
            status: trip.status,
            startDate: trip.startDate,
            endDate: trip.endDate,
            Car: {
                id: trip.car.id,
                brand: trip.car.brand,
                model: trip.car.model,
                ownerId: trip.car.ownerId,
                CarImage: trip.car.carImages.map(img => ({
                    image_url: img.image_url,
                })),
            },
            Driver: trip.driver ? { name: trip.driver.name } : null,
        }));

        // Fetch fleet status
        const cars = await this.bookingsRepository['prisma'].car.findMany({
            where: { ownerId },
            select: { status: true },
        });

        const availableCount = cars.filter(
            (car) => car.status?.toLowerCase() === 'available',
        ).length;

        const fleet = {
            available: availableCount,
            unavailable: cars.length - availableCount,
        };

        return { earnings, overview, trips, fleet };
    }
}
