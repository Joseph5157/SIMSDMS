import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useViolationTypes, useCreateViolationType, useUpdateViolationType, useDeactivateViolationType, useDeleteViolationType } from '../../hooks/useViolationTypes';

function TypeModal({ open, editing, onClose }) {
  const toast = useToast();
  const create = useCreateViolationType();
  const update = useUpdateViolationType();
  const [form, setForm] = useState({ name: editing?.name ?? '', default_fine: editing?.default_fine ?? '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { name: form.name, default_fine: parseFloat(form.default_fine) };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...payload });
        toast({ message: 'Updated.' });
      } else {
        await create.mutateAsync(payload);
        toast({ message: 'Violation type created.' });
      }
      onClose();
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Violation Type' : 'New Violation Type'} size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Name" value={form.name} onChange={set('name')} required />
        <Input label="Default fine (₹)" type="number" min="0" step="0.01" value={form.default_fine} onChange={set('default_fine')} required />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending || update.isPending}>{editing ? 'Save' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  );
}

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
        action={<Button onClick={() => { setEditing(null); setShowModal(true); }}>+ New Type</Button>}
      />
      <Table>
        <thead><tr><Th>Name</Th><Th>Default Fine (₹)</Th><Th>Status</Th><Th>System</Th><Th /></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading && <EmptyRow cols={5} message="Loading…" />}
          {data?.data?.map((t) => (
            <tr key={t.id}>
              <Td className="font-medium">{t.name}</Td>
              <Td>₹{t.default_fine}</Td>
              <Td><Badge status={t.is_active ? 'active' : 'inactive'} /></Td>
              <Td>{t.is_system && <Badge status="pending" label="System" />}</Td>
              <Td>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(t); setShowModal(true); }}>Edit</Button>
                  {!t.is_system && t.is_active && (
                    <Button variant="ghost" size="sm" onClick={() => handleDeactivate(t)}>Deactivate</Button>
                  )}
                  {!t.is_system && (
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(t)}>Delete</Button>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <TypeModal open={showModal} editing={editing} onClose={() => { setShowModal(false); setEditing(null); }} />
    </Layout>
  );
}
