import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow, ErrorRow, ErrorBlock } from '../../components/ui/Table';
import { Button, Tooltip } from '@mantine/core';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import ViolationTypeDrawer from '../../components/ViolationTypeDrawer';
import Breadcrumb from '../../components/Breadcrumb';
import { useViolationTypes, useDeactivateViolationType, useDeleteViolationType } from '../../hooks/useViolationTypes';

export default function ViolationTypesPage({ user }) {
  const toast = useToast();
  const [showModal, setShowModal]       = useState(false);
  const [editing, setEditing]           = useState(null);
  const [showDeactivated, setShowDeact] = useState(false);
  const [deletingType, setDeletingType] = useState(null);

  const { data, isLoading, isError, refetch } = useViolationTypes(true);
  const deactivate = useDeactivateViolationType();
  const deleteType = useDeleteViolationType();

  async function handleDeactivate(t) {
    try {
      await deactivate.mutateAsync(t.id);
      toast({ message: 'Deactivated.' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  async function handleDelete() {
    try {
      await deleteType.mutateAsync(deletingType.id);
      toast({ message: 'Deleted.' });
      setDeletingType(null);
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  const allRows      = data?.data ?? [];
  const activeRows   = allRows.filter((t) => t.is_active);
  const inactiveRows = allRows.filter((t) => !t.is_active);

  function renderActions(t, size = 'xs') {
    return (
      <div className="flex flex-wrap gap-1">
        <Button
          variant="subtle" size={size}
          aria-label={`Edit ${t.name}`}
          onClick={() => { setEditing(t); setShowModal(true); }}
        >
          Edit
        </Button>
        {t.is_active && (
          t.is_system ? null : (
            <Button
              variant="subtle" color="gray" size={size}
              aria-label={`Deactivate ${t.name}`}
              onClick={() => handleDeactivate(t)}
            >
              Deactivate
            </Button>
          )
        )}
        {t.is_system ? (
          <Tooltip label="System types cannot be deleted" withArrow position="top">
            <Button
              variant="subtle" color="red" size={size}
              aria-label={`Delete ${t.name} (system type — cannot be deleted)`}
              disabled
              className="pointer-events-auto"
            >
              Delete
            </Button>
          </Tooltip>
        ) : (
          <Button
            variant="subtle" color="red" size={size}
            aria-label={`Delete ${t.name}`}
            onClick={() => setDeletingType(t)}
          >
            Delete
          </Button>
        )}
      </div>
    );
  }

  function renderMobileCard(t, i) {
    return (
      <div key={t.id} className={`bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-xl)] p-3.5 ${t.is_active ? '' : 'opacity-65'}`}>
        <div className="flex items-start justify-between gap-2.5 mb-2.5">
          <div className="min-w-0">
            <p className="text-[length:var(--text-card)] text-[var(--text-muted)] font-[var(--weight-semibold)]">#{i + 1}</p>
            <p className="text-[length:var(--text-body)] font-[var(--weight-semibold)] text-[var(--text-primary)]">{t.name}</p>
            <p className="text-[length:var(--text-card)] text-[var(--text-secondary)] mt-0.5">Default fine: <strong>₹{t.default_fine}</strong></p>
          </div>
          <div className="flex gap-1 shrink-0 flex-wrap justify-end">
            <Badge status={t.is_active ? 'active' : 'inactive'} />
            {t.is_system && <Badge status="pending" label="System" />}
          </div>
        </div>
        <div className="border-t border-[var(--border)] pt-2.5">
          {renderActions(t)}
        </div>
      </div>
    );
  }

  function renderTableRow(t, i) {
    return (
      <tr key={t.id} className={t.is_active ? '' : 'opacity-60'}>
        <Td>{i + 1}</Td>
        <Td className="font-medium">{t.name}</Td>
        <Td>₹{t.default_fine}</Td>
        <Td><Badge status={t.is_active ? 'active' : 'inactive'} /></Td>
        <Td>{t.is_system && <Badge status="pending" label="System" />}</Td>
        <Td>{renderActions(t)}</Td>
      </tr>
    );
  }

  return (
    <Layout user={user}>
      <Breadcrumb items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Student Violation Types' }]} />
      <PageHeader
        title="Student Violation Types"
        subtitle="Define disciplinary categories and default fines"
        action={<Button size="md" onClick={() => { setEditing(null); setShowModal(true); }}>+ New Type</Button>}
      />

      {/* Mobile card list */}
      <div className="md:hidden flex flex-col gap-2">
        {isLoading && <p className="text-[length:var(--text-card)] text-[var(--text-muted)] text-center p-6">Loading…</p>}
        {isError && <ErrorBlock onRetry={refetch} />}
        {!isLoading && !isError && !activeRows.length && (
          <div className="px-4 py-6 text-center border border-dashed border-[var(--border)] rounded-[var(--radius-xl)]">
            <p className="text-[length:var(--text-card)] text-[var(--text-muted)]">No student violation types yet.</p>
          </div>
        )}
        {activeRows.map((t, i) => renderMobileCard(t, i))}

        {inactiveRows.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowDeact((s) => !s)}
              className="text-[length:var(--text-small)] text-[var(--text-muted)] bg-transparent border-0 cursor-pointer py-1.5 px-0 font-[var(--weight-semibold)]"
            >
              {showDeactivated ? '▲ Hide' : '▼ Show'} deactivated ({inactiveRows.length})
            </button>
            {showDeactivated && inactiveRows.map((t, i) => renderMobileCard(t, i))}
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr><Th>S.No</Th><Th>Name</Th><Th>Default Fine (₹)</Th><Th>Status</Th><Th>System</Th><Th /></tr>
          </thead>
          <tbody>
            {isLoading && <EmptyRow cols={6} message="Loading…" />}
            {isError && <ErrorRow cols={6} onRetry={refetch} />}
            {!isLoading && !isError && !activeRows.length && <EmptyRow cols={6} message="No student violation types yet." />}
            {activeRows.map((t, i) => renderTableRow(t, i))}
          </tbody>
        </Table>

        {inactiveRows.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowDeact((s) => !s)}
              className="text-[length:var(--text-small)] text-[var(--text-muted)] bg-transparent border-0 cursor-pointer py-1.5 px-0 font-[var(--weight-semibold)]"
            >
              {showDeactivated ? '▲ Hide' : '▼ Show'} deactivated types ({inactiveRows.length})
            </button>
            {showDeactivated && (
              <Table>
                <thead>
                  <tr><Th>S.No</Th><Th>Name</Th><Th>Default Fine (₹)</Th><Th>Status</Th><Th>System</Th><Th /></tr>
                </thead>
                <tbody>
                  {inactiveRows.map((t, i) => renderTableRow(t, i))}
                </tbody>
              </Table>
            )}
          </div>
        )}
      </div>

      <ViolationTypeDrawer open={showModal} editing={editing} onClose={() => { setShowModal(false); setEditing(null); }} />

      {deletingType && (
        <ConfirmDialog
          open
          title="Delete Student Violation Type"
          message={`Delete "${deletingType.name}"? This cannot be undone.`}
          confirmText="Delete"
          isDangerous
          isLoading={deleteType.isPending}
          onConfirm={handleDelete}
          onCancel={() => setDeletingType(null)}
        />
      )}
    </Layout>
  );
}
