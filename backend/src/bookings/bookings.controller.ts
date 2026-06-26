import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import type { AuthenticatedRequest } from '../common/types';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a booking',
    description: 'Book a car for a date range',
  })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({
    status: 409,
    description: 'Car not available for the selected dates',
  })
  create(
    @Body() createBookingDto: CreateBookingDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // Security: Extract userId from the authenticated token, NOT the request body.
    // If ADMIN, allow booking on behalf of others (use body userId if provided).
    // If USER, always force their own userId.
    const user = req.user;
    const userIdToUse =
      user.role === 'ADMIN'
        ? createBookingDto.userId || user.userId
        : user.userId;

    return this.bookingsService.create({
      ...createBookingDto,
      userId: userIdToUse,
    });
  }

  @Get('owner-dashboard')
  @ApiOperation({
    summary: 'Owner dashboard',
    description: 'Get booking stats for car owner dashboard',
  })
  getOwnerDashboard(@Request() req: AuthenticatedRequest) {
    return this.bookingsService.getOwnerDashboard(req.user.userId);
  }

  @Get('debug')
  @ApiOperation({
    summary: 'Debug info',
    description: 'Get current user info from token (for testing)',
  })
  getDebugInfo(@Request() req: AuthenticatedRequest) {
    return {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'List bookings',
    description: 'Get all bookings with filters (status, date range, search)',
  })
  findAll(
    @Request() req: AuthenticatedRequest,
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
  @ApiOperation({
    summary: 'Get booking by ID',
    description: 'Get booking details (own bookings or admin)',
  })
  @ApiResponse({ status: 200, description: 'Returns booking details' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.bookingsService.findOne(+id, req.user);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update booking status',
    description: 'Update booking status (approve, reject, complete, cancel)',
  })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('driverId') driverId?: number,
  ) {
    return this.bookingsService.updateStatus(+id, status, driverId);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark booking as read',
    description: 'Mark a booking notification as read',
  })
  markAsRead(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.bookingsService.markAsRead(+id, req.user.userId);
  }
}
