import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(
    @Req() req: any,
    @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED',
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.users.list({ status, q, page: Number(page ?? 1), limit: Number(limit ?? 20), excludeUserId: req.user.userId });
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() body: { status: 'APPROVED' | 'REJECTED' }) {
    return this.users.setStatus(id, body.status);
  }

  @Patch(':id/role')
  setRole(@Param('id') id: string, @Body() body: { role: 'ADMIN' | 'EMPLOYEE' }) {
    return this.users.setRole(id, body.role);
  }

  @Post()
  create(
    @Body()
    body: {
      fullName: string;
      position: string;
      birthDate: string;
      email: string;
      role?: 'ADMIN' | 'EMPLOYEE';
      status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    },
  ) {
    return this.users.createUser(body as any);
  }

  // Детализированный профиль сотрудника для администратора (статистика + доступы)
  @Get(':id/profile')
  getProfile(@Param('id') id: string) {
    return this.users.adminGetProfile(id);
  }

  // Обновление профиля сотрудника администратором (аватар и основные поля)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { fullName?: string; position?: string; birthDate?: string; email?: string; avatarKey?: string }) {
    return this.users.adminUpdateUser(id, body);
  }
}


