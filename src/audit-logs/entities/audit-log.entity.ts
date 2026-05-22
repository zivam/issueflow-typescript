import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum AuditActor {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE',
  AUTO_ASSIGN = 'AUTO_ASSIGN',
  AUTO_ESCALATE = 'AUTO_ESCALATE',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  action: string;

  @Column()
  entityType: string;

  @Column()
  entityId: number;

  @Column({ nullable: true })
  performedBy?: number;

  @Column({
    type: 'enum',
    enum: AuditActor,
    default: AuditActor.USER,
  })
  actor: AuditActor;

  @CreateDateColumn()
  timestamp: Date;
}
