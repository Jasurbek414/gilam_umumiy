import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { BonusesService } from './bonuses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class BonusesController {
  constructor(private readonly bonusesService: BonusesService) {}

  // ---- BONUSES ----
  @Post('bonuses')
  async createBonus(@Body() body: any, @Req() req: any) {
    if (req.user?.role !== 'SUPER_ADMIN') {
      body.companyId = req.user?.companyId;
    }
    return this.bonusesService.createBonus(body, req.user?.id || req.user?.sub);
  }

  @Get('bonuses/employee/:employeeId')
  async findBonusesByEmployee(@Param('employeeId') employeeId: string) {
    return this.bonusesService.findBonusesByEmployee(employeeId);
  }

  @Get('bonuses/company/:companyId')
  async findBonusesByCompany(@Param('companyId') companyId: string, @Req() req: any) {
    const targetId = req.user?.role === 'SUPER_ADMIN' ? companyId : req.user?.companyId;
    return this.bonusesService.findBonusesByCompany(targetId);
  }

  // ---- PENALTIES ----
  @Post('penalties')
  async createPenalty(@Body() body: any, @Req() req: any) {
    if (req.user?.role !== 'SUPER_ADMIN') {
      body.companyId = req.user?.companyId;
    }
    return this.bonusesService.createPenalty(body, req.user?.id || req.user?.sub);
  }

  @Get('penalties/employee/:employeeId')
  async findPenaltiesByEmployee(@Param('employeeId') employeeId: string) {
    return this.bonusesService.findPenaltiesByEmployee(employeeId);
  }

  @Get('penalties/company/:companyId')
  async findPenaltiesByCompany(@Param('companyId') companyId: string, @Req() req: any) {
    const targetId = req.user?.role === 'SUPER_ADMIN' ? companyId : req.user?.companyId;
    return this.bonusesService.findPenaltiesByCompany(targetId);
  }
}
