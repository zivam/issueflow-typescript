import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketDependency } from './entities/ticket-dependency.entity';
import { Ticket } from './entities/ticket.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketDependency]), AuditLogsModule],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}