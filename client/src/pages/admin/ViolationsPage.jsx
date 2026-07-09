import { useState, useMemo } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow, ErrorRow, ErrorBlock } from '../../components/ui/Table';
import { Button, TextInput, Select, Modal } from '@mantine/core';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import FormModal from '../../components/ui/FormModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import { useViolations, useHideViolation, useResolveFlag, useViolationAuditLog } from '../../hooks/useViolations';
import { useUsers } from '../../hooks/useUsers';
import {
  useAnalyticsSummary,
  useViolationTypeAnalysis,
  useRepeatViolators,
  useAnalyticsFilterOptions,
} from '../../hooks/useAnalytics';
import Breadcrumb from '../../components/Breadcrumb';

const COURSE_LABELS = { b_pharm: 'B.Pharm', pharm_d: 'Pharm.D', m_pharm: 'M.Pharm' };

const selectCls = 'border border-[var(--border)] rounded-lg px-3 py-2 outline-none focus:border-[var(--brand)] bg-[var(--surface-card)] text-[var(--text-secondary)] text-[length:13px]';

const RANGE_OPTIONS = [
  { value: 'this_week',  label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom',     label: 'Custom Range' },
];

function DisciplineAnalytics() {
  const [range, setRange]           = useState('this_month');
  const [fromDate, setFromDate]     = useState('');
  const [toDate, setToDate]         = useState('');
  const [course, setCourse]         = useState('');
  const [year, setYear]             = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [violationTypeId, setViolationTypeId] = useState('');

  const params = useMemo(() => ({
    range,
    ...(range === 'custom' && fromDate && toDate ? { from_date: fromDate, to_date: toDate } : {}),
    ...(course ? { course } : {}),
    ...(year ? { year } : {}),
    ...(academicYear ? { academic_year: academicYear } : {}),
    ...(violationTypeId ? { violation_type_id: violationTypeId } : {}),
  }), [range, fromDate, toDate, course, year, academicYear, violationTypeId]);

  const { data: filterOptions }  = useAnalyticsFilterOptions();
  const { data: summary }        = useAnalyticsSummary(params);
  const { data: typeAnalysis }   = useViolationTypeAnalysis(params);
  const { data: repeatData }     = useRepeatViolators(params);

  const maxTypeCount = Math.max(1, ...(typeAnalysis?.data?.map((t) => t.count) ?? [0]));

  return (
    <div className="mb-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Violations"  value={summary?.total_violations ?? 0}  sub="Selected period" accent="blue" />
        <StatCard label="Students Affected" value={summary?.students_affected ?? 0} sub="Unique students" accent="indigo" />
        <StatCard label="Repeat Violators"  value={summary?.repeat_violators_count ?? 0} sub="Need counselling" accent="red" />
        <StatCard
          label="Most Common"
          value={summary?.most_common?.type ?? '—'}
          sub={summary?.most_common ? `${summary.most_common.count} cases` : 'No data'}
          accent="yellow"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={range} onChange={(e) => setRange(e.target.value)} className={selectCls}>
          {RANGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {range === 'custom' && (
          <>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={selectCls} />
            <input type="date" value={toDate}   onChange={(e) => setToDate(e.target.value)}   className={selectCls} />
          </>
        )}
        <select value={course} onChange={(e) => setCourse(e.target.value)} className={selectCls}>
          <option value="">All Courses</option>
          {filterOptions?.courses?.map((c) => <option key={c} value={c}>{COURSE_LABELS[c] ?? c}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} className={selectCls}>
          <option value="">All Years</option>
          {filterOptions?.years?.map((y) => <option key={y} value={y}>Year {y}</option>)}
        </select>
        <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={selectCls}>
          <option value="">All Academic Years</option>
          {filterOptions?.academic_years?.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={violationTypeId} onChange={(e) => setViolationTypeId(e.target.value)} className={selectCls}>
          <option value="">All Violation Types</option>
          {filterOptions?.violation_types?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Violation type breakdown */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)] p-4">
          <p className="text-[length:13px] font-semibold text-[var(--text-primary)] mb-3">Violation Type Breakdown</p>
          {!typeAnalysis?.data?.length && (
            <p className="text-[length:13px] text-[var(--text-muted)] py-4 text-center">No violations in this period.</p>
          )}
          <div className="space-y-2">
            {typeAnalysis?.data?.map((t) => (
              <div key={t.violation_type_id} className="flex items-center gap-2">
                <span className="text-[length:12px] text-[var(--text-secondary)] w-28 shrink-0 truncate">{t.name}</span>
                <div className="flex-1 h-4 rounded bg-[var(--surface-page)] overflow-hidden">
                  <div
                    className="h-full rounded bg-[var(--brand)]"
                    style={{ width: `${(t.count / maxTypeCount) * 100}%` }}
                  />
                </div>
                <span className="text-[length:12px] font-semibold text-[var(--text-primary)] w-8 text-right shrink-0">{t.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Repeat violators / counselling table */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)] p-4 overflow-x-auto">
          <p className="text-[length:13px] font-semibold text-[var(--text-primary)] mb-3">
            Students Requiring Counselling
            {repeatData?.threshold != null && <span className="font-normal text-[var(--text-muted)]"> (&gt;{repeatData.threshold} violations)</span>}
          </p>
          {!repeatData?.data?.length ? (
            <p className="text-[length:13px] text-[var(--text-muted)] py-4 text-center">No repeat violators in this period.</p>
          ) : (
            <table className="w-full text-[length:12px]">
              <thead>
                <tr className="text-left text-[var(--text-muted)] border-b border-[var(--divider)]">
                  <th className="pb-1.5 pr-3 font-medium">Student</th>
                  <th className="pb-1.5 pr-3 font-medium">Course</th>
                  <th className="pb-1.5 pr-3 font-medium">Year</th>
                  <th className="pb-1.5 pr-3 font-medium text-right">Count</th>
                  <th className="pb-1.5 font-medium">Main Issue</th>
                </tr>
              </thead>
              <tbody>
                {repeatData.data.map((s) => (
                  <tr key={s.student_id} className="border-b border-[var(--divider)] last:border-b-0">
                    <td className="py-1.5 pr-3">
                      <p className="font-medium text-[var(--text-primary)]">{s.student_name}</p>
                      <p className="text-[length:11px] text-[var(--text-muted)]">{s.registration_number}</p>
                    </td>
                    <td className="py-1.5 pr-3 text-[var(--text-secondary)]">{COURSE_LABELS[s.course] ?? s.course}</td>
                    <td className="py-1.5 pr-3 text-[var(--text-secondary)]">{s.year}</td>
                    <td className="py-1.5 pr-3 text-right font-semibold text-[var(--color-red-600)]">{s.violation_count}</td>
                    <td className="py-1.5 text-[var(--text-secondary)]">{s.main_issue ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function ResolveFlagModal({ violation, onClose }) {
  const toast = useToast();
  const resolve = useResolveFlag();
  const [reason, setReason] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await resolve.mutateAsync({ id: violation.id, reason });
      toast({ message: 'Flag resolved.' });
      onClose();
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  return (
    <FormModal
      opened={!!violation}
      onClose={onClose}
      title="Resolve Flag"
      size="sm"
      onSubmit={handleSubmit}
      submitLabel="Resolve"
      loading={resolve.isPending}
    >
      <div className="text-[length:13px] text-[var(--text-secondary)] rounded-lg p-3"
        style={{ backgroundColor: 'var(--color-amber-bg)', border: '1px solid var(--color-amber-border)' }}>
        <strong>Flag note:</strong> {violation?.flag_note}
      </div>
      <TextInput
        label="Resolution note"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        required
      />
    </FormModal>
  );
}

function AuditModal({ violationId, onClose }) {
  const { data } = useViolationAuditLog(violationId);
  return (
    <Modal opened={!!violationId} onClose={onClose} title="Student Violation Audit Log" size="lg" centered>
      <div className="space-y-2">
        {data?.data?.map((log) => (
          <div key={log.id} className="border border-[var(--border)] rounded-lg p-3 text-[length:13px]">
            <div className="flex justify-between text-[length:11px] text-[var(--text-muted)] mb-1">
              <span>{log.changedBy?.name} · <Badge status={log.change_type} label={log.change_type} /></span>
              <span>{new Date(log.created_at).toLocaleString()}</span>
            </div>
            {log.reason && <p className="text-[var(--text-secondary)]">{log.reason}</p>}
          </div>
        ))}
        {!data?.data?.length && <p className="text-[var(--text-muted)] text-[length:13px]">No audit entries.</p>}
      </div>
    </Modal>
  );
}

export default function ViolationsPage({ user }) {
  const toast = useToast();
  const [page, setPage]       = useState(1);
  const [filters, setFilters] = useState({ record_status: '', is_flagged: '', faculty_id: '' });
  const [resolving, setResolving] = useState(null);
  const [auditing,  setAuditing]  = useState(null);
  const [hiding,    setHiding]    = useState(null);

  const { data, isLoading, isError, refetch } = useViolations({ ...filters, page, limit: 20 });
  const { data: facultyData } = useUsers({ role: 'faculty' });
  const hide = useHideViolation();

  async function handleHide() {
    try {
      await hide.mutateAsync(hiding.id);
      toast({ message: 'Student violation hidden.' });
      setHiding(null);
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  return (
    <Layout user={user}>
      <Breadcrumb items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Student Violations' }]} />
      <PageHeader title="Student Discipline Analytics" subtitle="Violation patterns, repeat offenders, and record management" />

      <DisciplineAnalytics />

      <p className="text-[length:13px] font-semibold text-[var(--text-primary)] mb-2">All Records</p>

      <div className="flex flex-wrap gap-3 mb-4">
        <Select
          w={144}
          placeholder="All faculty"
          clearable
          value={filters.faculty_id || null}
          onChange={(value) => { setFilters(f => ({ ...f, faculty_id: value ?? '' })); setPage(1); }}
          data={facultyData?.data?.map((f) => ({ value: f.id, label: f.name })) || []}
        />
        <Select
          w={144}
          placeholder="All status"
          clearable
          value={filters.record_status || null}
          onChange={(value) => { setFilters(f => ({ ...f, record_status: value ?? '' })); setPage(1); }}
          data={[
            { value: 'active', label: 'Active' },
            { value: 'hidden', label: 'Hidden' },
          ]}
        />
        <Select
          w={144}
          placeholder="All"
          clearable
          value={filters.is_flagged || null}
          onChange={(value) => { setFilters(f => ({ ...f, is_flagged: value ?? '' })); setPage(1); }}
          data={[
            { value: 'true',  label: 'Flagged only' },
            { value: 'false', label: 'Not flagged' },
          ]}
        />
      </div>

      {/* Mobile card list */}
      <div className="md:hidden" style={{ backgroundColor: 'var(--surface-card)', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
        {isLoading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-card)' }}>Loading…</div>}
        {isError && <ErrorBlock onRetry={refetch} />}
        {!isLoading && !isError && !data?.data?.length && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-card)' }}>No student violations found.</div>}
        {data?.data?.map((v) => (
          <div key={v.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', backgroundColor: 'var(--surface-card)',
            borderBottom: '1px solid var(--border)', gap: 12,
            opacity: v.record_status === 'hidden' ? 0.6 : 1,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 'var(--text-card-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', marginBottom: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {v.student?.student_name}
              </p>
              <p style={{ fontSize: 'var(--text-small)', color: 'var(--text-muted)' }}>
                {v.student?.registration_number} • {v.violationType?.name}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {v.is_flagged && <Badge status="pending" label="Flagged" />}
              <Badge status={v.record_status} />
            </div>
            <div style={{ display: 'flex', gap: 2, flexShrink: 0, marginLeft: 4 }}>
              {v.is_flagged && !v.flag_resolved_at && (
                <Button variant="subtle" size="xs" onClick={() => setResolving(v)}>Resolve</Button>
              )}
              {v.record_status === 'active' && (
                <Button variant="subtle" size="xs" onClick={() => setHiding(v)}>Hide</Button>
              )}
              <Button variant="subtle" size="xs" onClick={() => setAuditing(v.id)}>Log</Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Student</Th><Th className="hidden md:table-cell">Faculty</Th>
              <Th>Type</Th><Th>Fine (₹)</Th><Th>Status</Th><Th>Flagged</Th><Th />
            </tr>
          </thead>
          <tbody>
            {isLoading && <EmptyRow cols={7} message="Loading…" />}
            {isError && <ErrorRow cols={7} onRetry={refetch} />}
            {!isLoading && !isError && !data?.data?.length && <EmptyRow cols={7} />}
            {data?.data?.map((v) => (
              <tr key={v.id} className={v.is_flagged ? 'bg-[var(--color-amber-bg)]' : v.record_status === 'hidden' ? 'opacity-50' : ''}>
                <Td>
                  <p className="font-medium text-[var(--text-primary)]">{v.student?.student_name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{v.student?.registration_number}</p>
                </Td>
                <Td className="hidden md:table-cell">{v.faculty?.name}</Td>
                <Td>
                  {v.violationType?.name}
                  {v.custom_violation && <p className="text-xs text-[var(--text-muted)]">{v.custom_violation}</p>}
                </Td>
                <Td>{v.is_warning_only ? <span className="text-xs text-[var(--text-muted)]">Warning only</span> : `₹${v.fine_amount}`}</Td>
                <Td><Badge status={v.record_status} /></Td>
                <Td>{v.is_flagged && <Badge status="pending" label="Flagged" />}</Td>
                <Td>
                  <div className="flex gap-1">
                    {v.is_flagged && !v.flag_resolved_at && (
                      <Button variant="subtle" size="xs" onClick={() => setResolving(v)}>Resolve</Button>
                    )}
                    {v.record_status === 'active' && (
                      <Button variant="subtle" size="xs" onClick={() => setHiding(v)}>Hide</Button>
                    )}
                    <Button variant="subtle" size="xs" onClick={() => setAuditing(v.id)}>Log</Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <Pagination meta={data?.meta} page={page} onPage={setPage} />

      {resolving && <ResolveFlagModal violation={resolving} onClose={() => setResolving(null)} />}
      {auditing  && <AuditModal violationId={auditing} onClose={() => setAuditing(null)} />}
      {hiding && (
        <ConfirmDialog
          open
          title="Hide Student Violation"
          message="Hide this student violation record? It will no longer appear in the active list."
          confirmText="Hide"
          isDangerous
          isLoading={hide.isPending}
          onConfirm={handleHide}
          onCancel={() => setHiding(null)}
        />
      )}
    </Layout>
  );
}
