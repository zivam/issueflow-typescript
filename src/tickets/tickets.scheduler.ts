import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TicketsService } from './tickets.service';

@Injectable()
export class TicketsScheduler {
  private readonly logger = new Logger(TicketsScheduler.name);

  constructor(private readonly ticketsService: TicketsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async escalateOverdueTickets() {
    const result = await this.ticketsService.autoEscalateOverdueTickets();

    if (result.escalated > 0) {
      this.logger.log(
        `Auto-escalation: checked ${result.checked} tickets, escalated ${result.escalated}`,
      );
    }
  }
}
