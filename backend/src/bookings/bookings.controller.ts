import { Controller, Get, Post, Body, UseGuards, Request, Patch, Param, Query } from '@nestjs/common';
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

    @Get('owner-dashboard')
    getOwnerDashboard(@Request() req: any) {
        return this.bookingsService.getOwnerDashboard(req.user.userId);
    }

    @Get('debug')
    getDebugInfo(@Request() req: any) {
        return { userId: req.user.userId, role: req.user.role, email: req.user.email };
    }

    @Get()
    findAll(
        @Request() req: any,
        @Query('status') status?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('month') month?: string,
        @Query('year') year?: string,
        @Query('search') search?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.bookingsService.findAll(req.user, {
            status,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            month: month ? parseInt(month, 10) : undefined,
            year: year ? parseInt(year, 10) : undefined,
            search,
            startDate,
            endDate,
        });
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req: any) {
        return this.bookingsService.findOne(+id, req.user);
    }

    @Patch(':id/status')
    updateStatus(
        @Param('id') id: string,
        @Body('status') status: string,
        @Body('driverId') driverId?: number,
    ) {
        return this.bookingsService.updateStatus(+id, status, driverId);
    }

    @Patch(':id/read')
    markAsRead(@Param('id') id: string, @Request() req: any) {
        return this.bookingsService.markAsRead(+id, req.user.userId);
    }
}
