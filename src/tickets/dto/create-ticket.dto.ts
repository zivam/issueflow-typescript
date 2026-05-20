import {
  TicketPriority,
  TicketStatus,
  TicketType,
} from '../entities/ticket.entity';

export class CreateTicketDto {
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  projectId: number;
  assigneeId?: number;
  dueDate?: Date;
}