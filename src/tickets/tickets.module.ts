import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { UsersModule } from '../users/users.module';
import { TicketsController } from './tickets.controller';
import { TicketsScheduler } from './tickets.scheduler';
import { TicketsService } from './tickets.service';
import { TicketAttachment } from './entities/ticket-attachment.entity';
import { TicketDependency } from './entities/ticket-dependency.entity';
import { Ticket } from './entities/ticket.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, TicketDependency, TicketAttachment]),
    AuditLogsModule,
    UsersModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsScheduler],
  exports: [TicketsService],
})
export class TicketsModule {}