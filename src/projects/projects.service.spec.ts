import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';
import { Project } from './entities/project.entity';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const mockProjectsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
  };

  const mockAuditLogsService = {
    create: jest.fn(),
  };

  const baseProject: Project = {
    id: 2,
    name: 'Test Project',
    description: 'Test project description',
    ownerId: 1,
    createdAt: new Date(),
    deletedAt: undefined,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectsRepository,
        },
        {
          provide: AuditLogsService,
          useValue: mockAuditLogsService,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a project and writes audit log', async () => {
    const createProjectDto = {
      name: 'New Project',
      description: 'New project description',
      ownerId: 1,
    };

    mockProjectsRepository.create.mockReturnValue(createProjectDto);
    mockProjectsRepository.save.mockResolvedValue({
      id: 10,
      ...createProjectDto,
    });

    const result = await service.create(createProjectDto);

    expect(mockProjectsRepository.create).toHaveBeenCalledWith(
      createProjectDto,
    );

    expect(mockProjectsRepository.save).toHaveBeenCalledWith(createProjectDto);

    expect(mockAuditLogsService.create).toHaveBeenCalledWith({
      action: AuditAction.CREATE,
      entityType: 'PROJECT',
      entityId: 10,
    });

    expect(result).toEqual({
      id: 10,
      ...createProjectDto,
    });
  });

  it('finds all non-deleted projects ordered by id', async () => {
    mockProjectsRepository.find.mockResolvedValue([baseProject]);

    const result = await service.findAll();

    expect(mockProjectsRepository.find).toHaveBeenCalledWith({
      where: expect.any(Object),
      order: { id: 'ASC' },
    });

    expect(result).toEqual([baseProject]);
  });

  it('throws NotFoundException when project does not exist', async () => {
    mockProjectsRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates a project and writes audit log', async () => {
    mockProjectsRepository.findOne.mockResolvedValue({
      ...baseProject,
    });

    mockProjectsRepository.save.mockImplementation((project) =>
      Promise.resolve(project),
    );

    await service.update(2, {
      name: 'Updated Project',
    });

    expect(mockProjectsRepository.save).toHaveBeenCalledWith({
      ...baseProject,
      name: 'Updated Project',
    });

    expect(mockAuditLogsService.create).toHaveBeenCalledWith({
      action: AuditAction.UPDATE,
      entityType: 'PROJECT',
      entityId: 2,
    });
  });

  it('soft deletes a project and writes audit log', async () => {
    mockProjectsRepository.findOne.mockResolvedValue(baseProject);
    mockProjectsRepository.softDelete.mockResolvedValue(undefined);

    await service.remove(2);

    expect(mockProjectsRepository.softDelete).toHaveBeenCalledWith(2);

    expect(mockAuditLogsService.create).toHaveBeenCalledWith({
      action: AuditAction.DELETE,
      entityType: 'PROJECT',
      entityId: 2,
    });
  });

  it('restores a soft-deleted project and writes audit log', async () => {
    mockProjectsRepository.findOne.mockResolvedValue({
      ...baseProject,
      deletedAt: new Date(),
    });

    mockProjectsRepository.restore.mockResolvedValue(undefined);

    await service.restore(2);

    expect(mockProjectsRepository.restore).toHaveBeenCalledWith(2);

    expect(mockAuditLogsService.create).toHaveBeenCalledWith({
      action: AuditAction.RESTORE,
      entityType: 'PROJECT',
      entityId: 2,
    });
  });
});