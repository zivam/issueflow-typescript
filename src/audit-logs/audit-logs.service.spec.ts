import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  AuditAction,
  AuditActor,
  AuditLog,
} from './entities/audit-log.entity';
import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsService', () => {
  let service: AuditLogsService;

  const mockAuditLogsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogsRepository,
        },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates an audit log with USER actor by default', async () => {
    const auditLog = {
      id: 1,
      action: AuditAction.CREATE,
      entityType: 'TICKET',
      entityId: 8,
      performedBy: 4,
      actor: AuditActor.USER,
      timestamp: new Date(),
    };

    mockAuditLogsRepository.create.mockReturnValue(auditLog);
    mockAuditLogsRepository.save.mockResolvedValue(auditLog);

    const result = await service.create({
      action: AuditAction.CREATE,
      entityType: 'TICKET',
      entityId: 8,
      performedBy: 4,
    });

    expect(mockAuditLogsRepository.create).toHaveBeenCalledWith({
      action: AuditAction.CREATE,
      entityType: 'TICKET',
      entityId: 8,
      performedBy: 4,
      actor: AuditActor.USER,
    });

    expect(mockAuditLogsRepository.save).toHaveBeenCalledWith(auditLog);
    expect(result).toEqual(auditLog);
  });

  it('creates an audit log with SYSTEM actor when provided', async () => {
    const auditLog = {
      id: 2,
      action: AuditAction.AUTO_ESCALATE,
      entityType: 'TICKET',
      entityId: 10,
      actor: AuditActor.SYSTEM,
      timestamp: new Date(),
    };

    mockAuditLogsRepository.create.mockReturnValue(auditLog);
    mockAuditLogsRepository.save.mockResolvedValue(auditLog);

    const result = await service.create({
      action: AuditAction.AUTO_ESCALATE,
      entityType: 'TICKET',
      entityId: 10,
      actor: AuditActor.SYSTEM,
    });

    expect(mockAuditLogsRepository.create).toHaveBeenCalledWith({
      action: AuditAction.AUTO_ESCALATE,
      entityType: 'TICKET',
      entityId: 10,
      actor: AuditActor.SYSTEM,
    });

    expect(result).toEqual(auditLog);
  });

  it('finds all audit logs ordered by newest timestamp first', async () => {
    const logs = [
      {
        id: 2,
        action: AuditAction.UPDATE,
        entityType: 'COMMENT',
        entityId: 2,
      },
      {
        id: 1,
        action: AuditAction.CREATE,
        entityType: 'TICKET',
        entityId: 8,
      },
    ];

    mockAuditLogsRepository.find.mockResolvedValue(logs);

    const result = await service.findAll({});

    expect(mockAuditLogsRepository.find).toHaveBeenCalledWith({
      where: {},
      order: { timestamp: 'DESC' },
    });

    expect(result).toEqual(logs);
  });

  it('filters audit logs by action and entityType', async () => {
    const logs = [
      {
        id: 3,
        action: AuditAction.UPDATE,
        entityType: 'TICKET',
        entityId: 8,
      },
    ];

    mockAuditLogsRepository.find.mockResolvedValue(logs);

    const result = await service.findAll({
      action: AuditAction.UPDATE,
      entityType: 'TICKET',
    });

    expect(mockAuditLogsRepository.find).toHaveBeenCalledWith({
      where: {
        action: AuditAction.UPDATE,
        entityType: 'TICKET',
      },
      order: { timestamp: 'DESC' },
    });

    expect(result).toEqual(logs);
  });
});