import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  findAll(@Query('projectId') projectId?: string) {
    return this.ticketsService.findAll(projectId ? +projectId : undefined);
  }

  @Get('deleted')
  findDeleted(@Query('projectId') projectId?: string) {
    return this.ticketsService.findDeleted(projectId ? +projectId : undefined);
  }

  @Get(':ticketId/dependencies')
  findDependencies(@Param('ticketId') ticketId: string) {
    return this.ticketsService.findDependencies(+ticketId);
  }

  @Get(':ticketId')
  findOne(@Param('ticketId') ticketId: string) {
    return this.ticketsService.findOne(+ticketId);
  }

  @Post()
  create(@Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.create(createTicketDto);
  }

  @Post(':ticketId/restore')
  restore(@Param('ticketId') ticketId: string) {
    return this.ticketsService.restore(+ticketId);
  }

  @Post(':ticketId/dependencies')
  addDependency(
    @Param('ticketId') ticketId: string,
    @Body('blockedBy') blockedBy: number,
  ) {
    return this.ticketsService.addDependency(+ticketId, +blockedBy);
  }

  @Patch(':ticketId')
  update(
    @Param('ticketId') ticketId: string,
    @Body() updateTicketDto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(+ticketId, updateTicketDto);
  }

  @Delete(':ticketId/dependencies/:blockerId')
  removeDependency(
    @Param('ticketId') ticketId: string,
    @Param('blockerId') blockerId: string,
  ) {
    return this.ticketsService.removeDependency(+ticketId, +blockerId);
  }

  @Delete(':ticketId')
  remove(@Param('ticketId') ticketId: string) {
    return this.ticketsService.remove(+ticketId);
  }
}