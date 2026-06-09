const ExcelJS = require('exceljs');
const prisma = require('../lib/prisma');
const { logAction } = require('../services/audit.service');
const logger = require('../lib/logger');

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

// Parses the uploaded workbook into validated rows and a list of row errors.
// Returns { uniqueRows, errors, scopeConditions } — does not touch the DB.
function parseWorkbook(workbook) {
  const sheet = workbook.worksheets[0];
  if (!sheet) return { sheet: null };

  const headerRow = sheet.getRow(1);
  const colIndexMap = {};
  headerRow.eachCell((cell, colNumber) => {
    const key = String(cell.value ?? '').trim().toLowerCase();
    if (COLUMN_MAP[key]) colIndexMap[COLUMN_MAP[key]] = colNumber;
  });

  const missingHeaders = REQUIRED_FIELDS.filter((f) => !colIndexMap[f]);
  if (missingHeaders.length > 0) return { missingHeaders };

  const validRows = [];
  const errors = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const get = (field) => {
      const val = row.getCell(colIndexMap[field]).value;
      return val !== null && val !== undefined ? String(val).trim() : '';
    };

    const reg         = get('registration_number');
    const name        = get('student_name');
    const course      = get('course');
    const semYear     = get('semester_or_year');
    const acYear      = get('academic_year');
    const institution = get('institution');

    const rowErrors = [];
    if (!reg)         rowErrors.push('registration_number is empty');
    if (!name)        rowErrors.push('student_name is empty');
    if (!course)      rowErrors.push('course is empty');
    if (!semYear)     rowErrors.push('semester_or_year is empty');
    if (!acYear)      rowErrors.push('academic_year is empty');
    if (!institution) rowErrors.push('institution is empty');

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, registration_number: reg || null, reasons: rowErrors });
      return;
    }

    validRows.push({ registration_number: reg, student_name: name, course, semester_or_year: semYear, academic_year: acYear, institution });
  });

  // Deduplicate within the file — keep last occurrence
  const rowMap = new Map();
  for (const r of validRows) rowMap.set(r.registration_number, r);
  const uniqueRows = Array.from(rowMap.values());

  // Build scoped deactivation conditions from every course+semester_or_year+academic_year
  // combination present in the file so that only students within those groups are
  // candidates for deactivation.
  const scopeKeys = new Map();
  for (const r of uniqueRows) {
    const key = `${r.course}|${r.semester_or_year}|${r.academic_year}`;
    if (!scopeKeys.has(key)) {
      scopeKeys.set(key, {
        course:           r.course,
        semester_or_year: r.semester_or_year,
        academic_year:    r.academic_year,
      });
    }
  }
  const scopeConditions = Array.from(scopeKeys.values());

  return { uniqueRows, errors, scopeConditions };
}

// ─── POST /students/upload ─────────────────────────────────────────────────────
//
// Query params:
//   dry_run=true            — validate & compute counts, no writes to DB
//   deactivate_missing=true — deactivate in-scope students absent from the file
//
// Deactivation is always scoped to the course+semester_or_year+academic_year
// combinations present in the file. A file containing only Year-1 students
// will never deactivate Year-2 or Year-3 students.

async function uploadStudents(req, res) {
  const dryRun           = req.query.dry_run           === 'true';
  const deactivateMissing = req.query.deactivate_missing === 'true';

  if (!req.file) {
    return res.status(400).json({ error: true, code: 'BAD_REQUEST', message: 'Excel file is required.' });
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(req.file.buffer);
  } catch {
    return res.status(422).json({ error: true, code: 'INVALID_FILE', message: 'Could not parse the uploaded file. Ensure it is a valid .xlsx file.' });
  }

  const parsed = parseWorkbook(workbook);

  if (parsed.sheet === null) {
    return res.status(422).json({ error: true, code: 'EMPTY_FILE', message: 'The uploaded file has no worksheets.' });
  }
  if (parsed.missingHeaders) {
    return res.status(422).json({
      error: true,
      code: 'MISSING_COLUMNS',
      message: `Missing required columns: ${parsed.missingHeaders.join(', ')}`,
    });
  }

  const { uniqueRows, errors, scopeConditions } = parsed;
  const uploadedRegNums = uniqueRows.map((r) => r.registration_number);

  // Hard block: never deactivate when no valid rows were found.
  if (uniqueRows.length === 0 && deactivateMissing) {
    return res.status(422).json({
      error: true,
      code: 'NO_VALID_ROWS',
      message: 'No valid rows were found in the file. Deactivation is blocked to prevent accidental mass-deactivation.',
      valid_rows:    0,
      invalid_rows:  errors.length,
      errors,
    });
  }

  const deactivateWhere =
    deactivateMissing && scopeConditions.length > 0
      ? {
          status:              'active',
          deleted_at:          null,
          registration_number: { notIn: uploadedRegNums },
          OR:                  scopeConditions,
        }
      : null;

  // ── Dry-run: compute counts, no writes ────────────────────────────────────────
  if (dryRun) {
    try {
      const existingInFile = await prisma.student.findMany({
        where:  { registration_number: { in: uploadedRegNums } },
        select: { registration_number: true },
      });
      const existingSet  = new Set(existingInFile.map((s) => s.registration_number));
      const wouldAdd     = uniqueRows.filter((r) => !existingSet.has(r.registration_number)).length;
      const wouldUpdate  = uniqueRows.filter((r) =>  existingSet.has(r.registration_number)).length;
      const wouldDeactivate = deactivateWhere
        ? await prisma.student.count({ where: deactivateWhere })
        : 0;

      return res.json({
        dry_run:           true,
        valid_rows:        uniqueRows.length,
        invalid_rows:      errors.length,
        would_add:         wouldAdd,
        would_update:      wouldUpdate,
        would_deactivate:  wouldDeactivate,
        deactivate_missing: deactivateMissing,
        scope:             scopeConditions,
        errors,
      });
    } catch (err) {
      logger.error(`uploadStudents dry_run error: ${err.message}`);
      return res.status(500).json({ error: true, code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' });
    }
  }

  // ── Actual import (transactional) ─────────────────────────────────────────────
  let added_count       = 0;
  let updated_count     = 0;
  let deactivated_count = 0;
  let log;

  try {
    await prisma.$transaction(async (tx) => {
      for (const row of uniqueRows) {
        const existing = await tx.student.findUnique({
          where: { registration_number: row.registration_number },
        });

        if (existing) {
          await tx.student.update({
            where: { registration_number: row.registration_number },
            data:  { ...row, status: 'active', deleted_at: null },
          });
          updated_count++;
        } else {
          await tx.student.create({ data: { ...row, status: 'active' } });
          added_count++;
        }
      }

      if (deactivateWhere) {
        const result = await tx.student.updateMany({
          where: deactivateWhere,
          data:  { status: 'inactive' },
        });
        deactivated_count = result.count;
      }

      // Save upload log inside the same transaction so it commits or rolls back together.
      log = await tx.studentUploadLog.create({
        data: {
          uploaded_by:       req.user.id,
          filename:          req.file.originalname,
          added_count,
          updated_count,
          deactivated_count,
          errors,
        },
      });
    });
  } catch (err) {
    logger.error(`uploadStudents transaction error: ${err.message}`);
    return res.status(500).json({ error: true, code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' });
  }

  // Audit log is outside the transaction (it's an append-only record; a failure here
  // does not need to undo the import).
  logAction({
    actorId:    req.user.id,
    action:     'STUDENT_UPLOAD',
    targetId:   log.id,
    targetType: 'student_upload_log',
    metadata:   {
      filename:          req.file.originalname,
      added_count,
      updated_count,
      deactivated_count,
      error_count:       errors.length,
      deactivate_missing: deactivateMissing,
    },
  }).catch((err) => logger.error('Failed to log STUDENT_UPLOAD action', err));

  res.status(200).json({
    log_id:            log.id,
    filename:          req.file.originalname,
    valid_rows:        uniqueRows.length,
    invalid_rows:      errors.length,
    added_count,
    updated_count,
    deactivated_count,
    error_count:       errors.length,
    deactivate_missing: deactivateMissing,
    scope:             scopeConditions,
    errors,
  });
}

// ─── GET /students/upload-logs ─────────────────────────────────────────────────

async function getUploadLogs(req, res) {
  const { page = '1', limit = '20' } = req.query;
  const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const [total, logs] = await Promise.all([
    prisma.studentUploadLog.count(),
    prisma.studentUploadLog.findMany({
      orderBy: { uploaded_at: 'desc' },
      skip:    (pageNum - 1) * pageSize,
      take:    pageSize,
      include: { uploader: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  res.json({ data: logs, meta: { total, page: pageNum, limit: pageSize, pages: Math.ceil(total / pageSize) } });
}

// ─── GET /students ─────────────────────────────────────────────────────────────

async function listStudents(req, res) {
  const { course, semester_or_year, status, search, page = '1', limit = '20' } = req.query;
  const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const where = { deleted_at: null };
  if (course)           where.course           = course;
  if (semester_or_year) where.semester_or_year = semester_or_year;
  if (status)           where.status           = status;
  if (search) {
    where.OR = [
      { student_name:         { contains: search, mode: 'insensitive' } },
      { registration_number:  { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy: { student_name: 'asc' },
      skip:    (pageNum - 1) * pageSize,
      take:    pageSize,
    }),
  ]);

  res.json({ data: students, meta: { total, page: pageNum, limit: pageSize, pages: Math.ceil(total / pageSize) } });
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
        { student_name:        { contains: q, mode: 'insensitive' } },
        { registration_number: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true, registration_number: true, student_name: true,
      course: true, semester_or_year: true, academic_year: true, institution: true,
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
    actorId:    req.user.id,
    action:     'PROMOTE_STUDENT',
    targetId:   student.id,
    targetType: 'student',
    metadata: {
      from: { semester_or_year: student.semester_or_year, academic_year: student.academic_year },
      to:   { semester_or_year: data.semester_or_year, academic_year: data.academic_year ?? student.academic_year },
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

  const updated = await prisma.student.update({ where: { id: req.params.id }, data: { status: 'inactive' } });

  await logAction({
    actorId: req.user.id, action: 'DEACTIVATE_STUDENT', targetId: student.id, targetType: 'student',
  });

  res.json(updated);
}

module.exports = {
  uploadStudents, getUploadLogs, listStudents, searchStudents, promoteStudent, deactivateStudent,
};
