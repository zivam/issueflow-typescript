import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('comment_mentions')
@Unique(['commentId', 'userId'])
export class CommentMention {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  commentId: number;

  @Column()
  userId: number;
}
