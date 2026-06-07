import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import { useCoverRequests, useConfirmCover } from '../../hooks/useCoverRequests';
import { useUsers } from '../../hooks/useUsers';

const MONTHS = [
  { v: 1, l: 'January' }, { v: 2, l: 'February' }, { v: 3, l: 'March' },
  { v: 4, l: 'April' },   { v: 5, l: 'May' },       { v: 6, l: 'June' },
  { v: 7, l: 'July' },    { v: 8, l: 'August' },    { v: 9, l: 'September' },
  { v: 10, l: 'October' },{ v: 11, l: 'November' }, { v: 12, l: 'December' },
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
  const { data, isLoading }   = useCoverRequests({
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

  const selectCls = 'border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 bg-white';

  return (
    <Layout user={user}>
      <PageHeader title="Cover Requests" subtitle="Manage Need Cover broadcasts" />

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="covered">Covered</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select value={facultyId} onChange={(e) => { setFacultyId(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">All faculty</option>
          {facultyData?.data?.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>

        <select value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">All months</option>
          {MONTHS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>

        {month && (
          <select value={year} onChange={(e) => { setYear(+e.target.value); setPage(1); }} className={selectCls}>
            {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        )}
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Faculty</Th><Th>Slot date</Th><Th>Session</Th>
            <Th>Reason</Th><Th>Volunteer</Th><Th>Status</Th><Th>Expires</Th><Th />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading && <EmptyRow cols={8} message="Loading…" />}
          {!isLoading && !data?.data?.length && <EmptyRow cols={8} />}
          {data?.data?.map((cr) => (
            <tr key={cr.id}>
              <Td className="font-medium">{cr.requester?.name}</Td>
              <Td>{cr.dutySlot ? new Date(cr.dutySlot.duty_date).toLocaleDateString('en-IN') : '—'}</Td>
              <Td className="capitalize">{cr.dutySlot?.session_type ?? '—'}</Td>
              <Td className="max-w-xs truncate text-slate-500 text-[12px]">{cr.reason ?? '—'}</Td>
              <Td>{cr.volunteer?.name ?? <span className="text-slate-400 text-[12px]">No volunteer yet</span>}</Td>
              <Td><Badge status={cr.status} /></Td>
              <Td className="text-[12px] text-slate-400">{new Date(cr.expires_at).toLocaleDateString('en-IN')}</Td>
              <Td>
                {cr.status === 'open' && cr.volunteer_id && (
                  <Button size="sm" onClick={() => handleConfirm(cr)} loading={confirm.isPending}>Confirm</Button>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination meta={data?.meta} page={page} onPage={setPage} />
    </Layout>
  );
}
