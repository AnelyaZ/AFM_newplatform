import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';

@Module({
  imports: [PrismaModule],
  providers: [LessonsService],
  controllers: [LessonsController],
})
export class LessonsModule {}


