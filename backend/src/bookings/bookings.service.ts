import { Injectable, ConflictException } from '@nestjs/common';
import { BookingsRepository } from './bookings.repository';
import { CreateBookingDto } from './dto/create-booking.dto';
import { FirebaseService } from 'src/firebase/firebase.service';
import { ChatGateway } from 'src/chat/chat.gateway';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BookingsService {
    constructor(
        private bookingsRepository: BookingsRepository,
        private firebaseService: FirebaseService,
        private chatGateway: ChatGateway,
        private prisma: PrismaService,
    ) { }

    async create(createBookingDto: CreateBookingDto) {
        const { carId, startDate, endDate } = createBookingDto;

        const existingBooking = await this.bookingsRepository.findOverlappingBooking(
            carId,
            new Date(startDate),
            new Date(endDate)
        );

        if (existingBooking) {
            throw new ConflictException('This car is already booked for the selected dates!');
        }

        const newBooking = await this.bookingsRepository.createWithRelations(createBookingDto);
        const carOwnerId = newBooking.car?.ownerId;

        // Send push notification to customer
        if (newBooking.user && newBooking.user.fcmToken) {
            const title = 'Booking Confirmed!';
            const body = `Your booking for ${newBooking.car.brand} ${newBooking.car.model} is successful.`;
            this.firebaseService.sendPushNotification(newBooking.user.fcmToken, title, body);
        }

        // Create notification + Socket.IO emit for car owner
        if (carOwnerId) {
            const ownerNotiTitle = 'New Booking Received!';
            const ownerNotiBody = `${newBooking.user?.name || 'A user'} booked your ${newBooking.car.brand} ${newBooking.car.model}.`;

            const notification = await this.prisma.notification.create({
                data: {
                    title: ownerNotiTitle,
                    body: ownerNotiBody,
                    type: 'NEW_BOOKING',
                    userId: carOwnerId,
                    senderId: newBooking.userId,
                    bookingId: newBooking.id,
                },
            });

            this.chatGateway.emitToUser(carOwnerId, 'newBooking', {
                booking: newBooking,
                notification,
            });

            // Emit badge update to owner
            const ownerBadgeCounts = await this.getBadgeCounts(carOwnerId);
            this.chatGateway.emitToUser(carOwnerId, 'badgeUpdate', ownerBadgeCounts);

            // Send push to owner if they have fcm token
            if (newBooking.car.owner?.fcmToken) {
                this.firebaseService.sendPushNotification(
                    newBooking.car.owner.fcmToken,
                    ownerNotiTitle,
                    ownerNotiBody,
                );
            }
        }

        return newBooking;
    }

    async findAll(user: { userId: number; role: string }) {
        if (user.role === 'ADMIN') {
            return this.bookingsRepository.findAll();
        }
        return this.bookingsRepository.findByUserId(user.userId);
    }

    async updateStatus(id: number, status: string) {
        const updatedBooking = await this.bookingsRepository.updateStatus(id, status);

        // Notify the customer
        if (updatedBooking.user) {
            const title = `Booking Status Updated!`;
            const body = `Your booking for ${updatedBooking.car.brand} ${updatedBooking.car.model} has been updated to ${status}.`;

            // Create DB notification record
            const notification = await this.prisma.notification.create({
                data: {
                    title,
                    body,
                    type: `STATUS_CHANGED_${status}`,
                    userId: updatedBooking.userId,
                    senderId: updatedBooking.car.ownerId,
                    bookingId: updatedBooking.id,
                },
            });

            // Emit via Socket.IO
            this.chatGateway.emitToUser(updatedBooking.userId, 'bookingUpdate', {
                booking: updatedBooking,
                notification,
            });

            // Emit badge update to customer
            const customerBadgeCounts = await this.getBadgeCounts(updatedBooking.userId);
            this.chatGateway.emitToUser(updatedBooking.userId, 'badgeUpdate', customerBadgeCounts);

            // Send push notification if FCM token exists
            if (updatedBooking.user.fcmToken) {
                this.firebaseService.sendPushNotification(
                    updatedBooking.user.fcmToken,
                    title,
                    body,
                );
            }
        }

        // Also notify the car owner about the status change
        const carOwnerId = updatedBooking.car?.ownerId;
        if (carOwnerId && carOwnerId !== updatedBooking.userId) {
            const ownerTitle = `Booking #${updatedBooking.id} ${status}`;
            const ownerBody = `Booking for ${updatedBooking.car.brand} ${updatedBooking.car.model} by ${updatedBooking.user?.name || 'customer'} is now ${status}.`;

            const ownerNoti = await this.prisma.notification.create({
                data: {
                    title: ownerTitle,
                    body: ownerBody,
                    type: `OWNER_STATUS_CHANGED_${status}`,
                    userId: carOwnerId,
                    senderId: updatedBooking.userId,
                    bookingId: updatedBooking.id,
                },
            });

            this.chatGateway.emitToUser(carOwnerId, 'bookingUpdate', {
                booking: updatedBooking,
                notification: ownerNoti,
            });

            const ownerBadgeCounts = await this.getBadgeCounts(carOwnerId);
            this.chatGateway.emitToUser(carOwnerId, 'badgeUpdate', ownerBadgeCounts);

            if (updatedBooking.car.owner?.fcmToken) {
                this.firebaseService.sendPushNotification(
                    updatedBooking.car.owner.fcmToken,
                    ownerTitle,
                    ownerBody,
                );
            }
        }

        return updatedBooking;
    }

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

    private async getBadgeCounts(userId: number) {
        const [notifications, messages, bookings, reports] = await Promise.all([
            this.prisma.notification.count({ where: { userId, isRead: false } }),
            this.prisma.message.count({ where: { receiverId: userId, isRead: false } }),
            this.prisma.booking.count({
                where: { isRead: false, OR: [{ userId }, { ownerId: userId }] },
            }),
            this.prisma.dailyReport.count({ where: { ownerId: userId, isRead: false } }),
        ]);
        return { notifications, messages, bookings, reports };
    }
}
