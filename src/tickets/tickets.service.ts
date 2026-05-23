import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AuditAction,
  AuditActor,
} from '../audit-logs/entities/audit-log.entity';
import { UsersService } from '../users/users.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketDependency } from './entities/ticket-dependency.entity';
import { Ticket, TicketStatus } from './entities/ticket.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,

    @InjectRepository(TicketDependency)
    private readonly ticketDependenciesRepository: Repository<TicketDependency>,

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

    if (ticket.status === TicketStatus.DONE) {
      throw new BadRequestException('A DONE ticket cannot be updated');
    }

    if (updateTicketDto.status) {
      this.validateStatusForwardOnly(ticket.status, updateTicketDto.status);

      if (updateTicketDto.status === TicketStatus.DONE) {
        await this.validateNoUnresolvedBlockers(id);
      }
    }

    Object.assign(ticket, updateTicketDto);

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