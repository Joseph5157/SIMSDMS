import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import { useAuditLogs } from '../../hooks/useUsers';

export default function AuditLogsPage({ user }) {
  const [page, setPage]     = useState(1);
  const [action, setAction] = useState('');

  const { data, isLoading } = useAuditLogs({ action, page, limit: 50 });

  return (
    <Layout user={user}>
      <PageHeader title="Audit Logs" subtitle="Immutable system-level action history" />
      <div className="mb-4">
        <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Filter by action…" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} />
      </div>
      <Table>
        <thead><tr><Th>Actor</Th><Th>Action</Th><Th>Target</Th><Th>Timestamp</Th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading && <EmptyRow cols={4} message="Loading…" />}
          {!isLoading && !data?.data?.length && <EmptyRow cols={4} />}
          {data?.data?.map((log) => (
            <tr key={log.id}>
              <Td className="font-medium">{log.actor?.name ?? log.actor_id}</Td>
              <Td><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{log.action}</span></Td>
              <Td className="text-xs text-gray-500">{log.target_type} {log.target_id ? `· ${log.target_id.slice(0,8)}…` : ''}</Td>
              <Td className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination meta={data?.meta} page={page} onPage={setPage} />
    </Layout>
  );
}
