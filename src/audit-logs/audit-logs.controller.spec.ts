import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { AuditAction, AuditActor } from './entities/audit-log.entity';

describe('AuditLogsController', () => {
  let controller: AuditLogsController;

  const mockAuditLogsService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [
        {
          provide: AuditLogsService,
          useValue: mockAuditLogsService,
        },
      ],
    }).compile();

    controller = module.get<AuditLogsController>(AuditLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('finds all audit logs without filters', () => {
    controller.findAll(undefined, undefined, undefined, undefined);

    expect(mockAuditLogsService.findAll).toHaveBeenCalledWith({
      action: undefined,
      entityType: undefined,
      entityId: undefined,
      actor: undefined,
    });
  });

  it('passes filters to service', () => {
    controller.findAll(
      'TICKET',
      '8',
      AuditAction.UPDATE,
      AuditActor.USER,
    );

    expect(mockAuditLogsService.findAll).toHaveBeenCalledWith({
      action: AuditAction.UPDATE,
      entityType: 'TICKET',
      entityId: 8,
      actor: AuditActor.USER,
    });
  });

  it('converts entityId query param to number', () => {
    controller.findAll(undefined, '15', undefined, undefined);

    expect(mockAuditLogsService.findAll).toHaveBeenCalledWith({
      action: undefined,
      entityType: undefined,
      entityId: 15,
      actor: undefined,
    });
  });
});