import { Test, TestingModule } from '@nestjs/testing';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

describe('TicketsController', () => {
  let controller: TicketsController;

  const mockTicketsService = {
    findAll: jest.fn(),
    findDeleted: jest.fn(),
    exportCsv: jest.fn(),
    importCsv: jest.fn(),
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

  beforeEach(async () => {
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
});