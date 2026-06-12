import { Controller, Get, Post, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async create(@Body() body: any, @Req() req: any) {
    if (req.user?.role !== 'SUPER_ADMIN') {
      body.companyId = req.user?.companyId;
    }
    const userId = req.user?.id || req.user?.sub;
    return this.paymentsService.create(body, userId);
  }

  @Get('company/:companyId')
  async findByCompany(
    @Param('companyId') companyId: string,
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const targetId = req.user?.role === 'SUPER_ADMIN' ? companyId : req.user?.companyId;
    return this.paymentsService.findByCompany(targetId, startDate, endDate);
  }

  @Get('employee/:employeeId')
  async findByEmployee(@Param('employeeId') employeeId: string) {
    return this.paymentsService.findByEmployee(employeeId);
  }
}
