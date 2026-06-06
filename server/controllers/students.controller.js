const ExcelJS = require('exceljs');
const prisma = require('../lib/prisma');
const { logAction } = require('../services/audit.service');

// Expected Excel column headers (case-insensitive, trimmed)
const COLUMN_MAP = {
  'registration number': 'registration_number',
  'registration_number': 'registration_number',
  'student name': 'student_name',
  'student_name': 'student_name',
  'name': 'student_name',
  'course': 'course',
  'semester or year': 'semester_or_year',
  'semester_or_year': 'semester_or_year',
  'semester/year': 'semester_or_year',
  'academic year': 'academic_year',
  'academic_year': 'academic_year',
  'institution': 'institution',
};

const REQUIRED_FIELDS = ['registration_number', 'student_name', 'course', 'semester_or_year', 'academic_year', 'institution'];

// ─── POST /students/upload ─────────────────────────────────────────────────────

async function uploadStudents(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: true, code: 'BAD_REQUEST', message: 'Excel file is required.' });
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(req.file.buffer);
  } catch {
    return res.status(422).json({ error: true, code: 'INVALID_FILE', message: 'Could not parse the uploaded file. Ensure it is a valid .xlsx file.' });
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return res.status(422).json({ error: true, code: 'EMPTY_FILE', message: 'The uploaded file has no worksheets.' });
  }

  // Map header row to field names
  const headerRow = sheet.getRow(1);
  const colIndexMap = {}; // fieldName → column index (1-based)
  headerRow.eachCell((cell, colNumber) => {
    const key = String(cell.value ?? '').trim().toLowerCase();
    if (COLUMN_MAP[key]) {
      colIndexMap[COLUMN_MAP[key]] = colNumber;
    }
  });

  const missingHeaders = REQUIRED_FIELDS.filter((f) => !colIndexMap[f]);
  if (missingHeaders.length > 0) {
    return res.status(422).json({
      error: true,
      code: 'MISSING_COLUMNS',
      message: `Missing required columns: ${missingHeaders.join(', ')}`,
    });
  }

  const validRows = [];
  const errors = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const get = (field) => {
      const idx = colIndexMap[field];
      const val = row.getCell(idx).value;
      return val !== null && val !== undefined ? String(val).trim() : '';
    };

    const reg = get('registration_number');
    const name = get('student_name');
    const course = get('course');
    const semYear = get('semester_or_year');
    const acYear = get('academic_year');
    const institution = get('institution');

    const rowErrors = [];
    if (!reg) rowErrors.push('registration_number is empty');
    if (!name) rowErrors.push('student_name is empty');
    if (!course) rowErrors.push('course is empty');
    if (!semYear) rowErrors.push('semester_or_year is empty');
    if (!acYear) rowErrors.push('academic_year is empty');
    if (!institution) rowErrors.push('institution is empty');

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, registration_number: reg || null, reasons: rowErrors });
      return;
    }

    validRows.push({ registration_number: reg, student_name: name, course, semester_or_year: semYear, academic_year: acYear, institution });
  });

  // Deduplicate within file — keep last occurrence
  const rowMap = new Map();
  for (const r of validRows) rowMap.set(r.registration_number, r);
  const uniqueRows = Array.from(rowMap.values());
  const uploadedRegNums = uniqueRows.map((r) => r.registration_number);

  let added_count = 0;
  let updated_count = 0;

  // Upsert each row
  for (const row of uniqueRows) {
    const existing = await prisma.student.findUnique({
      where: { registration_number: row.registration_number },
    });

    if (existing) {
      await prisma.student.update({
        where: { registration_number: row.registration_number },
        data: { ...row, status: 'active', deleted_at: null },
      });
      updated_count++;
    } else {
      await prisma.student.create({ data: { ...row, status: 'active' } });
      added_count++;
    }
  }

  // Deactivate students not present in this upload
  const deactivated = await prisma.student.updateMany({
    where: {
      status: 'active',
      deleted_at: null,
      registration_number: { notIn: uploadedRegNums },
    },
    data: { status: 'inactive' },
  });
  const deactivated_count = deactivated.count;

  // Save upload log
  const log = await prisma.studentUploadLog.create({
    data: {
      uploaded_by: req.user.id,
      filename: req.file.originalname,
      added_count,
      updated_count,
      deactivated_count,
      errors,
    },
  });

  await logAction({
    actorId: req.user.id,
    action: 'STUDENT_UPLOAD',
    targetId: log.id,
    targetType: 'student_upload_log',
    metadata: { filename: req.file.originalname, added_count, updated_count, deactivated_count, error_count: errors.length },
  });

  res.status(200).json({
    log_id: log.id,
    filename: req.file.originalname,
    added_count,
    updated_count,
    deactivated_count,
    error_count: errors.length,
    errors,
  });
}

// ─── GET /students/upload-logs ─────────────────────────────────────────────────

async function getUploadLogs(req, res) {
  const { page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const [total, logs] = await Promise.all([
    prisma.studentUploadLog.count(),
    prisma.studentUploadLog.findMany({
      orderBy: { uploaded_at: 'desc' },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
      include: {
        uploader: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  res.json({
    data: logs,
    meta: { total, page: pageNum, limit: pageSize, pages: Math.ceil(total / pageSize) },
  });
}

// ─── GET /students ─────────────────────────────────────────────────────────────

async function listStudents(req, res) {
  const { course, semester_or_year, status, search, page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const where = { deleted_at: null };
  if (course) where.course = course;
  if (semester_or_year) where.semester_or_year = semester_or_year;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { student_name: { contains: search, mode: 'insensitive' } },
      { registration_number: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy: { student_name: 'asc' },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  res.json({
    data: students,
    meta: { total, page: pageNum, limit: pageSize, pages: Math.ceil(total / pageSize) },
  });
}

// ─── GET /students/search ──────────────────────────────────────────────────────

async function searchStudents(req, res) {
  const { q } = req.query;
  if (!q || String(q).trim().length < 2) {
    return res.status(400).json({ error: true, code: 'BAD_REQUEST', message: 'Query must be at least 2 characters.' });
  }

  const students = await prisma.student.findMany({
    where: {
      deleted_at: null,
      status: 'active',
      OR: [
        { student_name: { contains: q, mode: 'insensitive' } },
        { registration_number: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      registration_number: true,
      student_name: true,
      course: true,
      semester_or_year: true,
      academic_year: true,
      institution: true,
    },
    orderBy: { student_name: 'asc' },
    take: 20,
  });

  res.json({ data: students });
}

// ─── PATCH /students/:id/promote ──────────────────────────────────────────────

async function promoteStudent(req, res) {
  const student = await prisma.student.findUnique({ where: { id: req.params.id } });
  if (!student || student.deleted_at) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Student not found.' });
  }

  const data = { semester_or_year: req.body.semester_or_year };
  if (req.body.academic_year) data.academic_year = req.body.academic_year;

  const updated = await prisma.student.update({ where: { id: req.params.id }, data });

  await logAction({
    actorId: req.user.id,
    action: 'PROMOTE_STUDENT',
    targetId: student.id,
    targetType: 'student',
    metadata: {
      from: { semester_or_year: student.semester_or_year, academic_year: student.academic_year },
      to: { semester_or_year: data.semester_or_year, academic_year: data.academic_year ?? student.academic_year },
    },
  });

  res.json(updated);
}

// ─── PATCH /students/:id/deactivate ───────────────────────────────────────────

async function deactivateStudent(req, res) {
  const student = await prisma.student.findUnique({ where: { id: req.params.id } });
  if (!student || student.deleted_at) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Student not found.' });
  }
  if (student.status === 'inactive') {
    return res.status(409).json({ error: true, code: 'CONFLICT', message: 'Student is already inactive.' });
  }

  const updated = await prisma.student.update({
    where: { id: req.params.id },
    data: { status: 'inactive' },
  });

  await logAction({
    actorId: req.user.id,
    action: 'DEACTIVATE_STUDENT',
    targetId: student.id,
    targetType: 'student',
  });

  res.json(updated);
}

module.exports = {
  uploadStudents,
  getUploadLogs,
  listStudents,
  searchStudents,
  promoteStudent,
  deactivateStudent,
};
