import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type OverviewFilters = { from?: string; to?: string };

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(filters: OverviewFilters) {
    const fromDate = filters.from ? new Date(filters.from) : undefined;
    const toDate = filters.to ? new Date(filters.to) : undefined;

    const whereAttempt: any = {};
    if (fromDate || toDate) {
      whereAttempt.startedAt = {};
      if (fromDate) whereAttempt.startedAt.gte = fromDate;
      if (toDate) whereAttempt.startedAt.lte = toDate;
    }

    const [totalUsers, approvedUsers, pendingUsers, rejectedUsers, attemptsAll, attemptsPassed, attemptsFailed, avgScore, chapters] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'APPROVED' } }),
      this.prisma.user.count({ where: { status: 'PENDING' } }),
      this.prisma.user.count({ where: { status: 'REJECTED' } }),
      this.prisma.testAttempt.count({ where: whereAttempt }),
      this.prisma.testAttempt.count({ where: { ...whereAttempt, status: 'PASSED' } }),
      this.prisma.testAttempt.count({ where: { ...whereAttempt, status: 'FAILED' } }),
      this.prisma.testAttempt.aggregate({ _avg: { score: true }, where: { ...whereAttempt, finishedAt: { not: null } } }),
      this.prisma.chapter.findMany({ select: { id: true, orderIndex: true, title: true } }),
    ]);

    // Безопасный запрос с параметризацией через Prisma.sql
    let perChapter: any[];
    if (fromDate || toDate) {
      const safeFromDate = fromDate ?? new Date('1970-01-01');
      const safeToDate = toDate ?? new Date('2999-12-31');
      perChapter = (await this.prisma.$queryRaw`
          SELECT c.id, c."orderIndex", c.title,
                 COUNT(a.*) as attempts_total,
                 SUM(CASE WHEN a.status = 'PASSED'::"public"."AttemptStatus" THEN 1 ELSE 0 END) as attempts_passed,
                 ROUND(AVG(a.score))::int as avg_score
          FROM "TestAttempt" a
          JOIN "Test" t ON t.id = a."testId"
          JOIN "Chapter" c ON c.id = t."chapterId"
          WHERE a."startedAt" BETWEEN ${safeFromDate} AND ${safeToDate}
          GROUP BY c.id, c."orderIndex", c.title
          ORDER BY c."orderIndex" ASC
      `) as any[];
    } else {
      perChapter = (await this.prisma.$queryRaw`
          SELECT c.id, c."orderIndex", c.title,
                 COUNT(a.*) as attempts_total,
                 SUM(CASE WHEN a.status = 'PASSED'::"public"."AttemptStatus" THEN 1 ELSE 0 END) as attempts_passed,
                 ROUND(AVG(a.score))::int as avg_score
          FROM "TestAttempt" a
          JOIN "Test" t ON t.id = a."testId"
          JOIN "Chapter" c ON c.id = t."chapterId"
          GROUP BY c.id, c."orderIndex", c.title
          ORDER BY c."orderIndex" ASC
      `) as any[];
    }

    const passRate = attemptsAll > 0 ? Math.round((attemptsPassed / attemptsAll) * 100) : 0;

    return {
      users: {
        total: totalUsers,
        approved: approvedUsers,
        pending: pendingUsers,
        rejected: rejectedUsers,
      },
      attempts: {
        total: attemptsAll,
        passed: attemptsPassed,
        failed: attemptsFailed,
        passRate,
        avgScore: Math.round(avgScore._avg.score ?? 0),
      },
      perChapter: perChapter.map((r) => ({
        chapterId: r.id,
        orderIndex: Number(r.orderIndex),
        title: r.title as string,
        attemptsTotal: Number(r.attempts_total ?? 0),
        attemptsPassed: Number(r.attempts_passed ?? 0),
        avgScore: Number(r.avg_score ?? 0),
      })),
    };
  }
}


