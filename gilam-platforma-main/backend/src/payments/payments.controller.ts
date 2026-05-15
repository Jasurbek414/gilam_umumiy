import { Controller, Get, Post, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async create(@Body() body: any, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.paymentsService.create(body, userId);
  }

  @Get('company/:companyId')
  async findByCompany(
    @Param('companyId') companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.paymentsService.findByCompany(companyId, startDate, endDate);
  }

  @Get('employee/:employeeId')
  async findByEmployee(@Param('employeeId') employeeId: string) {
    return this.paymentsService.findByEmployee(employeeId);
  }
}
