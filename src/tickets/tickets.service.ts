import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket, TicketStatus } from './entities/ticket.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
  ) {}

  create(createTicketDto: CreateTicketDto) {
    const ticket = this.ticketsRepository.create(createTicketDto);
    return this.ticketsRepository.save(ticket);
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
    }

    Object.assign(ticket, updateTicketDto);

    if (updateTicketDto.priority) {
      ticket.isOverdue = false;
    }

    await this.ticketsRepository.save(ticket);
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.ticketsRepository.softDelete(id);
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