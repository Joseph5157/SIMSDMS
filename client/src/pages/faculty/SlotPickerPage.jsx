import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import { useAvailableSlots, useMonthSlots, usePickSlot, useUnpickSlot } from '../../hooks/useDutySlots';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function SlotPickerPage({ user }) {
  const toast = useToast();
  const now   = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: available, isLoading: loadingAvail } = useAvailableSlots(year, month);
  const { data: mySlots,   isLoading: loadingMine }  = useMonthSlots(year, month);

  const pick   = usePickSlot();
  const unpick = useUnpickSlot();

  async function handlePick(slot) {
    try {
      await pick.mutateAsync({ duty_date: slot.duty_date, session_type: slot.session_type });
      toast({ message: 'Slot picked!' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  async function handleUnpick(id) {
    if (!confirm('Unpick this slot?')) return;
    try {
      await unpick.mutateAsync(id);
      toast({ message: 'Slot unpicked.' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  const remainingSlots = available?.slots_remaining ?? 0;
  const windowOpen = available !== undefined && !available?.error;

  return (
    <Layout user={user}>
      <PageHeader title="My Duty Slots" subtitle="Pick your slots for the month" />

      <div className="flex items-center gap-3 mb-6">
        <select value={year} onChange={(e) => setYear(+e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          {[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y => <option key={y}>{y}</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(+e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
      </div>

      {/* My picked slots */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">My picked slots ({mySlots?.data?.length ?? 0})</h3>
        <Table>
          <thead><tr><Th>Date</Th><Th>Session</Th><Th>Status</Th><Th /></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loadingMine && <EmptyRow cols={4} message="Loading…" />}
            {!loadingMine && !mySlots?.data?.length && <EmptyRow cols={4} message="No slots picked yet." />}
            {mySlots?.data?.map((s) => (
              <tr key={s.id}>
                <Td className="font-medium">{new Date(s.duty_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</Td>
                <Td className="capitalize">{s.session_type}</Td>
                <Td><Badge status={s.status} /></Td>
                <Td>
                  {s.status === 'scheduled' && (
                    <Button variant="ghost" size="sm" onClick={() => handleUnpick(s.id)}>Unpick</Button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Available slots */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Available slots</h3>
          {available && <span className="text-xs text-gray-500">You can pick {remainingSlots} more slot(s)</span>}
        </div>
        {loadingAvail ? <p className="text-sm text-gray-400">Loading…</p> :
         !available ? <p className="text-sm text-gray-400 bg-yellow-50 border border-yellow-200 rounded-lg p-3">The scheduling window is not open for this month.</p> : (
          <Table>
            <thead><tr><Th>Date</Th><Th>Session</Th><Th /></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {!available.data?.length && <EmptyRow cols={3} message="No available slots." />}
              {available.data?.map((s, i) => (
                <tr key={i}>
                  <Td className="font-medium">{new Date(s.duty_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</Td>
                  <Td className="capitalize">{s.session_type}</Td>
                  <Td>
                    <Button size="sm" disabled={remainingSlots <= 0} onClick={() => handlePick(s)} loading={pick.isPending}>Pick</Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </Layout>
  );
}
