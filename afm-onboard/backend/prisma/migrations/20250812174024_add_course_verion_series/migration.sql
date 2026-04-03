/*
  Warnings:

  - A unique constraint covering the columns `[courseId]` on the table `Test` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "public"."QuestionType" ADD VALUE 'BOOLEAN';

-- AlterTable
ALTER TABLE "public"."Course" ADD COLUMN     "seriesId" UUID,
ADD COLUMN     "version" INTEGER;

-- AlterTable
ALTER TABLE "public"."Lesson" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "sectionId" UUID;

-- AlterTable
ALTER TABLE "public"."Test" ADD COLUMN     "courseId" UUID,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."TestSection" (
    "id" UUID NOT NULL,
    "testId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortIndex" INTEGER NOT NULL,

    CONSTRAINT "TestSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Course_seriesId_idx" ON "public"."Course"("seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "Test_courseId_key" ON "public"."Test"("courseId");

-- AddForeignKey
ALTER TABLE "public"."Test" ADD CONSTRAINT "Test_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TestSection" ADD CONSTRAINT "TestSection_testId_fkey" FOREIGN KEY ("testId") REFERENCES "public"."Test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."TestSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
