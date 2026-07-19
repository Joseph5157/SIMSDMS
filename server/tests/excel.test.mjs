import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const ExcelJS = _require('exceljs');
const { buildWorkbook } = _require('../lib/excel');

const COLUMNS = [
  { header: 'Name', key: 'name', width: 20 },
  { header: 'Reg',  key: 'reg',  width: 20 },
  { header: 'Count', key: 'count', width: 10 },
];

async function readBack(rows) {
  const buffer = await buildWorkbook('Sheet', COLUMNS, rows);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.worksheets[0];
  // Row 1 is the header; data starts at row 2.
  return sheet.getRow(2);
}

// buildWorkbook must neutralise spreadsheet formula injection: any string cell
// starting with = + - @ (or tab/CR) is prefixed with a single quote so Excel
// renders it as literal text. (ADMIN-HIGH-002)
describe('excel.buildWorkbook — formula injection neutralisation', () => {
  it('prefixes a leading = with a quote', async () => {
    const row = await readBack([{ name: '=HYPERLINK("http://evil","x")', reg: 'R1', count: 1 }]);
    expect(row.getCell(1).value).toBe('\'=HYPERLINK("http://evil","x")');
  });

  it('neutralises + - @ leading characters too', async () => {
    const row = await readBack([{ name: '+1', reg: '-2', count: 3 }]);
    expect(row.getCell(1).value).toBe("'+1");
    expect(row.getCell(2).value).toBe("'-2");
  });

  it('leaves ordinary strings and numbers untouched', async () => {
    const row = await readBack([{ name: 'Jane Doe', reg: 'SIMS-2026-001', count: 5 }]);
    expect(row.getCell(1).value).toBe('Jane Doe');
    expect(row.getCell(2).value).toBe('SIMS-2026-001');
    expect(row.getCell(3).value).toBe(5);
  });
});
