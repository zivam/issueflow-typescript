import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { mkdir, unlink } from 'fs/promises';
import { dirname } from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { In, IsNull, LessThan, Not, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AuditAction,
  AuditActor,
} from '../audit-logs/entities/audit-log.entity';
import { UsersService } from '../users/users.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketAttachment } from './entities/ticket-attachment.entity';
import { TicketDependency } from './entities/ticket-dependency.entity';
import {
  Ticket,
  TicketPriority,
  TicketStatus,
  TicketType,
} from './entities/ticket.entity';

@Injectable()
export class TicketsService {
  private readonly maxAttachmentSize = 10 * 1024 * 1024;

  private readonly allowedAttachmentMimeTypes = [
    'image/png',
    'image/jpeg',
    'application/pdf',
    'text/plain',
  ];

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,

    @InjectRepository(TicketDependency)
    private readonly ticketDependenciesRepository: Repository<TicketDependency>,

    @InjectRepository(TicketAttachment)
    private readonly ticketAttachmentsRepository: Repository<TicketAttachment>,

    private readonly auditLogsService: AuditLogsService,
    private readonly usersService: UsersService,
  ) {}

  async create(createTicketDto: CreateTicketDto) {
    const ticketData = { ...createTicketDto };

    if (!ticketData.assigneeId) {
      ticketData.assigneeId = await this.findAutoAssignee(ticketData.projectId);
    }

    const ticket = this.ticketsRepository.create(ticketData);
    const savedTicket = await this.ticketsRepository.save(ticket);

    await this.auditLogsService.create({
      action: AuditAction.CREATE,
      entityType: 'TICKET',
      entityId: savedTicket.id,
    });

    if (!createTicketDto.assigneeId && savedTicket.assigneeId) {
      await this.auditLogsService.create({
        action: AuditAction.AUTO_ASSIGN,
        entityType: 'TICKET',
        entityId: savedTicket.id,
        performedBy: savedTicket.assigneeId,
        actor: AuditActor.SYSTEM,
      });
    }

    return savedTicket;
  }

  findAll(projectId?: number) {
    return this.ticketsRepository.find({
      where: {
        ...(projectId ? { projectId } : {}),
        deletedAt: IsNull(),
      },
      order: { id: 'ASC' },
    });
  }

  findDeleted(projectId?: number) {
    return this.ticketsRepository.find({
      withDeleted: true,
      where: {
        ...(projectId ? { projectId } : {}),
        deletedAt: Not(IsNull()),
      },
      order: { id: 'ASC' },
    });
  }

  async exportCsv(projectId?: number) {
    const tickets = await this.findAll(projectId);

    return stringify(
      tickets.map((ticket) => ({
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        type: ticket.type,
        projectId: ticket.projectId,
        assigneeId: ticket.assigneeId ?? '',
        dueDate: ticket.dueDate ? new Date(ticket.dueDate).toISOString() : '',
      })),
      {
        header: true,
        columns: [
          'title',
          'description',
          'status',
          'priority',
          'type',
          'projectId',
          'assigneeId',
          'dueDate',
        ],
      },
    );
  }

  async importCsv(csvContent: string) {
    if (!csvContent || csvContent.trim().length === 0) {
      throw new BadRequestException('csvContent is required');
    }

    let rows: Record<string, string>[];

    try {
      rows = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, string>[];
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid CSV content';

      throw new BadRequestException(`Invalid CSV content: ${message}`);
    }

    const errors: string[] = [];
    let created = 0;

    for (let index = 0; index < rows.length; index++) {
      const rowNumber = index + 2;
      const row = rows[index];

      try {
        const createTicketDto = this.csvRowToCreateTicketDto(row, rowNumber);
        await this.create(createTicketDto);
        created++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown import error';

        errors.push(`Row ${rowNumber}: ${message}`);
      }
    }

    return {
      created,
      failed: errors.length,
      errors,
    };
  }

  async autoEscalateOverdueTickets() {
    const overdueTickets = await this.ticketsRepository.find({
      where: {
        deletedAt: IsNull(),
        dueDate: LessThan(new Date()),
        status: Not(TicketStatus.DONE),
      },
      order: { id: 'ASC' },
    });

    const escalatedTickets = [];

    for (const ticket of overdueTickets) {
      const previousPriority = ticket.priority;
      const previousIsOverdue = ticket.isOverdue;

      if (ticket.priority === TicketPriority.LOW) {
        ticket.priority = TicketPriority.MEDIUM;
      } else if (ticket.priority === TicketPriority.MEDIUM) {
        ticket.priority = TicketPriority.HIGH;
      } else if (ticket.priority === TicketPriority.HIGH) {
        ticket.priority = TicketPriority.CRITICAL;
      } else if (ticket.priority === TicketPriority.CRITICAL) {
        ticket.isOverdue = true;
      }

      const changed =
        previousPriority !== ticket.priority ||
        previousIsOverdue !== ticket.isOverdue;

      if (!changed) {
        continue;
      }

      const savedTicket = await this.ticketsRepository.save(ticket);

      await this.auditLogsService.create({
        action: AuditAction.AUTO_ESCALATE,
        entityType: 'TICKET',
        entityId: savedTicket.id,
        actor: AuditActor.SYSTEM,
      });

      escalatedTickets.push({
        id: savedTicket.id,
        previousPriority,
        newPriority: savedTicket.priority,
        previousIsOverdue,
        newIsOverdue: savedTicket.isOverdue,
      });
    }

    return {
      checked: overdueTickets.length,
      escalated: escalatedTickets.length,
      tickets: escalatedTickets,
    };
  }

  async findOne(id: number) {
    const ticket = await this.ticketsRepository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with id ${id} was not found`);
    }

    return ticket;
  }

  async update(id: number, updateTicketDto: UpdateTicketDto) {
    const ticket = await this.findOne(id);

    this.validateVersion(ticket.version, updateTicketDto.version);

    if (ticket.status === TicketStatus.DONE) {
      throw new BadRequestException('A DONE ticket cannot be updated');
    }

    if (updateTicketDto.status) {
      this.validateStatusForwardOnly(ticket.status, updateTicketDto.status);

      if (updateTicketDto.status === TicketStatus.DONE) {
        await this.validateNoUnresolvedBlockers(id);
      }
    }

    const { version, ...ticketUpdates } = updateTicketDto;

    Object.assign(ticket, ticketUpdates);

    if (updateTicketDto.priority) {
      ticket.isOverdue = false;
    }

    await this.ticketsRepository.save(ticket);

    await this.auditLogsService.create({
      action: AuditAction.UPDATE,
      entityType: 'TICKET',
      entityId: id,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.ticketsRepository.softDelete(id);

    await this.auditLogsService.create({
      action: AuditAction.DELETE,
      entityType: 'TICKET',
      entityId: id,
    });
  }

  async restore(id: number) {
    const ticket = await this.ticketsRepository.findOne({
      withDeleted: true,
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with id ${id} was not found`);
    }

    await this.ticketsRepository.restore(id);

    await this.auditLogsService.create({
      action: AuditAction.RESTORE,
      entityType: 'TICKET',
      entityId: id,
    });
  }

  async addDependency(ticketId: number, blockedBy: number) {
    if (ticketId === blockedBy) {
      throw new BadRequestException('A ticket cannot depend on itself');
    }

    const ticket = await this.findOne(ticketId);
    const blocker = await this.findOne(blockedBy);

    if (ticket.projectId !== blocker.projectId) {
      throw new BadRequestException(
        'Both tickets must belong to the same project',
      );
    }

    const existingDependency = await this.ticketDependenciesRepository.findOne({
      where: {
        ticketId,
        blockedBy,
      },
    });

    if (existingDependency) {
      throw new BadRequestException('Dependency already exists');
    }

    const dependency = this.ticketDependenciesRepository.create({
      ticketId,
      blockedBy,
    });

    const savedDependency =
      await this.ticketDependenciesRepository.save(dependency);

    await this.auditLogsService.create({
      action: AuditAction.CREATE,
      entityType: 'TICKET_DEPENDENCY',
      entityId: savedDependency.id,
    });

    return savedDependency;
  }

  async findDependencies(ticketId: number) {
    await this.findOne(ticketId);

    const dependencies = await this.ticketDependenciesRepository.find({
      where: { ticketId },
      order: { id: 'ASC' },
    });

    const blockerIds = dependencies.map((dependency) => dependency.blockedBy);

    if (blockerIds.length === 0) {
      return [];
    }

    const blockers = await this.ticketsRepository.find({
      where: {
        id: In(blockerIds),
        deletedAt: IsNull(),
      },
      order: { id: 'ASC' },
    });

    return blockers.map((blocker) => ({
      id: blocker.id,
      title: blocker.title,
      status: blocker.status,
    }));
  }

  async removeDependency(ticketId: number, blockerId: number) {
    await this.findOne(ticketId);
    await this.findOne(blockerId);

    const dependency = await this.ticketDependenciesRepository.findOne({
      where: {
        ticketId,
        blockedBy: blockerId,
      },
    });

    if (!dependency) {
      throw new NotFoundException('Dependency was not found');
    }

    const dependencyId = dependency.id;

    await this.ticketDependenciesRepository.remove(dependency);

    await this.auditLogsService.create({
      action: AuditAction.DELETE,
      entityType: 'TICKET_DEPENDENCY',
      entityId: dependencyId,
    });
  }

  async addAttachment(ticketId: number, file: Express.Multer.File) {
    await this.findOne(ticketId);
    await this.validateAttachmentFile(file);

    await mkdir(dirname(file.path), { recursive: true });

    const attachment = this.ticketAttachmentsRepository.create({
      ticketId,
      originalName: file.originalname,
      fileName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
    });

    const savedAttachment =
      await this.ticketAttachmentsRepository.save(attachment);

    await this.auditLogsService.create({
      action: AuditAction.CREATE,
      entityType: 'TICKET_ATTACHMENT',
      entityId: savedAttachment.id,
    });

    return savedAttachment;
  }

  async findAttachments(ticketId: number) {
    await this.findOne(ticketId);

    return this.ticketAttachmentsRepository.find({
      where: { ticketId },
      order: { id: 'ASC' },
    });
  }

  async removeAttachment(ticketId: number, attachmentId: number) {
    await this.findOne(ticketId);

    const attachment = await this.ticketAttachmentsRepository.findOne({
      where: {
        id: attachmentId,
        ticketId,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment was not found');
    }

    await this.ticketAttachmentsRepository.remove(attachment);

    try {
      await unlink(attachment.path);
    } catch {
      // File may already be missing. The database record is still removed.
    }

    await this.auditLogsService.create({
      action: AuditAction.DELETE,
      entityType: 'TICKET_ATTACHMENT',
      entityId: attachmentId,
    });
  }

  async getProjectWorkload(projectId: number) {
    const developers = await this.usersService.findDevelopers();

    const workload = await Promise.all(
      developers.map(async (developer) => {
        const openTickets = await this.ticketsRepository.count({
          where: {
            projectId,
            assigneeId: developer.id,
            deletedAt: IsNull(),
            status: Not(TicketStatus.DONE),
          },
        });

        return {
          userId: developer.id,
          username: developer.username,
          fullName: developer.fullName,
          openTickets,
        };
      }),
    );

    return workload;
  }

  private validateVersion(currentVersion: number, requestVersion?: number) {
    if (requestVersion === undefined) {
      return;
    }

    if (requestVersion !== currentVersion) {
      throw new ConflictException(
        `Version conflict. Current version is ${currentVersion}`,
      );
    }
  }

  private async validateAttachmentFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Attachment file is required');
    }

    if (file.size > this.maxAttachmentSize) {
      await this.deleteUploadedFileIfExists(file);
      throw new BadRequestException('Attachment size cannot exceed 10MB');
    }

    if (!this.allowedAttachmentMimeTypes.includes(file.mimetype)) {
      await this.deleteUploadedFileIfExists(file);
      throw new BadRequestException(
        'Only png, jpeg, pdf and txt files are allowed',
      );
    }
  }

  private async deleteUploadedFileIfExists(file: Express.Multer.File) {
    if (!file?.path) {
      return;
    }

    try {
      await unlink(file.path);
    } catch {
      // File may already be missing.
    }
  }

  private csvRowToCreateTicketDto(
    row: Record<string, string>,
    rowNumber: number,
  ): CreateTicketDto {
    const title = this.requireString(row.title, 'title', rowNumber);
    const description = this.requireString(
      row.description,
      'description',
      rowNumber,
    );
    const status = this.requireEnum(
      row.status,
      TicketStatus,
      'status',
      rowNumber,
    );
    const priority = this.requireEnum(
      row.priority,
      TicketPriority,
      'priority',
      rowNumber,
    );
    const type = this.requireEnum(row.type, TicketType, 'type', rowNumber);
    const projectId = this.requireNumber(row.projectId, 'projectId', rowNumber);
    const assigneeId = this.optionalNumber(
      row.assigneeId,
      'assigneeId',
      rowNumber,
    );
    const dueDate = this.optionalDate(row.dueDate, 'dueDate', rowNumber);

    return {
      title,
      description,
      status,
      priority,
      type,
      projectId,
      ...(assigneeId ? { assigneeId } : {}),
      ...(dueDate ? { dueDate } : {}),
    };
  }

  private requireString(value: string | undefined, field: string, row: number) {
    if (!value || value.trim().length === 0) {
      throw new BadRequestException(`Row ${row}: ${field} is required`);
    }

    return value.trim();
  }

  private requireNumber(value: string | undefined, field: string, row: number) {
    if (!value || value.trim().length === 0) {
      throw new BadRequestException(`Row ${row}: ${field} is required`);
    }

    const parsedValue = Number(value);

    if (!Number.isInteger(parsedValue)) {
      throw new BadRequestException(`Row ${row}: ${field} must be an integer`);
    }

    return parsedValue;
  }

  private optionalNumber(value: string | undefined, field: string, row: number) {
    if (!value || value.trim().length === 0) {
      return undefined;
    }

    const parsedValue = Number(value);

    if (!Number.isInteger(parsedValue)) {
      throw new BadRequestException(`Row ${row}: ${field} must be an integer`);
    }

    return parsedValue;
  }

  private optionalDate(value: string | undefined, field: string, row: number) {
    if (!value || value.trim().length === 0) {
      return undefined;
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(`Row ${row}: ${field} must be a valid date`);
    }

    return parsedDate;
  }

  private requireEnum<T extends Record<string, string>>(
    value: string | undefined,
    enumObject: T,
    field: string,
    row: number,
  ) {
    if (!value || value.trim().length === 0) {
      throw new BadRequestException(`Row ${row}: ${field} is required`);
    }

    const normalizedValue = value.trim().toUpperCase();
    const allowedValues = Object.values(enumObject);

    if (!allowedValues.includes(normalizedValue)) {
      throw new BadRequestException(
        `Row ${row}: ${field} must be one of: ${allowedValues.join(', ')}`,
      );
    }

    return normalizedValue as T[keyof T];
  }

  private async findAutoAssignee(projectId: number) {
    const workload = await this.getProjectWorkload(projectId);

    if (workload.length === 0) {
      throw new BadRequestException('No developers available for assignment');
    }

    const sortedWorkload = workload.sort((a, b) => {
      if (a.openTickets !== b.openTickets) {
        return a.openTickets - b.openTickets;
      }

      return a.userId - b.userId;
    });

    return sortedWorkload[0].userId;
  }

  private async validateNoUnresolvedBlockers(ticketId: number) {
    const dependencies = await this.ticketDependenciesRepository.find({
      where: { ticketId },
    });

    const blockerIds = dependencies.map((dependency) => dependency.blockedBy);

    if (blockerIds.length === 0) {
      return;
    }

    const unresolvedBlockers = await this.ticketsRepository.find({
      where: {
        id: In(blockerIds),
        deletedAt: IsNull(),
        status: Not(TicketStatus.DONE),
      },
    });

    if (unresolvedBlockers.length > 0) {
      throw new BadRequestException(
        'Ticket cannot be moved to DONE while it has unresolved blockers',
      );
    }
  }

  private validateStatusForwardOnly(
    currentStatus: TicketStatus,
    nextStatus: TicketStatus,
  ) {
    const order = [
      TicketStatus.TODO,
      TicketStatus.IN_PROGRESS,
      TicketStatus.IN_REVIEW,
      TicketStatus.DONE,
    ];

    const currentIndex = order.indexOf(currentStatus);
    const nextIndex = order.indexOf(nextStatus);

    if (nextIndex < currentIndex) {
      throw new BadRequestException(
        `Status cannot move backward from ${currentStatus} to ${nextStatus}`,
      );
    }
  }
}