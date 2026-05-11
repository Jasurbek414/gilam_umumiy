import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole, UserStatus } from '../entities/user.entity';

export class CreateUserDto {
  @IsOptional()
  @IsUUID()
  companyId?: string | null;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  salary?: number;

  @IsOptional()
  @IsString()
  workSchedule?: string;

  @IsOptional()
  lunchBreakMinutes?: number;

  @IsOptional()
  @IsString()
  birthPlace?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsUUID()
  companyId?: string | null;

  @IsOptional()
  currentLocation?: any;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  salary?: number;

  @IsOptional()
  @IsString()
  workSchedule?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lunchBreakMinutes?: number;

  @IsOptional()
  @IsString()
  birthPlace?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
