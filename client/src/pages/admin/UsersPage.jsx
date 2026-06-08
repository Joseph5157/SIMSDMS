import { useState, useRef, useEffect } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input, { Select } from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import { useUsers, useCreateUser, useDeactivateUser, useReactivateUser } from '../../hooks/useUsers';

// ── ··· action menu ─────────────────────────────────────────────────────────
function RowMenu({ user: u, onDeactivate, onReactivate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (u.role === 'super_admin') return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-[16px]"
      >
        ···
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[140px]">
          {u.status === 'active' ? (
            <button
              onClick={() => { setOpen(false); onDeactivate(u); }}
              className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
            >
              Deactivate
            </button>
          ) : (
            <button
              onClick={() => { setOpen(false); onReactivate(u); }}
              className="w-full text-left px-4 py-2 text-[13px] text-green-700 hover:bg-green-50 transition-colors"
            >
              Reactivate
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Create user modal ────────────────────────────────────────────────────────
function CreateUserModal({ open, onClose }) {
  const toast  = useToast();
  const create = useCreateUser();
  const [form, setForm] = useState({
    name: '', email: '', role: 'faculty',
    department: '', designation: '', phone: '', telegram_id: '',
  });
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
    <Modal open={open} onClose={onClose} title="Add User">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Full name"    value={form.name}        onChange={set('name')}        required />
        <Input label="Email"        type="email" value={form.email} onChange={set('email')} required />
        <Input label="Telegram ID"  value={form.telegram_id} onChange={set('telegram_id')} placeholder="@username or numeric ID" />
        <Select label="Role" value={form.role} onChange={set('role')}>
          <option value="faculty">Faculty</option>
          <option value="admin">Admin</option>
        </Select>
        <Input label="Department"   value={form.department}  onChange={set('department')} />
        <Input label="Designation"  value={form.designation} onChange={set('designation')} />
        <Input label="Phone"        value={form.phone}       onChange={set('phone')} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending}>Create</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function UsersPage({ user }) {
  const toast = useToast();
  const [page,       setPage]       = useState(1);
  const [role,       setRole]       = useState('');
  const [status,     setStatus]     = useState('');
  const [search,     setSearch]     = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useUsers({ role, status, search, page, limit: 20 });
  const deactivate = useDeactivateUser();
  const reactivate = useReactivateUser();

  async function handleDeactivate(u) {
    if (!confirm(`Deactivate ${u.name}?`)) return;
    try {
      await deactivate.mutateAsync(u.id);
      toast({ message: `${u.name} deactivated.` });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  async function handleReactivate(u) {
    if (!confirm(`Reactivate ${u.name}?`)) return;
    try {
      await reactivate.mutateAsync(u.id);
      toast({ message: `${u.name} reactivated.` });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  const selectCls = 'border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 bg-white';

  return (
    <Layout user={user}>
      <PageHeader
        title="User Management"
        subtitle="Manage faculty and admin accounts"
        action={<Button onClick={() => setShowCreate(true)}>+ Add User</Button>}
      />

      {/* Filter bar */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          className="border border-slate-200 rounded-lg px-3 py-2 text-[13px] flex-1 min-w-[200px] outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 placeholder:text-slate-400"
          placeholder="Search by name or Telegram ID…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">All roles</option>
          <option value="faculty">Faculty</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Role</Th>
            <Th className="hidden sm:table-cell">Department</Th>
            <Th className="hidden md:table-cell">Telegram ID</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading && <EmptyRow cols={6} message="Loading…" />}
          {!isLoading && !data?.data?.length && <EmptyRow cols={6} />}
          {data?.data?.map((u) => (
            <tr key={u.id}>
              <Td>
                <p className="font-medium text-slate-900">{u.name}</p>
                <p className="text-[11px] text-slate-400">{u.email}</p>
              </Td>
              <Td><Badge status={u.role} label={u.role.replace(/_/g, ' ')} /></Td>
              <Td className="hidden sm:table-cell">{u.department ?? '—'}</Td>
              <Td className="hidden md:table-cell">
                <span className="font-mono text-[12px] text-slate-600">
                  {u.telegram_id ?? '—'}
                </span>
              </Td>
              <Td><Badge status={u.status} /></Td>
              <Td>
                <RowMenu
                  user={u}
                  onDeactivate={handleDeactivate}
                  onReactivate={handleReactivate}
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div style={{
        marginTop: 16, padding: '12px 16px',
        backgroundColor: '#f8fafc', borderRadius: 12,
        border: '1px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          Total users in system
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
          {data?.data?.length ?? 0}
        </span>
      </div>

      <Pagination meta={data?.meta} page={page} onPage={setPage} />
      <CreateUserModal open={showCreate} onClose={() => setShowCreate(false)} />
    </Layout>
  );
}
