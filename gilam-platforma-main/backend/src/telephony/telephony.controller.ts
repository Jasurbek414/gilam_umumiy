import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TelephonyService } from './telephony.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@Controller('telephony')
@UseGuards(JwtAuthGuard)
export class TelephonyController {
  constructor(private readonly telephonyService: TelephonyService) {}

  @Get('config/:companyId')
  async getConfig(
    @Param('companyId') companyId: string,
    @CurrentUser() user: User,
  ) {
    const targetId =
      user.role === UserRole.SUPER_ADMIN ? companyId : user.companyId;
    return this.telephonyService.getSipConfig(targetId);
  }

  @Post('config')
  async updateConfig(@Body() body: any, @CurrentUser() user: User) {
    // Force ownership
    const companyId =
      user.role === UserRole.SUPER_ADMIN && body.companyId
        ? body.companyId
        : user.companyId;

    return this.telephonyService.updateSipConfig(companyId, body.credentials);
  }
}
