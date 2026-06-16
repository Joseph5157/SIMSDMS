import { useState, useRef, useEffect } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import { Button } from '@mantine/core';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import CreateUserDrawer from '../../components/CreateUserDrawer';
import { useToast } from '../../components/ui/Toast';
import { useUsers, useDeactivateUser, useReactivateUser, useDeleteUser, useResetUserLogin } from '../../hooks/useUsers';
import { useInvites, useCreateInvite, useRegenerateInvite, useCancelInvite } from '../../hooks/useInvites';

// ── Row menu for users ──────────────────────────────────────────────────────
function RowMenu({ user: u, userRole, onDeactivate, onReactivate, onResetTelegram, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (u.role === 'super_admin') return null;
  const isSuperAdmin = userRole === 'super_admin';

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
          ) : u.status === 'pending_telegram' ? (
            isSuperAdmin && (
              <button
                onClick={() => { setOpen(false); onResetTelegram(u); }}
                className="w-full text-left px-4 py-2 text-[13px] text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Reset Telegram
              </button>
            )
          ) : (
            <button
              onClick={() => { setOpen(false); onReactivate(u); }}
              className="w-full text-left px-4 py-2 text-[13px] text-green-700 hover:bg-green-50 transition-colors"
            >
              Reactivate
            </button>
          )}
          {isSuperAdmin && (
            <>
              <div className="border-t border-slate-100 my-1"></div>
              <button
                onClick={() => { setOpen(false); onDelete(u); }}
                className="w-full text-left px-4 py-2 text-[13px] text-red-700 hover:bg-red-50 transition-colors"
              >
                Delete User
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Row menu for pending invites ────────────────────────────────────────────
function InviteRowMenu({ invite, onRegenerate, onCancel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
          <button
            onClick={() => { setOpen(false); onRegenerate(invite); }}
            className="w-full text-left px-4 py-2 text-[13px] text-blue-600 hover:bg-blue-50 transition-colors"
          >
            Regenerate
          </button>
          <div className="border-t border-slate-100 my-1"></div>
          <button
            onClick={() => { setOpen(false); onCancel(invite); }}
            className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function UsersPage({ user }) {
  const toast = useToast();
  const [page,       setPage]       = useState(1);
  const [role,       setRole]       = useState('');
  const [status,     setStatus]     = useState('');
  const [search,     setSearch]     = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Confirm-dialog states (replaces window.confirm)
  const [deactivatingUser,  setDeactivatingUser]  = useState(null);
  const [reactivatingUser,  setReactivatingUser]  = useState(null);
  const [deletingUser,      setDeletingUser]      = useState(null);
  const [cancellingInvite,  setCancellingInvite]  = useState(null);
  const [resettingTelegram, setResettingTelegram] = useState(null);

  const { data, isLoading } = useUsers({ role, status, search, page, limit: 20 });
  const { data: invitesData, isLoading: invitesLoading } = useInvites();

  const createInvite     = useCreateInvite();
  const deactivate       = useDeactivateUser();
  const reactivate       = useReactivateUser();
  const resetUserLogin   = useResetUserLogin();
  const regenerateInvite = useRegenerateInvite();
  const cancelInvite     = useCancelInvite();
  const deleteUser       = useDeleteUser();

  async function handleDeactivate() {
    try {
      await deactivate.mutateAsync(deactivatingUser.id);
      toast({ message: `${deactivatingUser.name} deactivated.` });
      setDeactivatingUser(null);
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  async function handleReactivate() {
    try {
      await reactivate.mutateAsync(reactivatingUser.id);
      toast({ message: `${reactivatingUser.name} reactivated.` });
      setReactivatingUser(null);
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  async function doResetTelegram() {
    try {
      const response = await resetUserLogin.mutateAsync(resettingTelegram.id);
      if (response.data?.relink_link) {
        navigator.clipboard.writeText(response.data.relink_link).catch(() => {});
      }
      toast({ message: `Relink link generated for ${resettingTelegram.name}. Copied to clipboard.` });
      setResettingTelegram(null);
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  async function handleDelete() {
    try {
      await deleteUser.mutateAsync(deletingUser.id);
      toast({ message: `${deletingUser.name} deleted.` });
      setDeletingUser(null);
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed to delete user.', type: 'error' });
    }
  }

  async function handleRegenerateInvite(inv) {
    try {
      const response = await regenerateInvite.mutateAsync(inv.id);
      if (response.data?.invite_link) {
        navigator.clipboard.writeText(response.data.invite_link).catch(() => {});
      }
      toast({ message: 'New invite link generated. Copied to clipboard.' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  async function handleCancelInvite() {
    try {
      await cancelInvite.mutateAsync(cancellingInvite.id);
      toast({ message: `Invite for ${cancellingInvite.name} cancelled.` });
      setCancellingInvite(null);
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  const selectCls = 'border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15 bg-white';

  return (
    <Layout user={user}>
      <PageHeader
        title="User Management"
        subtitle="Manage faculty and admin accounts"
        action={<Button size="sm" onClick={() => setShowCreate(true)}>+ Invite User</Button>}
      />

      {/* Filter bar */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          className="border border-slate-200 rounded-lg px-3 py-2 text-[13px] flex-1 min-w-[200px] outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15 placeholder:text-slate-400 bg-white"
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
          <option value="pending_telegram">Telegram Relink Needed</option>
        </select>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden" style={{ backgroundColor: 'var(--surface-card)', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
        {isLoading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-card)' }}>Loading…</div>}
        {!isLoading && !data?.data?.length && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-card)' }}>No users found.</div>}
        {data?.data?.map((u) => (
          <div key={u.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', backgroundColor: 'var(--surface-card)',
            borderBottom: '1px solid var(--border)', gap: 12,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 'var(--text-card-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', marginBottom: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {u.name}
              </p>
              <p style={{ fontSize: 'var(--text-small)', color: 'var(--text-muted)' }}>{u.email}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <Badge status={u.role} label={u.role.replace(/_/g, ' ')} />
              <Badge status={u.status} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
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
          <tbody>
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
                    userRole={user.role}
                    onDeactivate={setDeactivatingUser}
                    onReactivate={setReactivatingUser}
                    onResetTelegram={setResettingTelegram}
                    onDelete={setDeletingUser}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <div style={{
        marginTop: 16, padding: '12px 16px',
        backgroundColor: 'var(--surface-page)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>Active users</span>
        <span style={{ fontSize: 'var(--text-body)', fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)' }}>
          {data?.data?.length ?? 0}
        </span>
      </div>

      <Pagination meta={data?.meta} page={page} onPage={setPage} />

      {/* ── PENDING INVITES SECTION ── */}
      <div style={{ marginTop: 32, marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-card-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)', marginBottom: 2 }}>Pending Invites</h2>
            <p style={{ fontSize: 'var(--text-small)', color: 'var(--text-muted)' }}>Invite links not yet activated</p>
          </div>
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th className="hidden sm:table-cell">Expires</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {invitesLoading && <EmptyRow cols={5} message="Loading…" />}
            {!invitesLoading && !invitesData?.data?.length && <EmptyRow cols={5} message="No pending invites." />}
            {invitesData?.data?.map((inv) => (
              <tr key={inv.id}>
                <Td><p className="font-medium text-slate-900">{inv.name}</p></Td>
                <Td>{inv.email}</Td>
                <Td><Badge status={inv.role} label={inv.role.replace(/_/g, ' ')} /></Td>
                <Td className="hidden sm:table-cell text-[12px] text-slate-600">
                  {new Date(inv.invite_expires_at).toLocaleDateString()}
                </Td>
                <Td>
                  <InviteRowMenu
                    invite={inv}
                    onRegenerate={handleRegenerateInvite}
                    onCancel={setCancellingInvite}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <CreateUserDrawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
        actorRole={user.role}
        onSubmit={async (form, callback) => {
          try {
            const response = await createInvite.mutateAsync(form);
            toast({ message: 'Invite created.' });
            callback(response.data);
          } catch (err) {
            toast({ message: err.response?.data?.message ?? 'Failed to create invite.', type: 'error' });
          }
        }}
        loading={createInvite.isPending}
      />

      {deactivatingUser && (
        <ConfirmDialog
          open
          title="Deactivate User"
          message={`Deactivate ${deactivatingUser.name}?`}
          confirmText="Deactivate"
          isDangerous
          isLoading={deactivate.isPending}
          onConfirm={handleDeactivate}
          onCancel={() => setDeactivatingUser(null)}
        />
      )}
      {reactivatingUser && (
        <ConfirmDialog
          open
          title="Reactivate User"
          message={`Reactivate ${reactivatingUser.name}?`}
          confirmText="Reactivate"
          isLoading={reactivate.isPending}
          onConfirm={handleReactivate}
          onCancel={() => setReactivatingUser(null)}
        />
      )}
      {deletingUser && (
        <ConfirmDialog
          open
          title="Delete User"
          message={`Delete ${deletingUser.name}? This action cannot be undone.`}
          confirmText="Delete"
          isDangerous
          isLoading={deleteUser.isPending}
          onConfirm={handleDelete}
          onCancel={() => setDeletingUser(null)}
        />
      )}
      {cancellingInvite && (
        <ConfirmDialog
          open
          title="Cancel Invite"
          message={`Cancel invite for ${cancellingInvite.name}?`}
          confirmText="Cancel Invite"
          isDangerous
          isLoading={cancelInvite.isPending}
          onConfirm={handleCancelInvite}
          onCancel={() => setCancellingInvite(null)}
        />
      )}
      {resettingTelegram && (
        <ConfirmDialog
          open
          title="Reset Telegram Login"
          message={`Generate a new activation link for ${resettingTelegram.name}? They will need to re-link their Telegram account.`}
          confirmText="Reset & Copy Link"
          isLoading={resetUserLogin.isPending}
          onConfirm={doResetTelegram}
          onCancel={() => setResettingTelegram(null)}
        />
      )}
    </Layout>
  );
}
