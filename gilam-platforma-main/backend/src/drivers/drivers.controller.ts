import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('drivers')
@UseGuards(JwtAuthGuard)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post('go-online')
  async goOnline(@Req() req: any, @Body() body: { latitude?: number; longitude?: number }) {
    const driverId = req.user?.id || req.user?.sub;
    return this.driversService.goOnline(driverId, body.latitude, body.longitude);
  }

  @Post('go-offline')
  async goOffline(@Req() req: any, @Body() body: { reason?: string; latitude?: number; longitude?: number }) {
    const driverId = req.user?.id || req.user?.sub;
    return this.driversService.goOffline(driverId, body.reason, body.latitude, body.longitude);
  }

  @Post('location')
  async updateLocation(@Req() req: any, @Body() body: any) {
    const driverId = req.user?.id || req.user?.sub;
    return this.driversService.updateLocation(driverId, body);
  }

  @Get('live')
  async getLiveDrivers(@Req() req: any, @Query('companyId') companyId?: string) {
    const targetId = req.user?.role === 'SUPER_ADMIN' ? companyId : req.user?.companyId;
    return this.driversService.getLiveDrivers(targetId);
  }

  @Get('live/company/:companyId')
  async getLiveByCompany(@Req() req: any, @Param('companyId') companyId: string) {
    const targetId = req.user?.role === 'SUPER_ADMIN' ? companyId : req.user?.companyId;
    return this.driversService.getLiveDrivers(targetId);
  }

  @Get('status-summary')
  async getStatusSummary(@Req() req: any, @Query('companyId') companyId?: string) {
    const targetId = req.user?.role === 'SUPER_ADMIN' ? companyId : req.user?.companyId;
    return this.driversService.getStatusSummary(targetId);
  }

  @Get('all-with-status')
  async getAllWithStatus(@Req() req: any, @Query('companyId') companyId?: string) {
    const targetId = req.user?.role === 'SUPER_ADMIN' ? companyId : req.user?.companyId;
    return this.driversService.getDriversWithStatus(targetId);
  }

  @Get(':id/location-history')
  async getLocationHistory(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.driversService.getLocationHistory(id, from, to);
  }

  @Get(':id/work-sessions')
  async getWorkSessions(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.driversService.getWorkSessions(id, from, to);
  }

  @Get('work-session/today')
  async getTodaySession(@Req() req: any) {
    const driverId = req.user?.id || req.user?.sub;
    return this.driversService.getTodaySession(driverId);
  }

  @Get('profile')
  async getProfile(@Req() req: any) {
    const driverId = req.user?.id || req.user?.sub;
    return this.driversService.getLiveDrivers(); // Returns driver's own data
  }
}

// ── Address endpoints ──
@Controller()
@UseGuards(JwtAuthGuard)
export class AddressController {
  constructor(private readonly driversService: DriversService) {}

  @Post('orders/:orderId/address')
  async saveAddress(@Param('orderId') orderId: string, @Body() body: any) {
    return this.driversService.saveAddress({ ...body, orderId });
  }

  @Patch('orders/:orderId/address/confirm')
  async confirmAddress(@Param('orderId') orderId: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.driversService.confirmAddress(orderId, userId);
  }

  @Get('orders/:orderId/address')
  async getAddress(@Param('orderId') orderId: string) {
    return this.driversService.getAddress(orderId);
  }
}
