#!/usr/bin/env node
/**
 * Seeds one known-credential faculty user for e2e login. Idempotent (upsert).
 * Run against a disposable/dedicated test database — never against a real
 * dev/staging/production DB, since the password below is public in this repo.
 *
 * Usage: DATABASE_URL=... node e2e/seed.mjs
 */

import { createRequire } from 'module';
import { E2E_FACULTY_EMAIL, E2E_FACULTY_PASSWORD } from './fixtures.mjs';

const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('../server/node_modules/@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const password_hash = await bcrypt.hash(E2E_FACULTY_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: E2E_FACULTY_EMAIL },
    update: { password_hash, status: 'active', must_change_password: false, deleted_at: null },
    create: {
      name: 'E2E Faculty',
      email: E2E_FACULTY_EMAIL,
      role: 'faculty',
      department: 'Computer Science',
      designation: 'Assistant Professor',
      status: 'active',
      password_hash,
      must_change_password: false,
      session_version: 1,
      approved_at: new Date(),
    },
  });
  console.log(`Seeded e2e faculty user: ${E2E_FACULTY_EMAIL}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
