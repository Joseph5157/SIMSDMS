import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
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
    <Modal
      open={open}
      onClose={onClose}
      title="Post Need Cover Broadcast"
      size="sm"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} className="min-h-11">Cancel</Button>
          <Button type="submit" form="broadcast-form" loading={create.isPending} className="min-h-11">Post</Button>
        </>
      }
    >
      <form id="broadcast-form" onSubmit={handleSubmit} className="flex flex-col gap-0">
        <div className="mb-2 pb-2 border-b border-slate-200">
          <Select label="Duty slot" value={form.duty_slot_id} onChange={(e) => setForm(f => ({ ...f, duty_slot_id: e.target.value }))} required>
            <option value="">Select slot…</option>
            {mySlots.map((s) => (
              <option key={s.id} value={s.id}>{new Date(s.duty_date).toLocaleDateString('en-IN')} · {s.session_type}</option>
            ))}
          </Select>
        </div>
        <div>
          <Input label="Reason (optional)" value={form.reason} onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))} />
        </div>
      </form>
    </Modal>
  );
}

export default function FacultyCoverRequestsPage({ user }) {
  const toast = useToast();
  const [tab, setTab]     = useState('open');
  const [showPost, setShowPost] = useState(false);

  const { data: open }   = useOpenCoverRequests();
  const { data: mine }   = useMyCoverRequests();
  const volunteer        = useVolunteer();

  async function handleVolunteer(id) {
    try {
      await volunteer.mutateAsync(id);
      toast({ message: 'You have volunteered to cover this slot.' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  return (
    <Layout user={user}>
      <PageHeader
        title="Cover Requests"
        action={<Button onClick={() => setShowPost(true)}>+ Post Broadcast</Button>}
      />

      <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-lg w-fit">
        {['open','my'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors ${tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>
            {t === 'open' ? 'Open broadcasts' : 'My requests'}
          </button>
        ))}
      </div>

      {tab === 'open' && (
        <Table>
          <thead><tr><Th>Faculty</Th><Th>Date</Th><Th>Session</Th><Th>Reason</Th><Th>Expires</Th><Th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!open?.data?.length && <EmptyRow cols={6} message="No open broadcasts right now." />}
            {open?.data?.map((cr) => (
              <tr key={cr.id}>
                <Td className="font-medium">{cr.requester?.name}</Td>
                <Td>{cr.dutySlot ? new Date(cr.dutySlot.duty_date).toLocaleDateString('en-IN') : '—'}</Td>
                <Td className="capitalize">{cr.dutySlot?.session_type}</Td>
                <Td className="text-slate-500 text-xs">{cr.reason ?? '—'}</Td>
                <Td className="text-xs text-slate-400">{new Date(cr.expires_at).toLocaleDateString('en-IN')}</Td>
                <Td>
                  {!cr.volunteer_id
                    ? <Button size="sm" onClick={() => handleVolunteer(cr.id)} loading={volunteer.isPending}>Volunteer</Button>
                    : <span className="text-xs text-slate-400">Volunteer assigned</span>}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {tab === 'my' && (
        <Table>
          <thead><tr><Th>Slot</Th><Th>Role</Th><Th>Status</Th><Th>Volunteer</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!mine?.data?.length && <EmptyRow cols={4} message="No cover requests." />}
            {mine?.data?.map((cr) => (
              <tr key={cr.id}>
                <Td>{cr.dutySlot ? `${new Date(cr.dutySlot.duty_date).toLocaleDateString('en-IN')} · ${cr.dutySlot.session_type}` : '—'}</Td>
                <Td><span className="text-xs text-slate-500">{cr.requested_by === user?.id ? 'Posted' : 'Volunteered'}</span></Td>
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
