import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@Body() dto: CreateCustomerDto, @CurrentUser() user: User) {
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.OPERATOR) {
      dto.companyId = user.companyId;
    }
    return this.customersService.create(dto);
  }

  @Get('company/:companyId')
  findAllByCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentUser() user: User,
  ) {
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.OPERATOR) {
      if (!companyId || companyId === 'null') return this.customersService.findAll();
    }
    const targetId =
      (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.OPERATOR) ? companyId : user.companyId;
    return this.customersService.findAllByCompany(targetId);
  }

  @Get()
  findAllGlobal(@CurrentUser() user: User) {
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.OPERATOR) {
      return this.customersService.findAll();
    }
    return this.customersService.findAllByCompany(user.companyId);
  }

  @Get('search/global')
  searchGlobal(
    @Query('q') query: string,
    @CurrentUser() user: User,
  ) {
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.OPERATOR) {
      return this.customersService.search(null, query || '');
    }
    return this.customersService.search(user.companyId, query || '');
  }

  @Get('search/:companyId')
  search(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query('q') query: string,
    @CurrentUser() user: User,
  ) {
    const targetId =
      (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.OPERATOR) ? companyId : user.companyId;
    return this.customersService.search(targetId, query || '');
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.remove(id);
  }
}
