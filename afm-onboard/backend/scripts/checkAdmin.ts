import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function main() {
  const prisma = new PrismaClient();
  const email = process.env.CHECK_EMAIL || 'admin@example.com';
  const password = process.env.CHECK_PASSWORD || 'ChangeMeAdmin#2025';
  const user = await prisma.user.findUnique({ where: { email } });
  console.log('User:', user ? { id: user.id, email: user.email, role: user.role, status: user.status } : null);
  if (user) {
    const ok = await bcrypt.compare(password, user.passwordHash);
    console.log('Password match:', ok);
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });


