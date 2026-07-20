import { useState, useEffect } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import Breadcrumb from '../../components/Breadcrumb';
import { Table, Th, Td, Tr, EmptyRow, ErrorRow, ErrorBlock } from '../../components/ui/Table';
import { Button, Checkbox } from '@mantine/core';
import { AppSelect, AppTextInput } from '../../components/ui/AppField';
import Badge from '../../components/ui/Badge';
import FormModal from '../../components/ui/FormModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import { CardSkeleton, TableRowSkeleton } from '../../components/ui/Skeleton';
import UploadStudentsDrawer from '../../components/UploadStudentsDrawer';
import StudentDetailsDrawer from '../../components/StudentDetailsDrawer';
import { useDebounce } from '../../hooks/useDebounce';
import {
  useStudents, usePromoteStudent, useDeleteStudent,
  useBulkPromoteStudents, useBulkDeleteStudents,
} from '../../hooks/useStudents';
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
      <AppSelect
        label="Year"
        data={YEAR_OPTIONS}
        value={form.year}
        onChange={(v) => setForm((f) => ({ ...f, year: v }))}
        required
      />
      <AppSelect
        label="Semester"
        data={SEMESTER_OPTIONS}
        value={form.semester}
        onChange={(v) => setForm((f) => ({ ...f, semester: v }))}
        required
        mt="sm"
      />
      <AppTextInput
        mt="sm"
        placeholder="Academic Year e.g. 2025-26 (optional)"
        value={form.academic_year}
        onChange={(e) => setForm((f) => ({ ...f, academic_year: e.target.value }))}
      />
    </FormModal>
  );
}

function BulkPromoteModal({ open, ids, onClose, onDone }) {
  const toast   = useToast();
  const promote = useBulkPromoteStudents();
  const [form, setForm] = useState({ year: '1', semester: '1', academic_year: '' });

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const res = await promote.mutateAsync({
        ids,
        year:          parseInt(form.year, 10),
        semester:      parseInt(form.semester, 10),
        academic_year: form.academic_year || undefined,
      });
      toast({ message: `Promoted ${res.data.updated} student${res.data.updated === 1 ? '' : 's'}.` });
      onDone();
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  return (
    <FormModal
      opened={open}
      onClose={onClose}
      title={`Promote ${ids.length} student${ids.length === 1 ? '' : 's'}`}
      size="sm"
      onSubmit={handleSubmit}
      submitLabel="Promote"
      loading={promote.isPending}
    >
      <AppSelect
        label="Year"
        data={YEAR_OPTIONS}
        value={form.year}
        onChange={(v) => setForm((f) => ({ ...f, year: v }))}
        required
      />
      <AppSelect
        label="Semester"
        data={SEMESTER_OPTIONS}
        value={form.semester}
        onChange={(v) => setForm((f) => ({ ...f, semester: v }))}
        required
        mt="sm"
      />
      <AppTextInput
        mt="sm"
        placeholder="Academic Year e.g. 2025-26 (optional)"
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
  const [filterCourse,  setFilterCourse]  = useState('');
  const [filterYear,    setFilterYear]    = useState('');
  const [showUpload, setShowUpload]       = useState(false);
  const [promoting, setPromoting]         = useState(null);
  const [deleting, setDeleting]           = useState(null);
  const [viewingId, setViewingId]         = useState(null);
  const [selectedIds, setSelectedIds]         = useState(new Set());
  const [showBulkPromote, setShowBulkPromote] = useState(false);
  const [bulkDeleting, setBulkDeleting]       = useState(false);

  const debouncedSearch = useDebounce(search, 500);
  const { data, isLoading, isError, refetch } = useStudents({
    search:  debouncedSearch,
    course:  filterCourse  || undefined,
    year:    filterYear    || undefined,
    page,
    limit:   20,
  });
  const deleteStudent  = useDeleteStudent();
  const bulkDelete     = useBulkDeleteStudents();

  // Selection is page-scoped — clear it whenever the visible row set changes.
  // Feeds a bulk-delete action, so this matters: kept as one effect (rather than
  // clearing inline in each filter setter) because debouncedSearch changes on its
  // own timer, not from a handler. Safe in practice — this clear commits well
  // before the refetched `data` for the new filter/page arrives and could be
  // bulk-acted on.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIds(new Set());
  }, [page, filterCourse, filterYear, debouncedSearch]);

  const pageIds     = (data?.data ?? []).map((s) => s.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someSelected = pageIds.some((id) => selectedIds.has(id));

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function resetFilters() {
    setFilterCourse(''); setFilterYear('');
    setSearch(''); setPage(1);
  }

  async function handleDelete() {
    try {
      await deleteStudent.mutateAsync(deleting.id);
      toast({ message: 'Student permanently deleted.' });
      setDeleting(null);
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
      setDeleting(null);
    }
  }

  async function handleBulkDelete() {
    try {
      const res = await bulkDelete.mutateAsync(Array.from(selectedIds));
      const { deleted, skipped = [] } = res.data;
      const withRecords = skipped.filter((s) => s.reason === 'has disciplinary records').length;
      let message = `Permanently deleted ${deleted} student${deleted === 1 ? '' : 's'}.`;
      if (withRecords > 0) {
        message += ` ${withRecords} skipped — kept for their disciplinary records.`;
      }
      toast({ message, type: withRecords > 0 ? 'info' : 'success' });
      clearSelection();
      setBulkDeleting(false);
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
      setBulkDeleting(false);
    }
  }

  const hasFilters = filterCourse || filterYear || search;

  return (
    <Layout user={user}>
      <Breadcrumb items={[
        { label: 'Admin', href: ROUTES.ADMIN_DASHBOARD },
        { label: 'Students' },
      ]} />
      <PageHeader
        title="Student Management"
        subtitle="Upload Excel to sync student records"
        action={<Button size="md" onClick={() => setShowUpload(true)}>↑ Upload Excel</Button>}
      />

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4 items-center">
        <input
          placeholder="Search name or reg. no…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-[1_1_180px] min-w-40 border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-[7px] text-[16px] bg-[var(--surface-card)]"
        />
        <select
          value={filterCourse}
          onChange={(e) => { setFilterCourse(e.target.value); setPage(1); }}
          className={`border border-[var(--border)] rounded-[var(--radius-md)] px-2.5 py-[7px] text-[16px] bg-[var(--surface-card)] ${filterCourse ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}
        >
          <option value="">All courses</option>
          <option value="b_pharm">B.Pharm</option>
          <option value="pharm_d">Pharm.D</option>
          <option value="m_pharm">M.Pharm</option>
        </select>
        <select
          value={filterYear}
          onChange={(e) => { setFilterYear(e.target.value); setPage(1); }}
          className={`border border-[var(--border)] rounded-[var(--radius-md)] px-2.5 py-[7px] text-[16px] bg-[var(--surface-card)] ${filterYear ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}
        >
          <option value="">All years</option>
          {[1,2,3,4,5,6].map((y) => <option key={y} value={y}>Year {y}</option>)}
        </select>
        {hasFilters && (
          <button onClick={resetFilters} className="text-[12px] text-[var(--text-secondary)] bg-transparent border-0 cursor-pointer px-1.5 py-1 font-[var(--weight-semibold)]">
            Clear
          </button>
        )}
      </div>

      {/* Mobile card list */}
      <div className="md:hidden bg-[var(--surface-card)] rounded-[var(--radius-2xl)] border border-[var(--border)] overflow-hidden mb-4">
        {!isLoading && !isError && data?.data?.length > 0 && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-page)]">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected && !allSelected}
              onChange={toggleSelectAll}
            />
            <span className="text-[length:var(--text-small)] font-[var(--weight-semibold)] text-[var(--text-secondary)]">
              {allSelected ? `All ${pageIds.length} selected` : `Select all (${pageIds.length})`}
            </span>
          </div>
        )}
        {isLoading && Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
        {isError && <ErrorBlock onRetry={refetch} />}
        {!isLoading && !isError && !data?.data?.length && (
          <div className="p-10 text-center text-[var(--text-muted)] text-[length:var(--text-card)]">No students found.</div>
        )}
        {data?.data?.map((s) => (
          <div key={s.id} className="px-4 py-3.5 bg-[var(--surface-card)] border-b border-[var(--border)]">
            <div
              onClick={() => setViewingId(s.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setViewingId(s.id);
                }
              }}
              className="flex items-center justify-between gap-3 cursor-pointer"
            >
              <span onClick={(e) => e.stopPropagation()} className="shrink-0">
                <Checkbox checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[length:var(--text-card-lg)] font-[var(--weight-semibold)] text-[var(--text-primary)] mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                  {s.student_name}
                </p>
                <p className="text-[length:var(--text-small)] text-[var(--text-muted)]">
                  {s.registration_number} · {COURSE_LABELS[s.course] ?? s.course} · Yr {s.year}, Sem {s.semester}
                </p>
              </div>
              <Badge status={s.status} />
            </div>
            <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-[var(--border)]">
              <Button variant="subtle" size="xs" onClick={() => setPromoting(s)}>Promote</Button>
              <Button variant="subtle" size="xs" color="red" onClick={() => setDeleting(s)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onChange={toggleSelectAll}
                />
              </Th>
              <Th>Reg. No.</Th>
              <Th>Name</Th>
              <Th>Course</Th>
              <Th>Year</Th>
              <Th>Semester</Th>
              <Th>Batch</Th>
              <Th>Acad. Year</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 10 }).map((_, i) => <TableRowSkeleton key={i} cols={9} />)}
            {isError && <ErrorRow cols={9} onRetry={refetch} />}
            {!isLoading && !isError && !data?.data?.length && <EmptyRow cols={9} />}
            {data?.data?.map((s) => (
              <Tr key={s.id} onClick={() => setViewingId(s.id)}>
                <Td>
                  <span onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} />
                  </span>
                </Td>
                <Td className="font-mono text-xs">{s.registration_number}</Td>
                <Td className="font-medium text-[var(--text-primary)]">{s.student_name}</Td>
                <Td>{COURSE_LABELS[s.course] ?? s.course}</Td>
                <Td>{s.year}</Td>
                <Td>{s.semester}</Td>
                <Td>{s.batch_year}</Td>
                <Td>{s.academic_year}</Td>
                <Td><Badge status={s.status} /></Td>
                <Td>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button variant="subtle" size="xs" onClick={() => setPromoting(s)}>Promote</Button>
                    <Button variant="subtle" size="xs" color="red" onClick={() => setDeleting(s)}>Delete</Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>

      <div className="mt-4 px-4 py-3 bg-[var(--surface-page)] rounded-[var(--radius-lg)] border border-[var(--border)] flex justify-between items-center">
        <span className="text-[length:var(--text-small)] text-[var(--text-secondary)]">Total students</span>
        <span className="text-[length:var(--text-body)] font-[var(--weight-bold)] text-[var(--text-primary)]">
          {data?.meta?.total ?? 0}
        </span>
      </div>

      <Pagination meta={data?.meta} page={page} onPage={setPage} />
      {selectedIds.size > 0 && <div className="h-16" />}

      {selectedIds.size > 0 && (
        <div className="fixed left-0 right-0 z-40 bottom-[60px] sm:bottom-0 bg-[var(--surface-card)] border-t border-[var(--border)] shadow-[0_-4px_12px_rgba(0,0,0,0.06)] px-4 py-2.5 flex items-center justify-between gap-2.5 flex-wrap">
          <span className="text-[length:var(--text-card)] font-[var(--weight-semibold)] text-[var(--text-primary)]">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2">
            <Button variant="subtle" size="sm" onClick={clearSelection}>Clear</Button>
            <Button variant="light" size="sm" onClick={() => setShowBulkPromote(true)}>Bulk Promote</Button>
            <Button variant="light" color="red" size="sm" onClick={() => setBulkDeleting(true)}>Bulk Delete</Button>
          </div>
        </div>
      )}

      <UploadStudentsDrawer open={showUpload} onClose={() => setShowUpload(false)} />
      <StudentDetailsDrawer studentId={viewingId} onClose={() => setViewingId(null)} />
      {promoting && <PromoteModal open student={promoting} onClose={() => setPromoting(null)} />}
      {deleting && (
        <ConfirmDialog
          open
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          title="Delete Student"
          message={`Are you sure you want to permanently delete ${deleting.student_name}? This action cannot be undone.`}
          confirmText="Delete"
          isDangerous
          isLoading={deleteStudent.isPending}
        />
      )}
      {showBulkPromote && (
        <BulkPromoteModal
          open
          ids={Array.from(selectedIds)}
          onClose={() => setShowBulkPromote(false)}
          onDone={() => { setShowBulkPromote(false); clearSelection(); }}
        />
      )}
      {bulkDeleting && (
        <ConfirmDialog
          open
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDeleting(false)}
          title="Delete Students"
          message={`Are you sure you want to permanently delete the selected ${selectedIds.size} student${selectedIds.size === 1 ? '' : 's'}? This action cannot be undone.`}
          confirmText="Delete"
          isDangerous
          isLoading={bulkDelete.isPending}
        />
      )}
    </Layout>
  );
}
