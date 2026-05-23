import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction, AuditActor } from '../audit-logs/entities/audit-log.entity';
import { UsersService } from '../users/users.service';
import { TicketAttachment } from './entities/ticket-attachment.entity';
import { TicketDependency } from './entities/ticket-dependency.entity';
import {
  Ticket,
  TicketPriority,
  TicketStatus,
  TicketType,
} from './entities/ticket.entity';
import { TicketsService } from './tickets.service';

describe('TicketsService', () => {
  let service: TicketsService;

  const mockTicketsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
    count: jest.fn(),
  };

  const mockTicketDependenciesRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockTicketAttachmentsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockAuditLogsService = {
    create: jest.fn(),
  };

  const mockUsersService = {
    findDevelopers: jest.fn(),
  };

  const baseTicket: Ticket = {
    id: 1,
    title: 'Test ticket',
    description: 'Test description',
    status: TicketStatus.TODO,
    priority: TicketPriority.MEDIUM,
    type: TicketType.BUG,
    projectId: 10,
    assigneeId: 1,
    dueDate: undefined,
    isOverdue: false,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: mockTicketsRepository,
        },
        {
          provide: getRepositoryToken(TicketDependency),
          useValue: mockTicketDependenciesRepository,
        },
        {
          provide: getRepositoryToken(TicketAttachment),
          useValue: mockTicketAttachmentsRepository,
        },
        {
          provide: AuditLogsService,
          useValue: mockAuditLogsService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws ConflictException when updating with an old version', async () => {
    mockTicketsRepository.findOne.mockResolvedValue({
      ...baseTicket,
      version: 3,
    });

    await expect(
      service.update(1, {
        description: 'Old update',
        version: 2,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(mockTicketsRepository.save).not.toHaveBeenCalled();
  });

  it('does not allow updating a DONE ticket', async () => {
    mockTicketsRepository.findOne.mockResolvedValue({
      ...baseTicket,
      status: TicketStatus.DONE,
    });

    await expect(
      service.update(1, {
        description: 'Should fail',
        version: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mockTicketsRepository.save).not.toHaveBeenCalled();
  });

  it('does not allow moving ticket status backward', async () => {
    mockTicketsRepository.findOne.mockResolvedValue({
      ...baseTicket,
      status: TicketStatus.IN_REVIEW,
    });

    await expect(
      service.update(1, {
        status: TicketStatus.IN_PROGRESS,
        version: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mockTicketsRepository.save).not.toHaveBeenCalled();
  });

  it('does not allow moving ticket to DONE when it has unresolved blockers', async () => {
    mockTicketsRepository.findOne.mockResolvedValue({
      ...baseTicket,
      status: TicketStatus.IN_REVIEW,
    });

    mockTicketDependenciesRepository.find.mockResolvedValue([
      {
        id: 1,
        ticketId: 1,
        blockedBy: 2,
      },
    ]);

    mockTicketsRepository.find.mockResolvedValue([
      {
        ...baseTicket,
        id: 2,
        status: TicketStatus.TODO,
      },
    ]);

    await expect(
      service.update(1, {
        status: TicketStatus.DONE,
        version: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mockTicketsRepository.save).not.toHaveBeenCalled();
  });

  it('auto assigns a ticket to the least-loaded developer', async () => {
    mockUsersService.findDevelopers.mockResolvedValue([
      {
        id: 3,
        username: 'dev3',
      },
      {
        id: 4,
        username: 'dev4',
      },
    ]);

    mockTicketsRepository.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1);

    mockTicketsRepository.create.mockImplementation((data) => data);
    mockTicketsRepository.save.mockImplementation((data) =>
      Promise.resolve({
        id: 100,
        ...data,
      }),
    );

    const result = await service.create(
      {
        title: 'Auto assign',
        description: 'Should pick least-loaded developer',
        status: TicketStatus.TODO,
        priority: TicketPriority.LOW,
        type: TicketType.FEATURE,
        projectId: 10,
      },
      4,
    );

    expect(result.assigneeId).toBe(4);

    expect(mockAuditLogsService.create).toHaveBeenCalledWith({
      action: AuditAction.AUTO_ASSIGN,
      entityType: 'TICKET',
      entityId: 100,
      performedBy: 4,
      actor: AuditActor.SYSTEM,
    });
  });

  it('creates an unassigned ticket when no developers exist', async () => {
    mockUsersService.findDevelopers.mockResolvedValue([]);

    mockTicketsRepository.create.mockImplementation((data) => data);
    mockTicketsRepository.save.mockImplementation((data) =>
      Promise.resolve({
        id: 101,
        ...data,
      }),
    );

    const result = await service.create(
      {
        title: 'No developer',
        description: 'Should stay unassigned',
        status: TicketStatus.TODO,
        priority: TicketPriority.LOW,
        type: TicketType.FEATURE,
        projectId: 10,
      },
      4,
    );

    expect(result.assigneeId).toBeUndefined();

    expect(mockAuditLogsService.create).toHaveBeenCalledWith({
      action: AuditAction.CREATE,
      entityType: 'TICKET',
      entityId: 101,
      performedBy: 4,
    });
  });

  it('returns project workload sorted by openTicketCount and userId', async () => {
    mockUsersService.findDevelopers.mockResolvedValue([
      {
        id: 5,
        username: 'dev5',
      },
      {
        id: 3,
        username: 'dev3',
      },
      {
        id: 4,
        username: 'dev4',
      },
    ]);

    mockTicketsRepository.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);

    const workload = await service.getProjectWorkload(10);

    expect(workload).toEqual([
      {
        userId: 3,
        username: 'dev3',
        openTicketCount: 1,
      },
      {
        userId: 4,
        username: 'dev4',
        openTicketCount: 1,
      },
      {
        userId: 5,
        username: 'dev5',
        openTicketCount: 2,
      },
    ]);
  });
});