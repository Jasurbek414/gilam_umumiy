import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Get()
  async findAll(@CurrentUser() user: User) {
    if (!user) {
      throw new UnauthorizedException('Sessiya muddati tugadi');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      return this.companiesService.findAll();
    }

    if (!user.companyId) {
      return [];
    }

    try {
      const company = await this.companiesService.findOne(user.companyId);
      return [company];
    } catch {
      // CompanyId bazada mavjud emas (stale token) — bo'sh ro'yxat qaytaramiz
      return [];
    }
  }

  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN)
  getStats() {
    return this.companiesService.getStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    // Only same company or superadmin
    if (user.role !== UserRole.SUPER_ADMIN && user.companyId !== id) {
      throw new ForbiddenException('Ruxsat etilmagan');
    }
    return this.companiesService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: User,
  ) {
    if (user.role !== UserRole.SUPER_ADMIN && user.companyId !== id) {
      throw new ForbiddenException('Ruxsat etilmagan');
    }
    return this.companiesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.companiesService.remove(id);
  }
}
