import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Patch,
  ParseUUIDPipe,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @CurrentUser() user: User) {
    // Har doim companyId ni token'dan olish (SUPER_ADMIN bundan mustasno)
    if (user.role !== UserRole.SUPER_ADMIN) {
      createOrderDto.companyId = user.companyId;
    }
    // Operator o'zini avtomatik belgilaydi
    if (user.role === UserRole.OPERATOR || user.role === UserRole.COMPANY_ADMIN) {
      (createOrderDto as any).operatorId = user.id;
    }
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get('company/:companyId')
  findAllByCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentUser() user: User,
  ) {
    // Security: Only SUPER_ADMIN can view any company's orders.
    // All other roles (including OPERATOR) are restricted to their own company.
    const targetCompanyId =
      user.role === UserRole.SUPER_ADMIN ? companyId : user.companyId;
    return this.ordersService.findAllByCompany(targetCompanyId);
  }

  @Get('company/:companyId/stats')
  getCompanyStats(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentUser() user: User,
  ) {
    // Security: Only SUPER_ADMIN can view any company's stats.
    const targetCompanyId =
      user.role === UserRole.SUPER_ADMIN ? companyId : user.companyId;
    return this.ordersService.getCompanyStats(targetCompanyId);
  }

  @Get('driver/:driverId')
  getDriverActiveOrders(@Param('driverId', ParseUUIDPipe) driverId: string) {
    return this.ordersService.getDriverActiveOrders(driverId);
  }

  @Get('facility/:companyId')
  getFacilityOrders(@Param('companyId', ParseUUIDPipe) companyId: string) {
    return this.ordersService.getFacilityOrders(companyId);
  }

  @Get('driver/:driverId/history')
  getDriverCompletedOrders(@Param('driverId', ParseUUIDPipe) driverId: string) {
    return this.ordersService.getDriverCompletedOrders(driverId);
  }

  @Get('facility/:companyId/history')
  getFacilityCompletedOrders(
     @Param('companyId', ParseUUIDPipe) companyId: string,
     @CurrentUser() user: User
  ) {
    // If it's the master looking (no user injected correctly via decorator in simple setup or they are admin), fallback to all.
    // But since JWT guard gives us user, we can check role
    if (user?.role === UserRole.WORKER || user?.role === UserRole.MANAGER) {
       return this.ordersService.getWorkerCompletedOrders(companyId, user.id);
    }
    return this.ordersService.getFacilityCompletedOrders(companyId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @Put(':id')
  updateOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: any,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.updateOrder(id, updateData);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto, user?.id);
  }

  @Patch('items/:itemId/price')
  updateItemPrice(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body('price') price: number,
  ) {
    return this.ordersService.updateItemPrice(itemId, price);
  }

  /**
   * Sex hodimi: o'lchab tekshirganidan keyin butun buyurtma summasini qo'lda kiritish.
   * WORKER, MANAGER, COMPANY_ADMIN roli kerak.
   */
  @Patch(':id/total')
  updateTotal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('totalAmount') totalAmount: number,
    @CurrentUser() user: User,
  ) {
    const allowed = [
      UserRole.WORKER, UserRole.MANAGER,
      UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN,
    ];
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException('Faqat sex hodimi va admin uchun ruxsat etilgan');
    }
    return this.ordersService.updateTotalAmount(id, totalAmount);
  }

  /**
   * Operator: tayinlangan haydovchiga mijoz lokatsiyasini yuborish.
   * Push notification + WebSocket orqali.
   */
  @Post(':id/send-location')
  sendLocationToDriver(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.sendLocationToDriver(id, user.id);
  }
}
