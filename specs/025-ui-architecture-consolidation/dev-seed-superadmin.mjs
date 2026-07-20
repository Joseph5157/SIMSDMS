import { createRequire } from 'module';
const require = createRequire('C:/Users/sikha/Music/sims disclipne/e2e/seed.mjs');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('../server/node_modules/@prisma/client');
const prisma = new PrismaClient();

const EMAIL = 'e2e.superadmin@sims.test';
const PASSWORD = 'SuperTest1234!';

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: EMAIL },
    update: { password_hash: hash, status: 'active', must_change_password: false, deleted_at: null, role: 'super_admin' },
    create: {
      name: 'E2E Super Admin',
      email: EMAIL,
      role: 'super_admin',
      status: 'active',
      password_hash: hash,
      must_change_password: false,
      session_version: 1,
      approved_at: new Date(),
    },
  });
  console.log(`Seeded super_admin: ${EMAIL} / ${PASSWORD}`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
