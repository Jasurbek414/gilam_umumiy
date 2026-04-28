import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { MeasurementUnit } from '../entities/service.entity';

export class CreateServiceDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(MeasurementUnit)
  @IsNotEmpty()
  measurementUnit: MeasurementUnit;

  @IsNumber()
  @IsNotEmpty()
  price: number;
}

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(MeasurementUnit)
  measurementUnit?: MeasurementUnit;

  @IsOptional()
  @IsNumber()
  price?: number;
}
