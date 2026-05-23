import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketPriority, TicketStatus, TicketType } from './entities/ticket.entity';

describe('TicketsController', () => {
  let controller: TicketsController;

  const mockTicketsService = {
    findAll: jest.fn(),
    findDeleted: jest.fn(),
    exportCsv: jest.fn(),
    importCsv: jest.fn(),
    autoEscalateOverdueTickets: jest.fn(),
    findDependencies: jest.fn(),
    findAttachments: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    restore: jest.fn(),
    addDependency: jest.fn(),
    addAttachment: jest.fn(),
    update: jest.fn(),
    removeDependency: jest.fn(),
    removeAttachment: jest.fn(),
    remove: jest.fn(),
  };

  const adminRequest = {
    user: {
      id: 1,
      username: 'admin',
      role: 'ADMIN',
    },
  } as any;

  const developerRequest = {
    user: {
      id: 4,
      username: 'safeuser',
      role: 'DEVELOPER',
    },
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        {
          provide: TicketsService,
          useValue: mockTicketsService,
        },
      ],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes projectId to findAll', () => {
    controller.findAll('2');

    expect(mockTicketsService.findAll).toHaveBeenCalledWith(2);
  });

  it('allows ADMIN to list deleted tickets', () => {
    controller.findDeleted('2', adminRequest);

    expect(mockTicketsService.findDeleted).toHaveBeenCalledWith(2);
  });

  it('blocks DEVELOPER from listing deleted tickets', () => {
    expect(() => controller.findDeleted('2', developerRequest)).toThrow(
      ForbiddenException,
    );

    expect(mockTicketsService.findDeleted).not.toHaveBeenCalled();
  });

  it('exports CSV with optional projectId', () => {
    controller.exportCsv('2');

    expect(mockTicketsService.exportCsv).toHaveBeenCalledWith(2);
  });

  it('imports CSV multipart file with projectId and logged-in user id', () => {
    const file = {
      originalname: 'tickets.csv',
      mimetype: 'text/csv',
      buffer: Buffer.from('title,description,status,priority,type'),
      size: 100,
    } as Express.Multer.File;

    controller.importCsv(file, '2', developerRequest);

    expect(mockTicketsService.importCsv).toHaveBeenCalledWith(file, 2, 4);
  });

  it('passes logged-in user id when creating a ticket', () => {
    const createTicketDto = {
      title: 'New ticket',
      description: 'Ticket description',
      status: TicketStatus.TODO,
      priority: TicketPriority.MEDIUM,
      type: TicketType.BUG,
      projectId: 2,
    };

    controller.create(createTicketDto, developerRequest);

    expect(mockTicketsService.create).toHaveBeenCalledWith(createTicketDto, 4);
  });

  it('allows ADMIN to restore a ticket', () => {
    controller.restore('8', adminRequest);

    expect(mockTicketsService.restore).toHaveBeenCalledWith(8, 1);
  });

  it('blocks DEVELOPER from restoring a ticket', () => {
    expect(() => controller.restore('8', developerRequest)).toThrow(
      ForbiddenException,
    );

    expect(mockTicketsService.restore).not.toHaveBeenCalled();
  });

  it('passes logged-in user id when adding a dependency', () => {
    controller.addDependency('8', 9, developerRequest);

    expect(mockTicketsService.addDependency).toHaveBeenCalledWith(8, 9, 4);
  });

  it('passes logged-in user id when updating a ticket', () => {
    const updateDto = {
      description: 'Updated description',
      version: 1,
    };

    controller.update('8', updateDto, developerRequest);

    expect(mockTicketsService.update).toHaveBeenCalledWith(8, updateDto, 4);
  });

  it('passes logged-in user id when removing a ticket', () => {
    controller.remove('8', developerRequest);

    expect(mockTicketsService.remove).toHaveBeenCalledWith(8, 4);
  });
});