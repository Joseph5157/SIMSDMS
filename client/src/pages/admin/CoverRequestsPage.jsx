import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow, ErrorRow, ErrorBlock } from '../../components/ui/Table';
import { Button, Select } from '@mantine/core';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import { useCoverRequests, useConfirmCover } from '../../hooks/useCoverRequests';
import { useUsers } from '../../hooks/useUsers';
import Breadcrumb from '../../components/Breadcrumb';

const MONTHS = [
  { v: '1',  l: 'January' },  { v: '2',  l: 'February' }, { v: '3',  l: 'March' },
  { v: '4',  l: 'April' },    { v: '5',  l: 'May' },       { v: '6',  l: 'June' },
  { v: '7',  l: 'July' },     { v: '8',  l: 'August' },    { v: '9',  l: 'September' },
  { v: '10', l: 'October' },  { v: '11', l: 'November' },  { v: '12', l: 'December' },
];

export default function CoverRequestsPage({ user }) {
  const toast = useToast();
  const now   = new Date();

  const [page,      setPage]      = useState(1);
  const [status,    setStatus]    = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [month,     setMonth]     = useState('');
  const [year,      setYear]      = useState(now.getFullYear());

  const { data: facultyData } = useUsers({ role: 'faculty', limit: 100 });
  const { data, isLoading, isError, refetch } = useCoverRequests({
    status,
    faculty_id: facultyId || undefined,
    month:  month  || undefined,
    year:   month  ? year : undefined,
    page,
    limit: 20,
  });
  const confirm = useConfirmCover();

  async function handleConfirm(cr) {
    try {
      await confirm.mutateAsync(cr.id);
      toast({ message: 'Cover confirmed.' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  const rows = data?.data ?? [];

  return (
    <Layout user={user}>
      <Breadcrumb items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Cover Requests' }]} />
      <PageHeader title="Cover Requests" subtitle="Manage Need Cover broadcasts" />

      {/* Filter bar — Mantine Select */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Select
          w={150}
          placeholder="All statuses"
          clearable
          value={status || null}
          onChange={(v) => { setStatus(v ?? ''); setPage(1); }}
          data={[
            { value: 'open',      label: 'Open' },
            { value: 'covered',   label: 'Covered' },
            { value: 'expired',   label: 'Expired' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
        <Select
          w={170}
          placeholder="All faculty"
          clearable
          searchable
          value={facultyId || null}
          onChange={(v) => { setFacultyId(v ?? ''); setPage(1); }}
          data={(facultyData?.data ?? []).map((f) => ({ value: String(f.id), label: f.name }))}
        />
        <Select
          w={140}
          placeholder="All months"
          clearable
          value={month || null}
          onChange={(v) => { setMonth(v ?? ''); setPage(1); }}
          data={MONTHS.map((m) => ({ value: m.v, label: m.l }))}
        />
        {month && (
          <Select
            w={100}
            value={String(year)}
            onChange={(v) => { setYear(Number(v)); setPage(1); }}
            data={[now.getFullYear() - 1, now.getFullYear()].map((y) => ({ value: String(y), label: String(y) }))}
          />
        )}
      </div>

      {/* Mobile card list */}
      <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {isLoading && <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Loading…</p>}
        {isError && <ErrorBlock onRetry={refetch} />}
        {!isLoading && !isError && !rows.length && (
          <div style={{ padding: '24px 16px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No cover requests found.</p>
          </div>
        )}
        {rows.map((cr) => (
          <div key={cr.id} style={{
            background: 'var(--surface-card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{cr.requester?.name}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, textTransform: 'capitalize' }}>
                  {cr.dutySlot?.session_type ?? '—'}
                  {cr.dutySlot?.duty_date && ` · ${new Date(cr.dutySlot.duty_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
                </p>
              </div>
              <Badge status={cr.status} label={cr.status === 'open' ? (cr.volunteer_id ? 'Volunteer Assigned' : 'Pending') : undefined} />
            </div>
            {cr.reason && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.4 }}>{cr.reason}</p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {cr.volunteer?.name
                  ? <>Volunteer: <strong style={{ color: 'var(--text-secondary)' }}>{cr.volunteer.name}</strong></>
                  : 'No volunteer yet'}
              </span>
              {cr.status === 'open' && cr.volunteer_id && (
                <Button size="xs" onClick={() => handleConfirm(cr)} loading={confirm.isPending}>Confirm</Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Faculty</Th><Th>Slot date</Th><Th>Session</Th>
              <Th>Reason</Th><Th>Volunteer</Th><Th>Status</Th><Th>Expires</Th><Th />
            </tr>
          </thead>
          <tbody>
            {isLoading && <EmptyRow cols={8} message="Loading…" />}
            {isError && <ErrorRow cols={8} onRetry={refetch} />}
            {!isLoading && !isError && !rows.length && <EmptyRow cols={8} />}
            {rows.map((cr) => (
              <tr key={cr.id}>
                <Td className="font-medium">{cr.requester?.name}</Td>
                <Td>{cr.dutySlot ? new Date(cr.dutySlot.duty_date).toLocaleDateString('en-IN') : '—'}</Td>
                <Td className="capitalize">{cr.dutySlot?.session_type ?? '—'}</Td>
                <Td className="max-w-xs truncate text-[var(--text-muted)] text-[length:12px]">{cr.reason ?? '—'}</Td>
                <Td>{cr.volunteer?.name ?? <span className="text-[var(--text-muted)] text-[length:12px]">No volunteer yet</span>}</Td>
                <Td><Badge status={cr.status} label={cr.status === 'open' ? (cr.volunteer_id ? 'Volunteer Assigned' : 'Pending') : undefined} /></Td>
                <Td className="text-[length:12px] text-[var(--text-muted)]">{new Date(cr.expires_at).toLocaleDateString('en-IN')}</Td>
                <Td>
                  {cr.status === 'open' && cr.volunteer_id && (
                    <Button size="xs" onClick={() => handleConfirm(cr)} loading={confirm.isPending}>Confirm</Button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <Pagination meta={data?.meta} page={page} onPage={setPage} />
    </Layout>
  );
}
