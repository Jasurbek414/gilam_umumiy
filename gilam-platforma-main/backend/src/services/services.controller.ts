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
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  create(@Body() dto: CreateServiceDto, @CurrentUser() user: User) {
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.OPERATOR) {
      dto.companyId = user.companyId;
    }
    return this.servicesService.create(dto);
  }

  @Get('company/:companyId')
  findAllByCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentUser() user: User,
  ) {
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.OPERATOR) {
      if (!companyId || companyId === 'null') return this.servicesService.findAll();
    }
    const targetId =
      (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.OPERATOR) ? companyId : user.companyId;
    return this.servicesService.findAllByCompany(targetId);
  }

  @Get()
  findAllGlobal(@CurrentUser() user: User) {
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.OPERATOR) {
      return this.servicesService.findAll();
    }
    return this.servicesService.findAllByCompany(user.companyId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.remove(id);
  }
}
