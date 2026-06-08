import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('bookings')
@UseGuards(JwtAuthGuard) // 👈 Protect ALL routes in this controller
export class BookingsController {
    constructor(private readonly bookingsService: BookingsService) { }

    @Post()
    create(@Body() createBookingDto: CreateBookingDto, @Request() req: any) {
        // Security: Extract userId from the authenticated token, NOT the request body.
        // If ADMIN, allow booking on behalf of others (use body userId if provided).
        // If USER, always force their own userId.
        const user = req.user;
        const userIdToUse = user.role === 'ADMIN'
            ? (createBookingDto.userId || user.userId)
            : user.userId;

        return this.bookingsService.create({
            ...createBookingDto,
            userId: userIdToUse,
        });
    }

    @Get()
    findAll(@Request() req: any) {
        // Pass the authenticated user info to the service for role-based filtering
        return this.bookingsService.findAll(req.user);
    }
}
