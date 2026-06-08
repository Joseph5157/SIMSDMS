import { useState, useRef } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input, { Select } from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import { useStudents, useUploadStudents, useUploadLogs, usePromoteStudent, useDeactivateStudent } from '../../hooks/useStudents';

function UploadModal({ open, onClose }) {
  const toast = useToast();
  const upload = useUploadStudents();
  const fileRef = useRef();
  const [result, setResult] = useState(null);

  async function handleUpload(e) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    try {
      const res = await upload.mutateAsync(file);
      setResult(res.data);
      toast({ message: `Upload complete: ${res.data.added_count} added, ${res.data.updated_count} updated, ${res.data.deactivated_count} deactivated.` });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Upload failed.', type: 'error' });
    }
  }

  return (
    <Modal open={open} onClose={() => { onClose(); setResult(null); }} title="Upload Students (Excel)">
      <form onSubmit={handleUpload} className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">File must be <strong>.xlsx</strong>. Required columns: Registration Number, Student Name, Course, Semester/Year, Academic Year, Institution.</p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="text-sm" required />
        {result && (
          <div className="bg-green-50 rounded-lg p-3 text-sm text-green-800 space-y-1">
            <p>Added: {result.added_count} | Updated: {result.updated_count} | Deactivated: {result.deactivated_count}</p>
            {result.error_count > 0 && <p className="text-red-600">Errors: {result.error_count} rows skipped.</p>}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Close</Button>
          <Button type="submit" loading={upload.isPending}>Upload</Button>
        </div>
      </form>
    </Modal>
  );
}

function PromoteModal({ open, student, onClose }) {
  const toast = useToast();
  const promote = usePromoteStudent();
  const [form, setForm] = useState({ semester_or_year: '', academic_year: '' });

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await promote.mutateAsync({ id: student.id, ...form });
      toast({ message: 'Student promoted.' });
      onClose();
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Promote — ${student?.student_name}`} size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="New Semester / Year" value={form.semester_or_year} onChange={(e) => setForm((f) => ({ ...f, semester_or_year: e.target.value }))} required />
        <Input label="Academic Year (e.g. 2025-26)" value={form.academic_year} onChange={(e) => setForm((f) => ({ ...f, academic_year: e.target.value }))} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={promote.isPending}>Promote</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function StudentsPage({ user }) {
  const toast = useToast();
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload]   = useState(false);
  const [promoting, setPromoting]     = useState(null);

  const { data, isLoading } = useStudents({ search, page, limit: 20 });
  const deactivate = useDeactivateStudent();

  async function handleDeactivate(s) {
    if (!confirm(`Deactivate ${s.student_name}?`)) return;
    try {
      await deactivate.mutateAsync(s.id);
      toast({ message: 'Student deactivated.' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  return (
    <Layout user={user}>
      <PageHeader
        title="Student Management"
        subtitle="Upload Excel to sync student records"
        action={<Button onClick={() => setShowUpload(true)}>↑ Upload Excel</Button>}
      />
      <div className="mb-4">
        <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search by name or reg. number…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <Table>
        <thead><tr><Th>Reg. No.</Th><Th>Name</Th><Th className="hidden sm:table-cell">Course</Th><Th>Semester/Year</Th><Th className="hidden sm:table-cell">Acad. Year</Th><Th>Status</Th><Th /></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading && <EmptyRow cols={7} message="Loading…" />}
          {!isLoading && !data?.data?.length && <EmptyRow cols={7} />}
          {data?.data?.map((s) => (
            <tr key={s.id}>
              <Td className="font-mono text-xs">{s.registration_number}</Td>
              <Td className="font-medium text-gray-900">{s.student_name}</Td>
              <Td className="hidden sm:table-cell">{s.course}</Td>
              <Td>{s.semester_or_year}</Td>
              <Td className="hidden sm:table-cell">{s.academic_year}</Td>
              <Td><Badge status={s.status} /></Td>
              <Td>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setPromoting(s)}>Promote</Button>
                  {s.status === 'active' && <Button variant="ghost" size="sm" onClick={() => handleDeactivate(s)}>Deactivate</Button>}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination meta={data?.meta} page={page} onPage={setPage} />
      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} />
      {promoting && <PromoteModal open student={promoting} onClose={() => setPromoting(null)} />}
    </Layout>
  );
}
