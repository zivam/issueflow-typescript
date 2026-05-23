import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { UsersModule } from '../users/users.module';
import {
  CommentsController,
  UserMentionsController,
} from './comments.controller';
import { CommentsService } from './comments.service';
import { CommentMention } from './entities/comment-mention.entity';
import { Comment } from './entities/comment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, CommentMention]),
    UsersModule,
    AuditLogsModule,
  ],
  controllers: [CommentsController, UserMentionsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}