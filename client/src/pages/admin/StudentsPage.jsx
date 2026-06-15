import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import Breadcrumb from '../../components/Breadcrumb';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import { Button, TextInput } from '@mantine/core';
import Badge from '../../components/ui/Badge';
import FormModal from '../../components/ui/FormModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import Skeleton, { CardSkeleton, TableRowSkeleton } from '../../components/ui/Skeleton';
import UploadStudentsDrawer from '../../components/UploadStudentsDrawer';
import { useDebounce } from '../../hooks/useDebounce';
import { useStudents, usePromoteStudent, useDeactivateStudent } from '../../hooks/useStudents';
import { ROUTES } from '../../utils/constants';

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
    <FormModal
      opened={open}
      onClose={onClose}
      title={`Promote — ${student?.student_name}`}
      size="sm"
      onSubmit={handleSubmit}
      submitLabel="Promote"
      loading={promote.isPending}
    >
      <TextInput
        label="New Semester / Year"
        value={form.semester_or_year}
        onChange={(e) => setForm((f) => ({ ...f, semester_or_year: e.target.value }))}
        required
      />
      <TextInput
        label="Academic Year (e.g. 2025-26)"
        value={form.academic_year}
        onChange={(e) => setForm((f) => ({ ...f, academic_year: e.target.value }))}
      />
    </FormModal>
  );
}

export default function StudentsPage({ user }) {
  const toast = useToast();
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload]     = useState(false);
  const [promoting, setPromoting]       = useState(null);
  const [deactivating, setDeactivating] = useState(null);

  const debouncedSearch = useDebounce(search, 500);
  const { data, isLoading } = useStudents({ search: debouncedSearch, page, limit: 20 });
  const deactivate = useDeactivateStudent();

  async function handleDeactivate() {
    try {
      await deactivate.mutateAsync(deactivating.id);
      toast({ message: 'Student deactivated.' });
      setDeactivating(null);
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  return (
    <Layout user={user}>
      <Breadcrumb items={[
        { label: 'Admin', href: ROUTES.ADMIN_DASHBOARD },
        { label: 'Students' },
      ]} />
      <PageHeader
        title="Student Management"
        subtitle="Upload Excel to sync student records"
        action={<Button size="sm" onClick={() => setShowUpload(true)}>↑ Upload Excel</Button>}
      />
      <div className="mb-4">
        <input className="border border-slate-200 rounded-lg px-3 py-2 text-[13px] w-80 outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15 bg-white placeholder:text-slate-400"
          placeholder="Search by name or reg. number…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {/* Mobile card list */}
      <div className="md:hidden" style={{ backgroundColor: 'var(--surface-card)', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
        {isLoading && (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}
        {!isLoading && !data?.data?.length && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-card)' }}>No students found.</div>}
        {data?.data?.map((s) => (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', backgroundColor: 'var(--surface-card)',
            borderBottom: '1px solid var(--divider)', gap: 12,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 'var(--text-card-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', marginBottom: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.student_name}
              </p>
              <p style={{ fontSize: 'var(--text-small)', color: 'var(--text-muted)' }}>{s.registration_number} • {s.semester_or_year}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <Badge status={s.status} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Reg. No.</Th><Th>Name</Th><Th className="hidden sm:table-cell">Course</Th>
              <Th>Semester/Year</Th><Th className="hidden sm:table-cell">Acad. Year</Th>
              <Th>Status</Th><Th />
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 10 }).map((_, i) => (
              <TableRowSkeleton key={i} cols={7} />
            ))}
            {!isLoading && !data?.data?.length && <EmptyRow cols={7} />}
            {data?.data?.map((s) => (
              <tr key={s.id}>
                <Td className="font-mono text-xs">{s.registration_number}</Td>
                <Td className="font-medium text-slate-900">{s.student_name}</Td>
                <Td className="hidden sm:table-cell">{s.course}</Td>
                <Td>{s.semester_or_year}</Td>
                <Td className="hidden sm:table-cell">{s.academic_year}</Td>
                <Td><Badge status={s.status} /></Td>
                <Td>
                  <div className="flex gap-2">
                    <Button variant="subtle" size="xs" onClick={() => setPromoting(s)}>Promote</Button>
                    {s.status === 'active' && <Button variant="subtle" size="xs" onClick={() => setDeactivating(s)}>Deactivate</Button>}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <div style={{
        marginTop: 16, padding: '12px 16px',
        backgroundColor: 'var(--surface-page)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          Total students
        </span>
        <span style={{ fontSize: 'var(--text-body)', fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)' }}>
          {data?.meta?.total ?? data?.data?.length ?? 0}
        </span>
      </div>

      <Pagination meta={data?.meta} page={page} onPage={setPage} />
      <UploadStudentsDrawer open={showUpload} onClose={() => setShowUpload(false)} />
      {promoting && <PromoteModal open student={promoting} onClose={() => setPromoting(null)} />}
      {deactivating && (
        <ConfirmDialog
          open
          onConfirm={handleDeactivate}
          onCancel={() => setDeactivating(null)}
          title="Deactivate Student"
          message={`Are you sure you want to deactivate ${deactivating.student_name}? This action cannot be undone.`}
          confirmText="Deactivate"
          isDangerous
          isLoading={deactivate.isPending}
        />
      )}
    </Layout>
  );
}
