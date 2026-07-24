import { useState, useMemo } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow, ErrorRow } from '../../components/ui/Table';
import { TextInput, Select } from '@mantine/core';
import Badge from '../../components/ui/Badge';
import { useAllFacultyDuties } from '../../hooks/useDutySlots';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

// Weekday + day + month for the mobile agenda date headers, e.g. "Mon, 28 Jul".
function fmtDayHeader(d) {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
}

function sessionLabel(s) {
  return s === 'morning' ? 'Morning' : s === 'afternoon' ? 'Afternoon' : (s ?? '—');
}

// The latest reassignment (if any) — SLOT_SELECT returns it as a 1-element array.
function reassignment(slot) {
  return slot.reassignments?.[0] ?? null;
}

const EMPTY_SLOTS = [];

// One session line (AM/PM) inside a mobile agenda day card. `slot` is null when
// that session isn't booked; we only render the "Unbooked" placeholder when the
// list isn't being filtered by a search (absence during a search means "no
// match", not "unbooked", so showing it would mislead).
function AgendaRow({ label, slot, showUnbooked }) {
  if (!slot) {
    if (!showUnbooked) return null;
    return (
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="shrink-0 w-9 text-center text-[length:var(--text-micro)] font-[var(--weight-semibold)] text-[var(--text-muted)] bg-[var(--surface-page)] rounded-[var(--radius-md)] py-0.5">{label}</span>
        <span className="text-[length:var(--text-small)] text-[var(--text-muted)]">Unbooked</span>
      </div>
    );
  }
  const r = reassignment(slot);
  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <span className="shrink-0 w-9 text-center text-[length:var(--text-micro)] font-[var(--weight-semibold)] text-[var(--text-secondary)] bg-[var(--surface-page)] rounded-[var(--radius-md)] py-0.5 mt-0.5">{label}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[length:var(--text-card)] font-[var(--weight-semibold)] text-[var(--text-primary)] whitespace-nowrap overflow-hidden text-ellipsis">{slot.faculty?.name}</p>
          <Badge status={slot.status} />
        </div>
        <p className="text-[length:var(--text-micro)] text-[var(--text-muted)]">{slot.faculty?.department ?? '—'}</p>
        {r && (
          <p className="text-[length:var(--text-micro)] text-[var(--color-indigo-text)] mt-0.5 font-[var(--weight-semibold)]">↻ was: {r.fromFaculty?.name}</p>
        )}
      </div>
    </div>
  );
}

export default function AllFacultyDutiesPage({ user }) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [search, setSearch]   = useState('');
  const [session, setSession] = useState('');

  const { data, isLoading, isError, refetch } = useAllFacultyDuties(year, month);
  // Stable reference while loading, so the useMemo below (keyed on `slots`)
  // doesn't recompute on every render before data arrives.
  const slots = data?.data ?? EMPTY_SLOTS;

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return slots.filter((s) => {
      if (session && s.session_type !== session) return false;
      if (q) {
        const r = reassignment(s);
        const haystack = [
          s.faculty?.name, s.faculty?.department,
          r?.fromFaculty?.name, r?.toFaculty?.name,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [slots, search, session]);

  // Group the filtered slots by date for the mobile agenda. Each day holds at
  // most a morning + an afternoon slot (enforced by the DB unique constraint on
  // [duty_date, session_type]), so a whole month is a short, scannable list.
  const agenda = useMemo(() => {
    const byDate = new Map();
    for (const s of filtered) {
      const key = new Date(s.duty_date).toISOString().slice(0, 10);
      if (!byDate.has(key)) byDate.set(key, { key, date: s.duty_date, morning: null, afternoon: null });
      const g = byDate.get(key);
      if (s.session_type === 'morning') g.morning = s;
      else if (s.session_type === 'afternoon') g.afternoon = s;
    }
    return [...byDate.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filtered]);

  const showAM = session === '' || session === 'morning';
  const showPM = session === '' || session === 'afternoon';
  const showUnbooked = !search.trim();

  return (
    <Layout user={user}>
      <PageHeader
        title="All Faculty Duties"
        subtitle="Every booked duty this month — see who is on duty when to plan reassignments"
      />

      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} aria-label="Previous month"
          className="w-11 h-11 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-secondary)] flex items-center justify-center text-base">‹</button>
        <p className="font-bold text-[15px] text-[var(--text-primary)]">{MONTH_NAMES[month - 1]} {year}</p>
        <button onClick={nextMonth} aria-label="Next month"
          className="w-11 h-11 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-secondary)] flex items-center justify-center text-base">›</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <TextInput
          w={240}
          placeholder="Search faculty or department"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        <Select
          w={160}
          placeholder="All sessions"
          clearable
          value={session || null}
          onChange={(v) => setSession(v ?? '')}
          data={[
            { value: 'morning',   label: 'Morning' },
            { value: 'afternoon', label: 'Afternoon' },
          ]}
        />
        <span className="text-[length:12px] text-[var(--text-muted)]">
          {filtered.length} {filtered.length === 1 ? 'duty' : 'duties'}
        </span>
      </div>

      {/* Mobile day agenda — one card per date, AM + PM stacked */}
      <div className="md:hidden mb-4">
        {isLoading && <div className="bg-[var(--surface-card)] rounded-[var(--radius-2xl)] border border-[var(--border)] p-10 text-center text-[var(--text-muted)] text-[length:var(--text-card)]">Loading…</div>}
        {isError && <div className="bg-[var(--surface-card)] rounded-[var(--radius-2xl)] border border-[var(--border)] p-6 text-center"><button onClick={refetch} className="text-[var(--brand)] text-[length:13px] font-semibold">Retry</button></div>}
        {!isLoading && !isError && !agenda.length && <div className="bg-[var(--surface-card)] rounded-[var(--radius-2xl)] border border-[var(--border)] p-10 text-center text-[var(--text-muted)] text-[length:var(--text-card)]">No booked duties this month.</div>}
        <div className="flex flex-col gap-3">
          {agenda.map((g) => {
            const amVisible = showAM && (g.morning || showUnbooked);
            const pmVisible = showPM && (g.afternoon || showUnbooked);
            return (
              <div key={g.key} className="bg-[var(--surface-card)] rounded-[var(--radius-2xl)] border border-[var(--border)] overflow-hidden">
                <div className="px-4 py-2 bg-[var(--surface-page)] border-b border-[var(--border)]">
                  <p className="text-[length:var(--text-small)] font-[var(--weight-semibold)] text-[var(--text-secondary)]">{fmtDayHeader(g.date)}</p>
                </div>
                {showAM && <AgendaRow label="AM" slot={g.morning} showUnbooked={showUnbooked} />}
                {amVisible && pmVisible && <div className="mx-4 border-t border-[var(--border)]" />}
                {showPM && <AgendaRow label="PM" slot={g.afternoon} showUnbooked={showUnbooked} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Faculty</Th><Th>Department</Th><Th>Duty Date</Th><Th>Session</Th><Th>Status</Th><Th>Reassignment</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <EmptyRow cols={6} message="Loading…" />}
            {isError && <ErrorRow cols={6} onRetry={refetch} />}
            {!isLoading && !isError && !filtered.length && <EmptyRow cols={6} message="No booked duties this month." />}
            {filtered.map((s) => {
              const r = reassignment(s);
              return (
                <tr key={s.id}>
                  <Td className="font-medium text-[var(--text-primary)]">{s.faculty?.name}</Td>
                  <Td>{s.faculty?.department ?? '—'}</Td>
                  <Td className="text-[length:12px]">{fmtDate(s.duty_date)}</Td>
                  <Td>{sessionLabel(s.session_type)}</Td>
                  <Td><Badge status={s.status} /></Td>
                  <Td>
                    {r ? (
                      <span className="text-[length:12px] text-[var(--color-indigo-text)] font-medium">
                        {r.fromFaculty?.name} → {r.toFaculty?.name}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </Layout>
  );
}
