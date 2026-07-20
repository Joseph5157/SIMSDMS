import { useState, useRef, useEffect } from 'react';
import Layout from '../../components/Layout';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import { Button } from '@mantine/core';
import { useToast } from '../../components/ui/Toast';
import { useAvailableSlots, useMonthSlots, usePickSlot } from '../../hooks/useDutySlots';
import { useDutyTimingSettings } from '../../hooks/useDutyTimingSettings';
import { formatHourMin } from '../../utils/time';

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
  const { data: timingSettings } = useDutyTimingSettings();

  const morningStartLabel = timingSettings
    ? formatHourMin(timingSettings.session_start_morning_hour, timingSettings.session_start_morning_min)
    : '8:00 AM';
  const afternoonStartLabel = timingSettings
    ? formatHourMin(timingSettings.session_start_afternoon_hour, timingSettings.session_start_afternoon_min)
    : '1:00 PM';

  const pick = usePickSlot();

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
      <div className="text-center pt-4 pb-2.5 mb-3 border-b border-[var(--border-strong)]">
        <h2 className="text-[18px] font-[var(--weight-bold)] leading-[1.3] m-0">My Duty Slots</h2>
        <p className="text-[12px] text-[var(--text-muted)] mt-1 mb-0">Pick your duty slots for the month</p>
      </div>

      {/* ── Window status ── */}
      {loadingAvail ? (
        <Skeleton height="44px" className="rounded-xl mb-4" />
      ) : windowOpen ? (
        <div className="flex items-center gap-2.5 bg-[var(--color-emerald-bg)] border border-[var(--color-emerald-border)] rounded-[var(--radius-lg)] px-3.5 py-2.5 mb-4">
          <span className="w-[7px] h-[7px] rounded-[var(--radius-full)] bg-[var(--color-emerald-solid)] shrink-0" />
          <p className="text-[13px] text-[var(--color-emerald-text)] m-0">
            Window <strong>open</strong> ·{' '}
            {loadingMine
              ? <Skeleton width="80px" height="12px" className="inline-block" />
              : <>{pickedCount} of {requiredSlots} picked · <strong>{remainingSlots} left to pick</strong></>}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 bg-[var(--surface-page)] border border-[var(--border)] rounded-[var(--radius-lg)] px-3.5 py-2.5 mb-4">
          <span className="w-[7px] h-[7px] rounded-[var(--radius-full)] bg-[var(--text-muted)] shrink-0" />
          <p className="text-[13px] text-[var(--text-muted)] m-0">
            Scheduling window is <strong>closed</strong>.
          </p>
        </div>
      )}

      {/* ── Calendar ── */}
      <div className="md:max-w-[420px] bg-[var(--surface-card)] rounded-[var(--radius-2xl)] border border-[var(--border)] p-4 mb-5">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="w-11 h-11 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-page)] cursor-pointer text-[16px] text-[var(--text-secondary)] flex items-center justify-center">‹</button>
          <p className="font-[var(--weight-bold)] text-[15px] text-[var(--text-primary)] m-0">
            {MONTH_NAMES[month - 1]} {year}
          </p>
          <button onClick={nextMonth} className="w-11 h-11 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-page)] cursor-pointer text-[16px] text-[var(--text-secondary)] flex items-center justify-center">›</button>
        </div>

        {/* Legend — above grid */}
        <div className="flex gap-3.5 mb-2.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[var(--radius-full)] bg-[var(--color-blue-500)] inline-block" />
            <span className="text-[length:var(--text-small)] text-[var(--text-secondary)]">Morning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[var(--radius-full)] bg-[var(--color-orange-solid)] inline-block" />
            <span className="text-[length:var(--text-small)] text-[var(--text-secondary)]">Afternoon</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[var(--radius-full)] bg-[var(--color-emerald-solid)] inline-block" />
            <span className="text-[length:var(--text-small)] text-[var(--text-secondary)]">Picked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[var(--radius-full)] bg-[var(--color-slate-400)] inline-block" />
            <span className="text-[length:var(--text-small)] text-[var(--text-secondary)]">Past</span>
          </div>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-[var(--weight-bold)] text-[var(--text-muted)] py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Loading state */}
        {(loadingAvail || loadingMine) ? (
          <div className="grid grid-cols-7 gap-[3px]">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} height="40px" className="rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-[3px]">
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

              let bg = 'transparent', border = 'none', color = 'var(--text-muted)';
              if (isToday)      { border = '2px solid var(--brand)'; color = 'var(--brand)'; }
              if (isPast)       { color = 'var(--text-muted)'; }
              if (isPastPicked) { bg = 'var(--surface-page)'; color = 'var(--text-muted)'; }
              if (isSelected)   { bg = 'var(--color-blue-50)'; border = '2px solid var(--brand)'; }
              if (!isPast && (pickedMorn || pickedAftern)) { color = 'var(--text-primary)'; }

              // Build accessible label
              const dateObj = new Date(year, month - 1, d);
              const fullDateLabel = dateObj.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
              const stateLabel = isPast ? 'past' : (pickedMorn || pickedAftern) ? 'picked' : hasAnything ? 'available' : 'no sessions';
              const ariaLabel = `${fullDateLabel} — ${stateLabel}`;

              return (
                <button
                  key={i}
                  onClick={() => isClickable && setSelected(isSelected ? null : dateStr)}
                  disabled={!isClickable}
                  aria-label={ariaLabel}
                  aria-pressed={isSelected}
                  aria-disabled={!isClickable}
                  className="w-full aspect-square rounded-[var(--radius-md)] flex flex-col items-center justify-center p-0.5 gap-0.5 transition-[transform,background-color] duration-150 ease-in-out"
                  style={{
                    border: border || '1px solid transparent',
                    background: bg,
                    cursor: isClickable ? 'pointer' : 'default',
                    transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                  }}
                >
                  <span className="text-[13px] leading-none" style={{ fontWeight: isToday ? 700 : 500, color }}>
                    {d}
                  </span>
                  {/* Session dots */}
                  <div className="flex gap-[3px] min-h-2">
                    {(hasMorn || pickedMorn) && (
                      <span
                        className="w-2 h-2 rounded-[var(--radius-full)] shrink-0"
                        style={{ background: pickedMorn ? (isPast ? 'var(--color-slate-400)' : 'var(--color-emerald-solid)') : 'var(--color-blue-500)' }}
                      />
                    )}
                    {(hasAftern || pickedAftern) && (
                      <span
                        className="w-2 h-2 rounded-[var(--radius-full)] shrink-0"
                        style={{ background: pickedAftern ? (isPast ? 'var(--color-slate-400)' : 'var(--color-emerald-solid)') : 'var(--color-orange-solid)' }}
                      />
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
            <div ref={panelRef} className="mt-3.5 p-3.5 bg-[var(--surface-page)] border border-[var(--border)] rounded-[var(--radius-lg)] scroll-mt-20 scroll-mb-20">
              <p className="text-[13px] font-[var(--weight-bold)] text-[var(--text-primary)] mt-0 mb-2.5">
                {DAY_LABELS_FULL[d.getDay()]}, {d.getDate()} {MONTH_NAMES[d.getMonth()]}
              </p>

              <div className="flex flex-col gap-2">
                {/* Morning */}
                {pickedMorn ? (
                  <div className="flex items-center justify-between bg-[var(--color-emerald-bg)] border border-[var(--color-emerald-border)] rounded-[var(--radius-lg)] px-3.5 py-2.5">
                    <span className="text-[13px] text-[var(--color-emerald-text)] font-[var(--weight-semibold)]">✅ Morning picked</span>
                  </div>
                ) : hasMorn ? (
                  <Button
                    size="md" fullWidth
                    loading={pickingId === `${selected}|morning`}
                    disabled={!!pickingId && pickingId !== `${selected}|morning`}
                    onClick={() => handlePick(selected, 'morning')}
                    leftSection={<span className="text-[11px] bg-[rgba(255,255,255,0.25)] px-1.5 py-0.5 rounded-[var(--radius-sm)] font-[var(--weight-bold)]">AM</span>}
                  >
                    Pick Morning ({morningStartLabel})
                  </Button>
                ) : null}

                {/* Afternoon */}
                {pickedAftern ? (
                  <div className="flex items-center justify-between bg-[var(--color-emerald-bg)] border border-[var(--color-emerald-border)] rounded-[var(--radius-lg)] px-3.5 py-2.5">
                    <span className="text-[13px] text-[var(--color-emerald-text)] font-[var(--weight-semibold)]">✅ Afternoon picked</span>
                  </div>
                ) : hasAftern ? (
                  <Button
                    size="md" fullWidth variant="default"
                    loading={pickingId === `${selected}|afternoon`}
                    disabled={!!pickingId && pickingId !== `${selected}|afternoon`}
                    onClick={() => handlePick(selected, 'afternoon')}
                    style={{ background: 'var(--color-orange-bg)', color: 'var(--color-orange-solid)', border: '1px solid var(--color-orange-border)' }}
                    leftSection={<span className="text-[11px] bg-[var(--color-orange-border)] px-1.5 py-0.5 rounded-[var(--radius-sm)] font-[var(--weight-bold)]">PM</span>}
                  >
                    Pick Afternoon ({afternoonStartLabel})
                  </Button>
                ) : null}

                {remainingSlots <= 0 && !pickedMorn && !pickedAftern && (
                  <p className="text-[12px] text-[var(--color-amber-text)] m-0 text-center">
                    You've reached your {requiredSlots}-slot limit. To change a picked slot, ask your Admin to reassign it, or request a reassignment from a colleague.
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* No slots message when window is open but empty */}
        {windowOpen && !loadingAvail && (available?.data ?? []).length === 0 && (
          <div className="mt-4 px-3.5 py-3 bg-[var(--color-amber-bg)] border border-[var(--color-amber-border)] rounded-[var(--radius-lg)]">
            <p className="text-[12px] text-[var(--color-amber-text)] m-0">
              ⚠️ No slots set up for this month yet. Ask your Admin to configure working days on the Duty Calendar page.
            </p>
          </div>
        )}
      </div>

      {/* ── My Picks summary ── */}
      <div>
        <p className="text-[11px] font-[var(--weight-bold)] text-[var(--text-muted)] uppercase tracking-[var(--tracking-wide)] mb-2.5">
          My picks · {pickedCount} / {requiredSlots} required
        </p>
        {loadingMine ? (
          <Skeleton height="52px" className="rounded-xl" />
        ) : !mySlots?.data?.length ? (
          <p className="text-[13px] text-[var(--text-muted)] text-center py-4">
            Tap a highlighted date above to pick your slots.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {mySlots.data.map((s) => {
              const key = String(s.duty_date).slice(0, 10);
              const d = new Date(key);
              return (
                <div key={s.id} className="flex items-center gap-2.5 bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border)] px-3.5 py-2.5">
                  <span
                    className="w-2 h-2 rounded-[var(--radius-full)] shrink-0"
                    style={{ background: s.session_type === 'morning' ? 'var(--color-blue-500)' : 'var(--color-orange-solid)' }}
                  />
                  <p className="flex-1 text-[13px] font-[var(--weight-semibold)] text-[var(--text-primary)] m-0 capitalize">
                    {s.session_type} · {d.getDate()} {MONTH_NAMES[d.getMonth()].slice(0,3)}
                  </p>
                  <Badge status={s.status} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
