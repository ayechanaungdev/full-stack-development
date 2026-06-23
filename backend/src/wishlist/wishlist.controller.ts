import { Controller, Get, Post, Delete, Param, UseGuards, Request, Query } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { QueryWishlistDto } from './dto/query-wishlist.dto';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  findAll(@Request() req: any, @Query() query: QueryWishlistDto) {
    return this.wishlistService.findAll(req.user.userId, query.page, query.limit);
  }

  @Post(':carId')
  add(@Param('carId') carId: string, @Request() req: any) {
    return this.wishlistService.add(req.user.userId, +carId);
  }

  @Delete(':carId')
  remove(@Param('carId') carId: string, @Request() req: any) {
    return this.wishlistService.remove(req.user.userId, +carId);
  }
}
