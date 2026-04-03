import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ChaptersService } from './chapters.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('chapters')
@UseGuards(JwtAuthGuard)
export class ChaptersController {
  constructor(private readonly chapters: ChaptersService) {}

  @Get()
  list(@Req() req: any) {
    return this.chapters.listForUser(req.user.userId);
  }

  // Новый список модулей курса (для детальной страницы курса)
  @Get('by-course/:courseId')
  listByCourse(@Param('courseId') courseId: string, @Req() req: any) {
    return this.chapters.adminListByCourse(courseId);
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() req: any) {
    return this.chapters.getById(id, req.user.userId);
  }

  // ADMIN endpoints
  @Get('admin/list')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  adminList(
    @Query('q') q?: string,
  ) {
    return this.chapters.adminList(q);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Req() req: any, @Body() body: { courseId: string; orderIndex: number; title: string; description?: string; passScore: number; isPublished?: boolean }) {
    return this.chapters.create(body, req.user.userId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() body: Partial<{ orderIndex: number; title: string; description?: string; passScore: number; isPublished?: boolean }>) {
    return this.chapters.update(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.chapters.remove(id);
  }

  @Get(':id/contents')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  listContents(@Param('id') id: string) {
    return this.chapters.listContents(id);
  }

  @Post(':id/contents')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  createContents(
    @Param('id') id: string,
    @Body() body: { blocks: { blockType: 'TEXT'|'IMAGE'|'VIDEO'|'FILE'; textHtml?: string | null; mediaKey?: string | null; sortIndex: number }[] },
  ) {
    return this.chapters.createContents(id, body.blocks);
  }

  @Patch('contents/:blockId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateContent(
    @Param('blockId') blockId: string,
    @Body() body: Partial<{ blockType: 'TEXT'|'IMAGE'|'VIDEO'|'FILE'; textHtml?: string | null; mediaKey?: string | null; sortIndex: number }>,
  ) {
    return this.chapters.updateContent(blockId, body);
  }

  @Delete('contents/:blockId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deleteContent(@Param('blockId') blockId: string) {
    return this.chapters.deleteContent(blockId);
  }
}


