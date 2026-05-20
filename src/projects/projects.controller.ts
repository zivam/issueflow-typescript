import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  @Get('deleted')
  findDeleted() {
    return this.projectsService.findDeleted();
  }

  @Get(':projectId')
  findOne(@Param('projectId') projectId: string) {
    return this.projectsService.findOne(+projectId);
  }

  @Post()
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Post(':projectId/restore')
  restore(@Param('projectId') projectId: string) {
    return this.projectsService.restore(+projectId);
  }

  @Patch(':projectId')
  update(
    @Param('projectId') projectId: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(+projectId, updateProjectDto);
  }

  @Delete(':projectId')
  remove(@Param('projectId') projectId: string) {
    return this.projectsService.remove(+projectId);
  }
}