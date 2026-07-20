import { createRequire } from 'module';
const require = createRequire('C:/Users/sikha/Music/sims disclipne/e2e/seed.mjs');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('../server/node_modules/@prisma/client');
const prisma = new PrismaClient();

// ── IST date/time helpers ──────────────────────────────────────────────
const IST_MIN = 330;
const nowMs = Date.now();
const istISO = (offsetDays = 0) =>
  new Date(nowMs + IST_MIN * 60000 + offsetDays * 86400000).toISOString().slice(0, 10);
const dateOnly = (iso) => new Date(`${iso}T00:00:00.000Z`);
const istWall = (iso, h, m) =>
  new Date(new Date(`${iso}T00:00:00.000Z`).getTime() + ((h * 60 + m) - IST_MIN) * 60000);

async function main() {
  // ── Users: reuse the 3 seeded logins, add a 2nd faculty for variety ──
  const faculty = await prisma.user.findUnique({ where: { email: 'e2e.faculty@sims.test' } });
  const admin = await prisma.user.findUnique({ where: { email: 'e2e.admin@sims.test' } });
  const superadmin = await prisma.user.findUnique({ where: { email: 'e2e.superadmin@sims.test' } });

  const f2hash = await bcrypt.hash('E2eTest1234!', 10);
  const faculty2 = await prisma.user.upsert({
    where: { email: 'e2e.faculty2@sims.test' },
    update: { status: 'active', role: 'faculty', deleted_at: null },
    create: {
      name: 'Meera Krishnan', email: 'e2e.faculty2@sims.test', role: 'faculty',
      title: 'Dr.', department: 'Pharmaceutics', designation: 'Associate Professor',
      status: 'active', password_hash: f2hash, must_change_password: false,
      session_version: 1, approved_at: new Date(),
    },
  });
  // Give the primary faculty a friendlier name/title for the greeting
  await prisma.user.update({
    where: { id: faculty.id },
    data: { name: 'Arjun Nair', title: 'Dr.', department: 'Pharmacology', designation: 'Assistant Professor' },
  });

  // ── Clear transactional tables (throwaway DB) in FK-safe order ──
  await prisma.photoAccessLog.deleteMany();
  await prisma.violationAuditLog.deleteMany();
  await prisma.attendanceAuditLog.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.dutyReassignmentRequest.deleteMany();
  await prisma.dutyReassignment.deleteMany();
  await prisma.violation.deleteMany();
  await prisma.dutyAttendance.deleteMany();
  await prisma.dutySlot.deleteMany();
  await prisma.message.deleteMany();
  await prisma.violationType.deleteMany();
  await prisma.student.deleteMany();

  // ── System config (single 'global' row; sensible defaults) ──
  await prisma.systemConfig.upsert({ where: { id: 'global' }, update: {}, create: { id: 'global' } });

  // ── Violation types ──
  const vtLate = await prisma.violationType.create({
    data: { name: 'Late to Class', default_fine: 50, created_by: admin.id },
  });
  const vtUniform = await prisma.violationType.create({
    data: { name: 'Improper Uniform', default_fine: 100, created_by: admin.id },
  });
  const vtPhone = await prisma.violationType.create({
    data: { name: 'Mobile Phone Use', default_fine: 200, created_by: admin.id },
  });

  // ── Students ──
  const mk = (i, name, course, year, sem) => prisma.student.create({
    data: {
      registration_number: `SIMS23${String(100 + i)}`, student_name: name,
      course, year, semester: sem, batch_year: 2023, academic_year: '2025-26',
      gender: i % 2 ? 'male' : 'female',
    },
  });
  const s1 = await mk(1, 'Rahul Verma', 'b_pharm', 2, 4);
  const s2 = await mk(2, 'Priya Sharma', 'b_pharm', 3, 6);
  const s3 = await mk(3, 'Aditya Rao', 'pharm_d', 3, 6);
  const s4 = await mk(4, 'Sneha Iyer', 'b_pharm', 1, 2);

  const T = istISO(0);

  // ── Duty slots ──
  // Today: faculty (morning, checked in) + faculty2 (afternoon, checked out)
  const slotTodayAm = await prisma.dutySlot.create({
    data: { faculty_id: faculty.id, duty_date: dateOnly(T), session_type: 'morning', status: 'scheduled', created_by: admin.id },
  });
  const slotTodayPm = await prisma.dutySlot.create({
    data: { faculty_id: faculty2.id, duty_date: dateOnly(T), session_type: 'afternoon', status: 'completed', created_by: admin.id },
  });
  // Upcoming (faculty) — drives Next-7-days + Upcoming duties
  const up1 = await prisma.dutySlot.create({
    data: { faculty_id: faculty.id, duty_date: dateOnly(istISO(2)), session_type: 'morning', status: 'scheduled', created_by: admin.id },
  });
  const up2 = await prisma.dutySlot.create({
    data: { faculty_id: faculty.id, duty_date: dateOnly(istISO(4)), session_type: 'morning', status: 'scheduled', created_by: admin.id },
  });
  await prisma.dutySlot.create({
    data: { faculty_id: faculty.id, duty_date: dateOnly(istISO(6)), session_type: 'afternoon', status: 'scheduled', created_by: admin.id },
  });
  // faculty2 future afternoon — the slot faculty2 wants to hand to faculty
  const f2future = await prisma.dutySlot.create({
    data: { faculty_id: faculty2.id, duty_date: dateOnly(istISO(3)), session_type: 'afternoon', status: 'scheduled', created_by: admin.id },
  });
  // Yesterday morning — reassigned from faculty to faculty2 (slot now owned by faculty2)
  const pastReassigned = await prisma.dutySlot.create({
    data: { faculty_id: faculty2.id, duty_date: dateOnly(istISO(-1)), session_type: 'morning', status: 'completed', created_by: admin.id },
  });

  // ── Attendance ──
  await prisma.dutyAttendance.create({
    data: { duty_slot_id: slotTodayAm.id, faculty_id: faculty.id, in_time: istWall(T, 8, 6) }, // checked in (slightly late)
  });
  await prisma.dutyAttendance.create({
    data: { duty_slot_id: slotTodayPm.id, faculty_id: faculty2.id, in_time: istWall(T, 13, 2), out_time: istWall(T, 16, 10) },
  });

  // ── Violations (recorded by faculty today; 2 flagged) ──
  await prisma.violation.create({
    data: { student_id: s1.id, faculty_id: faculty.id, duty_slot_id: slotTodayAm.id, violation_type_id: vtLate.id, fine_amount: 50, remarks: 'Arrived 20 min late' },
  });
  await prisma.violation.create({
    data: { student_id: s2.id, faculty_id: faculty.id, duty_slot_id: slotTodayAm.id, violation_type_id: vtUniform.id, fine_amount: 100, is_flagged: true, flag_note: 'Repeat offender — needs admin review' },
  });
  await prisma.violation.create({
    data: { student_id: s3.id, faculty_id: faculty.id, duty_slot_id: slotTodayAm.id, violation_type_id: vtPhone.id, fine_amount: 200, is_flagged: true, flag_note: 'Using phone during exam' },
  });
  await prisma.violation.create({
    data: { student_id: s4.id, faculty_id: faculty.id, violation_type_id: vtLate.id, fine_amount: 50, is_warning_only: true, remarks: 'First warning' },
  });

  // ── Reassignment history (admin moved yesterday's faculty duty to faculty2) ──
  await prisma.dutyReassignment.create({
    data: {
      duty_slot_id: pastReassigned.id, from_faculty_id: faculty.id, to_faculty_id: faculty2.id,
      duty_date: dateOnly(istISO(-1)), session_type: 'morning', reason: 'Faculty on leave', reassigned_by: admin.id,
    },
  });

  // ── Reassignment requests ──
  // Incoming to faculty (faculty2 asks faculty to take their future afternoon) → PendingReassignmentRequests card
  await prisma.dutyReassignmentRequest.create({
    data: { duty_slot_id: f2future.id, from_faculty_id: faculty2.id, to_faculty_id: faculty.id, reason: 'Conference travel', status: 'pending' },
  });
  // Outgoing from faculty (faculty asks faculty2) on an upcoming slot → "requested to … pending" + Cancel on Upcoming row
  await prisma.dutyReassignmentRequest.create({
    data: { duty_slot_id: up2.id, from_faculty_id: faculty.id, to_faculty_id: faculty2.id, reason: 'Personal commitment', status: 'pending' },
  });

  // ── Messages to faculty (inbox → recent activity feed) ──
  await prisma.message.create({
    data: { from_user_id: admin.id, to_user_id: faculty.id, subject: 'Duty schedule published', body: 'Your duties for this month are now visible.', is_read: false },
  });
  await prisma.message.create({
    data: { from_user_id: admin.id, to_user_id: faculty.id, subject: 'Reminder: submit violation reports', body: 'Please ensure all violations are logged by end of week.', is_read: true, read_at: new Date() },
  });

  // ── Admin audit log (super-admin recent system activity feed) ──
  const audits = [
    { actor_id: admin.id, action: 'USER_CREATED', target_type: 'user' },
    { actor_id: admin.id, action: 'CALENDAR_WINDOW_OPEN', target_type: 'calendar' },
    { actor_id: admin.id, action: 'ADMIN_ASSIGN_SLOTS', target_type: 'duty_slot' },
    { actor_id: superadmin.id, action: 'USER_REACTIVATED', target_type: 'user' },
    { actor_id: admin.id, action: 'VIOLATION_FLAG_RESOLVED', target_type: 'violation' },
    { actor_id: superadmin.id, action: 'SESSION_RESET', target_type: 'user' },
  ];
  for (let i = 0; i < audits.length; i++) {
    await prisma.adminAuditLog.create({
      data: { ...audits[i], created_at: new Date(nowMs - i * 3600000) },
    });
  }

  console.log('Rich seed complete:');
  console.log('  users: faculty(Arjun Nair), faculty2(Meera Krishnan), admin, super_admin');
  console.log('  today: faculty morning (checked-in), faculty2 afternoon (checked-out)');
  console.log('  4 violations (2 flagged), 3 upcoming faculty slots, 1 reassignment history');
  console.log('  2 reassignment requests (1 incoming to faculty, 1 outgoing), 2 messages, 6 audit logs');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
