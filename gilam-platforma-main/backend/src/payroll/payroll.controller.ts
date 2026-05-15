import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payroll')
@UseGuards(JwtAuthGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('calculate')
  async calculate(@Body() body: { companyId: string; year: number; month: number; globalRestDay?: string }, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.payrollService.calculate(body.companyId, body.year, body.month, userId, body.globalRestDay);
  }

  @Get('periods/:companyId')
  async findPeriods(@Param('companyId') companyId: string) {
    return this.payrollService.findPeriods(companyId);
  }

  @Get('period/:periodId')
  async findPeriod(@Param('periodId') periodId: string) {
    return this.payrollService.findPeriodWithItems(periodId);
  }

  @Patch('period/:periodId/approve')
  async approve(@Param('periodId') periodId: string, @Body() body: { companyId: string }, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.payrollService.approve(periodId, userId, body.companyId);
  }

  @Patch('period/:periodId/pay')
  async markAsPaid(@Param('periodId') periodId: string, @Body() body: { companyId: string }, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.payrollService.markAsPaid(periodId, userId, body.companyId);
  }

  @Get('employee/:employeeId/balance')
  async getEmployeeBalance(@Param('employeeId') employeeId: string, @Query('companyId') companyId: string) {
    return this.payrollService.getEmployeeBalance(employeeId, companyId);
  }
}
