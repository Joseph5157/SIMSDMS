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
    if (!confirm(`Reset login session for ${u.name}?`)) return;
    try {
      await reset.mutateAsync(u.id);
      toast({ message: `Session reset for ${u.name}. They must log in again.` });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  return (
    <Layout user={user}>
      <PageHeader title="Session Reset" subtitle="Force users to re-authenticate via Telegram OTP" />
      <div className="mb-4">
        <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search user…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Mobile card list */}
      <div className="md:hidden" style={{
        backgroundColor: '#fff', borderRadius: 16,
        border: '1px solid #e2e8f0', overflow: 'hidden',
        marginBottom: 16,
      }}>
        {isLoading && <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading…</div>}
        {!isLoading && !data?.data?.length && <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No users found.</div>}
        {data?.data?.map((u) => (
          <div key={u.id} style={{
            padding: '14px 16px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            backgroundColor: '#fff',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a',
                marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap' }}>
                {u.name}
              </p>
              <p style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                flexShrink: 0,
                padding: '8px 14px',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
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
        <tbody className="divide-y divide-gray-100">
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
