import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';
import { UsersService } from '../users/users.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentMention } from './entities/comment-mention.entity';
import { Comment } from './entities/comment.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentsRepository: Repository<Comment>,

    @InjectRepository(CommentMention)
    private readonly commentMentionsRepository: Repository<CommentMention>,

    private readonly usersService: UsersService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    ticketId: number,
    createCommentDto: CreateCommentDto,
    performedBy?: number,
  ) {
    const comment = this.commentsRepository.create({
      ...createCommentDto,
      ticketId,
    });

    const savedComment = await this.commentsRepository.save(comment);

    await this.syncMentions(savedComment.id, savedComment.content);

    await this.auditLogsService.create({
      action: AuditAction.CREATE,
      entityType: 'COMMENT',
      entityId: savedComment.id,
      performedBy: performedBy ?? savedComment.authorId,
    });

    return this.attachMentionedUsers(savedComment);
  }

  async findAllByTicket(ticketId: number) {
    const comments = await this.commentsRepository.find({
      where: { ticketId },
      order: { id: 'ASC' },
    });

    return Promise.all(
      comments.map((comment) => this.attachMentionedUsers(comment)),
    );
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

  async update(
    id: number,
    updateCommentDto: UpdateCommentDto,
    performedBy?: number,
  ) {
    const comment = await this.findOne(id);

    this.validateVersion(comment.version, updateCommentDto.version);

    const { version, ...commentUpdates } = updateCommentDto;

    Object.assign(comment, commentUpdates);

    const savedComment = await this.commentsRepository.save(comment);

    await this.syncMentions(savedComment.id, savedComment.content);

    await this.auditLogsService.create({
      action: AuditAction.UPDATE,
      entityType: 'COMMENT',
      entityId: savedComment.id,
      performedBy: performedBy ?? savedComment.authorId,
    });

    return this.attachMentionedUsers(savedComment);
  }

  async remove(id: number, performedBy?: number) {
    const comment = await this.findOne(id);

    await this.commentMentionsRepository.delete({ commentId: id });
    await this.commentsRepository.remove(comment);

    await this.auditLogsService.create({
      action: AuditAction.DELETE,
      entityType: 'COMMENT',
      entityId: id,
      performedBy: performedBy ?? comment.authorId,
    });
  }

  async findMentionsForUser(userId: number) {
    await this.usersService.findOne(userId);

    const mentions = await this.commentMentionsRepository.find({
      where: { userId },
      order: { id: 'ASC' },
    });

    const commentIds = mentions.map((mention) => mention.commentId);

    if (commentIds.length === 0) {
      return [];
    }

    const comments = await this.commentsRepository.find({
      where: { id: In(commentIds) },
      order: { id: 'ASC' },
    });

    return Promise.all(
      comments.map((comment) => this.attachMentionedUsers(comment)),
    );
  }

  private validateVersion(currentVersion: number, requestVersion?: number) {
    if (requestVersion === undefined) {
      return;
    }

    if (requestVersion !== currentVersion) {
      throw new ConflictException(
        `Version conflict. Current version is ${currentVersion}`,
      );
    }
  }

  private async syncMentions(commentId: number, content: string) {
    await this.commentMentionsRepository.delete({ commentId });

    const usernames = this.extractMentionedUsernames(content);
    const mentionedUsers = await this.usersService.findByUsernames(usernames);

    if (mentionedUsers.length === 0) {
      return;
    }

    const mentions = mentionedUsers.map((user) =>
      this.commentMentionsRepository.create({
        commentId,
        userId: user.id,
      }),
    );

    await this.commentMentionsRepository.save(mentions);
  }

  private extractMentionedUsernames(content: string) {
    const matches = content.matchAll(/@([a-zA-Z0-9_]+)/g);

    return [...new Set([...matches].map((match) => match[1].toLowerCase()))];
  }

  private async attachMentionedUsers(comment: Comment) {
    const mentions = await this.commentMentionsRepository.find({
      where: { commentId: comment.id },
      order: { id: 'ASC' },
    });

    const userIds = mentions.map((mention) => mention.userId);

    if (userIds.length === 0) {
      return {
        ...comment,
        mentionedUsers: [],
      };
    }

    const mentionedUsers = await Promise.all(
      userIds.map((userId) => this.usersService.findOne(userId)),
    );

    return {
      ...comment,
      mentionedUsers: mentionedUsers.map((user) => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
      })),
    };
  }
}