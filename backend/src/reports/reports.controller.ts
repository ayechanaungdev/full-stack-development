import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'List reports', description: 'Get paginated reports with date filters' })
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.findAll(req.user.userId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      startDate,
      endDate,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get report by ID', description: 'Get a single report details' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.reportsService.findOne(+id, req.user.userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark report as read', description: 'Mark a report notification as read' })
  markAsRead(@Param('id') id: string, @Request() req: any) {
    return this.reportsService.markAsRead(+id, req.user.userId);
  }
}
