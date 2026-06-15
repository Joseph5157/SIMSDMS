import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import Badge from '../../components/ui/Badge';
import { Button, Skeleton } from '@mantine/core';
import { useToast } from '../../components/ui/Toast';
import { useAvailableSlots, useMonthSlots, usePickSlot, useUnpickSlot } from '../../hooks/useDutySlots';

const MONTHS    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS      = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Slot card (shared base) ────────────────────────────────────────────────────
function SlotRow({ dateStr, sessionType, right }) {
  const d = new Date(dateStr);
  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {/* Date tile */}
      <div style={{
        width: 46, height: 46, borderRadius: 10, flexShrink: 0,
        background: '#f8fafc', border: '1px solid #e2e8f0',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
          {d.getDate()}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {MONTHS[d.getMonth()]}
        </span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 2, textTransform: 'capitalize' }}>
          {sessionType} session
        </p>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
          {DAYS[d.getDay()]} · {sessionType === 'morning' ? '9:00 AM' : '2:00 PM'}
        </p>
      </div>

      {/* Right slot (button or badge) */}
      <div style={{ flexShrink: 0 }}>{right}</div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SlotPickerPage({ user }) {
  const toast = useToast();
  const now   = new Date();
  // Use local date string to avoid UTC-day-shift issues on Indian devices
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [pickingId, setPickingId] = useState(null);

  const { data: available, isLoading: loadingAvail } = useAvailableSlots(year, month);
  const { data: mySlots,   isLoading: loadingMine }  = useMonthSlots(year, month);

  const pick   = usePickSlot();
  const unpick = useUnpickSlot();

  async function handlePick(slot) {
    const key = `${slot.duty_date}|${slot.session_type}`;
    setPickingId(key);
    try {
      await pick.mutateAsync({ duty_date: slot.duty_date, session_type: slot.session_type });
      toast({ message: `✅ ${slot.session_type} slot on ${slot.duty_date} picked!` });
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

  const windowOpen     = !!available && !available?.error;
  const pickedCount    = mySlots?.data?.length ?? 0;
  const remainingSlots = available?.slots_remaining ?? 0;
  const requiredSlots  = available?.slots_per_faculty ?? 3;

  // Only show today + future — use local date comparison, not UTC
  const futureSlots = (available?.data ?? []).filter(s => s.duty_date >= todayStr);

  const selectCls = 'border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-blue-500 bg-white';

  return (
    <Layout user={user}>
      <PageHeader title="My Duty Slots" subtitle="Pick your slots for the month" />

      {/* Month selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <select value={year} onChange={(e) => setYear(+e.target.value)} className={selectCls}>
          {[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y => <option key={y}>{y}</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(+e.target.value)} className={selectCls}>
          {FULL_MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
      </div>

      {/* Window status banner */}
      {loadingAvail ? (
        <Skeleton height={44} radius={12} mb={20} />
      ) : windowOpen ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 12, padding: '12px 16px', marginBottom: 20,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#065f46', margin: 0 }}>
            Window <strong>open</strong> · {loadingMine
              ? <Skeleton display="inline-block" w={80} h={12} radius={4} />
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
      )}

      {/* ── AVAILABLE SLOTS (shown first — primary action) ── */}
      {windowOpen && (
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Available to pick ({futureSlots.length})
          </p>

          {remainingSlots <= 0 ? (
            <div style={{
              padding: '16px', textAlign: 'center',
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14,
            }}>
              <p style={{ fontSize: 13, color: '#065f46', margin: 0, fontWeight: 600 }}>
                ✅ All {requiredSlots} required slots picked for this month!
              </p>
            </div>
          ) : loadingAvail ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map(i => <Skeleton key={i} height={74} radius={14} />)}
            </div>
          ) : futureSlots.length === 0 ? (
            <div style={{
              padding: '24px 16px', textAlign: 'center',
              border: '1.5px dashed #e2e8f0', borderRadius: 14,
            }}>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
                No available slots for the rest of this month.
              </p>
              <p style={{ fontSize: 11, color: '#cbd5e1', marginTop: 6 }}>
                Ask your Admin to assign slots manually.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {futureSlots.map((s) => {
                const key = `${s.duty_date}|${s.session_type}`;
                return (
                  <SlotRow
                    key={key}
                    dateStr={s.duty_date}
                    sessionType={s.session_type}
                    right={
                      <Button
                        size="md"
                        disabled={!!pickingId && pickingId !== key}
                        loading={pickingId === key}
                        onClick={() => handlePick(s)}
                      >
                        Pick
                      </Button>
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MY PICKS (below — reference, not primary action) ── */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          My picks ({pickedCount}{requiredSlots ? ` / ${requiredSlots} required` : ''})
        </p>

        {loadingMine ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2].map(i => <Skeleton key={i} height={74} radius={14} />)}
          </div>
        ) : !mySlots?.data?.length ? (
          <div style={{
            padding: '24px 16px', textAlign: 'center',
            border: '1.5px dashed #e2e8f0', borderRadius: 14,
          }}>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>No slots picked yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mySlots.data.map((s) => (
              <SlotRow
                key={s.id}
                dateStr={s.duty_date instanceof Date
                  ? s.duty_date.toISOString().slice(0,10)
                  : String(s.duty_date).slice(0,10)}
                sessionType={s.session_type}
                right={
                  s.status === 'scheduled'
                    ? <Button variant="subtle" color="red" size="xs" onClick={() => handleUnpick(s.id)}>Unpick</Button>
                    : <Badge status={s.status} />
                }
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
