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
    </Layout>
  );
}
