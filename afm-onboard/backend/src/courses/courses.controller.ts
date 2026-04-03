import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CoursesService } from './courses.service';

@Controller('courses')
@UseGuards(JwtAuthGuard)
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  // ADMIN: детали курса без проверок доступа (для черновиков/нулевой версии)
  @Get('admin/by-id/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  adminGetCourse(@Param('id') id: string) {
    return this.courses.adminGetCourse(id);
  }

  // Список курсов, доступных сотруднику
  @Get()
  listForUser(@Req() req: any) {
    return this.courses.listForUser(req.user.userId);
  }

  // Детали курса + список модулей (глав)
  @Get(':id')
  getCourse(@Param('id') id: string, @Req() req: any) {
    return this.courses.getCourseForUser(id, req.user.userId);
  }

  // ADMIN
  @Get('admin/list')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  adminList(@Query('q') q?: string) {
    return this.courses.adminList(q);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Req() req: any, @Body() body: { title: string; description?: string; isPublished?: boolean }) {
    return this.courses.create({ ...body, createdById: req.user.userId });
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() body: Partial<{ title: string; description?: string; isPublished?: boolean }>) {
    return this.courses.update(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string, @Query('force') force?: string) {
    return this.courses.remove(id, force === '1' || force === 'true');
  }

  @Post(':id/publish')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  publish(@Param('id') id: string, @Req() req: any) {
    return this.courses.publishNewVersion(id, req.user.userId);
  }

  @Patch(':id/public')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  togglePublic(@Param('id') id: string, @Body() body: { isPublic: boolean }) {
    return this.courses.update(id, { isPublished: false, isPublic: !!body.isPublic });
  }

  @Patch(':id/archive')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async archive(@Param('id') id: string, @Body() body: { isArchived: boolean; force?: boolean }) {
    return this.courses.archive(id, !!body.isArchived, !!body.force);
  }

  // Управление доступом пользователей к курсам
  @Get(':id/access')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  listAccess(@Param('id') id: string) {
    return this.courses.listAccess(id);
  }

  @Post(':id/access')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  grantAccess(@Param('id') courseId: string, @Body() body: { userId: string }) {
    return this.courses.grantAccess(courseId, body.userId);
  }

  @Delete(':id/access/:userId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  revokeAccess(@Param('id') courseId: string, @Param('userId') userId: string) {
    return this.courses.revokeAccess(courseId, userId);
  }

  // Пререквизиты курса
  @Get(':id/prerequisites')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  listPrerequisites(@Param('id') id: string) {
    return this.courses.listPrerequisites(id);
  }

  @Post(':id/prerequisites')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  setPrerequisites(@Param('id') id: string, @Body() body: { requiredCourseIds: string[] }) {
    return this.courses.setPrerequisites(id, Array.isArray(body.requiredCourseIds) ? body.requiredCourseIds : []);
  }
}


