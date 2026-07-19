const ExcelJS = require('exceljs');

// Characters that make Excel/Sheets treat a cell as a live formula. Untrusted
// text (student names, registration numbers uploaded via Excel) is re-emitted
// into exports, so a value like `=HYPERLINK(...)` or `=cmd|...` would execute
// when a staff member opens the file. (ADMIN-HIGH-002)
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

// Neutralises spreadsheet formula injection by prefixing a single quote to any
// string that starts with a formula trigger — Excel then renders it as literal
// text. Non-strings (numbers, dates, null) pass through untouched.
function neutralizeCell(value) {
  if (typeof value === 'string' && value.length > 0 && FORMULA_TRIGGERS.includes(value[0])) {
    return `'${value}`;
  }
  return value;
}

function neutralizeRow(row) {
  const safe = {};
  for (const key of Object.keys(row)) {
    safe[key] = neutralizeCell(row[key]);
  }
  return safe;
}

// Builds a single-sheet workbook with a styled header row (bold white text on
// brand-blue fill) and returns the .xlsx buffer. `columns` follows ExcelJS's
// `sheet.columns` shape: [{ header, key, width }]. `rows` are plain objects
// keyed to match `columns[].key`. Every cell value is neutralised against
// formula injection before being written.
async function buildWorkbook(sheetName, columns, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns;

  sheet.getRow(1).eachCell((cell) => {
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  sheet.getRow(1).height = 22;

  rows.forEach((row) => sheet.addRow(neutralizeRow(row)));

  return workbook.xlsx.writeBuffer();
}

// Sends an .xlsx buffer as a file download with the standard headers.
function sendWorkbook(res, buffer, filename) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

module.exports = { buildWorkbook, sendWorkbook };
