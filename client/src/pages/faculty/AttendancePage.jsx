import Layout, { PageHeader } from '../../components/Layout';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { useMonthSlots } from '../../hooks/useDutySlots';
import { useAttendance, useCheckIn, useCheckOut } from '../../hooks/useAttendance';

function SlotAttendanceCard({ slot }) {
  const toast = useToast();
  const { data: att, isLoading } = useAttendance(slot.id);
  const checkIn  = useCheckIn();
  const checkOut = useCheckOut();

  const dateStr = new Date(slot.duty_date).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' });

  async function handleIn() {
    try { await checkIn.mutateAsync(slot.id); toast({ message: 'Checked in!' }); }
    catch (err) { toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' }); }
  }
  async function handleOut() {
    try { await checkOut.mutateAsync(slot.id); toast({ message: 'Checked out.' }); }
    catch (err) { toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' }); }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-slate-900">{dateStr}</p>
          <p className="text-[13px] text-slate-500 capitalize">{slot.session_type} session</p>
        </div>
        <Badge status={slot.status} />
      </div>

      {isLoading ? <p className="text-[13px] text-slate-400">Loading attendance…</p> : (
        <div className="flex items-center gap-4">
          <div className="text-[13px]">
            <p className="text-slate-500 text-xs">Check-in</p>
            <p className="font-medium">{att?.in_time ? new Date(att.in_time).toLocaleTimeString() : '—'}</p>
            {att?.in_status && <Badge status={att.in_status} />}
          </div>
          <div className="text-[13px]">
            <p className="text-slate-500 text-xs">Check-out</p>
            <p className="font-medium">{att?.out_time ? new Date(att.out_time).toLocaleTimeString() : '—'}</p>
            {att?.auto_out && <span className="text-xs text-orange-500">Auto</span>}
          </div>
          <div className="ml-auto flex gap-2">
            {!att?.in_time && (
              <Button size="sm" onClick={handleIn} loading={checkIn.isPending}>Check In</Button>
            )}
            {att?.in_time && !att?.out_time && (
              <Button size="sm" variant="secondary" onClick={handleOut} loading={checkOut.isPending}>Check Out</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AttendancePage({ user }) {
  const now   = new Date();
  const { data } = useMonthSlots(now.getFullYear(), now.getMonth() + 1);
  const slots = data?.data ?? [];

  const todayStr = now.toISOString().slice(0,10);
  const today    = slots.filter(s => new Date(s.duty_date).toISOString().slice(0,10) === todayStr);
  const upcoming = slots.filter(s => new Date(s.duty_date) > now);
  const past     = slots.filter(s => new Date(s.duty_date) < now && new Date(s.duty_date).toISOString().slice(0,10) !== todayStr);

  function renderGroup(label, group) {
    if (!group.length) return null;
    return (
      <div className="mb-6">
        <h3 className="text-[13px] font-semibold text-slate-700 mb-3">{label}</h3>
        <div className="space-y-3">
          {group.map((s) => <SlotAttendanceCard key={s.id} slot={s} />)}
        </div>
      </div>
    );
  }

  return (
    <Layout user={user}>
      <PageHeader title="My Attendance" subtitle="Check in and out for your duty sessions" />
      {renderGroup("Today's duty", today)}
      {renderGroup('Upcoming', upcoming)}
      {renderGroup('Past slots', past)}
      {!slots.length && <p className="text-[13px] text-slate-400">No duty slots this month.</p>}
    </Layout>
  );
}
