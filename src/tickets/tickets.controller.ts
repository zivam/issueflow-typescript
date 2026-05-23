import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Header,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
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

  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="tickets.csv"')
  exportCsv(@Query('projectId') projectId?: string) {
    return this.ticketsService.exportCsv(projectId ? +projectId : undefined);
  }

  @Post('import')
  importCsv(@Body('csvContent') csvContent: string) {
    return this.ticketsService.importCsv(csvContent);
  }

  @Get(':ticketId/dependencies')
  findDependencies(@Param('ticketId') ticketId: string) {
    return this.ticketsService.findDependencies(+ticketId);
  }

  @Get(':ticketId/attachments')
  findAttachments(@Param('ticketId') ticketId: string) {
    return this.ticketsService.findAttachments(+ticketId);
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

  @Post(':ticketId/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          const uploadPath = './uploads/ticket-attachments';

          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }

          callback(null, uploadPath);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(
            Math.random() * 1e9,
          )}`;
          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  addAttachment(
    @Param('ticketId') ticketId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.ticketsService.addAttachment(+ticketId, file);
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

  @Delete(':ticketId/attachments/:attachmentId')
  removeAttachment(
    @Param('ticketId') ticketId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.ticketsService.removeAttachment(+ticketId, +attachmentId);
  }

  @Delete(':ticketId')
  remove(@Param('ticketId') ticketId: string) {
    return this.ticketsService.remove(+ticketId);
  }
}