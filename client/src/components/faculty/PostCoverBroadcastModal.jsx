import { useState } from 'react';
import { Select, TextInput } from '@mantine/core';
import FormModal from '../ui/FormModal';
import { useToast } from '../ui/Toast';
import { useCreateCoverRequest } from '../../hooks/useCoverRequests';
import { useMonthSlots } from '../../hooks/useDutySlots';

export default function PostCoverBroadcastModal({ open, onClose }) {
  const toast = useToast();
  const now   = new Date();
  const { data: slotsData } = useMonthSlots(now.getFullYear(), now.getMonth() + 1);
  const create = useCreateCoverRequest();
  const [form, setForm] = useState({ duty_slot_id: '', reason: '' });

  const mySlots = (slotsData?.data ?? []).filter(s => s.status === 'scheduled');

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await create.mutateAsync({ duty_slot_id: form.duty_slot_id, reason: form.reason || undefined });
      toast({ message: 'Cover request posted.' });
      onClose();
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  return (
    <FormModal
      opened={open}
      onClose={onClose}
      title="Post Need Cover Broadcast"
      size="sm"
      onSubmit={handleSubmit}
      submitLabel="Post"
      loading={create.isPending}
    >
      <Select
        label="Duty slot"
        placeholder="Select slot…"
        value={form.duty_slot_id || null}
        onChange={(value) => setForm(f => ({ ...f, duty_slot_id: value ?? '' }))}
        required
        data={mySlots.map(s => ({
          value: String(s.id),
          label: `${new Date(s.duty_date).toLocaleDateString('en-IN')} · ${s.session_type}`,
        }))}
      />
      <TextInput
        label="Reason (optional)"
        value={form.reason}
        onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
      />
    </FormModal>
  );
}
