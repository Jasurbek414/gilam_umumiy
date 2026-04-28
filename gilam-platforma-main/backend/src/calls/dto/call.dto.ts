import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { CallDirection } from '../entities/call.entity';

// ─── STANDART WEBHOOK (Asterisk / FreeSWITCH / manual) ─────────────────────
export class WebhookIncomingCallDto {
  @IsString()
  @IsNotEmpty()
  callerPhone: string;

  @IsString()
  @IsNotEmpty()
  calledPhone: string;

  @IsString()
  @IsOptional()
  sipCallId?: string;
}

// ─── ZADARMA WEBHOOK FORMAT ─────────────────────────────────────────────────
// Zadarma POST request bilan yuboradi, form fields
export class ZadarmaWebhookDto {
  // Qo'ng'iroq boshlandi
  @IsOptional()
  call_start?: string;

  // Qo'ng'iroq tugadi
  @IsOptional()
  call_end?: string;

  // Qo'ng'iroq qiluvchi raqam
  @IsOptional()
  caller_id?: string;

  @IsOptional()
  from?: string;

  // Qo'ng'iroq qilingan DID raqam
  @IsOptional()
  called_did?: string;

  @IsOptional()
  to?: string;

  // Zadarma unique call ID
  @IsOptional()
  pbx_call_id?: string;

  @IsOptional()
  call_id?: string;

  // Qo'shimcha ma'lumotlar
  @IsOptional()
  disposition?: string; // ANSWERED, NO ANSWER, BUSY, FAILED

  @IsOptional()
  duration?: string;

  @IsOptional()
  billsec?: string;

  @IsOptional()
  recording_id?: string;
}

// ─── CHIQUVCHI QO'NG'IROQ ───────────────────────────────────────────────────
export class CreateCallDto {
  @IsString()
  @IsNotEmpty()
  callerPhone: string;

  @IsString()
  @IsOptional()
  calledPhone?: string;

  @IsUUID()
  @IsOptional()
  campaignId?: string;

  @IsEnum(CallDirection)
  @IsOptional()
  direction?: CallDirection;
}

// ─── QABUL QILISH ───────────────────────────────────────────────────────────
export class AnswerCallDto {
  @IsUUID()
  @IsOptional()
  operatorId?: string;
}

// ─── YAKUNLASH ──────────────────────────────────────────────────────────────
export class CompleteCallDto {
  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsUUID()
  @IsOptional()
  orderId?: string;

  // Yangi mijoz (agar bazada yo'q bo'lsa)
  @IsOptional()
  newCustomer?: {
    fullName: string;
    phone: string;
    phone2?: string;
    address: string;
  };

  // Manual haydovchi (kampaniyaning default haydovchisi ishlatiladi agar belgilanmasa)
  @IsUUID()
  @IsOptional()
  driverId?: string;
}

// ─── QIDIRUV PARAMETRLARI ───────────────────────────────────────────────────
export class GetCallsQueryDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsUUID()
  @IsOptional()
  campaignId?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
