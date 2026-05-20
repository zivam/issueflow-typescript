import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Comment } from './entities/comment.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentsRepository: Repository<Comment>,
  ) {}

  create(ticketId: number, createCommentDto: CreateCommentDto) {
    const comment = this.commentsRepository.create({
      ...createCommentDto,
      ticketId,
    });

    return this.commentsRepository.save(comment);
  }

  findAllByTicket(ticketId: number) {
    return this.commentsRepository.find({
      where: { ticketId },
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number) {
    const comment = await this.commentsRepository.findOne({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with id ${id} was not found`);
    }

    return comment;
  }

  async update(id: number, updateCommentDto: UpdateCommentDto) {
    const comment = await this.findOne(id);

    Object.assign(comment, updateCommentDto);

    await this.commentsRepository.save(comment);
  }

  async remove(id: number) {
    const comment = await this.findOne(id);

    await this.commentsRepository.remove(comment);
  }
}