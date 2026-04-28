import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CallsService } from './calls.service';
import {
  WebhookIncomingCallDto,
  ZadarmaWebhookDto,
  CreateCallDto,
  CompleteCallDto,
  GetCallsQueryDto,
} from './dto/call.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  // ─── ZADARMA WEBHOOK ─────────────────────────────────────────────────────────
  // Zadarma bu URL ga POST yuboradi (auth shart emas, IP whitelist qilish tavsiya etiladi)
  // Zadarma Settings → Notifications → Webhook URL: https://yourdomain.com/api/calls/webhook/zadarma
  @Post('webhook/zadarma')
  handleZadarmaWebhook(@Body() dto: ZadarmaWebhookDto) {
    return this.callsService.handleZadarmaWebhook(dto);
  }

  // ─── STANDART WEBHOOK (Asterisk / FreeSWITCH) ──────────────────────────────
  @Post('webhook/incoming')
  handleIncomingWebhook(@Body() dto: WebhookIncomingCallDto) {
    return this.callsService.handleIncomingWebhook(dto);
  }

  // ─── RO'YXAT ──────────────────────────────────────────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR)
  findAll(@Request() req: any, @Query() query: GetCallsQueryDto) {
    if (req.user.role === UserRole.OPERATOR) {
      return this.callsService.findOperatorCalls(
        req.user.id,
        req.user.companyId,
        query,
      );
    }
    return this.callsService.findAll(req.user.companyId, query);
  }

  // ─── STATISTIKA ───────────────────────────────────────────────────────────
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR)
  getStats(@Request() req: any) {
    return this.callsService.getStats(req.user.companyId);
  }

  // ─── CHIQUVCHI ────────────────────────────────────────────────────────────
  @Post('outgoing')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OPERATOR, UserRole.COMPANY_ADMIN)
  createOutgoing(@Body() dto: CreateCallDto, @Request() req: any) {
    return this.callsService.createOutgoing(
      req.user.id,
      req.user.companyId,
      dto,
    );
  }

  // ─── QABUL QILISH ─────────────────────────────────────────────────────────
  @Put(':id/answer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OPERATOR, UserRole.COMPANY_ADMIN)
  answerCall(@Param('id') id: string, @Request() req: any) {
    return this.callsService.answerCall(id, req.user.id);
  }

  // ─── YAKUNLASH ────────────────────────────────────────────────────────────
  @Put(':id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OPERATOR, UserRole.COMPANY_ADMIN)
  completeCall(
    @Param('id') id: string,
    @Body() dto: CompleteCallDto,
    @Request() req: any,
  ) {
    return this.callsService.completeCall(
      id,
      req.user.id,
      req.user.companyId,
      dto,
    );
  }

  // ─── JAVOBSIZ ─────────────────────────────────────────────────────────────
  @Put(':id/miss')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OPERATOR, UserRole.COMPANY_ADMIN)
  missCall(@Param('id') id: string, @Request() req: any) {
    return this.callsService.missCall(id, req.user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR)
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.callsService.findOne(id, req.user.companyId);
  }
}
