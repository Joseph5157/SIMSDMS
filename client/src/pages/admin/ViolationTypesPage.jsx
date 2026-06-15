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

  return (
    <Layout user={user}>
      <PageHeader
        title="Violation Types"
        action={<Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}>+ New Type</Button>}
      />
      <Table>
        <thead><tr><Th>Name</Th><Th>Default Fine (₹)</Th><Th>Status</Th><Th>System</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading && <EmptyRow cols={5} message="Loading…" />}
          {data?.data?.map((t) => (
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
      <ViolationTypeDrawer open={showModal} editing={editing} onClose={() => { setShowModal(false); setEditing(null); }} />
    </Layout>
  );
}
