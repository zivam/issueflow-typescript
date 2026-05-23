import { ForbiddenException } from '@nestjs/common';
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

  it('finds all projects', () => {
    controller.findAll();

    expect(mockProjectsService.findAll).toHaveBeenCalled();
  });

  it('allows ADMIN to list deleted projects', () => {
    controller.findDeleted(adminRequest);

    expect(mockProjectsService.findDeleted).toHaveBeenCalled();
  });

  it('blocks DEVELOPER from listing deleted projects', () => {
    expect(() => controller.findDeleted(developerRequest)).toThrow(
      ForbiddenException,
    );

    expect(mockProjectsService.findDeleted).not.toHaveBeenCalled();
  });

  it('gets project workload', () => {
    controller.getWorkload('2');

    expect(mockTicketsService.getProjectWorkload).toHaveBeenCalledWith(2);
  });

  it('finds one project by id', () => {
    controller.findOne('2');

    expect(mockProjectsService.findOne).toHaveBeenCalledWith(2);
  });

  it('creates a project', () => {
    const createProjectDto = {
      name: 'Project',
      description: 'Project description',
      ownerId: 1,
    };

    controller.create(createProjectDto);

    expect(mockProjectsService.create).toHaveBeenCalledWith(createProjectDto);
  });

  it('allows ADMIN to restore a project', () => {
    controller.restore('2', adminRequest);

    expect(mockProjectsService.restore).toHaveBeenCalledWith(2);
  });

  it('blocks DEVELOPER from restoring a project', () => {
    expect(() => controller.restore('2', developerRequest)).toThrow(
      ForbiddenException,
    );

    expect(mockProjectsService.restore).not.toHaveBeenCalled();
  });

  it('updates a project', () => {
    const updateProjectDto = {
      name: 'Updated project',
    };

    controller.update('2', updateProjectDto);

    expect(mockProjectsService.update).toHaveBeenCalledWith(
      2,
      updateProjectDto,
    );
  });

  it('removes a project', () => {
    controller.remove('2');

    expect(mockProjectsService.remove).toHaveBeenCalledWith(2);
  });
});