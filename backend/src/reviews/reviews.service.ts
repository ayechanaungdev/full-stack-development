import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    carId: number;
    userId: number;
    rating: number;
    comment?: string;
  }) {
    return this.prisma.review.create({ data });
  }
}
