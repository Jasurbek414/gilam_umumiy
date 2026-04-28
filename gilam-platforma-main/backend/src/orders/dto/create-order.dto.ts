import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { MeasurementUnit } from '../../services/entities/service.entity';

export class CreateOrderItemDto {
  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  length?: number;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOrderDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @IsOptional()
  @IsUUID()
  operatorId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
