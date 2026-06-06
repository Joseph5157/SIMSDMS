import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import { useCoverRequests, useConfirmCover } from '../../hooks/useCoverRequests';

export default function CoverRequestsPage({ user }) {
  const toast = useToast();
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState('');

  const { data, isLoading } = useCoverRequests({ status, page, limit: 20 });
  const confirm = useConfirmCover();

  async function handleConfirm(cr) {
    try {
      await confirm.mutateAsync(cr.id);
      toast({ message: 'Cover confirmed.' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  return (
    <Layout user={user}>
      <PageHeader title="Cover Requests" subtitle="Manage Need Cover broadcasts" />
      <div className="mb-4">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="covered">Covered</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <Table>
        <thead><tr><Th>Faculty</Th><Th>Slot date</Th><Th>Session</Th><Th>Reason</Th><Th>Volunteer</Th><Th>Status</Th><Th>Expires</Th><Th /></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading && <EmptyRow cols={8} message="Loading…" />}
          {!isLoading && !data?.data?.length && <EmptyRow cols={8} />}
          {data?.data?.map((cr) => (
            <tr key={cr.id}>
              <Td className="font-medium">{cr.requester?.name}</Td>
              <Td>{cr.dutySlot ? new Date(cr.dutySlot.duty_date).toLocaleDateString('en-IN') : '—'}</Td>
              <Td className="capitalize">{cr.dutySlot?.session_type ?? '—'}</Td>
              <Td className="max-w-xs truncate text-gray-500">{cr.reason ?? '—'}</Td>
              <Td>{cr.volunteer?.name ?? <span className="text-gray-400 text-xs">No volunteer yet</span>}</Td>
              <Td><Badge status={cr.status} /></Td>
              <Td className="text-xs text-gray-400">{new Date(cr.expires_at).toLocaleDateString('en-IN')}</Td>
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
