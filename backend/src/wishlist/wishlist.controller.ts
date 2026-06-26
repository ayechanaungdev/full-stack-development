import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import type { AuthenticatedRequest } from '../common/types';
import { QueryWishlistDto } from './dto/query-wishlist.dto';

@ApiTags('Wishlist')
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({
    summary: 'List wishlist',
    description: 'Get user wishlist with pagination',
  })
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: QueryWishlistDto,
  ) {
    return this.wishlistService.findAll(
      req.user.userId,
      query.page,
      query.limit,
    );
  }

  @Post(':carId')
  @ApiOperation({
    summary: 'Add to wishlist',
    description: 'Add a car to user wishlist',
  })
  add(@Param('carId') carId: string, @Request() req: AuthenticatedRequest) {
    return this.wishlistService.add(req.user.userId, +carId);
  }

  @Delete(':carId')
  @ApiOperation({
    summary: 'Remove from wishlist',
    description: 'Remove a car from user wishlist',
  })
  remove(@Param('carId') carId: string, @Request() req: AuthenticatedRequest) {
    return this.wishlistService.remove(req.user.userId, +carId);
  }
}
