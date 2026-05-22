import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditActor } from './entities/audit-log.entity';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('actor') actor?: AuditActor,
  ) {
    return this.auditLogsService.findAll({
      entityType,
      entityId: entityId ? +entityId : undefined,
      action,
      actor,
    });
  }
}