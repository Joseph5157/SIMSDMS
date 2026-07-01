import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import { Button, Select, TextInput } from '@mantine/core';
import Badge from '../../components/ui/Badge';
import FormModal from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { useMyCoverRequests, useOpenCoverRequests, useCreateCoverRequest, useVolunteer } from '../../hooks/useCoverRequests';
import { useMonthSlots } from '../../hooks/useDutySlots';

function PostBroadcastModal({ open, onClose }) {
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

export default function FacultyCoverRequestsPage({ user }) {
  const toast = useToast();
  const [tab, setTab]       = useState('open');
  const [showPost, setShowPost] = useState(false);

  const { data: open } = useOpenCoverRequests();
  const { data: mine } = useMyCoverRequests();
  const volunteer      = useVolunteer();
  const [pendingId, setPendingId] = useState(null);

  async function handleVolunteer(id) {
    setPendingId(id);
    try {
      await volunteer.mutateAsync(id);
      toast({ message: 'You have volunteered to cover this slot.' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Layout user={user}>
      <PageHeader
        title="Cover Requests"
        action={<Button size="sm" onClick={() => setShowPost(true)}>+ Post Broadcast</Button>}
      />

      <div className="flex gap-1 mb-4 bg-[var(--surface-page)] p-1 rounded-lg w-fit" role="tablist">
        {['open', 'my'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            tabIndex={tab === t ? 0 : -1}
            className={`px-4 py-1.5 rounded-md text-[length:13px] font-medium transition-colors ${tab === t ? 'bg-[var(--surface-card)] shadow text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
            {t === 'open' ? 'Open broadcasts' : 'My requests'}
          </button>
        ))}
      </div>

      {tab === 'open' && (
        <Table>
          <thead>
            <tr>
              <Th>Faculty</Th><Th>Date</Th><Th>Session</Th><Th>Reason</Th><Th>Expires</Th><Th />
            </tr>
          </thead>
          <tbody>
            {!open?.data?.length && <EmptyRow cols={6} message="No open broadcasts right now." />}
            {open?.data?.map((cr) => (
              <tr key={cr.id}>
                <Td className="font-medium">{cr.requester?.name}</Td>
                <Td>{cr.dutySlot ? new Date(cr.dutySlot.duty_date).toLocaleDateString('en-IN') : '—'}</Td>
                <Td className="capitalize">{cr.dutySlot?.session_type}</Td>
                <Td className="text-[var(--text-muted)] text-xs">{cr.reason ?? '—'}</Td>
                <Td className="text-xs text-[var(--text-muted)]">{new Date(cr.expires_at).toLocaleDateString('en-IN')}</Td>
                <Td>
                  {!cr.volunteer_id
                    ? <Button size="xs" onClick={() => handleVolunteer(cr.id)} loading={pendingId === cr.id}>Volunteer</Button>
                    : <span className="text-xs text-[var(--text-muted)]">Volunteer assigned</span>}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {tab === 'my' && (
        <Table>
          <thead>
            <tr>
              <Th>Slot</Th><Th>Role</Th><Th>Status</Th><Th>Volunteer</Th>
            </tr>
          </thead>
          <tbody>
            {!mine?.data?.length && <EmptyRow cols={4} message="No cover requests." />}
            {mine?.data?.map((cr) => (
              <tr key={cr.id}>
                <Td>{cr.dutySlot ? `${new Date(cr.dutySlot.duty_date).toLocaleDateString('en-IN')} · ${cr.dutySlot.session_type}` : '—'}</Td>
                <Td><span className="text-xs text-[var(--text-muted)]">{cr.requested_by === user?.id ? 'Posted' : 'Volunteered'}</span></Td>
                <Td><Badge status={cr.status} /></Td>
                <Td>{cr.volunteer?.name ?? '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <PostBroadcastModal open={showPost} onClose={() => setShowPost(false)} />
    </Layout>
  );
}
