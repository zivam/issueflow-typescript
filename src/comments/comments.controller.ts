import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
} from '@nestjs/common';
import { RequestWithUser } from '../auth/request-with-user.interface';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller('tickets/:ticketId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  findAll(@Param('ticketId') ticketId: string) {
    return this.commentsService.findAllByTicket(+ticketId);
  }

  @Post()
  create(
    @Param('ticketId') ticketId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.commentsService.create(+ticketId, createCommentDto, req.user.id);
  }

  @Patch(':commentId')
  update(
    @Param('commentId') commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.commentsService.update(+commentId, updateCommentDto, req.user.id);
  }

  @Delete(':commentId')
  remove(@Param('commentId') commentId: string, @Req() req: RequestWithUser) {
    return this.commentsService.remove(+commentId, req.user.id);
  }
}

@Controller('users/:userId/mentions')
export class UserMentionsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  findMentionsForUser(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.commentsService.findMentionsForUser(
      +userId,
      page ? +page : undefined,
      pageSize ? +pageSize : undefined,
    );
  }
}