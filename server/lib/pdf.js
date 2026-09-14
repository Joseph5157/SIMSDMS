const path = require('path');
const PDFDocument = require('pdfkit');
const { INSTITUTION_NAME } = require('./branding');

const BRAND_BLUE = '#2563EB';
const ROW_ALT    = '#EFF6FF';
const TEXT_MUTED = '#64748B';
const TEXT_DARK  = '#0F172A';
// Same asset as client/src/assets/sims-logo.png — duplicated here rather than
// reached across the workspace boundary, so the server owns its own PDF
// branding assets independent of the client build.
const LOGO_PATH   = path.join(__dirname, '../assets/sims-logo.png');
const LOGO_HEIGHT = 42;

// Builds a simple tabular report PDF (title + generated-date header, an
// optional summary key/value block, then a table) and returns a Buffer.
// `columns`: [{ header, key, width? }] — widths are proportional shares of
// the printable page width; omitted widths split the remainder evenly.
// `summary`: [{ label, value }] — rendered as a key/value block above the table.
function buildReportPdf({ title, subtitle, summary = [], columns, rows }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // ── Header ──────────────────────────────────────────────────────────────
    doc.image(LOGO_PATH, doc.page.margins.left, doc.y, { fit: [pageWidth, LOGO_HEIGHT], align: 'center' });
    doc.y += LOGO_HEIGHT + 6;
    doc.fontSize(16).font('Helvetica-Bold').fillColor(TEXT_DARK).text(INSTITUTION_NAME.toUpperCase(), { align: 'center' });
    doc.fontSize(13).text(title, { align: 'center' });
    doc.fontSize(9).font('Helvetica').fillColor(TEXT_MUTED)
      .text(`${subtitle ? subtitle + ' · ' : ''}Generated ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'center' });
    doc.moveDown(1);

    // ── Summary block ───────────────────────────────────────────────────────
    if (summary.length > 0) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT_DARK).text('Summary');
      doc.font('Helvetica').fontSize(9.5).fillColor(TEXT_DARK);
      for (const { label, value } of summary) {
        doc.text(`${label}: ${value}`);
      }
      doc.moveDown(1);
    }

    // ── Table ───────────────────────────────────────────────────────────────
    const explicitWidth = columns.reduce((sum, c) => sum + (c.width ?? 0), 0);
    const unsizedCount   = columns.filter((c) => !c.width).length;
    const remaining      = Math.max(0, pageWidth - explicitWidth);
    const fallbackWidth  = unsizedCount > 0 ? remaining / unsizedCount : 0;
    const colWidths = columns.map((c) => c.width ?? fallbackWidth);
    const cellTextWidths = colWidths.map((w) => Math.max(0, w - 8));

    const left     = doc.page.margins.left;
    const minRowH  = 20;
    const cellVPad = 6; // top padding; mirrored below the text when sizing the row
    let   y        = doc.y;

    // Wrapped-text height for one cell at the column's actual text width, under
    // whichever font/size is active on `doc` right now (header vs. body).
    function cellTextHeight(value, colIndex) {
      return doc.heightOfString(String(value ?? ''), { width: cellTextWidths[colIndex] });
    }

    // Tallest wrapped cell in the row, so the whole row reserves one shared
    // height — no cell may be taller than what the row was paginated for.
    function rowHeightFor(values) {
      return Math.max(minRowH, ...values.map((v, i) => cellTextHeight(v, i) + cellVPad * 2));
    }

    function drawRow(values, { rowHeight, bg, color, font }) {
      if (bg) doc.rect(left, y, pageWidth, rowHeight).fill(bg);
      let x = left;
      doc.font(font).fontSize(8.5).fillColor(color);
      values.forEach((value, i) => {
        // `height` bounds each cell to the row's own box: PDFKit clips/ellipsizes
        // inside it instead of auto-paginating mid-cell on tall wrapped text.
        doc.text(String(value ?? ''), x + 4, y + cellVPad, {
          width: cellTextWidths[i],
          height: rowHeight - cellVPad * 2,
          ellipsis: true,
        });
        x += colWidths[i];
      });
      y += rowHeight;
    }

    function drawHeaderRow() {
      doc.font('Helvetica-Bold').fontSize(8.5);
      const headers = columns.map((c) => c.header);
      const rowHeight = rowHeightFor(headers);
      drawRow(headers, { rowHeight, bg: BRAND_BLUE, color: '#FFFFFF', font: 'Helvetica-Bold' });
    }

    drawHeaderRow();

    rows.forEach((row, idx) => {
      doc.font('Helvetica').fontSize(8.5);
      const values = columns.map((c) => row[c.key] ?? '');
      const rowHeight = rowHeightFor(values);

      // Whole-row pagination check: if the tallest wrapped cell wouldn't fit,
      // start a fresh page (with a redrawn header) before drawing any cell —
      // never let an individual cell decide this on its own mid-row.
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeaderRow();
        doc.font('Helvetica').fontSize(8.5);
      }

      drawRow(values, { rowHeight, bg: idx % 2 === 1 ? ROW_ALT : null, color: TEXT_DARK, font: 'Helvetica' });
    });

    doc.end();
  });
}

function sendPdf(res, buffer, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

module.exports = { buildReportPdf, sendPdf };
