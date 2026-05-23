import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { RequestWithUser } from '../auth/request-with-user.interface';
import { TicketsService } from '../tickets/tickets.service';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly ticketsService: TicketsService,
  ) {}

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  @Get('deleted')
  findDeleted(@Req() req: RequestWithUser) {
    this.assertAdmin(req);

    return this.projectsService.findDeleted();
  }

  @Get(':projectId/workload')
  getWorkload(@Param('projectId') projectId: string) {
    return this.ticketsService.getProjectWorkload(+projectId);
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
  restore(@Param('projectId') projectId: string, @Req() req: RequestWithUser) {
    this.assertAdmin(req);

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

  private assertAdmin(req: RequestWithUser) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only ADMIN users can access this endpoint');
    }
  }
}