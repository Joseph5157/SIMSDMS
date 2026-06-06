import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import { useCalendar, useOpenWindow, useCloseWindow, useUpdateBlockedDates, useUpdateSessionsPerFaculty, useUnassignedFaculty, useAssignSlots } from '../../hooks/useCalendar';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export default function CalendarPage({ user }) {
  const toast = useToast();
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showAssign, setShowAssign] = useState(null);

  const { data: config, isLoading } = useCalendar(year, month);
  const { data: unassigned }        = useUnassignedFaculty(year, month);

  const openWindow   = useOpenWindow(year, month);
  const closeWindow  = useCloseWindow(year, month);
  const updateDates  = useUpdateBlockedDates(year, month);
  const updateSessions = useUpdateSessionsPerFaculty(year, month);

  const blocked = Array.isArray(config?.blocked_dates) ? config.blocked_dates : [];
  const working = Array.isArray(config?.working_days)  ? config.working_days  : [];

  function fmtDate(d) {
    return `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  function toggleBlocked(d) {
    const key = fmtDate(d);
    const updated = blocked.includes(key) ? blocked.filter(x => x !== key) : [...blocked, key];
    updateDates.mutate(updated, {
      onError: (err) => toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' }),
    });
  }

  function toggleWorking(d) {
    const key = fmtDate(d);
    const updated = working.includes(key) ? working.filter(x => x !== key) : [...working, key];
    // working_days uses blocked-dates endpoint but for working_days we need a separate call
    // actually they're separate fields — but we don't have a working_days update endpoint.
    // Working days are set via blocked-dates toggle — let's just track blocked only per the schema.
    toast({ message: 'Working days are managed via the blocked dates. Toggle blocked to exclude a day.', type: 'error' });
  }

  async function handleOpen() {
    try { await openWindow.mutateAsync(); toast({ message: 'Window opened. Faculty notified via Telegram.' }); }
    catch (err) { toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' }); }
  }

  async function handleClose() {
    if (!confirm('Close the scheduling window?')) return;
    try { await closeWindow.mutateAsync(); toast({ message: 'Window closed.' }); }
    catch (err) { toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' }); }
  }

  const days = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1);

  return (
    <Layout user={user}>
      <PageHeader title="Duty Calendar" subtitle="Manage scheduling window and blocked dates" />

      {/* Month picker */}
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

      {isLoading ? <p className="text-gray-400 text-sm">Loading…</p> : (
        <>
          {/* Status bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex items-center gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-1">Window status</p>
              <Badge status={config?.is_window_open ? 'active' : 'inactive'} label={config?.is_window_open ? 'Open' : 'Closed'} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Sessions per faculty</p>
              <p className="text-sm font-semibold">{config?.sessions_per_faculty ?? 3}</p>
            </div>
            <div className="flex gap-2 ml-auto">
              {!config?.is_window_open
                ? <Button size="sm" onClick={handleOpen} loading={openWindow.isPending}>Open Window</Button>
                : <Button size="sm" variant="danger" onClick={handleClose} loading={closeWindow.isPending}>Close Window</Button>}
              <Button size="sm" variant="secondary" onClick={() => {
                const n = prompt('Sessions per faculty:', config?.sessions_per_faculty ?? 3);
                if (n && !isNaN(n)) updateSessions.mutate(+n, { onSuccess: () => toast({ message: 'Updated.' }), onError: () => toast({ message: 'Failed.', type: 'error' }) });
              }}>Set Sessions</Button>
            </div>
          </div>

          {/* Days grid */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Blocked dates (click to toggle)</p>
            <div className="flex flex-wrap gap-2">
              {days.map((d) => {
                const key = fmtDate(d);
                const isBlocked = blocked.includes(key);
                return (
                  <button key={d} onClick={() => toggleBlocked(d)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${isBlocked ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'}`}>
                    {d}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2">Red = blocked (holiday). Working days: all non-blocked dates.</p>
          </div>

          {/* Unassigned faculty */}
          {unassigned?.data?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Unassigned faculty ({unassigned.total})</p>
              <Table>
                <thead><tr><Th>Name</Th><Th>Dept.</Th><Th>Slots picked</Th><Th>Required</Th><Th /></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {unassigned.data.map((f) => (
                    <tr key={f.id}>
                      <Td className="font-medium">{f.name}</Td>
                      <Td>{f.department ?? '—'}</Td>
                      <Td>{f.slots_picked}</Td>
                      <Td>{f.slots_required}</Td>
                      <Td><Button size="sm" variant="secondary" onClick={() => setShowAssign(f)}>Assign Slots</Button></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </>
      )}

      {showAssign && (
        <AssignSlotsModal
          faculty={showAssign}
          year={year} month={month}
          onClose={() => setShowAssign(null)}
        />
      )}
    </Layout>
  );
}

function AssignSlotsModal({ faculty, year, month, onClose }) {
  const toast = useToast();
  const assign = useAssignSlots(year, month);
  const [slots, setSlots] = useState([{ duty_date: '', session_type: 'morning' }]);

  function addSlot() { setSlots((s) => [...s, { duty_date: '', session_type: 'morning' }]); }
  function updateSlot(i, k, v) { setSlots((s) => s.map((x, j) => j === i ? { ...x, [k]: v } : x)); }
  function removeSlot(i) { setSlots((s) => s.filter((_, j) => j !== i)); }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const res = await assign.mutateAsync({ facultyId: faculty.id, slots });
      toast({ message: `${res.data.created_count} slot(s) assigned.` });
      onClose();
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  return (
    <Modal open onClose={onClose} title={`Assign Slots — ${faculty.name}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {slots.map((s, i) => (
          <div key={i} className="flex gap-2 items-end">
            <Input label={i === 0 ? 'Date' : ''} type="date" value={s.duty_date} onChange={(e) => updateSlot(i, 'duty_date', e.target.value)} required />
            <select value={s.session_type} onChange={(e) => updateSlot(i, 'session_type', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
            </select>
            {slots.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeSlot(i)}>✕</Button>}
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={addSlot}>+ Add slot</Button>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={assign.isPending}>Assign</Button>
        </div>
      </form>
    </Modal>
  );
}
