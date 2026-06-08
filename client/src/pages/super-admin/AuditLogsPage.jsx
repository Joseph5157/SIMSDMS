import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import { useAuditLogs } from '../../hooks/useUsers';

export default function AuditLogsPage({ user }) {
  const [page, setPage]     = useState(1);
  const [action, setAction] = useState('');

  const { data, isLoading } = useAuditLogs({ action, page, limit: 50 });

  function getActionColor(act) {
    if (!act) return '#64748b';
    if (act.includes('DELETE') || act.includes('DEACTIVATE')) return '#ef4444';
    if (act.includes('CREATE') || act.includes('UPLOAD')) return '#10b981';
    if (act.includes('RESET')) return '#f59e0b';
    if (act.includes('UPDATE') || act.includes('EDIT')) return '#3b82f6';
    return '#64748b';
  }

  return (
    <Layout user={user}>
      <PageHeader title="Audit Logs" subtitle="Immutable system-level action history" />
      <div className="mb-4">
        <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Filter by action…" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} />
      </div>

      {/* Mobile card list */}
      <div className="md:hidden" style={{
        backgroundColor: '#fff', borderRadius: 16,
        border: '1px solid #e2e8f0', overflow: 'hidden',
        marginBottom: 16,
      }}>
        {isLoading && <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading…</div>}
        {!isLoading && !data?.data?.length && <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No logs found.</div>}
        {data?.data?.map((log) => (
          <div key={log.id} style={{
            padding: '14px 16px',
            borderBottom: '1px solid #f1f5f9',
            backgroundColor: '#fff',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{
                fontSize: 12, fontWeight: 700, color: '#fff',
                backgroundColor: getActionColor(log.action),
                padding: '3px 8px', borderRadius: 6,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {log.action?.replace(/_/g, ' ')}
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {new Date(log.created_at).toLocaleString('en-IN', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>
              {log.actor?.name ?? 'System'}
            </p>
            <p style={{ fontSize: 12, color: '#94a3b8' }}>
              {log.target_type} · {log.target_id?.slice(0, 8)}…
            </p>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
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
      </div>
      <Pagination meta={data?.meta} page={page} onPage={setPage} />
    </Layout>
  );
}
