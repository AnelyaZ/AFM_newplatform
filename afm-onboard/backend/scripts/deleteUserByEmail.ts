import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const emailArg = process.argv[2];
  if (!emailArg) {
    console.error('Usage: ts-node scripts/deleteUserByEmail.ts <email>');
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log(`User with email ${email} not found. Nothing to delete.`);
    return;
  }

  const userId = user.id;

  // Pre-check hard references where FK fields are NOT nullable
  const [chapterRefs, courseRefs] = await prisma.$transaction([
    prisma.chapter.count({ where: { OR: [{ createdById: userId }, { updatedById: userId }] } }),
    prisma.course.count({ where: { OR: [{ createdById: userId }, { updatedById: userId }] } }),
  ]);

  if (chapterRefs > 0 || courseRefs > 0) {
    console.error(
      `Cannot delete user ${email}: referenced as creator/updater in ${chapterRefs} chapters and ${courseRefs} courses. Reassign ownership first.`,
    );
    process.exit(2);
  }

  await prisma.$transaction(async (tx) => {
    // Test attempts and nested attempt answers
    const attempts = await tx.testAttempt.findMany({ where: { userId }, select: { id: true } });
    const attemptIds = attempts.map((a) => a.id);
    if (attemptIds.length > 0) {
      await tx.attemptAnswer.deleteMany({ where: { attemptId: { in: attemptIds } } });
    }
    await tx.testAttempt.deleteMany({ where: { userId } });

    // Sessions
    await tx.session.deleteMany({ where: { userId } });

    // Progress
    await tx.lessonProgress.deleteMany({ where: { userId } });
    await tx.userProgress.deleteMany({ where: { userId } });

    // Course access
    await tx.userCourseAccess.deleteMany({ where: { userId } });

    // Admin invites created by this user (if any)
    await tx.adminInvite.deleteMany({ where: { invitedById: userId } });

    // Audit logs by this user
    await tx.auditLog.deleteMany({ where: { actorId: userId } });

    // Finally, the user
    await tx.user.delete({ where: { id: userId } });
  });

  console.log(`Deleted user ${email} (${userId}) and related records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });




