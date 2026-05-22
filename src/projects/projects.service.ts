import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(createProjectDto: CreateProjectDto) {
    const project = this.projectsRepository.create(createProjectDto);
    const savedProject = await this.projectsRepository.save(project);

    await this.auditLogsService.create({
      action: AuditAction.CREATE,
      entityType: 'PROJECT',
      entityId: savedProject.id,
    });

    return savedProject;
  }

  findAll() {
    return this.projectsRepository.find({
      where: { deletedAt: IsNull() },
      order: { id: 'ASC' },
    });
  }

  findDeleted() {
    return this.projectsRepository.find({
      withDeleted: true,
      where: { deletedAt: Not(IsNull()) },
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number) {
    const project = await this.projectsRepository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with id ${id} was not found`);
    }

    return project;
  }

  async update(id: number, updateProjectDto: UpdateProjectDto) {
    const project = await this.findOne(id);

    Object.assign(project, updateProjectDto);

    await this.projectsRepository.save(project);

    await this.auditLogsService.create({
      action: AuditAction.UPDATE,
      entityType: 'PROJECT',
      entityId: id,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.projectsRepository.softDelete(id);

    await this.auditLogsService.create({
      action: AuditAction.DELETE,
      entityType: 'PROJECT',
      entityId: id,
    });
  }

  async restore(id: number) {
    const project = await this.projectsRepository.findOne({
      withDeleted: true,
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`Project with id ${id} was not found`);
    }

    await this.projectsRepository.restore(id);

    await this.auditLogsService.create({
      action: AuditAction.RESTORE,
      entityType: 'PROJECT',
      entityId: id,
    });
  }
}