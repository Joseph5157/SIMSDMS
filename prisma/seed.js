require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const telegramId = process.env.SUPER_ADMIN_TELEGRAM_ID;
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';
  const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@sims.edu';

  if (!telegramId) {
    throw new Error('SUPER_ADMIN_TELEGRAM_ID is required in .env to seed');
  }

  const existing = await prisma.user.findFirst({
    where: { role: 'super_admin' },
  });

  if (existing) {
    console.log(`Super Admin already exists: ${existing.name} (${existing.email})`);
    return;
  }

  const superAdmin = await prisma.user.create({
    data: {
      name,
      email,
      role: 'super_admin',
      telegram_id: telegramId,
      telegram_verified: true,
      status: 'active',
      approved_at: new Date(),
    },
  });

  console.log(`Super Admin created: ${superAdmin.name} | Telegram: ${superAdmin.telegram_id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
