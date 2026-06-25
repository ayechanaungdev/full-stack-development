import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.wishlist.findMany({
        where: { customerId: userId },
        skip,
        take: limit,
        include: {
          car: {
            include: {
              carImages: { select: { image_url: true } },
              reviews: { select: { rating: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.wishlist.count({ where: { customerId: userId } }),
    ]);

    return {
      data: items.map((item) => ({
        car_id: String(item.carId),
        created_at: item.createdAt.toISOString(),
        car: {
          id: String(item.car.id),
          brand: item.car.brand,
          model: item.car.model,
          pricePerDay: item.car.pricePerDay,
          seats: item.car.seats,
          car_type: item.car.car_type,
          location: item.car.location,
          status: item.car.status,
          postal_code: item.car.postal_code,
          carImages: item.car.carImages,
          reviews: item.car.reviews,
        },
      })),
      total,
      page,
      limit,
    };
  }

  async add(userId: number, carId: number) {
    return this.prisma.wishlist.create({
      data: { customerId: userId, carId },
    });
  }

  async remove(userId: number, carId: number) {
    return this.prisma.wishlist.deleteMany({
      where: { customerId: userId, carId },
    });
  }
}
