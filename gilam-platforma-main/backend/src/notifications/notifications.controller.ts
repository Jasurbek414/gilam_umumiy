import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  ParseUUIDPipe,
  UseGuards,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  create(@Body() dto: CreateNotificationDto, @CurrentUser() user: User) {
    dto.companyId = user.companyId;
    return this.notificationsService.create(dto);
  }

  @Get('superadmin')
  getForSuperAdmin(@CurrentUser() user: User) {
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Ruxsat etilmagan');
    }
    return this.notificationsService.getForSuperAdmin();
  }

  @Get('company/:companyId')
  getByCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentUser() user: User,
  ) {
    const targetId =
      user.role === UserRole.SUPER_ADMIN ? companyId : user.companyId;
    return this.notificationsService.getByCompany(targetId);
  }

  @Get('user/:userId')
  getByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.notificationsService.getByUser(userId);
  }

  @Patch(':id/read')
  markAsRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch('company/:companyId/read-all')
  markAllAsReadCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentUser() user: User,
  ) {
    const targetId =
      user.role === UserRole.SUPER_ADMIN ? companyId : user.companyId;
    return this.notificationsService.markAllAsReadForCompany(targetId);
  }

  @Patch('superadmin/read-all')
  markAllAsReadSuperAdmin(@CurrentUser() user: User) {
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Ruxsat etilmagan');
    }
    return this.notificationsService.markAllAsReadForSuperAdmin();
  }
}
