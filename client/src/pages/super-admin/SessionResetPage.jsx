import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { useUsers, useResetUserLogin } from '../../hooks/useUsers';

export default function SessionResetPage({ user }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useUsers({ search, limit: 50 });
  const reset = useResetUserLogin();

  async function handleReset(u) {
    if (!confirm(`Reset Telegram for ${u.name}? They will need to re-link via a new link.`)) return;
    try {
      const res = await reset.mutateAsync(u.id);
      const relinkLink = res.data?.relink_link;
      if (relinkLink) {
        navigator.clipboard.writeText(relinkLink).catch(() => {});
      }
      toast({ message: `Relink link generated for ${u.name}. Copied to clipboard.` });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  return (
    <Layout user={user}>
      <PageHeader title="Telegram Relink" subtitle="Reset users' Telegram connection and generate relink links" />
      <div className="mb-4">
        <input className="border border-slate-200 rounded-lg px-3 py-2 text-[13px] w-80 outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15 bg-white placeholder:text-slate-400"
          placeholder="Search user…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Mobile card list */}
      <div className="md:hidden" style={{
        backgroundColor: 'var(--surface-card)', borderRadius: 'var(--radius-2xl)',
        border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16,
      }}>
        {isLoading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-card)' }}>Loading…</div>}
        {!isLoading && !data?.data?.length && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-card)' }}>No users found.</div>}
        {data?.data?.map((u) => (
          <div key={u.id} style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--divider)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, backgroundColor: 'var(--surface-card)',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 'var(--text-card-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)',
                marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.name}
              </p>
              <p style={{ fontSize: 'var(--text-small)', color: 'var(--text-muted)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.email}
              </p>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <Badge status={u.role} label={u.role.replace(/_/g, ' ')} />
                <Badge status={u.status} />
              </div>
            </div>
            <button
              onClick={() => handleReset(u)}
              style={{
                flexShrink: 0, padding: '8px 14px',
                backgroundColor: 'var(--red-bg)', color: 'var(--red-600)',
                border: '1px solid var(--red-border)', borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--text-small)', fontWeight: 'var(--weight-bold)',
                cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)',
              }}
            >
              Reset
            </button>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
      <Table>
        <thead><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Status</Th><Th>Telegram</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading && <EmptyRow cols={6} message="Loading…" />}
          {data?.data?.map((u) => (
            <tr key={u.id}>
              <Td className="font-medium">{u.name}</Td>
              <Td>{u.email}</Td>
              <Td><Badge status={u.role} label={u.role.replace('_',' ')} /></Td>
              <Td><Badge status={u.status} /></Td>
              <Td>{u.telegram_verified ? <Badge status="active" label="Verified" /> : <Badge status="inactive" label="Not set" />}</Td>
              <Td>
                <Button variant="ghost" size="sm" onClick={() => handleReset(u)} loading={reset.isPending}>Reset</Button>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      </div>
    </Layout>
  );
}
