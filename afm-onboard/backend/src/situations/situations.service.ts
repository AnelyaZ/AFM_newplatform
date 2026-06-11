import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SituationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getByLesson(lessonId: string) {
    const task = await this.prisma.situationTask.findUnique({
      where: { lessonId },
      include: {
        questions: {
          orderBy: { sortIndex: 'asc' },
          include: { options: { orderBy: { sortIndex: 'asc' } } },
        },
      },
    });
    if (!task) return null;
    return task;
  }

  async upsert(lessonId: string, data: { title?: string; scenario?: string; passScore?: number }) {
    return this.prisma.situationTask.upsert({
      where: { lessonId },
      update: data,
      create: { lessonId, ...data },
      include: { questions: { include: { options: true } } },
    });
  }

  async saveQuestions(
    lessonId: string,
    questions: { text: string; sortIndex: number; options: { text: string; isCorrect: boolean; sortIndex: number }[] }[],
  ) {
    const task = await this.prisma.situationTask.findUnique({ where: { lessonId } });
    if (!task) throw new NotFoundException('SituationTask not found');

    // Delete existing questions (cascades to options)
    await this.prisma.situationQuestion.deleteMany({ where: { taskId: task.id } });

    // Create new questions
    for (const q of questions) {
      await this.prisma.situationQuestion.create({
        data: {
          taskId: task.id,
          text: q.text,
          sortIndex: q.sortIndex,
          options: {
            createMany: {
              data: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect, sortIndex: o.sortIndex })),
            },
          },
        },
      });
    }

    return this.prisma.situationTask.findUnique({
      where: { lessonId },
      include: { questions: { orderBy: { sortIndex: 'asc' }, include: { options: { orderBy: { sortIndex: 'asc' } } } } },
    });
  }

  async delete(lessonId: string) {
    const task = await this.prisma.situationTask.findUnique({ where: { lessonId } });
    if (!task) return null;
    await this.prisma.situationTask.delete({ where: { lessonId } });
    return { ok: true };
  }
}
