import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('api/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  // Get notifications for the current user
  @Get()
  async getNotifications(
    @Request() req,
    @Query('unread') unread?: string,
  ) {
    const onlyUnread = unread === 'true';
    return this.notificationsService.getForUser(req.user.id, req.user.role, onlyUnread);
  }

  // Get unread count
  @Get('count')
  async getUnreadCount(@Request() req) {
    const count = await this.notificationsService.getUnreadCount(req.user.id, req.user.role);
    return { count };
  }

  // Mark a notification as read
  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markAsRead(parseInt(id), req.user.id);
  }

  // Mark all notifications as read
  @Post('read-all')
  async markAllAsRead(@Request() req) {
    await this.notificationsService.markAllAsRead(req.user.id, req.user.role);
    return { success: true };
  }
}
