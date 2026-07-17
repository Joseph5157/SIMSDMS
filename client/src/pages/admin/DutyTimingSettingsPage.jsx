import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Button } from '@mantine/core';
import { IconClockEdit } from '@tabler/icons-react';
import { useDutyTimingSettings } from '../../hooks/useDutyTimingSettings';
import DutyTimingSettingsModal from '../../components/admin/DutyTimingSettingsModal';
import { format12 } from '../../utils/timeFormat';
import Breadcrumb from '../../components/Breadcrumb';

const ROWS = [
  { key: 'session_start',  label: 'Session start' },
  { key: 'late_threshold', label: 'Late-arrival cutoff' },
  { key: 'auto_checkout',  label: 'Auto clock-out' },
];

// Read-only summary card — shows the current times in plain 12-hour language so
// a wrong value (e.g. an afternoon clock-out at 4:00 AM) is obvious at a glance.
function SummaryCard({ session, settings }) {
  const label = session === 'morning' ? 'Morning' : 'Afternoon';
  return (
    <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border)] p-3.5">
      <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">{label} session</p>
      {ROWS.map((row) => (
        <div key={row.key} className="flex items-center justify-between py-2 border-b border-b-[var(--border)] last:border-b-0">
          <span className="text-[13px] text-[var(--text-secondary)]">{row.label}</span>
          <span className="text-[13px] font-semibold text-[var(--text-primary)] tabular-nums">
            {format12(settings[`${row.key}_${session}_hour`], settings[`${row.key}_${session}_min`])}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function DutyTimingSettingsPage({ user }) {
  const { data: settings, isLoading } = useDutyTimingSettings();
  const [editing, setEditing] = useState(false);

  return (
    <Layout user={user}>
      <Breadcrumb items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Duty Timing Settings' }]} />
      <PageHeader title="Duty Timing Settings" subtitle="Session start times, late cutoffs, and auto clock-out — per session" />

      {isLoading || !settings ? (
        <p className="text-[var(--text-muted)] text-[length:13px]">Loading…</p>
      ) : (
        <div className="max-w-[760px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <SummaryCard session="morning"   settings={settings} />
            <SummaryCard session="afternoon" settings={settings} />
          </div>

          <Button leftSection={<IconClockEdit size={16} />} onClick={() => setEditing(true)}>
            Edit timings
          </Button>
        </div>
      )}

      {editing && settings && (
        <DutyTimingSettingsModal settings={settings} onClose={() => setEditing(false)} />
      )}
    </Layout>
  );
}
