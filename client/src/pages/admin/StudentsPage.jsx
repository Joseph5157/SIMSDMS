import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import Breadcrumb from '../../components/Breadcrumb';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import { Button, Select } from '@mantine/core';
import Badge from '../../components/ui/Badge';
import FormModal from '../../components/ui/FormModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import { CardSkeleton, TableRowSkeleton } from '../../components/ui/Skeleton';
import UploadStudentsDrawer from '../../components/UploadStudentsDrawer';
import { useDebounce } from '../../hooks/useDebounce';
import { useStudents, usePromoteStudent, useDeactivateStudent } from '../../hooks/useStudents';
import { ROUTES } from '../../utils/constants';

const COURSE_LABELS = { b_pharm: 'B.Pharm', pharm_d: 'Pharm.D', m_pharm: 'M.Pharm' };

const YEAR_OPTIONS = [
  { value: '1', label: 'Year 1' },
  { value: '2', label: 'Year 2' },
  { value: '3', label: 'Year 3' },
  { value: '4', label: 'Year 4' },
  { value: '5', label: 'Year 5' },
  { value: '6', label: 'Year 6' },
];

const SEMESTER_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Semester ${i + 1}`,
}));

function PromoteModal({ open, student, onClose }) {
  const toast   = useToast();
  const promote = usePromoteStudent();
  const [form, setForm] = useState({
    year:          String(student?.year ?? 1),
    semester:      String(student?.semester ?? 1),
    academic_year: '',
  });

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await promote.mutateAsync({
        id:            student.id,
        year:          parseInt(form.year, 10),
        semester:      parseInt(form.semester, 10),
        academic_year: form.academic_year || undefined,
      });
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
      <Select
        label="Year"
        data={YEAR_OPTIONS}
        value={form.year}
        onChange={(v) => setForm((f) => ({ ...f, year: v }))}
        required
      />
      <Select
        label="Semester"
        data={SEMESTER_OPTIONS}
        value={form.semester}
        onChange={(v) => setForm((f) => ({ ...f, semester: v }))}
        required
        mt="sm"
      />
      <input
        placeholder="Academic Year e.g. 2025-26 (optional)"
        value={form.academic_year}
        onChange={(e) => setForm((f) => ({ ...f, academic_year: e.target.value }))}
        style={{
          marginTop: 12, width: '100%', padding: '8px 12px',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          fontSize: 13, outline: 'none',
        }}
      />
    </FormModal>
  );
}

export default function StudentsPage({ user }) {
  const toast = useToast();
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [filterCourse,  setFilterCourse]  = useState('');
  const [filterYear,    setFilterYear]    = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [showUpload, setShowUpload]       = useState(false);
  const [promoting, setPromoting]         = useState(null);
  const [deactivating, setDeactivating]   = useState(null);

  const debouncedSearch = useDebounce(search, 500);
  const { data, isLoading } = useStudents({
    search:  debouncedSearch,
    course:  filterCourse  || undefined,
    year:    filterYear    || undefined,
    section: filterSection || undefined,
    page,
    limit:   20,
  });
  const deactivate = useDeactivateStudent();

  function resetFilters() {
    setFilterCourse(''); setFilterYear(''); setFilterSection('');
    setSearch(''); setPage(1);
  }

  async function handleDeactivate() {
    try {
      await deactivate.mutateAsync(deactivating.id);
      toast({ message: 'Student deactivated.' });
      setDeactivating(null);
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  const hasFilters = filterCourse || filterYear || filterSection || search;

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

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <input
          placeholder="Search name or reg. no…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{
            flex: '1 1 180px', minWidth: 160,
            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
            padding: '7px 12px', fontSize: 13, outline: 'none',
            backgroundColor: 'var(--surface-card)',
          }}
        />
        <select
          value={filterCourse}
          onChange={(e) => { setFilterCourse(e.target.value); setPage(1); }}
          style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '7px 10px', fontSize: 13, backgroundColor: 'var(--surface-card)', color: filterCourse ? 'var(--text-primary)' : 'var(--text-muted)' }}
        >
          <option value="">All courses</option>
          <option value="b_pharm">B.Pharm</option>
          <option value="pharm_d">Pharm.D</option>
          <option value="m_pharm">M.Pharm</option>
        </select>
        <select
          value={filterYear}
          onChange={(e) => { setFilterYear(e.target.value); setPage(1); }}
          style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '7px 10px', fontSize: 13, backgroundColor: 'var(--surface-card)', color: filterYear ? 'var(--text-primary)' : 'var(--text-muted)' }}
        >
          <option value="">All years</option>
          {[1,2,3,4,5,6].map((y) => <option key={y} value={y}>Year {y}</option>)}
        </select>
        <select
          value={filterSection}
          onChange={(e) => { setFilterSection(e.target.value); setPage(1); }}
          style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '7px 10px', fontSize: 13, backgroundColor: 'var(--surface-card)', color: filterSection ? 'var(--text-primary)' : 'var(--text-muted)' }}
        >
          <option value="">All sections</option>
          {['A','B','C','D'].map((s) => <option key={s} value={s}>Section {s}</option>)}
        </select>
        {hasFilters && (
          <button onClick={resetFilters} style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', fontWeight: 600 }}>
            Clear
          </button>
        )}
      </div>

      {/* Mobile card list */}
      <div className="md:hidden" style={{ backgroundColor: 'var(--surface-card)', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
        {isLoading && Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
        {!isLoading && !data?.data?.length && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-card)' }}>No students found.</div>
        )}
        {data?.data?.map((s) => (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', backgroundColor: 'var(--surface-card)',
            borderBottom: '1px solid var(--border)', gap: 12,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 'var(--text-card-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.student_name}
              </p>
              <p style={{ fontSize: 'var(--text-small)', color: 'var(--text-muted)' }}>
                {s.registration_number} · {COURSE_LABELS[s.course] ?? s.course} · Yr {s.year} Sem {s.semester}{s.section ? ` · ${s.section}` : ''}
              </p>
            </div>
            <Badge status={s.status} />
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Reg. No.</Th>
              <Th>Name</Th>
              <Th>Course</Th>
              <Th>Yr / Sem</Th>
              <Th>Section</Th>
              <Th>Batch</Th>
              <Th>Acad. Year</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 10 }).map((_, i) => <TableRowSkeleton key={i} cols={9} />)}
            {!isLoading && !data?.data?.length && <EmptyRow cols={9} />}
            {data?.data?.map((s) => (
              <tr key={s.id}>
                <Td className="font-mono text-xs">{s.registration_number}</Td>
                <Td className="font-medium text-[var(--text-primary)]">{s.student_name}</Td>
                <Td>{COURSE_LABELS[s.course] ?? s.course}</Td>
                <Td>{s.year} / {s.semester}</Td>
                <Td>{s.section ?? '—'}</Td>
                <Td>{s.batch_year}</Td>
                <Td>{s.academic_year}</Td>
                <Td><Badge status={s.status} /></Td>
                <Td>
                  <div className="flex gap-2">
                    <Button variant="subtle" size="xs" onClick={() => setPromoting(s)}>Promote</Button>
                    {s.status === 'active' && (
                      <Button variant="subtle" size="xs" color="red" onClick={() => setDeactivating(s)}>Deactivate</Button>
                    )}
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
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>Total students</span>
        <span style={{ fontSize: 'var(--text-body)', fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)' }}>
          {data?.meta?.total ?? 0}
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
          message={`Are you sure you want to deactivate ${deactivating.student_name}?`}
          confirmText="Deactivate"
          isDangerous
          isLoading={deactivate.isPending}
        />
      )}
    </Layout>
  );
}
