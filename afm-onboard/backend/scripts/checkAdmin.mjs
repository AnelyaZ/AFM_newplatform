import bcrypt from 'bcrypt';
const { PrismaClient } = await import('@prisma/client');

const prisma = new PrismaClient();
const email = process.env.CHECK_EMAIL || 'admin@example.com';
const password = process.env.CHECK_PASSWORD || 'ChangeMeAdmin#2025';

try {
  const user = await prisma.user.findUnique({ where: { email } });
  console.log('User:', user ? { id: user.id, email: user.email, role: user.role, status: user.status } : null);
  if (user) {
    const ok = await bcrypt.compare(password, user.passwordHash);
    console.log('Password match:', ok);
  }
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}


