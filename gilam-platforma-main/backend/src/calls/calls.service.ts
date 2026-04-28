import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Call, CallStatus, CallDirection } from './entities/call.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { CampaignsService } from '../campaigns/campaigns.service';
import { CallsGateway } from '../gateway/calls.gateway';
import {
  WebhookIncomingCallDto,
  ZadarmaWebhookDto,
  CreateCallDto,
  CompleteCallDto,
  GetCallsQueryDto,
} from './dto/call.dto';

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(Call)
    private callsRepo: Repository<Call>,
    @InjectRepository(Customer)
    private customersRepo: Repository<Customer>,
    @InjectRepository(Order)
    private ordersRepo: Repository<Order>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private campaignsService: CampaignsService,
    @Inject(forwardRef(() => CallsGateway))
    private callsGateway: CallsGateway,
  ) {}

  // ─── ZADARMA WEBHOOK ──────────────────────────────────────────────────────────
  // Zadarma format: POST with form fields (not JSON)
  // call_start: начало звонка | call_end: завершение | internal: внутренний звонок
  async handleZadarmaWebhook(data: ZadarmaWebhookDto): Promise<any> {
    // Zadarma send_status=call_start when ringing
    if (data.call_start) {
      return this.handleIncomingWebhook({
        callerPhone: data.caller_id || data.from || '',
        calledPhone: data.called_did || data.to || '',
        sipCallId: data.pbx_call_id || data.call_id,
      });
    }
    // call_end — qo'ng'iroq tugadi, javob berilmagan bo'lsa missed deb belgilaymiz
    if (data.call_end && data.pbx_call_id) {
      const call = await this.callsRepo.findOne({
        where: { sipCallId: data.pbx_call_id },
      });
      if (call && call.status === CallStatus.RINGING) {
        call.status = CallStatus.MISSED;
        call.endedAt = new Date();
        await this.callsRepo.save(call);
        this.callsGateway.notifyCallUpdate(call.companyId, {
          callId: call.id,
          status: CallStatus.MISSED,
        });
      }
      return { ok: true };
    }
    return { ok: true, skipped: true };
  }

  // ─── UMUMIY KIRUVCHI QO'NG'IROQ (Asterisk / Zadarma / boshqa) ───────────────
  async handleIncomingWebhook(dto: WebhookIncomingCallDto): Promise<Call> {
    const campaign = await this.campaignsService.findByPhoneNumber(
      dto.calledPhone,
    );
    if (!campaign) {
      throw new BadRequestException(`Kampaniya topilmadi: ${dto.calledPhone}`);
    }

    // Avvalgi urinishmi? (takroriy webhook)
    if (dto.sipCallId) {
      const existing = await this.callsRepo.findOne({
        where: { sipCallId: dto.sipCallId },
      });
      if (existing) return existing;
    }

    const existingCustomer = await this.customersRepo.findOne({
      where: [
        { phone1: dto.callerPhone, companyId: campaign.companyId },
        { phone2: dto.callerPhone, companyId: campaign.companyId },
      ],
    });

    const call = this.callsRepo.create({
      companyId: campaign.companyId,
      campaignId: campaign.id,
      callerPhone: dto.callerPhone,
      calledPhone: dto.calledPhone,
      sipCallId: dto.sipCallId,
      direction: CallDirection.INCOMING,
      status: CallStatus.RINGING,
      startedAt: new Date(),
      customerId: existingCustomer?.id,
    });

    const saved = await this.callsRepo.save(call);
    const callFull = await this.findOne(saved.id, campaign.companyId);

    // BARCHA kompaniya operatorlariga yuborish
    const eventData = {
      call: callFull,
      customer: existingCustomer,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        phoneNumber: campaign.phoneNumber,
        driver: campaign.driver
          ? { id: campaign.driver.id, fullName: campaign.driver.fullName }
          : null,
      },
    };
    this.callsGateway.notifyCompanyCall(campaign.companyId, eventData);
    this.callsGateway.notifyAllOperators(eventData);

    return callFull;
  }

  // ─── QABUL QILISH ────────────────────────────────────────────────────────────
  async answerCall(id: string, operatorId: string): Promise<Call> {
    const call = await this.callsRepo.findOne({
      where: { id },
      relations: ['campaign', 'customer'],
    });
    if (!call) throw new NotFoundException("Qo'ng'iroq topilmadi");
    if (call.status !== CallStatus.RINGING) {
      throw new BadRequestException(
        "Qo'ng'iroq allaqachon javob berilgan yoki tugagan",
      );
    }
    call.status = CallStatus.ANSWERED;
    call.operatorId = operatorId;
    call.answeredAt = new Date();
    const updated = await this.callsRepo.save(call);

    // Boshqa operatorlarga: modal yopilsin
    this.callsGateway.notifyCallTaken(call.companyId, {
      callId: id,
      operatorId,
      takenAt: updated.answeredAt,
    });

    return updated;
  }

  // ─── YAKUNLASH ───────────────────────────────────────────────────────────────
  async completeCall(
    callId: string,
    operatorId: string,
    companyId: string,
    dto: CompleteCallDto,
  ): Promise<Call> {
    const call = await this.callsRepo.findOne({
      where: { id: callId },
      relations: ['campaign', 'customer', 'order', 'operator'],
    });
    if (!call) throw new NotFoundException("Qo'ng'iroq topilmadi");
    if (
      call.status !== CallStatus.ANSWERED &&
      call.status !== CallStatus.RINGING
    ) {
      throw new BadRequestException("Qo'ng'iroq allaqachon tugagan");
    }

    // Use the call's own companyId (not the requesting operator's companyId)
    const callCompanyId = call.companyId;

    const endedAt = new Date();
    call.status = CallStatus.COMPLETED;
    call.endedAt = endedAt;
    call.durationSeconds = call.answeredAt
      ? Math.floor((endedAt.getTime() - call.answeredAt.getTime()) / 1000)
      : 0;
    if (dto.notes !== undefined) call.notes = dto.notes;

    // Yangi mijoz yaratish yoki mavjudini ulash
    if (!dto.customerId && dto.newCustomer) {
      const customer = this.customersRepo.create({
        companyId: callCompanyId,
        fullName: dto.newCustomer.fullName,
        phone1: dto.newCustomer.phone || call.callerPhone,
        phone2: dto.newCustomer.phone2,
        address: dto.newCustomer.address,
      });
      const saved = await this.customersRepo.save(customer);
      call.customerId = saved.id;
    } else if (dto.customerId) {
      call.customerId = dto.customerId;
    }

    // Haydovchini aniqlash:
    // 1. Operator manual tanlagan → dto.driverId
    // 2. Kampaniyaning o'z haydovchisi → campaign.driverId
    let resolvedDriverId = dto.driverId;
    if (!resolvedDriverId && call.campaignId) {
      const campaign = await this.campaignsService.findOne(
        call.campaignId,
        callCompanyId,
      );
      resolvedDriverId = campaign?.driverId;
    }

    if (resolvedDriverId && call.customerId) {
      const driver = await this.usersRepo.findOne({
        where: { id: resolvedDriverId, companyId: callCompanyId },
      });
      if (driver && !call.orderId) {
        const order = this.ordersRepo.create({
          companyId: callCompanyId,
          customerId: call.customerId,
          operatorId,
          driverId: resolvedDriverId,
          status: 'DRIVER_ASSIGNED' as any,
          paymentStatus: 'UNPAID' as any,
          totalAmount: 0,
          paidAmount: 0,
          notes: dto.notes || `Qo'ng'iroq: ${call.callerPhone}`,
        });
        const savedOrder = await this.ordersRepo.save(order);
        call.orderId = savedOrder.id;
      }
    }

    const updated = await this.callsRepo.save(call);

    // Haydovchiga bildirishnoma
    if (resolvedDriverId) {
      this.callsGateway.notifyCallUpdate(callCompanyId, {
        type: 'new_order',
        callId,
        driverId: resolvedDriverId,
        orderId: call.orderId,
        customerPhone: call.callerPhone,
        message: 'Sizga yangi buyurtma tayinlandi!',
      });
    }

    this.callsGateway.notifyCallUpdate(callCompanyId, {
      callId,
      status: CallStatus.COMPLETED,
    });

    return updated;
  }

  // ─── JAVOBSIZ ────────────────────────────────────────────────────────────────
  async missCall(callId: string, companyId: string): Promise<Call> {
    const call = await this.findOne(callId, companyId);
    call.status = CallStatus.MISSED;
    call.endedAt = new Date();
    const updated = await this.callsRepo.save(call);
    this.callsGateway.notifyCallUpdate(companyId, {
      callId,
      status: CallStatus.MISSED,
    });
    return updated;
  }

  // ─── CHIQUVCHI ───────────────────────────────────────────────────────────────
  async createOutgoing(
    operatorId: string,
    companyId: string,
    dto: CreateCallDto,
  ): Promise<Call> {
    const existingCustomer = await this.customersRepo.findOne({
      where: [
        { phone1: dto.callerPhone, companyId },
        { phone2: dto.callerPhone, companyId },
      ],
    });
    const call = this.callsRepo.create({
      companyId,
      campaignId: dto.campaignId,
      operatorId,
      callerPhone: dto.callerPhone,
      direction: CallDirection.OUTGOING,
      status: CallStatus.ANSWERED,
      startedAt: new Date(),
      answeredAt: new Date(),
      customerId: existingCustomer?.id,
    });
    return this.callsRepo.save(call);
  }

  // ─── RO'YXAT ─────────────────────────────────────────────────────────────────
  async findAll(companyId: string, query: GetCallsQueryDto) {
    const { page = 1, limit = 30, status, campaignId, search } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const qb = this.callsRepo
      .createQueryBuilder('call')
      .leftJoinAndSelect('call.operator', 'operator')
      .leftJoinAndSelect('call.campaign', 'campaign')
      .leftJoinAndSelect('call.customer', 'customer')
      .leftJoinAndSelect('call.order', 'order')
      .where('call.companyId = :companyId', { companyId });
    if (status) qb.andWhere('call.status = :status', { status });
    if (campaignId)
      qb.andWhere('call.campaignId = :campaignId', { campaignId });
    if (search) {
      qb.andWhere(
        '(call.callerPhone ILIKE :s OR customer.full_name ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    qb.orderBy('call.createdAt', 'DESC').skip(skip).take(Number(limit));
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async findOperatorCalls(
    operatorId: string,
    companyId: string,
    query: GetCallsQueryDto,
  ) {
    const { page = 1, limit = 30, status, campaignId } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const qb = this.callsRepo
      .createQueryBuilder('call')
      .leftJoinAndSelect('call.campaign', 'campaign')
      .leftJoinAndSelect('call.customer', 'customer')
      .leftJoinAndSelect('call.order', 'order')
      .where('call.companyId = :companyId', { companyId })
      .andWhere('call.operatorId = :operatorId', { operatorId });
    if (status) qb.andWhere('call.status = :status', { status });
    if (campaignId)
      qb.andWhere('call.campaignId = :campaignId', { campaignId });
    qb.orderBy('call.createdAt', 'DESC').skip(skip).take(Number(limit));
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async findOne(id: string, companyId: string): Promise<Call> {
    const call = await this.callsRepo.findOne({
      where: { id, companyId },
      relations: ['operator', 'campaign', 'customer', 'order'],
    });
    if (!call) throw new NotFoundException("Qo'ng'iroq topilmadi");
    return call;
  }

  async getStats(companyId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [total, todayTotal, answered, missed] = await Promise.all([
      this.callsRepo.count({ where: { companyId } }),
      this.callsRepo
        .createQueryBuilder('c')
        .where('c.companyId = :companyId', { companyId })
        .andWhere('c.createdAt >= :today', { today })
        .getCount(),
      this.callsRepo.count({
        where: { companyId, status: CallStatus.COMPLETED },
      }),
      this.callsRepo.count({ where: { companyId, status: CallStatus.MISSED } }),
    ]);
    return {
      total,
      todayTotal,
      answered,
      missed,
      answerRate: total > 0 ? Math.round((answered / total) * 100) : 0,
    };
  }
}
