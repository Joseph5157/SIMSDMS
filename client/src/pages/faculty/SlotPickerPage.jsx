import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import Badge from '../../components/ui/Badge';
import { Button, Skeleton } from '@mantine/core';
import { useToast } from '../../components/ui/Toast';
import { useAvailableSlots, useMonthSlots, usePickSlot, useUnpickSlot } from '../../hooks/useDutySlots';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Picked slot card ──────────────────────────────────────────────────────────
function PickedCard({ slot, onUnpick }) {
  const d = new Date(slot.duty_date);
  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {/* Date tile */}
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: '#eff6ff', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: '#2563eb', lineHeight: 1 }}>
          {d.getDate()}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {MONTHS[d.getMonth()]}
        </span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 2, textTransform: 'capitalize' }}>
          {slot.session_type} session
        </p>
        <p style={{ fontSize: 11, color: '#94a3b8' }}>{DAYS[d.getDay()]}</p>
      </div>

      {/* Status / Unpick */}
      {slot.status === 'scheduled' ? (
        <Button variant="subtle" color="red" size="xs" onClick={() => onUnpick(slot.id)}>
          Unpick
        </Button>
      ) : (
        <Badge status={slot.status} />
      )}
    </div>
  );
}

// ── Available slot row ─────────────────────────────────────────────────────────
function AvailableRow({ slot, onPick, disabled, loading }) {
  const d = new Date(slot.duty_date);
  const isMorning = slot.session_type === 'morning';
  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {/* Date tile */}
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: '#f8fafc', border: '1px solid #e2e8f0',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: '#334155', lineHeight: 1 }}>
          {d.getDate()}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {MONTHS[d.getMonth()]}
        </span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 2, textTransform: 'capitalize' }}>
          {slot.session_type} session
        </p>
        <p style={{ fontSize: 11, color: '#94a3b8' }}>
          {DAYS[d.getDay()]} · {isMorning ? '9:00 AM' : '2:00 PM'}
        </p>
      </div>

      {/* Pick button */}
      <Button
        size="sm"
        disabled={disabled}
        loading={loading}
        onClick={() => onPick(slot)}
        style={{ flexShrink: 0, minWidth: 64 }}
      >
        Pick
      </Button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SlotPickerPage({ user }) {
  const toast  = useToast();
  const now    = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [pickingId, setPickingId] = useState(null); // tracks which slot is being picked

  const { data: available, isLoading: loadingAvail } = useAvailableSlots(year, month);
  const { data: mySlots,   isLoading: loadingMine }  = useMonthSlots(year, month);

  const pick   = usePickSlot();
  const unpick = useUnpickSlot();

  async function handlePick(slot) {
    const key = `${slot.duty_date}|${slot.session_type}`;
    setPickingId(key);
    try {
      await pick.mutateAsync({ duty_date: slot.duty_date, session_type: slot.session_type });
      toast({ message: `${slot.session_type} slot on ${slot.duty_date} picked! ✅` });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed to pick slot.', type: 'error' });
    } finally {
      setPickingId(null);
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

  const windowOpen     = available && !available?.error;
  const pickedCount    = mySlots?.data?.length ?? 0;
  const remainingSlots = available?.slots_remaining ?? 0;
  const requiredSlots  = available?.slots_per_faculty ?? (pickedCount + remainingSlots);

  // Only show today + future slots — past dates can't be picked
  const futureSlots = (available?.data ?? []).filter(s => s.duty_date >= todayStr);

  const selectCls = 'border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-blue-500 bg-white';

  return (
    <Layout user={user}>
      <PageHeader title="My Duty Slots" subtitle="Pick your slots for the month" />

      {/* Month selector */}
      <div className="flex items-center gap-3 mb-4">
        <select value={year} onChange={(e) => setYear(+e.target.value)} className={selectCls}>
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        <select value={month} onChange={(e) => setMonth(+e.target.value)} className={selectCls}>
          {FULL_MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
      </div>

      {/* Window status banner */}
      {!loadingAvail && (
        windowOpen ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: 12, padding: '12px 16px', marginBottom: 20,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#065f46', margin: 0 }}>
              Window is <strong>open</strong>.{' '}
              {loadingMine
                ? <Skeleton display="inline-block" w={100} h={12} radius="sm" />
                : <>{pickedCount} of {requiredSlots} picked · <strong>{remainingSlots} remaining</strong></>}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 12, padding: '12px 16px', marginBottom: 20,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#94a3b8', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
              Scheduling window is <strong>closed</strong>. Contact Admin if you need slots assigned.
            </p>
          </div>
        )
      )}

      {/* ── My Picks ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          My picks ({pickedCount}{requiredSlots ? ` / ${requiredSlots} required` : ''})
        </p>
        {loadingMine ? (
          <p style={{ fontSize: 13, color: '#94a3b8' }}>Loading…</p>
        ) : !mySlots?.data?.length ? (
          <div style={{
            padding: '24px 16px', textAlign: 'center',
            border: '1.5px dashed #e2e8f0', borderRadius: 14,
          }}>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>No slots picked yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mySlots.data.map((s) => (
              <PickedCard key={s.id} slot={s} onUnpick={handleUnpick} />
            ))}
          </div>
        )}
      </div>

      {/* ── Available Slots ── */}
      {windowOpen && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Available slots ({futureSlots.length})
          </p>

          {remainingSlots <= 0 ? (
            <div style={{
              padding: '16px', textAlign: 'center',
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14,
            }}>
              <p style={{ fontSize: 13, color: '#065f46', margin: 0 }}>
                ✅ You have picked all {requiredSlots} required slots for this month.
              </p>
            </div>
          ) : loadingAvail ? (
            <p style={{ fontSize: 13, color: '#94a3b8' }}>Loading…</p>
          ) : !futureSlots.length ? (
            <div style={{
              padding: '24px 16px', textAlign: 'center',
              border: '1.5px dashed #e2e8f0', borderRadius: 14,
            }}>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>No available slots for the rest of the month</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {futureSlots.map((s) => {
                const key = `${s.duty_date}|${s.session_type}`;
                return (
                  <AvailableRow
                    key={key}
                    slot={s}
                    onPick={handlePick}
                    disabled={remainingSlots <= 0 || !!pickingId}
                    loading={pickingId === key}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
