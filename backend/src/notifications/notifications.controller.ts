import {
  Controller, Get, Patch, Delete, Param, Body, UseGuards, Request, ParseIntPipe, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@ApiTags('Notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('counts')
  @ApiOperation({ summary: 'Get badge counts', description: 'Get unread notification counts by type' })
  getBadgeCounts(@Request() req: any) {
    return this.notificationsService.getBadgeCounts(req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List notifications', description: 'Get paginated notifications for current user' })
  findAll(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.findAll(req.user.userId, page, limit);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read', description: 'Mark a single notification as read' })
  markAsRead(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch('read-by-sender')
  @ApiOperation({ summary: 'Mark notifications by sender as read', description: 'Mark all notifications from a sender as read' })
  markBySenderAsRead(
    @Body() body: { senderId: number; type?: string },
    @Request() req: any,
  ) {
    return this.notificationsService.markNotificationsBySenderAsRead(
      req.user.userId,
      body.senderId,
      body.type,
    );
  }

  @Patch('read-many')
  @ApiOperation({ summary: 'Mark multiple as read', description: 'Mark multiple notifications as read by IDs' })
  markManyAsRead(@Body() body: { ids: number[] }) {
    return this.notificationsService.markManyAsRead(body.ids);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete notifications', description: 'Delete multiple notifications by IDs' })
  deleteMany(@Body() body: { ids: number[] }, @Request() req: any) {
    return this.notificationsService.deleteMany(req.user.userId, body.ids);
  }
}
