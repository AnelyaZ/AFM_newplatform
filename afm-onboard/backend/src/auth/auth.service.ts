import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
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
    // Проверяем код регистрации
    const expectedCode = await this.settings.getRegistrationCode();
    const provided = (data.registrationCode || '').trim();
    if (!provided || provided !== expectedCode) {
      throw new (await import('@nestjs/common')).UnauthorizedException('Неверный код регистрации');
    }
    const passwordHash = await bcrypt.hash(
      data.password,
      Number(this.config.get('BCRYPT_ROUNDS') ?? 12),
    );
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


