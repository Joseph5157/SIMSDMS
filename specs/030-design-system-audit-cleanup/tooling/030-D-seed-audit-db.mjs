#!/usr/bin/env node

/**
 * 030-D-only deterministic browser-audit data.
 *
 * Safety guard: this script refuses to run unless DATABASE_URL resolves to the
 * dedicated local database/port created for this audit. It must never be used
 * against a shared development, staging, or production database.
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('../../../server/node_modules/@prisma/client/index.js');

const EXPECTED_DATABASE = 'sims_dms_audit_030';
const EXPECTED_PORT = 55432;
const SUPER_ADMIN_EMAIL = 'e2e.superadmin@sims.test';
const SECOND_FACULTY_EMAIL = 'e2e.faculty2@sims.test';

const prisma = new PrismaClient();

function utcDate(offsetDays = 0, hour = 12, minute = 0) {
  const value = new Date();
  value.setUTCHours(hour, minute, 0, 0);
  value.setUTCDate(value.getUTCDate() + offsetDays);
  return value;
}

async function assertDisposableDatabase() {
  const [row] = await prisma.$queryRawUnsafe(
    'select current_database() as database, inet_server_addr()::text as address, inet_server_port() as port',
  );
  if (
    row.database !== EXPECTED_DATABASE
    || Number(row.port) !== EXPECTED_PORT
    || !(row.address === '::1' || row.address.startsWith('127.0.0.1'))
  ) {
    throw new Error(
      `Refusing to seed non-audit database: ${row.database} at ${row.address}:${row.port}`,
    );
  }
}

async function main() {
  await assertDisposableDatabase();

  const superAdminPassword = process.env.AUDIT_SUPERADMIN_PASSWORD;
  if (!superAdminPassword) {
    throw new Error('AUDIT_SUPERADMIN_PASSWORD is required');
  }

  const [admin, faculty, superAdmin] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: 'e2e.admin@sims.test' } }),
    prisma.user.findUniqueOrThrow({ where: { email: 'e2e.faculty@sims.test' } }),
    prisma.user.findUniqueOrThrow({ where: { email: SUPER_ADMIN_EMAIL } }),
  ]);

  await prisma.user.update({
    where: { id: superAdmin.id },
    data: {
      password_hash: await bcrypt.hash(superAdminPassword, 10),
      must_change_password: false,
      status: 'active',
      deleted_at: null,
      avatar: 'super_admin',
    },
  });

  const secondFaculty = await prisma.user.upsert({
    where: { email: SECOND_FACULTY_EMAIL },
    update: {
      name: 'E2E Second Faculty',
      title: 'Dr.',
      department: 'Computer Science',
      designation: 'Associate Professor',
      status: 'active',
      deleted_at: null,
      must_change_password: false,
      avatar: 'female_professor',
    },
    create: {
      name: 'E2E Second Faculty',
      email: SECOND_FACULTY_EMAIL,
      title: 'Dr.',
      role: 'faculty',
      department: 'Computer Science',
      designation: 'Associate Professor',
      status: 'active',
      password_hash: await bcrypt.hash('SecondFacultyAudit1234!', 10),
      must_change_password: false,
      session_version: 1,
      approved_at: new Date(),
      avatar: 'female_professor',
    },
  });

  await prisma.user.update({
    where: { id: faculty.id },
    data: { title: 'Prof.', avatar: 'male_professor' },
  });
  await prisma.user.update({
    where: { id: admin.id },
    data: { avatar: 'admin' },
  });

  // This database was created solely for 030-D. Clear scenario tables so the
  // seed is deterministic when the audit is resumed or rerun.
  await prisma.$transaction([
    prisma.photoAccessLog.deleteMany(),
    prisma.violationAuditLog.deleteMany(),
    prisma.attendanceAuditLog.deleteMany(),
    prisma.dutyReassignmentRequest.deleteMany(),
    prisma.dutyReassignment.deleteMany(),
    prisma.dutyAttendance.deleteMany(),
    prisma.violation.deleteMany(),
    prisma.dutySlot.deleteMany(),
    prisma.message.deleteMany(),
    prisma.adminAuditLog.deleteMany(),
    prisma.pendingInvite.deleteMany(),
    prisma.studentUploadLog.deleteMany(),
    prisma.student.deleteMany(),
  ]);

  const students = [];
  const studentSeed = [
    ['AUD-001', 'Aarav Menon', 'b_pharm', 1, 2, 2026, 'male', 'active'],
    ['AUD-002', 'Diya Nair', 'b_pharm', 2, 4, 2025, 'female', 'active'],
    ['AUD-003', 'Farhan Ali', 'pharm_d', 3, 6, 2024, 'male', 'active'],
    ['AUD-004', 'Ishita Rao', 'm_pharm', 1, 2, 2026, 'female', 'active'],
    ['AUD-005', 'Kabir Shah', 'b_pharm', 4, 8, 2023, 'male', 'active'],
    ['AUD-006', 'Meera Das', 'pharm_d', 5, 10, 2022, 'female', 'active'],
    ['AUD-007', 'Nikhil Jain', 'b_pharm', 3, 6, 2024, 'male', 'active'],
    ['AUD-008', 'Sara Khan', 'b_pharm', 2, 4, 2025, 'female', 'inactive'],
  ];
  for (const [registration_number, student_name, course, year, semester, batch_year, gender, status] of studentSeed) {
    students.push(await prisma.student.create({
      data: {
        registration_number,
        student_name,
        course,
        year,
        semester,
        batch_year,
        gender,
        status,
        academic_year: '2026-27',
      },
    }));
  }

  const violationTypes = await prisma.violationType.findMany({ orderBy: { name: 'asc' } });
  const type = (index) => violationTypes[index % violationTypes.length];

  const slotSpecs = [
    [-35, 'morning', faculty.id, 'completed'],
    [-21, 'afternoon', secondFaculty.id, 'completed'],
    [-7, 'morning', faculty.id, 'completed'],
    [-2, 'afternoon', secondFaculty.id, 'completed'],
    [-1, 'morning', faculty.id, 'completed'],
    [0, 'afternoon', faculty.id, 'scheduled'],
    [1, 'morning', secondFaculty.id, 'scheduled'],
    [3, 'afternoon', faculty.id, 'scheduled'],
    [7, 'morning', secondFaculty.id, 'scheduled'],
    [14, 'afternoon', faculty.id, 'scheduled'],
  ];
  const slots = [];
  for (const [offset, session_type, faculty_id, status] of slotSpecs) {
    slots.push(await prisma.dutySlot.create({
      data: {
        duty_date: utcDate(offset),
        session_type,
        faculty_id,
        status,
        created_by: admin.id,
      },
    }));
  }

  const completedSlots = slots.filter((slot) => slot.status === 'completed');
  for (let index = 0; index < completedSlots.length; index += 1) {
    const slot = completedSlots[index];
    const inTime = new Date(slot.duty_date);
    inTime.setUTCHours(slot.session_type === 'morning' ? 8 : 13, index % 2 ? 18 : 4, 0, 0);
    const outTime = new Date(slot.duty_date);
    outTime.setUTCHours(16, index % 2 ? 42 : 28, 0, 0);
    await prisma.dutyAttendance.create({
      data: {
        duty_slot_id: slot.id,
        faculty_id: slot.faculty_id,
        in_time: inTime,
        out_time: outTime,
        auto_out: index === 1,
      },
    });
  }

  const violationRows = [];
  for (let index = 0; index < 14; index += 1) {
    const createdAt = utcDate(-index * 5, 10 + (index % 5));
    const selectedType = type(index);
    violationRows.push(await prisma.violation.create({
      data: {
        student_id: students[index % 7].id,
        faculty_id: index % 4 === 0 ? admin.id : faculty.id,
        duty_slot_id: index < completedSlots.length ? completedSlots[index].id : null,
        violation_type_id: selectedType.id,
        fine_amount: index % 5 === 0 ? 0 : selectedType.default_fine,
        is_warning_only: index % 5 === 0,
        remarks: index % 3 === 0 ? 'Audit scenario with a longer explanatory remark.' : null,
        is_flagged: index === 1 || index === 4,
        flag_note: index === 1 || index === 4 ? 'Needs administrator review' : null,
        created_at: createdAt,
      },
    }));
  }

  await prisma.violation.update({
    where: { id: violationRows[4].id },
    data: {
      flag_resolved_by: admin.id,
      flag_resolved_at: utcDate(-1),
    },
  });

  await prisma.violationAuditLog.createMany({
    data: violationRows.slice(0, 5).map((violation, index) => ({
      violation_id: violation.id,
      changed_by: index % 2 ? faculty.id : admin.id,
      change_type: index === 1 ? 'flagged' : 'created',
      new_data: { auditSeed: true, sequence: index + 1 },
      created_at: violation.created_at,
    })),
  });

  await prisma.dutyReassignmentRequest.create({
    data: {
      duty_slot_id: slots[7].id,
      from_faculty_id: faculty.id,
      to_faculty_id: secondFaculty.id,
      reason: 'Conference presentation during assigned duty time',
      status: 'pending',
    },
  });

  await prisma.dutyReassignment.create({
    data: {
      duty_slot_id: slots[8].id,
      from_faculty_id: faculty.id,
      to_faculty_id: secondFaculty.id,
      duty_date: slots[8].duty_date,
      session_type: slots[8].session_type,
      reason: 'Previously approved audit scenario',
      reassigned_by: admin.id,
      created_at: utcDate(-2),
    },
  });

  await prisma.message.createMany({
    data: [
      { from_user_id: admin.id, to_user_id: faculty.id, subject: 'Duty roster reminder', body: 'Please review the updated duty roster for this week.', is_read: false, created_at: utcDate(-1, 9) },
      { from_user_id: faculty.id, to_user_id: admin.id, subject: 'Attendance clarification', body: 'I have added the requested clarification for yesterday.', is_read: true, read_at: utcDate(0, 8), created_at: utcDate(-2, 15) },
      { from_user_id: superAdmin.id, to_user_id: admin.id, subject: 'Monthly audit', body: 'The monthly audit review is scheduled for Friday.', is_read: false, created_at: utcDate(-3, 11) },
      { from_user_id: secondFaculty.id, to_user_id: faculty.id, subject: 'Reassignment request', body: 'I can cover the requested afternoon duty.', is_read: true, read_at: utcDate(-1, 16), created_at: utcDate(-4, 13) },
    ],
  });

  await prisma.pendingInvite.create({
    data: {
      name: 'Pending Audit Faculty',
      email: 'pending.audit@sims.test',
      role: 'faculty',
      department: 'Computer Science',
      designation: 'Lecturer',
      title: 'Ms.',
      invite_token: '030-d-audit-pending-invite-token',
      invite_expires_at: utcDate(7),
      invited_by: admin.id,
    },
  });

  await prisma.studentUploadLog.create({
    data: {
      uploaded_by: admin.id,
      filename: '030-d-audit-students.xlsx',
      added_count: 8,
      updated_count: 0,
      deactivated_count: 1,
      errors: [],
      uploaded_at: utcDate(-6),
    },
  });

  await prisma.adminAuditLog.createMany({
    data: [
      { actor_id: superAdmin.id, action: 'USER_APPROVED', target_id: faculty.id, target_type: 'user', metadata: { auditSeed: true }, created_at: utcDate(-8) },
      { actor_id: admin.id, action: 'DUTY_REASSIGNED', target_id: slots[8].id, target_type: 'duty_slot', metadata: { auditSeed: true }, created_at: utcDate(-2) },
      { actor_id: admin.id, action: 'VIOLATION_FLAGGED', target_id: violationRows[1].id, target_type: 'violation', metadata: { auditSeed: true }, created_at: utcDate(-1) },
    ],
  });

  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();
  await prisma.calendarConfig.upsert({
    where: { config_month_config_year: { config_month: month, config_year: year } },
    update: {
      blocked_dates: [],
      working_days: [1, 2, 3, 4, 5],
      sessions_per_faculty: 3,
      is_window_open: true,
      opened_by: admin.id,
      opened_at: utcDate(-1),
      closes_at: utcDate(7),
    },
    create: {
      config_month: month,
      config_year: year,
      blocked_dates: [],
      working_days: [1, 2, 3, 4, 5],
      sessions_per_faculty: 3,
      is_window_open: true,
      opened_by: admin.id,
      opened_at: utcDate(-1),
      closes_at: utcDate(7),
    },
  });

  const counts = {
    users: await prisma.user.count(),
    students: await prisma.student.count(),
    dutySlots: await prisma.dutySlot.count(),
    violations: await prisma.violation.count(),
    messages: await prisma.message.count(),
    auditLogs: await prisma.adminAuditLog.count(),
  };
  console.log(JSON.stringify({ database: EXPECTED_DATABASE, counts }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
