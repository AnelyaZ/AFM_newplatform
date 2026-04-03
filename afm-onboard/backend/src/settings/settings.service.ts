import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const REGISTRATION_CODE_KEY = 'REGISTRATION_CODE';
const DEFAULT_REGISTRATION_CODE = '9287';
const MAIL_FROM_NAME_KEY = 'MAIL_FROM_NAME';
const MAIL_FROM_EMAIL_KEY = 'MAIL_FROM_EMAIL';
const DEFAULT_MAIL_FROM_NAME = 'AFM Learning';
const DEFAULT_MAIL_FROM_EMAIL = '';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRegistrationCode(): Promise<string> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: REGISTRATION_CODE_KEY } });
    return row?.value || DEFAULT_REGISTRATION_CODE;
  }

  async setRegistrationCode(code: string): Promise<{ registrationCode: string }> {
    const value = String(code || '').trim();
    if (!/^[0-9]{4}$/.test(value)) {
      throw new (await import('@nestjs/common')).BadRequestException('Код должен содержать ровно 4 цифры');
    }
    await this.prisma.systemSetting.upsert({
      where: { key: REGISTRATION_CODE_KEY },
      update: { value },
      create: { key: REGISTRATION_CODE_KEY, value },
    });
    return { registrationCode: value };
  }

  async getAll(): Promise<{ registrationCode: string }> {
    const registrationCode = await this.getRegistrationCode();
    const mailFromName = await this.getMailFromName();
    const mailFromEmail = await this.getMailFromEmail();
    return { registrationCode, mailFromName, mailFromEmail } as any;
  }

  async getMailFromName(): Promise<string> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: MAIL_FROM_NAME_KEY } });
    return row?.value || DEFAULT_MAIL_FROM_NAME;
  }

  async getMailFromEmail(): Promise<string> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: MAIL_FROM_EMAIL_KEY } });
    return row?.value || DEFAULT_MAIL_FROM_EMAIL;
  }

  async setMailFromName(name: string): Promise<{ mailFromName: string }> {
    const value = String(name || '').trim();
    await this.prisma.systemSetting.upsert({
      where: { key: MAIL_FROM_NAME_KEY },
      update: { value },
      create: { key: MAIL_FROM_NAME_KEY, value },
    });
    return { mailFromName: value };
  }

  async setMailFromEmail(email: string): Promise<{ mailFromEmail: string }> {
    const value = String(email || '').trim();
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new (await import('@nestjs/common')).BadRequestException('Некорректный email отправителя');
    }
    await this.prisma.systemSetting.upsert({
      where: { key: MAIL_FROM_EMAIL_KEY },
      update: { value },
      create: { key: MAIL_FROM_EMAIL_KEY, value },
    });
    return { mailFromEmail: value };
  }
}


