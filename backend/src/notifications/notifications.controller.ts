import {
  Controller, Get, Patch, Param, Body, UseGuards, Request, ParseIntPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('counts')
  getBadgeCounts(@Request() req: any) {
    return this.notificationsService.getBadgeCounts(req.user.userId);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.notificationsService.findAll(req.user.userId);
  }

  @Patch(':id/read')
  markAsRead(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch('read-by-sender')
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
  markManyAsRead(@Body() body: { ids: number[] }) {
    return this.notificationsService.markManyAsRead(body.ids);
  }
}
