import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('ticket_dependencies')
@Unique(['ticketId', 'blockedBy'])
export class TicketDependency {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ticketId: number;

  @Column()
  blockedBy: number;
}
