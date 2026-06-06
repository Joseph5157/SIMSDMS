import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input, { Select } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useLiveAttendance, useOverrideAttendance } from '../../hooks/useAttendance';
import { useState } from 'react';

function OverrideModal({ record, onClose }) {
  const toast = useToast();
  const override = useOverrideAttendance();
  const [form, setForm] = useState({ in_status: record?.in_status ?? '', override_reason: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await override.mutateAsync({ dutySlotId: record.slot_id, ...form });
      toast({ message: 'Attendance overridden.' });
      onClose();
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  return (
    <Modal open onClose={onClose} title={`Override — ${record?.faculty?.name}`} size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Select label="In status" value={form.in_status} onChange={set('in_status')}>
          <option value="normal">Normal</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
        </Select>
        <Input label="Reason (required)" value={form.override_reason} onChange={set('override_reason')} required />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={override.isPending}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

const STATUS_LABELS = { not_checked_in: 'Not In', checked_in: 'Checked In', checked_out: 'Checked Out' };
const STATUS_CLS    = { not_checked_in: 'bg-gray-100 text-gray-500', checked_in: 'bg-blue-100 text-blue-700', checked_out: 'bg-green-100 text-green-700' };

export default function AttendanceLivePage({ user }) {
  const { data, isLoading, dataUpdatedAt } = useLiveAttendance();
  const [overriding, setOverriding] = useState(null);

  const records = data?.data ?? [];
  const morning   = records.filter(r => r.session_type === 'morning');
  const afternoon = records.filter(r => r.session_type === 'afternoon');

  const lastUpdate = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—';

  function renderGroup(label, group) {
    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{label} ({group.length})</h3>
        <Table>
          <thead><tr><Th>Faculty</Th><Th>Status</Th><Th>In time</Th><Th>Out time</Th><Th>In status</Th><Th /></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {!group.length && <EmptyRow cols={6} message={`No ${label.toLowerCase()} duty today.`} />}
            {group.map((r) => (
              <tr key={r.slot_id}>
                <Td className="font-medium">{r.faculty?.name}<p className="text-xs text-gray-400">{r.faculty?.department}</p></Td>
                <Td>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLS[r.attendance_status]}`}>
                    {STATUS_LABELS[r.attendance_status]}
                  </span>
                </Td>
                <Td>{r.in_time ? new Date(r.in_time).toLocaleTimeString() : '—'}</Td>
                <Td>{r.out_time ? new Date(r.out_time).toLocaleTimeString() : '—'}{r.auto_out && <span className="ml-1 text-xs text-orange-500">(auto)</span>}</Td>
                <Td>{r.in_status ? <Badge status={r.in_status} /> : '—'}</Td>
                <Td><Button variant="ghost" size="sm" onClick={() => setOverriding(r)}>Override</Button></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  }

  return (
    <Layout user={user}>
      <PageHeader
        title="Live Attendance Dashboard"
        subtitle={`Today · Auto-refreshes every 30s · Last updated: ${lastUpdate}`}
      />
      {isLoading ? <p className="text-gray-400 text-sm">Loading…</p> : (
        <>
          {renderGroup('Morning duty', morning)}
          {renderGroup('Afternoon duty', afternoon)}
        </>
      )}
      {overriding && <OverrideModal record={overriding} onClose={() => setOverriding(null)} />}
    </Layout>
  );
}
