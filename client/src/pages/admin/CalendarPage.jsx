import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Button, TextInput, Select, NumberInput } from '@mantine/core';
import Badge from '../../components/ui/Badge';
import FormModal from '../../components/ui/FormModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import { useCalendar, useOpenWindow, useCloseWindow, useUpdateBlockedDates, useUpdateSessionsPerFaculty, useUnassignedFaculty, useAssignSlots } from '../../hooks/useCalendar';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
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
    <FormModal
      opened={!!faculty}
      onClose={onClose}
      title={`Assign Slots — ${faculty?.name}`}
      onSubmit={handleSubmit}
      submitLabel="Assign"
      loading={assign.isPending}
    >
      {slots.map((s, i) => (
        <div key={i} className="flex gap-2 items-end">
          <TextInput
            label={i === 0 ? 'Date' : ''}
            type="date"
            value={s.duty_date}
            onChange={(e) => updateSlot(i, 'duty_date', e.target.value)}
            required
            style={{ flex: 1 }}
          />
          <Select
            label={i === 0 ? 'Session' : ''}
            value={s.session_type}
            onChange={(value) => updateSlot(i, 'session_type', value ?? 'morning')}
            data={[
              { value: 'morning',   label: 'Morning' },
              { value: 'afternoon', label: 'Afternoon' },
            ]}
            style={{ flex: 1 }}
          />
          {slots.length > 1 && (
            <Button type="button" variant="subtle" size="xs" onClick={() => removeSlot(i)}
              style={{ marginBottom: 1 }}>✕</Button>
          )}
        </div>
      ))}
      <Button type="button" variant="subtle" size="sm" onClick={addSlot}>+ Add slot</Button>
    </FormModal>
  );
}

function SetSessionsModal({ currentValue, onClose, onSave, loading }) {
  const [value, setValue] = useState(typeof currentValue === 'number' ? currentValue : 3);
  return (
    <FormModal
      opened
      onClose={onClose}
      title="Sessions Per Faculty"
      size="xs"
      onSubmit={(e) => { e.preventDefault(); onSave(typeof value === 'number' ? value : 3); }}
      submitLabel="Save"
      loading={loading}
    >
      <NumberInput
        label="Sessions per faculty"
        description="Duty slots each faculty must pick this month"
        min={1}
        max={20}
        allowDecimal={false}
        value={value}
        onChange={(v) => setValue(v)}
        required
      />
    </FormModal>
  );
}

export default function CalendarPage({ user }) {
  const toast = useToast();
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showAssign,      setShowAssign]      = useState(null);
  const [closingWindow,   setClosingWindow]   = useState(false);
  const [showSetSessions, setShowSetSessions] = useState(false);

  const { data: config, isLoading } = useCalendar(year, month);
  const { data: unassigned }        = useUnassignedFaculty(year, month);

  const openWindow     = useOpenWindow(year, month);
  const closeWindow    = useCloseWindow(year, month);
  const updateDates    = useUpdateBlockedDates(year, month);
  const updateSessions = useUpdateSessionsPerFaculty(year, month);

  const blocked = Array.isArray(config?.blocked_dates) ? config.blocked_dates : [];

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

  async function handleOpen() {
    try { await openWindow.mutateAsync(); toast({ message: 'Window opened. Faculty notified via Telegram.' }); }
    catch (err) { toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' }); }
  }

  async function doClose() {
    try {
      await closeWindow.mutateAsync();
      toast({ message: 'Window closed.' });
      setClosingWindow(false);
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  async function handleSetSessions(value) {
    try {
      await updateSessions.mutateAsync(value);
      toast({ message: 'Updated.' });
      setShowSetSessions(false);
    } catch {
      toast({ message: 'Failed.', type: 'error' });
    }
  }

  const days = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1);

  return (
    <Layout user={user}>
      <PageHeader title="Duty Calendar" subtitle="Manage scheduling window and blocked dates" />

      {/* Month picker */}
      <div className="flex items-center gap-2 mb-6">
        <Select
          w={100}
          value={String(year)}
          onChange={(v) => setYear(Number(v))}
          data={[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y => ({ value: String(y), label: String(y) }))}
        />
        <Select
          w={120}
          value={String(month)}
          onChange={(v) => setMonth(Number(v))}
          data={MONTHS.map((m, i) => ({ value: String(i+1), label: m }))}
        />
      </div>

      {isLoading ? <p className="text-slate-400 text-[13px]">Loading…</p> : (
        <>
          {/* Status bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex items-center gap-6">
            <div>
              <p className="text-xs text-slate-500 mb-1">Window status</p>
              <Badge status={config?.is_window_open ? 'active' : 'inactive'} label={config?.is_window_open ? 'Open' : 'Closed'} />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Sessions per faculty</p>
              <p className="text-sm font-semibold">{config?.sessions_per_faculty ?? 3}</p>
            </div>
            <div className="flex gap-2 ml-auto">
              {!config?.is_window_open
                ? <Button size="sm" onClick={handleOpen} loading={openWindow.isPending}>Open Window</Button>
                : <Button size="sm" color="red" onClick={() => setClosingWindow(true)}>Close Window</Button>}
              <Button size="sm" variant="default" onClick={() => setShowSetSessions(true)}>Set Sessions</Button>
            </div>
          </div>

          {/* Days grid */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
            <p className="text-sm font-medium text-slate-700 mb-3">Blocked dates (click to toggle)</p>
            <div className="flex flex-wrap gap-2">
              {days.map((d) => {
                const key = fmtDate(d);
                const isBlocked = blocked.includes(key);
                return (
                  <button key={d} onClick={() => toggleBlocked(d)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${isBlocked ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'}`}>
                    {d}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-2">Red = blocked (holiday). Working days: all non-blocked dates.</p>
          </div>

          {/* Calendar legend */}
          <div style={{
            marginTop: 16, padding: '14px 16px',
            backgroundColor: 'var(--surface-card)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
          }}>
            <p style={{ fontSize: 'var(--text-small)', fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)', marginBottom: 10 }}>
              Calendar legend
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-red-bg)', border: '1px solid var(--color-red-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'var(--text-small)', color: 'var(--color-red-600)', fontWeight: 'var(--weight-bold)' }}>1</div>
                <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>Red — blocked holiday date</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-emerald-bg)', border: '1px solid var(--color-emerald-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'var(--text-small)', color: 'var(--color-emerald-text)', fontWeight: 'var(--weight-bold)' }}>2</div>
                <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>Green — working day</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--surface-page)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'var(--text-small)', color: 'var(--text-secondary)', fontWeight: 'var(--weight-bold)' }}>3</div>
                <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>Default — normal working day</span>
              </div>
            </div>
          </div>

          {/* Unassigned faculty */}
          {unassigned?.data?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 mt-6">
              <p className="text-sm font-medium text-slate-700 mb-3">Unassigned faculty ({unassigned.total})</p>
              <Table>
                <thead>
                  <tr><Th>Name</Th><Th>Dept.</Th><Th>Slots picked</Th><Th>Required</Th><Th /></tr>
                </thead>
                <tbody>
                  {unassigned.data.map((f) => (
                    <tr key={f.id}>
                      <Td className="font-medium">{f.name}</Td>
                      <Td>{f.department ?? '—'}</Td>
                      <Td>{f.slots_picked}</Td>
                      <Td>{f.slots_required}</Td>
                      <Td>
                        <Button size="xs" variant="default" onClick={() => setShowAssign(f)}>Assign Slots</Button>
                      </Td>
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

      {closingWindow && (
        <ConfirmDialog
          open
          title="Close Scheduling Window"
          message="Faculty will no longer be able to pick or change duty slots for this month."
          confirmText="Close Window"
          isDangerous
          isLoading={closeWindow.isPending}
          onConfirm={doClose}
          onCancel={() => setClosingWindow(false)}
        />
      )}

      {showSetSessions && (
        <SetSessionsModal
          currentValue={config?.sessions_per_faculty ?? 3}
          onClose={() => setShowSetSessions(false)}
          onSave={handleSetSessions}
          loading={updateSessions.isPending}
        />
      )}
    </Layout>
  );
}
