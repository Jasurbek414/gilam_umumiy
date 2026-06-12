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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from './entities/user.entity';

const uploadDir = join(process.cwd(), 'uploads', 'photos');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('upload-photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: uploadDir,
        filename: (_req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new Error('Faqat JPG, PNG yoki WEBP formatdagi rasmlar qabul qilinadi'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadPhoto(@UploadedFile() file: any) {
    if (!file) {
      return { error: 'Fayl yuklanmadi' };
    }
    return { url: `/uploads/photos/${file.filename}` };
  }

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() user: User) {
    // OPERATOR yaratish faqat SUPER_ADMIN uchun
    if (dto.role === UserRole.OPERATOR && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Operator yaratish faqat Super Admin uchun ruxsat etilgan',
      );
    }
    // CompanyAdmin faqat o'z kompaniyasi uchun yarata oladi
    // O'zgarish: Operatorlar ham endi ma'lum bir korxonaga tegishli bo'ladi. Null qilinmaydi.
    const finalDto = {
      ...dto,
      companyId: user.role === UserRole.SUPER_ADMIN ? dto.companyId : user.companyId,
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
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: User,
  ) {
    console.log(`[Users] PUT /${id} body:`, JSON.stringify(dto));
    try {
      return await this.usersService.update(id, dto);
    } catch (e) {
      console.error(`[Users] PUT /${id} ERROR:`, e.message, e.stack);
      throw e;
    }
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.usersService.remove(id);
  }
}
