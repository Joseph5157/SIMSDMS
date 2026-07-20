import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow, ErrorRow, ErrorBlock } from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import { TextInput } from '@mantine/core';
import { useAuditLogs } from '../../hooks/useUsers';

export default function AuditLogsPage({ user }) {
  const [page,   setPage]   = useState(1);
  const [action, setAction] = useState('');
  const [from,   setFrom]   = useState('');
  const [to,     setTo]     = useState('');

  const { data, isLoading, isError, refetch } = useAuditLogs({ action, from, to, page, limit: 50 });

  function getActionColor(act) {
    if (!act) return 'var(--text-muted)';
    if (act.includes('DELETE') || act.includes('DEACTIVATE')) return 'var(--color-red-solid)';
    if (act.includes('CREATE') || act.includes('UPLOAD'))     return 'var(--color-emerald-solid)';
    if (act.includes('RESET'))                                return 'var(--color-amber-solid)';
    if (act.includes('UPDATE') || act.includes('EDIT'))       return 'var(--color-blue-500)';
    return 'var(--text-muted)';
  }

  return (
    <Layout user={user}>
      <PageHeader title="Audit Logs" subtitle="Immutable system-level action history" />

      <div className="mb-4 flex gap-2 flex-wrap items-end">
        <TextInput
          placeholder="Filter by action…"
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          w={256}
        />
        <TextInput
          type="date"
          label="From"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          w={160}
        />
        <TextInput
          type="date"
          label="To"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1); }}
          w={160}
        />
      </div>

      {/* Mobile card list */}
      <div className="md:hidden bg-[var(--surface-card)] rounded-[var(--radius-2xl)] border border-[var(--border)] overflow-hidden mb-4">
        {isLoading && <div className="p-10 text-center text-[var(--text-muted)] text-[length:var(--text-card)]">Loading…</div>}
        {isError && <ErrorBlock onRetry={refetch} />}
        {!isLoading && !isError && !data?.data?.length && <div className="p-10 text-center text-[var(--text-muted)] text-[length:var(--text-card)]">No logs found.</div>}
        {data?.data?.map((log) => (
          <div key={log.id} className="px-4 py-3.5 border-b border-[var(--border)] bg-[var(--surface-card)]">
            <div className="flex justify-between items-start mb-1.5">
              <span
                className="text-[length:var(--text-small)] font-[var(--weight-bold)] text-[var(--text-on-brand)] px-2 py-[3px] rounded-[var(--radius-sm)] uppercase tracking-[var(--tracking-label)]"
                style={{ backgroundColor: getActionColor(log.action) }}
              >
                {log.action?.replace(/_/g, ' ')}
              </span>
              <span className="text-[length:var(--text-micro)] text-[var(--text-muted)]">
                {new Date(log.created_at).toLocaleString('en-IN', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>
            <p className="text-[length:var(--text-card)] font-[var(--weight-semibold)] text-[var(--text-primary)] mb-0.5">
              {log.actor?.name ?? 'System'}
            </p>
            <p className="text-[length:var(--text-small)] text-[var(--text-muted)]">
              {log.target_type} · {log.target_id?.slice(0, 8)}…
            </p>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Actor</Th>
              <Th>Action</Th>
              <Th>Target</Th>
              <Th>Timestamp</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <EmptyRow cols={4} message="Loading…" />}
            {isError && <ErrorRow cols={4} onRetry={refetch} />}
            {!isLoading && !isError && !data?.data?.length && <EmptyRow cols={4} />}
            {data?.data?.map((log) => (
              <tr key={log.id}>
                <Td className="font-medium">{log.actor?.name ?? log.actor_id}</Td>
                <Td>
                  <span className="font-mono text-[length:var(--text-micro)] bg-[var(--color-slate-100)] text-[var(--color-slate-600)] px-1.5 py-0.5 rounded-[var(--radius-sm)]">
                    {log.action}
                  </span>
                </Td>
                <Td className="text-[length:var(--text-micro)] text-[var(--color-slate-500)]">
                  {log.target_type} {log.target_id ? `· ${log.target_id.slice(0, 8)}…` : ''}
                </Td>
                <Td className="text-[length:var(--text-micro)] text-[var(--color-slate-400)]">
                  {new Date(log.created_at).toLocaleString()}
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
