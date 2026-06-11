import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { SettingsService } from '../settings/settings.service';

interface RegisterDto {
  fullName: string;
  position: string;
  birthDate: string; // ISO date
  email: string;
  password: string;
  registrationCode?: string;
}

interface LoginDto {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  async register(data: RegisterDto) {
const passwordHash = await bcrypt.hash(
      data.password,
      Number(this.config.get('BCRYPT_ROUNDS') ?? 12),
    );
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new (await import('@nestjs/common')).ConflictException('Пользователь с таким email уже существует');
    }
    const user = await this.prisma.user.create({
      data: {
        id: uuidv4(),
        fullName: data.fullName,
        position: data.position,
        birthDate: new Date(data.birthDate),
        email: data.email,
        passwordHash,
        mustChangePassword: false,
      },
      select: { id: true, status: true },
    });
    return user;
  }

  async login(data: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });

    const genericError = 'Неверный email или пароль';

    if (!user) {
      await bcrypt.compare(data.password, '$2b$12$dummy.hash.to.prevent.timing.attacks');
      throw new UnauthorizedException(genericError);
    }

    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException(genericError);

    if (user.status !== 'APPROVED') throw new UnauthorizedException(genericError);

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role, status: user.status, mustChangePassword: (user as any).mustChangePassword ?? false },
      { secret: this.config.get('JWT_SECRET'), expiresIn: this.config.get('JWT_ACCESS_TTL') },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: user.id },
      { secret: this.config.get('JWT_SECRET'), expiresIn: this.config.get('JWT_REFRESH_TTL') },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.session.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        refreshTokenHash,
        expiresAt: new Date(Date.now() + this.parseTtl(this.config.get('JWT_REFRESH_TTL') ?? '30d')),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, role: user.role, status: user.status, mustChangePassword: (user as any).mustChangePassword ?? false },
    };
  }

  async refresh(userId: string, refreshToken: string) {
    const sessions = await this.prisma.session.findMany({ where: { userId } });
    const match = await this.findMatchingSession(sessions, refreshToken);
    if (!match) throw new UnauthorizedException('Invalid token');
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role, status: user.status },
      { secret: this.config.get('JWT_SECRET'), expiresIn: this.config.get('JWT_ACCESS_TTL') },
    );
    return { accessToken };
  }

  async logout(userId: string, refreshToken: string) {
    const sessions = await this.prisma.session.findMany({ where: { userId } });
    const match = await this.findMatchingSession(sessions, refreshToken);
    if (match) {
      await this.prisma.session.delete({ where: { id: match.id } });
    }
  }

  private async findMatchingSession(
    sessions: { id: string; refreshTokenHash: string }[],
    token: string,
  ): Promise<{ id: string } | null> {
    for (const s of sessions) {
      if (await bcrypt.compare(token, s.refreshTokenHash)) return { id: s.id };
    }
    return null;
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user) return { ok: true };

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: { id: uuidv4(), userId: user.id, tokenHash, expiresAt },
    });

    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    const smtpHost = this.config.get('SMTP_HOST');
    if (smtpHost) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(this.config.get('SMTP_PORT') ?? 465),
        secure: Number(this.config.get('SMTP_PORT') ?? 465) === 465,
        auth: { user: this.config.get('SMTP_USER'), pass: this.config.get('SMTP_PASS') },
      });
      await transporter.sendMail({
        from: `"АФМ Обучение" <${this.config.get('SMTP_USER')}>`,
        to: email,
        subject: 'Сброс пароля — АФМ',
        html: `
          <p>Здравствуйте, ${user.fullName}!</p>
          <p>Вы запросили сброс пароля. Перейдите по ссылке ниже — она действительна 1 час:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
        `,
      });
    }

    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) throw new BadRequestException('Ссылка недействительна или устарела');

    const passwordHash = await bcrypt.hash(newPassword, Number(this.config.get('BCRYPT_ROUNDS') ?? 12));
    await this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });

    return { ok: true };
  }

  private parseTtl(ttl: string): number {
    // supports e.g. 15m, 30d
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) return 0;
    const value = Number(match[1]);
    const unit = match[2];
    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }
}



