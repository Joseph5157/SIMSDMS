import api from './api';

// Fetches a report export (Excel/PDF) as a blob and triggers a browser save.
// Shared by every report card's download button — endpoint/params/filename
// differ per report, so those are still built by the caller.
export async function downloadReportFile({ endpoint, params, filename, format }) {
  const res = await api.get(endpoint, { params, responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
  a.click();
  URL.revokeObjectURL(url);
}
