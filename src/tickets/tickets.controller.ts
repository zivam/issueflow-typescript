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
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';
import { RequestWithUser } from '../auth/request-with-user.interface';
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
  findDeleted(
    @Query('projectId') projectId: string | undefined,
    @Req() req: RequestWithUser,
  ) {
    this.assertAdmin(req);

    return this.ticketsService.findDeleted(projectId ? +projectId : undefined);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="tickets.csv"')
  exportCsv(@Query('projectId') projectId?: string) {
    return this.ticketsService.exportCsv(projectId ? +projectId : undefined);
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  importCsv(
    @UploadedFile() file: Express.Multer.File,
    @Body('projectId') projectId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.ticketsService.importCsv(file, +projectId, req.user.id);
  }

  @Post('auto-escalate')
  autoEscalateOverdueTickets() {
    return this.ticketsService.autoEscalateOverdueTickets();
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
  create(
    @Body() createTicketDto: CreateTicketDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ticketsService.create(createTicketDto, req.user.id);
  }

  @Post(':ticketId/restore')
  restore(@Param('ticketId') ticketId: string, @Req() req: RequestWithUser) {
    this.assertAdmin(req);

    return this.ticketsService.restore(+ticketId, req.user.id);
  }

  @Post(':ticketId/dependencies')
  addDependency(
    @Param('ticketId') ticketId: string,
    @Body('blockedBy') blockedBy: number,
    @Req() req: RequestWithUser,
  ) {
    return this.ticketsService.addDependency(
      +ticketId,
      +blockedBy,
      req.user.id,
    );
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
    @Req() req: RequestWithUser,
  ) {
    return this.ticketsService.addAttachment(+ticketId, file, req.user.id);
  }

  @Patch(':ticketId')
  update(
    @Param('ticketId') ticketId: string,
    @Body() updateTicketDto: UpdateTicketDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ticketsService.update(+ticketId, updateTicketDto, req.user.id);
  }

  @Delete(':ticketId/dependencies/:blockerId')
  removeDependency(
    @Param('ticketId') ticketId: string,
    @Param('blockerId') blockerId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.ticketsService.removeDependency(
      +ticketId,
      +blockerId,
      req.user.id,
    );
  }

  @Delete(':ticketId/attachments/:attachmentId')
  removeAttachment(
    @Param('ticketId') ticketId: string,
    @Param('attachmentId') attachmentId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.ticketsService.removeAttachment(
      +ticketId,
      +attachmentId,
      req.user.id,
    );
  }

  @Delete(':ticketId')
  remove(@Param('ticketId') ticketId: string, @Req() req: RequestWithUser) {
    return this.ticketsService.remove(+ticketId, req.user.id);
  }

  private assertAdmin(req: RequestWithUser) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only ADMIN users can access this endpoint');
    }
  }
}