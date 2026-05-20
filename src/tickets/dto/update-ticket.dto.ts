import {
  TicketPriority,
  TicketStatus,
} from '../entities/ticket.entity';

export class UpdateTicketDto {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: number;
  dueDate?: Date;
}