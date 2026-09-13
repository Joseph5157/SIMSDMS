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

  // Second faculty — never logs in, only referenced as the "to" side of a
  // reassignment fixture (Batch 3.2b), so it needs no password fixture entry.
  const faculty2Email = 'e2e.faculty2@sims.test';
  const faculty2 = await prisma.user.upsert({
    where: { email: faculty2Email },
    update: { status: 'active', deleted_at: null },
    create: {
      name: 'E2E Faculty Two',
      email: faculty2Email,
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
  console.log(`Seeded e2e second faculty user: ${faculty2Email}`);

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

  // One fixed duty reassignment (today, afternoon — a separate session from
  // the morning slot above, so no unique-constraint collision), for
  // e2e/reports-duty-reassignments.spec.js. The slot's current faculty_id is
  // the "to" side (faculty2), matching how the report's per-faculty counts
  // are derived (DutySlot.faculty_id = who currently holds it).
  let reassignSlot = await prisma.dutySlot.findFirst({ where: { duty_date: dutyDate, session_type: 'afternoon' } });
  if (!reassignSlot) {
    reassignSlot = await prisma.dutySlot.create({
      data: {
        faculty_id: faculty2.id,
        duty_date: dutyDate,
        session_type: 'afternoon',
        status: 'scheduled',
        created_by: admin.id,
      },
    });
  }
  console.log('Seeded e2e duty slot for today (afternoon, reassigned)');

  const existingReassignment = await prisma.dutyReassignment.findFirst({ where: { duty_slot_id: reassignSlot.id } });
  if (!existingReassignment) {
    await prisma.dutyReassignment.create({
      data: {
        duty_slot_id: reassignSlot.id,
        from_faculty_id: faculty.id,
        to_faculty_id: faculty2.id,
        duty_date: dutyDate,
        session_type: 'afternoon',
        reason: 'E2E test reassignment',
        reassigned_by: admin.id,
      },
    });
  }
  console.log('Seeded e2e duty reassignment for today (afternoon)');

  // Absent-faculty fixture — a different day from the morning/afternoon
  // slots above (today already has both sessions taken), still within the
  // current month so it shows under the Reports MonthFilter's default view.
  const absentDate = new Date(dutyDate);
  absentDate.setUTCDate(absentDate.getUTCDate() - 3);
  let absentSlot = await prisma.dutySlot.findFirst({ where: { duty_date: absentDate, session_type: 'morning' } });
  if (!absentSlot) {
    absentSlot = await prisma.dutySlot.create({
      data: {
        faculty_id: faculty2.id,
        duty_date: absentDate,
        session_type: 'morning',
        status: 'absent',
        created_by: admin.id,
      },
    });
  }
  console.log('Seeded e2e absent duty slot (3 days ago, morning)');

  // Attendance-override fixture — another different day, its own attendance
  // + audit log entry. NOTE: client/src/pages/admin/ReportsPage.jsx's
  // 'attendance-overrides' case reads r.faculty/r.dutySlot/r.overriddenBy,
  // but attendanceOverrideLog (server/controllers/reports.controller.js)
  // returns nested attendance.faculty/attendance.dutySlot/changedBy instead
  // — a pre-existing field-name mismatch, not introduced or fixed by this
  // batch. This fixture still seeds correctly; the report will display
  // blank name/"Invalid Date" for every row (already true before this
  // batch) until that mismatch is fixed separately.
  const overrideDate = new Date(dutyDate);
  overrideDate.setUTCDate(overrideDate.getUTCDate() - 2);
  let overrideSlot = await prisma.dutySlot.findFirst({ where: { duty_date: overrideDate, session_type: 'morning' } });
  if (!overrideSlot) {
    overrideSlot = await prisma.dutySlot.create({
      data: {
        faculty_id: faculty.id,
        duty_date: overrideDate,
        session_type: 'morning',
        status: 'completed',
        created_by: admin.id,
      },
    });
  }
  // out_time is set immediately (not left open) so the server's own
  // auto-clockout cron (server/lib/cron.js, every 10 minutes — matches any
  // attendance with in_time set and out_time still null) never touches this
  // fixture. It did exactly that to an earlier version of this fixture that
  // omitted out_time, silently turning it into a second Auto Clock-outs
  // report row for "E2E Faculty" and breaking Batch 3.1/3.2a's already-
  // committed count assertions — a real cross-fixture interaction, not a
  // one-off fluke, so every attendance fixture in this file must be created
  // already-closed unless it is deliberately testing auto-clockout itself.
  const overrideOutTime = new Date(overrideDate);
  overrideOutTime.setUTCHours(11, 0, 0, 0);
  let overrideAttendance = await prisma.dutyAttendance.findUnique({ where: { duty_slot_id: overrideSlot.id } });
  if (!overrideAttendance) {
    overrideAttendance = await prisma.dutyAttendance.create({
      data: { duty_slot_id: overrideSlot.id, faculty_id: faculty.id, in_time: overrideDate, out_time: overrideOutTime },
    });
  } else if (!overrideAttendance.out_time || overrideAttendance.auto_out) {
    // Heals a previously-seeded open record (from before this fix) that the
    // cron already auto-completed with auto_out:true in the meantime.
    overrideAttendance = await prisma.dutyAttendance.update({
      where: { id: overrideAttendance.id },
      data: { out_time: overrideOutTime, auto_out: false },
    });
  }
  const existingAuditLog = await prisma.attendanceAuditLog.findFirst({ where: { duty_attendance_id: overrideAttendance.id } });
  if (!existingAuditLog) {
    await prisma.attendanceAuditLog.create({
      data: {
        duty_attendance_id: overrideAttendance.id,
        changed_by: admin.id,
        override_reason: 'E2E test override reason',
      },
    });
  }
  console.log('Seeded e2e attendance override audit log (2 days ago)');

  // Flagged-violation fixture — a second Violation on the same student,
  // flagged for review (the existing E2E-STU-0001 violation is unflagged,
  // used only for the Student Violation Report / Pending Fines fixtures).
  // Recorded by faculty2, not admin: e2e/reports-student-violations.spec.js
  // (Batch 3.1) filters the Student Violation Report to Recorder=Admin and
  // expects exactly one matching row — recording this one as admin too
  // would silently break that already-committed test's count assertion, a
  // real cross-fixture interaction discovered while adding this fixture.
  const flagNote = 'E2E test flag note';
  const existingFlagged = await prisma.violation.findFirst({ where: { student_id: student.id, flag_note: flagNote } });
  if (!existingFlagged) {
    await prisma.violation.create({
      data: {
        student_id: student.id,
        faculty_id: faculty2.id,
        violation_type_id: violationType.id,
        fine_amount: 50,
        is_flagged: true,
        flag_note: flagNote,
      },
    });
  } else if (existingFlagged.faculty_id !== faculty2.id) {
    // Heals a previously-seeded copy of this fixture (from before this fix)
    // that was recorded as admin.
    await prisma.violation.update({ where: { id: existingFlagged.id }, data: { faculty_id: faculty2.id } });
  }
  console.log('Seeded e2e flagged violation for student: ' + studentReg);

  // Upload-history fixture — studentUploadHistory has no year/month filter
  // (always the most recent 50), so this needs no date coordination at all.
  const uploadFilename = 'e2e-test-upload.xlsx';
  const existingUpload = await prisma.studentUploadLog.findFirst({ where: { filename: uploadFilename } });
  if (!existingUpload) {
    await prisma.studentUploadLog.create({
      data: {
        uploaded_by: admin.id,
        filename: uploadFilename,
        added_count: 1,
        updated_count: 0,
        deactivated_count: 0,
        errors: [],
      },
    });
  }
  console.log(`Seeded e2e upload history log: ${uploadFilename}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
