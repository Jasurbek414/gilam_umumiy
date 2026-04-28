import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCustomerDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phone1: string;

  @IsOptional()
  @IsString()
  phone2?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  location?: any;

  @IsOptional()
  @IsUUID()
  operatorId?: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone1?: string;

  @IsOptional()
  @IsString()
  phone2?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  location?: any;

  @IsOptional()
  @IsUUID()
  operatorId?: string;
}
