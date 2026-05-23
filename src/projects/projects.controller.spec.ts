import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from '../tickets/tickets.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;

  const mockProjectsService = {
    findAll: jest.fn(),
    findDeleted: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    restore: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockTicketsService = {
    getProjectWorkload: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
        {
          provide: TicketsService,
          useValue: mockTicketsService,
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});