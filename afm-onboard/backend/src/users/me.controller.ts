import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async me(@Req() req: any) {
    const userId: string = req.user.userId;
    return this.users.getPublicProfile(userId);
  }

  @Get('progress')
  async myProgress(@Req() req: any) {
    const userId: string = req.user.userId;
    return this.users.getProgress(userId);
  }

  @Patch()
  async updateProfile(
    @Req() req: any,
    @Body()
    body: {
      fullName?: string;
      position?: string;
      birthDate?: string; // ISO
      email?: string;
    },
  ) {
    const userId: string = req.user.userId;
    return this.users.updateSelfProfile(userId, body);
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Req() req: any,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    const userId: string = req.user.userId;
    await this.users.changePassword(userId, body.currentPassword, body.newPassword);
  }
}


