import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  async get() {
    return this.settings.getAll();
  }

  @Patch()
  async update(
    @Body()
    body: { registrationCode?: string; mailFromName?: string; mailFromEmail?: string },
  ) {
    const res: Record<string, any> = {};
    if (typeof body.registrationCode === 'string') Object.assign(res, await this.settings.setRegistrationCode(body.registrationCode));
    if (typeof body.mailFromName === 'string') Object.assign(res, await this.settings.setMailFromName(body.mailFromName));
    if (typeof body.mailFromEmail === 'string') Object.assign(res, await this.settings.setMailFromEmail(body.mailFromEmail));
    return res;
  }
}


