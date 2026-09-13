#!/usr/bin/env node
/**
 * Seeds one known-credential faculty user for e2e login. Idempotent (upsert).
 * Run against a disposable/dedicated test database — never against a real
 * dev/staging/production DB, since the password below is public in this repo.
 *
 * Usage: DATABASE_URL=... node e2e/seed.mjs
 */

import { createRequire } from 'module';
import {
  E2E_FACULTY_EMAIL, E2E_FACULTY_PASSWORD,
  E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD,
} from './fixtures.mjs';

const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('../server/node_modules/@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const facultyHash = await bcrypt.hash(E2E_FACULTY_PASSWORD, 10);
  const faculty = await prisma.user.upsert({
    where: { email: E2E_FACULTY_EMAIL },
    update: { password_hash: facultyHash, status: 'active', must_change_password: false, deleted_at: null },
    create: {
      name: 'E2E Faculty',
      email: E2E_FACULTY_EMAIL,
      role: 'faculty',
      department: 'Computer Science',
      designation: 'Assistant Professor',
      status: 'active',
      password_hash: facultyHash,
      must_change_password: false,
      session_version: 1,
      approved_at: new Date(),
    },
  });
  console.log(`Seeded e2e faculty user: ${E2E_FACULTY_EMAIL}`);

  const adminHash = await bcrypt.hash(E2E_ADMIN_PASSWORD, 10);
  const admin = await prisma.user.upsert({
    where: { email: E2E_ADMIN_EMAIL },
    update: { password_hash: adminHash, status: 'active', must_change_password: false, deleted_at: null },
    create: {
      name: 'E2E Admin',
      email: E2E_ADMIN_EMAIL,
      role: 'admin',
      status: 'active',
      password_hash: adminHash,
      must_change_password: false,
      session_version: 1,
      approved_at: new Date(),
    },
  });
  console.log(`Seeded e2e admin user: ${E2E_ADMIN_EMAIL}`);

  // One fixed student + violation type + violation, for Reports tests (e.g.
  // e2e/reports-student-violations.spec.js) that need a known, non-empty
  // Student Violation Report result. Neither Student nor ViolationType nor
  // Violation has a natural unique key beyond id, so idempotency here is a
  // find-then-create rather than an upsert.
  const studentReg = 'E2E-STU-0001';
  let student = await prisma.student.findUnique({ where: { registration_number: studentReg } });
  if (!student) {
    const year = new Date().getFullYear();
    student = await prisma.student.create({
      data: {
        registration_number: studentReg,
        student_name: 'E2E Test Student',
        course: 'b_pharm',
        year: 1,
        semester: 1,
        batch_year: year,
        academic_year: `${year}-${String(year + 1).slice(2)}`,
        status: 'active',
      },
    });
  }
  console.log(`Seeded e2e student: ${studentReg}`);

  const violationTypeName = 'E2E Test Violation';
  let violationType = await prisma.violationType.findFirst({ where: { name: violationTypeName } });
  if (!violationType) {
    violationType = await prisma.violationType.create({
      data: { name: violationTypeName, default_fine: 100, is_active: true, created_by: admin.id },
    });
  }
  console.log(`Seeded e2e violation type: ${violationTypeName}`);

  const existingViolation = await prisma.violation.findFirst({
    where: { student_id: student.id, violation_type_id: violationType.id },
  });
  if (!existingViolation) {
    await prisma.violation.create({
      data: {
        student_id: student.id,
        faculty_id: admin.id, // admin ad-hoc record — duty_slot_id stays null
        violation_type_id: violationType.id,
        fine_amount: 100,
      },
    });
  }
  console.log(`Seeded e2e violation for student: ${studentReg}`);

  // One fixed duty slot + attendance (today, morning — falls under the
  // Reports MonthFilter's default current-year/current-month view with no
  // filter interaction needed), for e2e/reports-late-arrivals-auto-clockout.spec.js.
  // The dev DB this seed usually runs against has zero pre-existing duty
  // slots, so a same-day collision on the (duty_date, session_type) unique
  // constraint is not expected; find-then-create still guards it.
  const dutyDate = new Date();
  dutyDate.setUTCHours(0, 0, 0, 0);
  let dutySlot = await prisma.dutySlot.findFirst({ where: { duty_date: dutyDate, session_type: 'morning' } });
  if (!dutySlot) {
    dutySlot = await prisma.dutySlot.create({
      data: {
        faculty_id: faculty.id,
        duty_date: dutyDate,
        session_type: 'morning',
        status: 'completed',
        created_by: admin.id,
      },
    });
  }
  console.log('Seeded e2e duty slot for today (morning)');

  const existingAttendance = await prisma.dutyAttendance.findUnique({ where: { duty_slot_id: dutySlot.id } });
  if (!existingAttendance) {
    const inTime = new Date(dutyDate);
    inTime.setUTCHours(9, 15, 0, 0);
    await prisma.dutyAttendance.create({
      data: {
        duty_slot_id: dutySlot.id,
        faculty_id: faculty.id,
        in_time: inTime,
        auto_out: true, // qualifies for both the Auto Clock-outs report and (schema-wise) attendance history
      },
    });
  }
  console.log('Seeded e2e duty attendance (auto clock-out) for today');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
