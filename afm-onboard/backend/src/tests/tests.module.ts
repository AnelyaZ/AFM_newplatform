import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TestsService } from './tests.service';
import { TestsController } from './tests.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TestsController],
  providers: [TestsService],
})
export class TestsModule {}


