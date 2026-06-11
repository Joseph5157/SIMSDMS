require('dotenv').config();
const { PrismaClient } = require('../server/node_modules/@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL;
  const name = process.env.BOOTSTRAP_SUPER_ADMIN_NAME || 'SIMS Super Admin';
  const telegramId = process.env.BOOTSTRAP_SUPER_ADMIN_TELEGRAM_ID;
  const phone = process.env.BOOTSTRAP_SUPER_ADMIN_PHONE || null;
  const department = process.env.BOOTSTRAP_SUPER_ADMIN_DEPARTMENT || 'Administration';
  const designation = process.env.BOOTSTRAP_SUPER_ADMIN_DESIGNATION || 'Super Admin';

  if (!email) {
    throw new Error('BOOTSTRAP_SUPER_ADMIN_EMAIL is required in .env to seed');
  }

  if (!telegramId) {
    throw new Error('BOOTSTRAP_SUPER_ADMIN_TELEGRAM_ID is required in .env to seed');
  }

  const existingSuperAdmin = await prisma.user.findFirst({
    where: {
      role: 'super_admin',
      deleted_at: null,
    },
  });

  if (existingSuperAdmin) {
    console.log(`Bootstrap skipped: super_admin already exists (${existingSuperAdmin.email})`);
    return;
  }

  const existingEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (existingEmail) {
    throw new Error(`Cannot bootstrap: email already exists: ${email}`);
  }

  const existingTelegram = await prisma.user.findUnique({
    where: { telegram_id: telegramId },
  });

  if (existingTelegram) {
    throw new Error(`Cannot bootstrap: Telegram ID already exists: ${telegramId}`);
  }

  const superAdmin = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      role: 'super_admin',
      department,
      designation,
      status: 'active',
      telegram_id: telegramId,
      telegram_verified: true,
      session_version: 1,
      approved_at: new Date(),
    },
  });

  console.log(`Bootstrap super_admin created: ${superAdmin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
