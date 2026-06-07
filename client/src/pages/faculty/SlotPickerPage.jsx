import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { useAvailableSlots, useMonthSlots, usePickSlot, useUnpickSlot } from '../../hooks/useDutySlots';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Date tile card ────────────────────────────────────────────────────────────
function SlotCard({ slot, action }) {
  const d = new Date(slot.duty_date);
  const day   = d.getDate();
  const month = MONTHS[d.getMonth()];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
      {/* Date tile */}
      <div className="w-12 shrink-0 text-center">
        <p className="text-[22px] font-bold text-slate-900 leading-none">{day}</p>
        <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wide">{month}</p>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-900 capitalize">{slot.session_type} session</p>
        {slot.status && (
          <div className="mt-1">
            <Badge status={slot.status} />
          </div>
        )}
      </div>

      {/* Action */}
      {action}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
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

  const windowOpen      = available && !available?.error;
  const remainingSlots  = available?.slots_remaining ?? 0;
  const pickedCount     = mySlots?.data?.length ?? 0;
  // How many are required — infer from remaining + picked if available gives us slots_per_faculty
  const requiredSlots   = available?.slots_per_faculty ?? (pickedCount + remainingSlots);

  const selectCls = 'border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-blue-500 bg-white';

  return (
    <Layout user={user}>
      <PageHeader title="My Duty Slots" subtitle="Pick your slots for the month" />

      {/* Month selector */}
      <div className="flex items-center gap-3 mb-5">
        <select value={year} onChange={(e) => setYear(+e.target.value)} className={selectCls}>
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        <select value={month} onChange={(e) => setMonth(+e.target.value)} className={selectCls}>
          {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
      </div>

      {/* Window status banner */}
      {loadingAvail ? null : windowOpen ? (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6">
          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
          <p className="text-[13px] text-green-800">
            Scheduling window is <strong>open</strong>.
            {' '}{pickedCount} of {requiredSlots} slots picked · {remainingSlots} remaining.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 mb-6">
          <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
          <p className="text-[13px] text-slate-600">
            Scheduling window is <strong>closed</strong>. Contact Admin if you need slots assigned.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Left — My picked slots */}
        <div>
          <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
            My picks ({pickedCount})
          </p>
          {loadingMine ? (
            <p className="text-[13px] text-slate-400">Loading…</p>
          ) : !mySlots?.data?.length ? (
            <p className="text-[13px] text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-xl">
              No slots picked yet.
            </p>
          ) : (
            <div className="space-y-2">
              {mySlots.data.map((s) => (
                <SlotCard
                  key={s.id}
                  slot={s}
                  action={
                    s.status === 'scheduled' ? (
                      <Button variant="ghost" size="sm" onClick={() => handleUnpick(s.id)}>
                        Unpick
                      </Button>
                    ) : null
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Right — Available slots */}
        <div>
          <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Available slots
          </p>
          {loadingAvail ? (
            <p className="text-[13px] text-slate-400">Loading…</p>
          ) : !windowOpen ? (
            <p className="text-[13px] text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-xl">
              Window is closed.
            </p>
          ) : !available?.data?.length ? (
            <p className="text-[13px] text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-xl">
              No available slots.
            </p>
          ) : (
            <div className="space-y-2">
              {available.data.map((s, i) => (
                <SlotCard
                  key={i}
                  slot={s}
                  action={
                    <Button
                      size="sm"
                      disabled={remainingSlots <= 0 || pick.isPending}
                      loading={pick.isPending}
                      onClick={() => handlePick(s)}
                    >
                      Pick
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
