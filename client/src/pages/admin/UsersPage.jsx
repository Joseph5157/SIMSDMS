import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input, { Select } from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import { useUsers, useCreateUser, useDeactivateUser } from '../../hooks/useUsers';

function CreateUserModal({ open, onClose }) {
  const toast = useToast();
  const create = useCreateUser();
  const [form, setForm] = useState({ name: '', email: '', role: 'faculty', department: '', designation: '', phone: '', telegram_id: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await create.mutateAsync(form);
      toast({ message: 'User created successfully.' });
      onClose();
      setForm({ name: '', email: '', role: 'faculty', department: '', designation: '', phone: '', telegram_id: '' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed to create user.', type: 'error' });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create User">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Full name" value={form.name} onChange={set('name')} required />
        <Input label="Email" type="email" value={form.email} onChange={set('email')} required />
        <Input label="Telegram ID" value={form.telegram_id} onChange={set('telegram_id')} placeholder="@username or numeric ID" />
        <Select label="Role" value={form.role} onChange={set('role')}>
          <option value="faculty">Faculty</option>
          <option value="admin">Admin</option>
        </Select>
        <Input label="Department" value={form.department} onChange={set('department')} />
        <Input label="Designation" value={form.designation} onChange={set('designation')} />
        <Input label="Phone" value={form.phone} onChange={set('phone')} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending}>Create</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function UsersPage({ user }) {
  const toast = useToast();
  const [page, setPage]     = useState(1);
  const [role, setRole]     = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useUsers({ role, search, page, limit: 20 });
  const deactivate = useDeactivateUser();

  async function handleDeactivate(u) {
    if (!confirm(`Deactivate ${u.name}?`)) return;
    try {
      await deactivate.mutateAsync(u.id);
      toast({ message: 'User deactivated.' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  return (
    <Layout user={user}>
      <PageHeader
        title="User Management"
        subtitle="Manage faculty and admin accounts"
        action={<Button onClick={() => setShowCreate(true)}>+ New User</Button>}
      />

      <div className="flex gap-3 mb-4">
        <input
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="w-36">
          <option value="">All roles</option>
          <option value="faculty">Faculty</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </Select>
      </div>

      <Table>
        <thead><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Department</Th><Th>Status</Th><Th /></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading && <EmptyRow cols={6} message="Loading…" />}
          {!isLoading && !data?.data?.length && <EmptyRow cols={6} />}
          {data?.data?.map((u) => (
            <tr key={u.id}>
              <Td className="font-medium text-gray-900">{u.name}</Td>
              <Td>{u.email}</Td>
              <Td><Badge status={u.role} label={u.role.replace('_', ' ')} /></Td>
              <Td>{u.department ?? '—'}</Td>
              <Td><Badge status={u.status} /></Td>
              <Td>
                {u.status === 'active' && u.role !== 'super_admin' && (
                  <Button variant="ghost" size="sm" onClick={() => handleDeactivate(u)}>Deactivate</Button>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination meta={data?.meta} page={page} onPage={setPage} />
      <CreateUserModal open={showCreate} onClose={() => setShowCreate(false)} />
    </Layout>
  );
}
