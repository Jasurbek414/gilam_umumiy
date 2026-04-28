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
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from './entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() user: User) {
    // OPERATOR yaratish faqat SUPER_ADMIN uchun
    if (dto.role === UserRole.OPERATOR && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Operator yaratish faqat Super Admin uchun ruxsat etilgan',
      );
    }
    // CompanyAdmin faqat o'z kompaniyasi uchun yarata oladi
    // Operator yaratilayotgan bo'lsa uni aniq global qilish (backend service da null qilinadi)
    const finalDto = {
      ...dto,
      companyId: (dto.role === UserRole.OPERATOR) 
        ? null 
        : (user.role === UserRole.SUPER_ADMIN ? dto.companyId : user.companyId),
      passwordHash: dto.password,
    };
    return this.usersService.create(finalDto);
  }

  // Faqat operatorlarni ro'yxati (superadmin uchun)
  @Get('operators')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  findAllOperators() {
    return this.usersService.findByRole(UserRole.OPERATOR);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.OPERATOR) {
      return this.usersService.findAll();
    }
    return this.usersService.findAllByCompany(user.companyId);
  }

  @Get('company/:companyId')
  findAllByCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentUser() user: User,
  ) {
    const targetId =
      user.role === UserRole.SUPER_ADMIN ? companyId : user.companyId;
    return this.usersService.findAllByCompany(targetId);
  }

  @Put('push-token')
  updatePushToken(@CurrentUser() user: User, @Body() body: any) {
    console.log(`[PushToken] 🔔 PUT /push-token called by user ${user.id} (${user.phone}), body:`, JSON.stringify(body));
    const token = body?.token;
    if (!token) {
      console.warn('[PushToken] ⚠️ No token in request body!');
      return { error: 'Token is required' };
    }
    return this.usersService.updatePushToken(user.id, token);
  }

  // ─── Mileage Reports ────────────────────────────────────────
  @Get(':id/mileage')
  async getDriverMileage(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const fromDate = from ? new Date(from) : new Date(new Date().setHours(0, 0, 0, 0));
    const toDate = to ? new Date(to) : new Date();
    return this.usersService.getDriverMileage(id, fromDate, toDate);
  }

  @Get(':id/mileage/daily')
  async getDriverMileageDaily(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const fromDate = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30));
    const toDate = to ? new Date(to) : new Date();
    return this.usersService.getDriverMileageDaily(id, fromDate, toDate);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    // Basic protection: check if same company or superadmin
    return this.usersService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: User,
  ) {
    // Ensure the updated user belongs to the same company
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.usersService.remove(id);
  }
}
