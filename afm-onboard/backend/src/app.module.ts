import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChaptersModule } from './chapters/chapters.module';
import { TestsModule } from './tests/tests.module';
import { LessonsModule } from './lessons/lessons.module';
import { CoursesModule } from './courses/courses.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    // Rate Limiting: защита от brute force и DDoS атак
    // Лимиты увеличены для нормальной работы SPA (много запросов при загрузке страницы)
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'short',
          ttl: 1000, // 1 секунда
          limit: 30, // максимум 30 запросов в секунду
        },
        {
          name: 'medium',
          ttl: 10000, // 10 секунд
          limit: 150, // максимум 150 запросов за 10 секунд
        },
        {
          name: 'long',
          ttl: 60000, // 1 минута
          limit: 500, // максимум 500 запросов в минуту
        },
      ],
    }),
    ConfigModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    ChaptersModule,
    TestsModule,
    LessonsModule,
    ReportsModule,
    SettingsModule,
    CoursesModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Глобальный Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
