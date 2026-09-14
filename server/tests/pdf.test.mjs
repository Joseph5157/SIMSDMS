import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const PDFDocument = _require('pdfkit');
const { buildReportPdf } = _require('../lib/pdf');

const COLUMNS = [
  { header: 'A', key: 'a', width: 220 },
  { header: 'B', key: 'b', width: 220 },
];

// Long enough to wrap across several lines at these column widths/font size —
// this is what triggers PDFKit's own unbounded-text auto-pagination if a
// cell's height isn't bounded to the row's reserved box.
const LONG_NAME    = 'Nallala KVS Abhishek Kumar Extended Registration Name Wrap Test';
const LONG_FACULTY = 'Prof Extended Faculty Name Wrap Boundary Test';

// Renders `fillerCount` short single-line rows, then one "poison" row with
// two long wrapping cells, then a handful of trailing rows — while spying on
// PDFDocument so every doc.text() call is tagged with the page it landed on.
async function renderAndTrackPages(fillerCount) {
  let pageIndex = 0;
  const calls = [];
  const origAddPage = PDFDocument.prototype.addPage;
  const origText = PDFDocument.prototype.text;

  PDFDocument.prototype.addPage = function (...args) {
    pageIndex += 1;
    return origAddPage.apply(this, args);
  };
  PDFDocument.prototype.text = function (str, ...rest) {
    calls.push({ page: pageIndex, str: String(str) });
    return origText.apply(this, [str, ...rest]);
  };

  try {
    const rows = [];
    for (let i = 0; i < fillerCount; i++) rows.push({ a: `f${i}`, b: `f${i}` });
    rows.push({ a: LONG_NAME, b: LONG_FACULTY });
    for (let i = 0; i < 5; i++) rows.push({ a: `t${i}`, b: `t${i}` });

    await buildReportPdf({ title: 'Regression fixture', columns: COLUMNS, rows });
  } finally {
    PDFDocument.prototype.addPage = origAddPage;
    PDFDocument.prototype.text = origText;
  }

  return {
    totalPages: pageIndex,
    namePage: calls.find((c) => c.str === LONG_NAME)?.page,
    facultyPage: calls.find((c) => c.str === LONG_FACULTY)?.page,
  };
}

// Regression test for the PDFKit table-pagination bug: a hardcoded row height
// (independent of each cell's real wrapped-text height) let PDFKit's own
// unbounded-text auto-pagination fire mid-row whenever a tall wrapping cell
// started near the page bottom. Subsequent cells in that row were then drawn
// at a stale row-start Y on the page PDFKit had already flipped to, scattering
// one logical row across multiple near-empty pages.
//
// fillerCount=67 was found empirically (see server/.scratch during the fix)
// to land the long-wrapping row exactly on a page boundary at these column
// widths/font — the pre-fix code split it across two pages with an extra
// near-blank page; the fixed code keeps it on one page.
describe('lib/pdf.buildReportPdf — row-atomic pagination', () => {
  it('keeps a long-wrapping row entirely on one page at the page boundary', async () => {
    const result = await renderAndTrackPages(67);

    expect(result.namePage).toBeDefined();
    expect(result.facultyPage).toBeDefined();
    expect(result.namePage).toBe(result.facultyPage);
    expect(result.totalPages).toBe(3);
  });

  it('never lets total pages regress as filler content grows', async () => {
    // The bug also produced non-monotonic page counts (adding one more filler
    // row could *reduce* the page total) because a stray internal page break
    // left the row-tracking Y stuck near the bottom of whatever page PDFKit
    // had already flipped to. Page count must never decrease as rows grow.
    let previous = 0;
    for (let n = 60; n <= 75; n++) {
      const { totalPages } = await renderAndTrackPages(n);
      expect(totalPages).toBeGreaterThanOrEqual(previous);
      previous = totalPages;
    }
  });
});
