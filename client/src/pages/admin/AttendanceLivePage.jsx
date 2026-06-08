import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input, { Select } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useLiveAttendance, useOverrideAttendance } from '../../hooks/useAttendance';

// ── Override modal ────────────────────────────────────────────────────────────
function OverrideModal({ record, onClose }) {
  const toast    = useToast();
  const override = useOverrideAttendance();
  const [form, setForm] = useState({
    in_status:       record?.in_status ?? 'normal',
    override_reason: '',
  });
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

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ label, count, color }) {
  const cls = {
    green:  'bg-green-50  text-green-700  border-green-200',
    amber:  'bg-amber-50  text-amber-700  border-amber-200',
    red:    'bg-red-50    text-red-700    border-red-200',
    blue:   'bg-blue-50   text-blue-700   border-blue-200',
    gray:   'bg-slate-50  text-slate-500  border-slate-200',
  }[color] ?? 'bg-slate-50 text-slate-500 border-slate-200';

  return (
    <div className={`flex items-center gap-2.5 border rounded-lg px-4 py-2 ${cls}`}>
      <span className="text-xl font-bold">{count}</span>
      <span className="text-[12px] font-medium">{label}</span>
    </div>
  );
}

// ── Faculty card ──────────────────────────────────────────────────────────────
function FacultyCard({ record, onOverride }) {
  // Determine left-border colour from attendance status + in_status
  const borderCls =
    record.attendance_status === 'checked_in'  && record.in_status === 'late'    ? 'border-l-amber-500' :
    record.attendance_status === 'checked_in'  || record.attendance_status === 'checked_out' ? 'border-l-green-500' :
    record.in_status === 'absent'              ? 'border-l-red-500' :
    'border-l-slate-300';

  const statusBadge =
    record.attendance_status === 'checked_out' ? 'completed' :
    record.attendance_status === 'checked_in'  ? (record.in_status === 'late' ? 'late' : 'active') :
    record.in_status === 'absent'              ? 'absent' :
    'not_checked_in';

  const timeLabel =
    record.in_time
      ? `In: ${new Date(record.in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
      : record.attendance_status === 'not_checked_in'
      ? 'Not checked in'
      : '—';

  return (
    <div
      className={`bg-white border border-slate-200 border-l-4 ${borderCls} rounded-xl p-4 cursor-pointer hover:shadow-sm transition-shadow`}
      onClick={() => onOverride(record)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-900 truncate">{record.faculty?.name}</p>
          <p className="text-[11px] text-slate-400 truncate">{record.faculty?.department}</p>
        </div>
        <Badge
          status={record.session_type === 'morning' ? 'scheduled' : 'open'}
          label={record.session_type === 'morning' ? 'Morning' : 'Afternoon'}
        />
      </div>
      <div className="flex items-center justify-between">
        <Badge status={statusBadge} />
        <span className="text-[11px] text-slate-400 font-mono">{timeLabel}</span>
      </div>
      {record.auto_out && (
        <p className="text-[11px] text-orange-500 mt-1.5">Auto clocked-out</p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AttendanceLivePage({ user }) {
  const { data, isLoading, dataUpdatedAt } = useLiveAttendance();
  const [overriding, setOverriding] = useState(null);

  const records  = data?.data ?? [];
  const checkedIn    = records.filter(r => r.attendance_status === 'checked_in').length;
  const checkedOut   = records.filter(r => r.attendance_status === 'checked_out').length;
  const lateCount    = records.filter(r => r.in_status === 'late').length;
  const notIn        = records.filter(r => r.attendance_status === 'not_checked_in').length;
  const autoOut      = records.filter(r => r.auto_out).length;

  const lastUpdate = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <Layout user={user}>
      <PageHeader
        title="Live Attendance"
        subtitle={`Today · Refreshes every 30s · Last updated ${lastUpdate}`}
      />

      {/* Stat pills */}
      <div className="flex flex-wrap gap-3 mb-6">
        <StatPill label="Checked in"    count={checkedIn}  color="green" />
        <StatPill label="Checked out"   count={checkedOut} color="blue"  />
        <StatPill label="Late arrivals" count={lateCount}  color="amber" />
        <StatPill label="Not checked in" count={notIn}     color="red"   />
        <StatPill label="Auto clock-out" count={autoOut}   color="gray"  />
      </div>

      {isLoading ? (
        <p className="text-[13px] text-slate-400">Loading…</p>
      ) : !records.length ? (
        <div className="text-center py-16 text-slate-400 text-[13px]">No duty slots scheduled today.</div>
      ) : (
        <>
          {/* Morning */}
          {records.filter(r => r.session_type === 'morning').length > 0 && (
            <div className="mb-6">
              <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Morning duty · {records.filter(r => r.session_type === 'morning').length} faculty
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {records.filter(r => r.session_type === 'morning').map((r) => (
                  <FacultyCard key={r.slot_id} record={r} onOverride={setOverriding} />
                ))}
              </div>
            </div>
          )}

          {/* Afternoon */}
          {records.filter(r => r.session_type === 'afternoon').length > 0 && (
            <div>
              <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Afternoon duty · {records.filter(r => r.session_type === 'afternoon').length} faculty
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {records.filter(r => r.session_type === 'afternoon').map((r) => (
                  <FacultyCard key={r.slot_id} record={r} onOverride={setOverriding} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {overriding && (
        <OverrideModal record={overriding} onClose={() => setOverriding(null)} />
      )}
    </Layout>
  );
}
