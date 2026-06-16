import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import { Button } from '@mantine/core';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import ViolationTypeDrawer from '../../components/ViolationTypeDrawer';
import { useViolationTypes, useDeactivateViolationType, useDeleteViolationType } from '../../hooks/useViolationTypes';

export default function ViolationTypesPage({ user }) {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);

  const { data, isLoading } = useViolationTypes(true);
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

  async function handleDelete(t) {
    if (!confirm(`Delete "${t.name}"?`)) return;
    try {
      await deleteType.mutateAsync(t.id);
      toast({ message: 'Deleted.' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  const rows = data?.data ?? [];

  return (
    <Layout user={user}>
      <PageHeader
        title="Violation Types"
        subtitle="Define disciplinary categories and default fines"
        action={<Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}>+ New Type</Button>}
      />

      {/* Mobile card list */}
      <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isLoading && <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Loading…</p>}
        {!isLoading && !rows.length && (
          <div style={{ padding: '24px 16px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No violation types yet.</p>
          </div>
        )}
        {rows.map((t) => (
          <div key={t.id} style={{
            background: 'var(--surface-card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Default fine: <strong>₹{t.default_fine}</strong></p>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Badge status={t.is_active ? 'active' : 'inactive'} />
                {t.is_system && <Badge status="pending" label="System" />}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <Button variant="light" size="xs" onClick={() => { setEditing(t); setShowModal(true); }}>Edit</Button>
              {!t.is_system && t.is_active && (
                <Button variant="subtle" color="gray" size="xs" onClick={() => handleDeactivate(t)}>Deactivate</Button>
              )}
              {!t.is_system && (
                <Button variant="subtle" color="red" size="xs" onClick={() => handleDelete(t)}>Delete</Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr><Th>Name</Th><Th>Default Fine (₹)</Th><Th>Status</Th><Th>System</Th><Th /></tr>
          </thead>
          <tbody>
            {isLoading && <EmptyRow cols={5} message="Loading…" />}
            {!isLoading && !rows.length && <EmptyRow cols={5} message="No violation types yet." />}
            {rows.map((t) => (
              <tr key={t.id}>
                <Td className="font-medium">{t.name}</Td>
                <Td>₹{t.default_fine}</Td>
                <Td><Badge status={t.is_active ? 'active' : 'inactive'} /></Td>
                <Td>{t.is_system && <Badge status="pending" label="System" />}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <Button variant="subtle" size="xs" onClick={() => { setEditing(t); setShowModal(true); }}>Edit</Button>
                    {!t.is_system && t.is_active && (
                      <Button variant="subtle" size="xs" onClick={() => handleDeactivate(t)}>Deactivate</Button>
                    )}
                    {!t.is_system && (
                      <Button variant="subtle" color="red" size="xs" onClick={() => handleDelete(t)}>Delete</Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <ViolationTypeDrawer open={showModal} editing={editing} onClose={() => { setShowModal(false); setEditing(null); }} />
    </Layout>
  );
}
