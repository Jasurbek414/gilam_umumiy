import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR)
  findAll(@Request() req: any) {
    const companyId = req.user.companyId;
    // Operator uchun faqat o'zining kampaniyalarini ko'rsatish
    if (req.user.role === 'OPERATOR') {
      return this.campaignsService.findOperatorCampaigns(req.user.id);
    }
    return this.campaignsService.findAll(companyId);
  }

  @Get('by-line/:phoneNumber')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR)
  findByLine(@Param('phoneNumber') phoneNumber: string) {
    return this.campaignsService.findByPhoneNumber(phoneNumber);
  }

  @Get(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR)
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.campaignsService.findOne(id, req.user.companyId);
  }

  @Post()
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateCampaignDto, @Request() req: any) {
    return this.campaignsService.create(req.user.companyId, dto);
  }

  @Put(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
    @Request() req: any,
  ) {
    return this.campaignsService.update(id, req.user.companyId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.campaignsService.remove(id, req.user.companyId);
  }
}
