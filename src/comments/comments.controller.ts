import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
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
  ) {
    return this.commentsService.create(+ticketId, createCommentDto);
  }

  @Patch(':commentId')
  update(
    @Param('commentId') commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.commentsService.update(+commentId, updateCommentDto);
  }

  @Delete(':commentId')
  remove(@Param('commentId') commentId: string) {
    return this.commentsService.remove(+commentId);
  }
}