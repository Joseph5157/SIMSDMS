import { useState } from 'react';
import { Drawer } from 'vaul';
import { X, FileText } from 'lucide-react';
import { useUploadStudents } from '../hooks/useStudents';
import { useToast } from './ui/Toast';

const REQUIRED_COLUMNS = [
  { name: 'Registration Number', note: 'unique student ID' },
  { name: 'Student Name',        note: null },
  { name: 'Course',              note: 'b_pharm / pharm_d / m_pharm' },
  { name: 'Year',                note: '1–6' },
  { name: 'Semester',            note: '1–12' },
  { name: 'Batch Year',          note: 'e.g. 2023' },
  { name: 'Academic Year',       note: 'e.g. 2025-26' },
];

const OPTIONAL_COLUMNS = [
  { name: 'Section', note: 'A / B / C' },
  { name: 'Gender',  note: 'male / female / other' },
  { name: 'Phone',   note: 'for notifications' },
];

export default function UploadStudentsDrawer({ open, onClose }) {
  const toast = useToast();
  const upload = useUploadStudents();
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  function handleFileChange(e) {
    setFile(e.target.files[0] || null);
  }

  async function handleUpload() {
    if (!file) return;
    try {
      const res = await upload.mutateAsync(file);
      setResult(res.data);
      toast({ message: `Upload complete: ${res.data.added_count} added, ${res.data.updated_count} updated, ${res.data.deactivated_count} deactivated.` });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Upload failed.', type: 'error' });
    }
  }

  function handleClose() {
    setFile(null);
    setResult(null);
    onClose();
  }

  return (
    <Drawer.Root open={open} onOpenChange={(v) => !v && handleClose()} shouldScaleBackground>
      <Drawer.Portal>
        <Drawer.Overlay style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
          zIndex: 39,
        }} />
        <Drawer.Content style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 40,
          backgroundColor: '#fff',
          borderRadius: '20px 20px 0 0',
          maxHeight: '94vh',
          display: 'flex', flexDirection: 'column',
          outline: 'none',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        }}>
          {/* Drag handle */}
          <div style={{
            width: 36, height: 4,
            backgroundColor: '#e2e8f0', borderRadius: 2,
            margin: '12px auto 0', flexShrink: 0,
          }} />

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px 12px',
            borderBottom: '1px solid #f1f5f9', flexShrink: 0,
          }}>
            <div>
              <Drawer.Title style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Upload students
              </Drawer.Title>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>
                Excel .xlsx — syncs and replaces current records
              </p>
            </div>
            <button onClick={handleClose} style={{
              width: 32, height: 32, borderRadius: 10,
              border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#64748b',
            }}>
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
            <div style={{ padding: '16px 20px 8px' }}>

              {/* Required columns */}
              <p style={{
                fontSize: 10, fontWeight: 800, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10,
              }}>Required columns</p>
              <div style={{
                backgroundColor: '#f0f9ff', border: '1px solid #bae6fd',
                borderRadius: 12, padding: '12px 14px', marginBottom: 12,
              }}>
                {REQUIRED_COLUMNS.map((col, i) => (
                  <div key={col.name} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: i > 0 ? 6 : 0 }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#0ea5e9', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#0369a1', fontWeight: 600 }}>{col.name}</span>
                    {col.note && <span style={{ fontSize: 11, color: '#64748b' }}>— {col.note}</span>}
                  </div>
                ))}
              </div>

              {/* Optional columns */}
              <p style={{
                fontSize: 10, fontWeight: 800, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10,
              }}>Optional columns</p>
              <div style={{
                backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 12, padding: '12px 14px', marginBottom: 20,
              }}>
                {OPTIONAL_COLUMNS.map((col, i) => (
                  <div key={col.name} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: i > 0 ? 6 : 0 }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#94a3b8', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{col.name}</span>
                    {col.note && <span style={{ fontSize: 11, color: '#94a3b8' }}>— {col.note}</span>}
                  </div>
                ))}
              </div>

              {/* File picker */}
              <p style={{
                fontSize: 10, fontWeight: 800, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10,
              }}>File</p>
              <label style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 8,
                width: '100%', minHeight: 100,
                border: `2px dashed ${file ? '#3b82f6' : '#cbd5e1'}`,
                borderRadius: 14,
                backgroundColor: file ? '#eff6ff' : '#f8fafc',
                cursor: 'pointer',
                padding: '16px 20px',
                boxSizing: 'border-box',
                transition: 'all 0.15s',
                marginBottom: 20,
              }}>
                <FileText size={22} strokeWidth={1.5} color={file ? '#3b82f6' : '#94a3b8'} />
                <span style={{
                  fontSize: 13, fontWeight: 600, textAlign: 'center',
                  color: file ? '#2563eb' : '#64748b',
                }}>
                  {file ? file.name : 'Tap to choose file'}
                </span>
                {!file && (
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Excel workbook (.xlsx or .xls)</span>
                )}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>

              {/* Result */}
              {result && (
                <div style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 12,
                  padding: '12px 14px',
                  marginBottom: 20,
                }}>
                  <p style={{ fontSize: 13, color: '#15803d', fontWeight: 600, marginBottom: 4 }}>
                    Upload complete
                  </p>
                  <p style={{ fontSize: 12, color: '#166534' }}>
                    Added: {result.added_count} · Updated: {result.updated_count} · Deactivated: {result.deactivated_count}
                  </p>
                  {result.error_count > 0 && (
                    <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>
                      {result.error_count} rows skipped due to errors.
                    </p>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Sticky footer */}
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex', gap: 10,
            flexShrink: 0,
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
            backgroundColor: '#fff',
          }}>
            <button type="button" onClick={handleClose} style={{
              flex: 1, height: 48, borderRadius: 14,
              border: '1.5px solid #e2e8f0', backgroundColor: '#f8fafc',
              fontSize: 14, fontWeight: 700, color: '#475569', cursor: 'pointer',
            }}>Close</button>
            <button
              disabled={upload.isPending || !file}
              onClick={handleUpload}
              style={{
                flex: 2, height: 48, borderRadius: 14, border: 'none',
                background: (upload.isPending || !file)
                  ? '#93c5fd'
                  : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                fontSize: 14, fontWeight: 700, color: '#fff',
                cursor: upload.isPending ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                transition: 'all 0.15s',
              }}
            >
              {upload.isPending && (
                <span style={{
                  width: 14, height: 14,
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
              )}
              {upload.isPending ? 'Uploading…' : 'Upload'}
            </button>
          </div>

        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
