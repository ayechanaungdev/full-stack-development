import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiTags('Reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a review', description: 'Submit a rating and review for a car' })
  create(@Body() body: { carId: number; rating: number; comment?: string }, @Request() req: any) {
    return this.reviewsService.create({
      carId: body.carId,
      userId: req.user.userId,
      rating: body.rating,
      comment: body.comment,
    });
  }
}
