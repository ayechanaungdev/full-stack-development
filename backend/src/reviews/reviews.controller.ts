import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  create(@Body() body: { carId: number; rating: number; comment?: string }, @Request() req: any) {
    return this.reviewsService.create({
      carId: body.carId,
      userId: req.user.userId,
      rating: body.rating,
      comment: body.comment,
    });
  }
}
