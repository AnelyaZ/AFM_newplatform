import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  list(params: { status?: 'PENDING' | 'APPROVED' | 'REJECTED'; q?: string; page?: number; limit?: number }) {
    const { status, q, page = 1, limit = 20 } = params;
    return this.prisma.user.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(q
          ? {
              OR: [
                { fullName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  // Прогресс пользователя по главам (для страницы «Мой прогресс»)
  async getProgress(userId: string) {
    const courses = await this.prisma.course.findMany({
      where: {
        OR: [
          { isPublic: true, isPublished: true },
          { accesses: { some: { userId } } as any },
        ],
      },
      select: {
        id: true,
        chapters: { select: { id: true, title: true, orderIndex: true }, orderBy: { orderIndex: 'asc' } },
      },
    });
    const chapters = courses.flatMap((c) => c.chapters);
    const chapterIds = chapters.map((c) => c.id);
    const lessonByChapter = chapterIds.length
      ? await this.prisma.lesson.findMany({ where: { chapterId: { in: chapterIds } }, select: { id: true, chapterId: true } })
      : [];
    const lessonIds = lessonByChapter.map((l) => l.id);
    const lessonProgress = lessonIds.length
      ? await this.prisma.lessonProgress.findMany({ where: { userId, lessonId: { in: lessonIds } }, select: { lessonId: true, completed: true } })
      : [];
    const completedLessons = new Set(lessonProgress.filter((p) => p.completed).map((p) => p.lessonId));
    const chProgress = await this.prisma.userProgress.findMany({ where: { userId, chapterId: { in: chapterIds } } });
    const completedChapters = new Set(chProgress.filter((p) => p.status === 'COMPLETED').map((p) => p.chapterId));
    const bestScores = new Map(chProgress.map((p) => [p.chapterId, p.bestScore] as const));

    return chapters.map((c) => {
      const totalLessons = lessonByChapter.filter((l) => l.chapterId === c.id).length;
      const doneLessons = lessonByChapter.filter((l) => l.chapterId === c.id && completedLessons.has(l.id)).length;
      let status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED' = 'LOCKED';
      if (completedChapters.has(c.id)) status = 'COMPLETED';
      else if (c.orderIndex === 1) status = 'AVAILABLE';
      // для остальных глав логика доступности рассчитывается на уровне экрана курса/главы
      return { chapterId: c.id, chapterTitle: (c as any).title, status, bestScore: bestScores.get(c.id) };
    });
  }

  async setStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    return this.prisma.user.update({ where: { id }, data: { status } });
  }

  async setRole(id: string, role: 'ADMIN' | 'EMPLOYEE') {
    return this.prisma.user.update({ where: { id }, data: { role } });
  }

  async createUser(data: {
    fullName: string;
    position: string;
    birthDate: string;
    email: string;
    role?: 'ADMIN' | 'EMPLOYEE';
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  }) {
    // Автогенерация временного пароля
    const tempPassword = this.generateTempPassword();
    const bcryptRounds = Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
    const passwordHash = await bcrypt.hash(tempPassword, bcryptRounds);
    const role = data.role ?? 'EMPLOYEE';
    const status = data.status ?? (role === 'ADMIN' ? 'APPROVED' : 'APPROVED');

    const created = await this.prisma.user.create({
      data: {
        fullName: data.fullName,
        position: data.position,
        birthDate: new Date(data.birthDate),
        email: data.email,
        passwordHash,
        role,
        status,
        mustChangePassword: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        
        createdAt: true,
      },
    });

    // Отправка временного пароля на email (если настроен SMTP)
    try {
      await this.sendTempPasswordMail({ to: data.email, fullName: data.fullName, tempPassword });
    } catch (e) {
      // не валим процесс создания пользователя; логирование можно добавить в будущем
    }

    return created;
  }

  private generateTempPassword(): string {
    // 16 символов: буквы верх/низ, цифры, спец
    const upper = 'ABCDEFGHJKLMNPQRSTUVXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$%^&*()-_+=';
    const all = upper + lower + digits + special;
    const rnd = (n: number, src: string) => Array.from({ length: n }, () => src[Math.floor(Math.random() * src.length)]).join('');
    // гарантируем присутствие всех классов
    const base = [rnd(4, upper), rnd(4, lower), rnd(3, digits), rnd(3, special)].join('');
    const extra = rnd(2, all);
    const res = (base + extra).split('');
    // перемешаем Фишера-Йетса
    for (let i = res.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [res[i], res[j]] = [res[j], res[i]];
    }
    return res.join('');
  }

  private async sendTempPasswordMail(params: { to: string; fullName: string; tempPassword: string }) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (!host || !port || !user || !pass) return; // SMTP не настроен
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    const subject = 'AFM Learning — временный пароль';
    const fromName = await this.settings.getMailFromName();
    const fromEmail = await this.settings.getMailFromEmail();
    const from = fromEmail ? `${fromName} <${fromEmail}>` : undefined;
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu;line-height:1.6;color:#111">
        <h2>Здравствуйте, ${params.fullName}!</h2>
        <p>Для входа в систему вам назначен временный пароль:</p>
        <p style="font-size:18px;font-weight:700;background:#f4f4f5;padding:10px 14px;border-radius:8px;display:inline-block;letter-spacing:1px">${params.tempPassword}</p>
        <p>После входа система попросит придумать новый пароль.</p>
        <p style="color:#555">Если вы не ожидали это письмо — проигнорируйте его.</p>
      </div>
    `;
    await transporter.sendMail({ from: from || user, to: params.to, subject, html });
  }

  async getPublicProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        position: true,
        birthDate: true,
        email: true,
        role: true,
        status: true,
        avatarKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateSelfProfile(
    userId: string,
    data: { fullName?: string; position?: string; birthDate?: string; email?: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fullName ? { fullName: data.fullName } : {}),
        ...(data.position ? { position: data.position } : {}),
        ...(data.birthDate ? { birthDate: new Date(data.birthDate) } : {}),
        ...(data.email ? { email: data.email } : {}),
      },
      select: {
        id: true,
        fullName: true,
        position: true,
        birthDate: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new (await import('@nestjs/common')).UnauthorizedException('Invalid current password');
    }
    const bcryptRounds = Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
    const passwordHash = await bcrypt.hash(newPassword, bcryptRounds);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: false } });
  }

  // ADMIN: получить расширенный профиль пользователя со статистикой и доступными курсами
  async adminGetProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        position: true,
        birthDate: true,
        email: true,
        role: true,
        status: true,
        avatarKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Курсы, к которым есть доступ
    const accesses = await this.prisma.userCourseAccess.findMany({ where: { userId }, select: { courseId: true } });
    const courseIds = accesses.map((a) => a.courseId);
    const courses = await this.prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, title: true, description: true, version: true, isPublished: true },
    });

    // Доступные для назначения курсы: все опубликованные (назначение разрешит только опубликованные, непубликованные отфильтровываем)
    const availableCourses = await this.prisma.course.findMany({
      where: { isPublished: true },
      select: { id: true, title: true, description: true, isPublic: true },
      orderBy: [{ isPublic: 'desc' }, { updatedAt: 'desc' }],
    });

    // Пройденные главы и лучшие баллы
    const progress = await this.prisma.userProgress.findMany({ where: { userId }, include: { chapter: { select: { id: true, title: true, courseId: true } } } });
    const completed = progress.filter((p) => p.status === 'COMPLETED');
    const averageScore = completed.length > 0 ? Math.round(completed.reduce((s, p) => s + (p.bestScore || 0), 0) / completed.length) : 0;

    return {
      user,
      stats: {
        completedChapters: completed.length,
        averageScore,
      },
      courses,
      availableCourses,
    };
  }

  // ADMIN: обновить профиль пользователя (включая аватар)
  async adminUpdateUser(
    id: string,
    data: { fullName?: string; position?: string; birthDate?: string; email?: string; avatarKey?: string },
  ) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.fullName ? { fullName: data.fullName } : {}),
        ...(data.position ? { position: data.position } : {}),
        ...(data.birthDate ? { birthDate: new Date(data.birthDate) } : {}),
        ...(data.email ? { email: data.email } : {}),
        ...(data.avatarKey !== undefined ? { avatarKey: data.avatarKey } : {}),
      },
      select: {
        id: true,
        fullName: true,
        position: true,
        birthDate: true,
        email: true,
        role: true,
        status: true,
        avatarKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}


