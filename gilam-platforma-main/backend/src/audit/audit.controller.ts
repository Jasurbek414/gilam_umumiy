import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Kompaniya bo'yicha barcha audit loglarni olish.
   * Query: ?entityType=EXPENSE&limit=50
   */
  @Get('company/:companyId')
  findByCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query('entityType') entityType?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findByCompany(
      companyId,
      entityType,
      limit ? parseInt(limit) : 100,
    );
  }

  /**
   * Muayyan entity uchun tarix olish.
   * Masalan: /audit/entity/EXPENSE/uuid-123
   */
  @Get('entity/:entityType/:entityId')
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.findByEntity(entityType, entityId);
  }
}
