/*
  Warnings:

  - A unique constraint covering the columns `[lessonId]` on the table `Test` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Test" DROP CONSTRAINT "Test_chapterId_fkey";

-- AlterTable
ALTER TABLE "public"."Test" ADD COLUMN     "lessonId" UUID,
ADD COLUMN     "passScore" INTEGER,
ALTER COLUMN "chapterId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Test_lessonId_key" ON "public"."Test"("lessonId");

-- AddForeignKey
ALTER TABLE "public"."Test" ADD CONSTRAINT "Test_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "public"."Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Test" ADD CONSTRAINT "Test_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "public"."Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
