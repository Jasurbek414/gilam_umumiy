import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AdvancesService } from './advances.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('advances')
@UseGuards(JwtAuthGuard)
export class AdvancesController {
  constructor(private readonly advancesService: AdvancesService) {}

  @Post()
  async create(@Body() body: any, @Req() req: any) {
    if (req.user?.role !== 'SUPER_ADMIN') {
      body.companyId = req.user?.companyId;
    }
    const userId = req.user?.id || req.user?.sub;
    return this.advancesService.create(body, userId);
  }

  @Get('company/:companyId')
  async findByCompany(
    @Param('companyId') companyId: string,
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const targetId = req.user?.role === 'SUPER_ADMIN' ? companyId : req.user?.companyId;
    return this.advancesService.findByCompany(targetId, startDate, endDate);
  }

  @Get('employee/:employeeId')
  async findByEmployee(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.advancesService.findByEmployee(employeeId, startDate, endDate);
  }

  @Get('employee/:employeeId/total')
  async getEmployeeTotal(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const total = await this.advancesService.getEmployeeTotal(employeeId, startDate, endDate);
    return { total };
  }

  @Patch(':id/cancel')
  async cancel(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    const userId = req.user?.id || req.user?.sub;
    const targetCompanyId = req.user?.role === 'SUPER_ADMIN' ? body.companyId : req.user?.companyId;
    return this.advancesService.cancel(id, userId, targetCompanyId);
  }
}
