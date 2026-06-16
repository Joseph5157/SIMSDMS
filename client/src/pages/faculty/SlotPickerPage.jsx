import { useState, useRef, useEffect } from 'react';
import Layout from '../../components/Layout';
import Badge from '../../components/ui/Badge';
import { Button, Skeleton, Modal, Text, Group } from '@mantine/core';
import { useToast } from '../../components/ui/Toast';
import { useAvailableSlots, useMonthSlots, usePickSlot, useUnpickSlot } from '../../hooks/useDutySlots';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['S','M','T','W','T','F','S'];
const DAY_LABELS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function localDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

export default function SlotPickerPage({ user }) {
  const toast = useToast();
  const now   = new Date();
  const todayStr = localDateStr(now);

  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selected, setSelected] = useState(null); // dateStr of tapped cell
  const [pickingId, setPickingId] = useState(null);
  const [unpickTarget, setUnpickTarget] = useState(null); // slot to confirm unpick
  const [unpicking, setUnpicking] = useState(false);
  const panelRef = useRef(null);

  // When a date is selected, scroll its session panel into view so the
  // Pick buttons clear the fixed bottom nav bar.
  useEffect(() => {
    if (selected && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selected]);

  const { data: available, isLoading: loadingAvail } = useAvailableSlots(year, month);
  const { data: mySlots,   isLoading: loadingMine }  = useMonthSlots(year, month);

  const pick   = usePickSlot();
  const unpick = useUnpickSlot();

  async function handlePick(dateStr, session) {
    const key = `${dateStr}|${session}`;
    setPickingId(key);
    try {
      await pick.mutateAsync({ duty_date: dateStr, session_type: session });
      toast({ message: `✅ ${session === 'morning' ? 'Morning' : 'Afternoon'} on ${dateStr} picked!` });
      setSelected(null);
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    } finally {
      setPickingId(null);
    }
  }

  async function confirmUnpick() {
    if (!unpickTarget) return;
    setUnpicking(true);
    try {
      await unpick.mutateAsync(unpickTarget.id);
      toast({ message: 'Slot unpicked.' });
      setUnpickTarget(null);
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    } finally {
      setUnpicking(false);
    }
  }

  // ── Build lookup maps ──────────────────────────────────────────────────────
  const availMap = {}; // dateStr → ['morning','afternoon']
  for (const s of available?.data ?? []) {
    if (!availMap[s.duty_date]) availMap[s.duty_date] = [];
    availMap[s.duty_date].push(s.session_type);
  }

  const pickedMap = {}; // dateStr → {morning?: slot, afternoon?: slot}
  for (const s of mySlots?.data ?? []) {
    const key = String(s.duty_date).slice(0, 10);
    if (!pickedMap[key]) pickedMap[key] = {};
    pickedMap[key][s.session_type] = s;
  }

  const windowOpen     = !!available && !available?.error;
  const pickedCount    = mySlots?.data?.length ?? 0;
  const remainingSlots = available?.slots_remaining ?? 0;
  const requiredSlots  = available?.sessions_per_faculty ?? 3;

  // ── Calendar grid ──────────────────────────────────────────────────────────
  const firstWeekday  = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth   = new Date(year, month, 0).getDate();

  const cells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    }),
  ];
  // pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setSelected(null);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setSelected(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout user={user}>
      <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3, margin: 0 }}>My Duty Slots</h2>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>Pick your duty slots for the month</p>
      </div>

      {/* ── Window status ── */}
      {loadingAvail ? (
        <Skeleton height={44} radius={12} mb={16} />
      ) : windowOpen ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 12, padding: '10px 14px', marginBottom: 16,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#065f46', margin: 0 }}>
            Window <strong>open</strong> ·{' '}
            {loadingMine
              ? <Skeleton display="inline-block" w={80} h={12} radius={4} />
              : <>{pickedCount} of {requiredSlots} picked · <strong>{remainingSlots} left to pick</strong></>}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#f8fafc', border: '1px solid #e2e8f0',
          borderRadius: 12, padding: '10px 14px', marginBottom: 16,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#94a3b8', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Scheduling window is <strong>closed</strong>.
          </p>
        </div>
      )}

      {/* ── Calendar ── */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
        padding: '16px', marginBottom: 20,
      }}>
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={prevMonth} style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0',
            background: '#f8fafc', cursor: 'pointer', fontSize: 16, color: '#334155',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>‹</button>
          <p style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', margin: 0 }}>
            {MONTH_NAMES[month - 1]} {year}
          </p>
          <button onClick={nextMonth} style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0',
            background: '#f8fafc', cursor: 'pointer', fontSize: 16, color: '#334155',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>›</button>
        </div>

        {/* Day-of-week headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
          {DAY_LABELS.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#94a3b8', padding: '4px 0' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Loading state */}
        {(loadingAvail || loadingMine) ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} height={40} radius={8} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {cells.map((dateStr, i) => {
              if (!dateStr) return <div key={i} />;

              const isPast       = dateStr < todayStr;
              const isToday      = dateStr === todayStr;
              const avail        = availMap[dateStr] ?? [];
              const picked       = pickedMap[dateStr] ?? {};
              const hasMorn      = avail.includes('morning');
              const hasAftern    = avail.includes('afternoon');
              const pickedMorn   = !!picked.morning;
              const pickedAftern = !!picked.afternoon;
              const isPastPicked = isPast && (pickedMorn || pickedAftern);
              const isSelected   = selected === dateStr;
              const hasAnything  = avail.length > 0 || pickedMorn || pickedAftern;
              const isClickable  = !isPast && hasAnything && windowOpen;

              const d = parseInt(dateStr.slice(8), 10);

              let bg = 'transparent', border = 'none', color = '#94a3b8';
              if (isToday)      { border = '2px solid #2563eb'; color = '#2563eb'; }
              if (isPast)       { color = '#cbd5e1'; }
              if (isPastPicked) { bg = '#f1f5f9'; color = '#94a3b8'; }
              if (isSelected)   { bg = '#eff6ff'; border = '2px solid #2563eb'; }
              if (!isPast && (pickedMorn || pickedAftern)) { color = '#0f172a'; }

              return (
                <button
                  key={i}
                  onClick={() => isClickable && setSelected(isSelected ? null : dateStr)}
                  disabled={!isClickable}
                  style={{
                    width: '100%', aspectRatio: '1', borderRadius: 8,
                    border: border || '1px solid transparent',
                    background: bg, cursor: isClickable ? 'pointer' : 'default',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: 2, gap: 2,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color, lineHeight: 1 }}>
                    {d}
                  </span>
                  {/* Session dots */}
                  <div style={{ display: 'flex', gap: 2, minHeight: 5 }}>
                    {(hasMorn || pickedMorn) && (
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: pickedMorn ? (isPast ? '#94a3b8' : '#10b981') : '#3b82f6',
                      }} />
                    )}
                    {(hasAftern || pickedAftern) && (
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: pickedAftern ? (isPast ? '#94a3b8' : '#10b981') : '#f97316',
                      }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Selected-date session picker panel ── */}
        {selected && (() => {
          const avail        = availMap[selected] ?? [];
          const picked       = pickedMap[selected] ?? {};
          const hasMorn      = avail.includes('morning');
          const hasAftern    = avail.includes('afternoon');
          const pickedMorn   = !!picked.morning;
          const pickedAftern = !!picked.afternoon;
          const d            = new Date(selected);

          return (
            <div ref={panelRef} style={{
              marginTop: 14, padding: 14,
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12,
              scrollMarginTop: 80, scrollMarginBottom: 80,
            }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 10px' }}>
                {DAY_LABELS_FULL[d.getDay()]}, {d.getDate()} {MONTH_NAMES[d.getMonth()]}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Morning */}
                {pickedMorn ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px' }}>
                    <span style={{ fontSize: 13, color: '#065f46', fontWeight: 600 }}>✅ Morning picked</span>
                    {picked.morning?.status === 'scheduled' && (
                      <button onClick={() => setUnpickTarget(picked.morning)} style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Unpick</button>
                    )}
                  </div>
                ) : hasMorn ? (
                  <Button
                    size="md" fullWidth
                    loading={pickingId === `${selected}|morning`}
                    disabled={!!pickingId && pickingId !== `${selected}|morning`}
                    onClick={() => handlePick(selected, 'morning')}
                    leftSection={<span style={{ fontSize: 11, background: 'rgba(255,255,255,0.25)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>AM</span>}
                  >
                    Pick Morning (9:00 AM)
                  </Button>
                ) : null}

                {/* Afternoon */}
                {pickedAftern ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px' }}>
                    <span style={{ fontSize: 13, color: '#065f46', fontWeight: 600 }}>✅ Afternoon picked</span>
                    {picked.afternoon?.status === 'scheduled' && (
                      <button onClick={() => setUnpickTarget(picked.afternoon)} style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Unpick</button>
                    )}
                  </div>
                ) : hasAftern ? (
                  <Button
                    size="md" fullWidth variant="default"
                    loading={pickingId === `${selected}|afternoon`}
                    disabled={!!pickingId && pickingId !== `${selected}|afternoon`}
                    onClick={() => handlePick(selected, 'afternoon')}
                    style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa' }}
                    leftSection={<span style={{ fontSize: 11, background: '#fed7aa', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>PM</span>}
                  >
                    Pick Afternoon (2:00 PM)
                  </Button>
                ) : null}

                {remainingSlots <= 0 && !pickedMorn && !pickedAftern && (
                  <p style={{ fontSize: 12, color: '#92400e', margin: 0, textAlign: 'center' }}>
                    You've reached your {requiredSlots}-slot limit. Unpick a slot to choose a different one.
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#64748b' }}>Morning available</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#64748b' }}>Afternoon available</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#64748b' }}>Picked</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#64748b' }}>Past</span>
          </div>
        </div>

        {/* No slots message when window is open but empty */}
        {windowOpen && !loadingAvail && (available?.data ?? []).length === 0 && (
          <div style={{
            marginTop: 16, padding: '12px 14px',
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
          }}>
            <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>
              ⚠️ No slots set up for this month yet. Ask your Admin to configure working days on the Duty Calendar page.
            </p>
          </div>
        )}
      </div>

      {/* ── My Picks summary ── */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          My picks · {pickedCount} / {requiredSlots} required
        </p>
        {loadingMine ? (
          <Skeleton height={52} radius={12} />
        ) : !mySlots?.data?.length ? (
          <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>
            Tap a highlighted date above to pick your slots.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {mySlots.data.map((s) => {
              const key = String(s.duty_date).slice(0, 10);
              const d = new Date(key);
              return (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
                  padding: '10px 14px',
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: s.session_type === 'morning' ? '#3b82f6' : '#f97316',
                  }} />
                  <p style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0, textTransform: 'capitalize' }}>
                    {s.session_type} · {d.getDate()} {MONTH_NAMES[d.getMonth()].slice(0,3)}
                  </p>
                  <Badge status={s.status} />
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* ── Unpick confirmation modal ── */}
      <Modal
        opened={!!unpickTarget}
        onClose={() => !unpicking && setUnpickTarget(null)}
        title="Unpick this slot?"
        centered
        size="sm"
        withCloseButton={!unpicking}
      >
        {unpickTarget && (
          <>
            <Text size="sm" c="dimmed" mb="lg">
              You are about to remove your{' '}
              <strong style={{ textTransform: 'capitalize' }}>{unpickTarget.session_type}</strong>{' '}
              slot on{' '}
              <strong>
                {(() => {
                  const d = new Date(String(unpickTarget.duty_date).slice(0, 10));
                  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
                })()}
              </strong>
              . This slot will be released and available for others to pick.
            </Text>
            <Group justify="flex-end" gap="sm">
              <Button variant="default" onClick={() => setUnpickTarget(null)} disabled={unpicking}>
                Cancel
              </Button>
              <Button color="red" onClick={confirmUnpick} loading={unpicking}>
                Unpick
              </Button>
            </Group>
          </>
        )}
      </Modal>
    </Layout>
  );
}
