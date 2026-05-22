import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  AuditActor,
  AuditLog,
} from './entities/audit-log.entity';

export interface CreateAuditLogInput {
  action: string;
  entityType: string;
  entityId: number;
  performedBy?: number;
  actor?: AuditActor;
}

export interface AuditLogFilters {
  entityType?: string;
  entityId?: number;
  action?: string;
  actor?: AuditActor;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogsRepository: Repository<AuditLog>,
  ) {}

  create(input: CreateAuditLogInput) {
    const log = this.auditLogsRepository.create({
      ...input,
      actor: input.actor ?? AuditActor.USER,
    });

    return this.auditLogsRepository.save(log);
  }

  findAll(filters: AuditLogFilters) {
    const where: FindOptionsWhere<AuditLog> = {};

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.actor) {
      where.actor = filters.actor;
    }

    return this.auditLogsRepository.find({
      where,
      order: { timestamp: 'DESC' },
    });
  }
}