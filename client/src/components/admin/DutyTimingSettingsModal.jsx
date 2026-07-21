import { memo, useCallback, useState } from 'react';
import { Tooltip } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import FormModal from '../ui/FormModal';
import { useToast } from '../ui/Toast';
import { useUpdateDutyTimingSettings } from '../../hooks/useDutyTimingSettings';
import { toTimeStr, parseTimeStr, format12 } from '../../utils/timeFormat';

// The 12 flat fields the backend expects — kept as the form's source of truth so
// the PATCH payload shape is unchanged. Each on-screen time control maps to one
// (hour, min) pair.
const FIELDS = [
  'session_start_morning_hour', 'session_start_morning_min',
  'session_start_afternoon_hour', 'session_start_afternoon_min',
  'late_threshold_morning_hour', 'late_threshold_morning_min',
  'late_threshold_afternoon_hour', 'late_threshold_afternoon_min',
  'auto_checkout_morning_hour', 'auto_checkout_morning_min',
  'auto_checkout_afternoon_hour', 'auto_checkout_afternoon_min',
];

const ROWS = [
  { key: 'session_start',  label: 'Session start',      description: 'When this session begins' },
  { key: 'late_threshold', label: 'Late-arrival cutoff', description: 'Check-in after this time is flagged late' },
  { key: 'auto_checkout',  label: 'Auto clock-out',     description: 'Unchecked-out faculty are clocked out at this time' },
];

// Times are stored 24-hour; the plain-language caption (format12) is what makes
// each field unambiguous — the user always sees "4:00 PM", never a bare "16"
// or "4". See utils/timeFormat.js for the conversions.

const timeInputClass =
  'h-11 w-[132px] rounded-[var(--radius-lg)] border-[1.5px] border-[var(--border)] ' +
  'bg-[var(--surface-page)] px-3 text-[color:var(--text-primary)] outline-none ' +
  'transition-[border-color] duration-150 focus:border-[var(--border-strong)]';

const TimeRow = memo(function TimeRow({ label, description, hourKey, minKey, hour, min, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-b-[var(--border)] last:border-b-0">
      <div className="flex items-center gap-1.5 min-w-0 pr-2">
        <span className="text-[13px] text-[var(--text-secondary)] truncate">{label}</span>
        <Tooltip label={description} withArrow position="top" multiline w={200}>
          <IconInfoCircle size={13} className="shrink-0 text-[var(--text-muted)]" />
        </Tooltip>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="time"
          aria-label={label}
          className={timeInputClass}
          style={{ fontSize: 16, fontFamily: 'inherit', colorScheme: 'light dark' }}
          value={toTimeStr(hour, min)}
          onChange={(e) => onChange(hourKey, minKey, e.target.value)}
        />
        <span className="w-[64px] text-right text-[13px] font-semibold text-[var(--text-primary)] tabular-nums">
          {format12(hour, min)}
        </span>
      </div>
    </div>
  );
});

function SessionSection({ session, form, onChange }) {
  const label = session === 'morning' ? 'Morning' : 'Afternoon';
  return (
    <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border)] p-3.5">
      <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{label} session</p>
      {ROWS.map((row) => {
        const hourKey = `${row.key}_${session}_hour`;
        const minKey  = `${row.key}_${session}_min`;
        return (
          <TimeRow
            key={row.key}
            label={row.label}
            description={row.description}
            hourKey={hourKey}
            minKey={minKey}
            hour={form[hourKey]}
            min={form[minKey]}
            onChange={onChange}
          />
        );
      })}
    </div>
  );
}

// Mounted only while open (see SettingsPage's Duty Timing tab), so the form is
// seeded once from `settings` via the useState initializer — no null state,
// no seed-on-open effect.
export default function DutyTimingSettingsModal({ settings, onClose }) {
  const toast = useToast();
  const updateSettings = useUpdateDutyTimingSettings();
  const [form, setForm] = useState(() => {
    const initial = {};
    for (const key of FIELDS) initial[key] = settings[key];
    return initial;
  });
  const [error, setError] = useState('');

  const handleChange = useCallback((hourKey, minKey, timeStr) => {
    const { hour, minute } = parseTimeStr(timeStr);
    setForm((f) => ({ ...f, [hourKey]: hour, [minKey]: minute }));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await updateSettings.mutateAsync(form);
      toast({ message: 'Duty timing settings updated.' });
      onClose();
    } catch (err) {
      // Server enforces session_start < late cutoff ≤ auto clock-out per session;
      // surface that (and any other) message inline rather than only as a toast.
      setError(err.response?.data?.message ?? 'Failed to save settings.');
    }
  }

  return (
    <FormModal
      opened
      onClose={onClose}
      title="Duty Timing Settings"
      onSubmit={handleSubmit}
      submitLabel="Save Changes"
      loading={updateSettings.isPending}
      error={error}
      formId="duty-timing-form"
      size="lg"
    >
      <p className="text-[13px] text-[var(--text-muted)] -mt-1">
        The preview beside each field shows exactly how the time will be applied,
        in AM/PM — so an afternoon cutoff always reads as PM, never a bare hour.
      </p>
      <SessionSection session="morning"   form={form} onChange={handleChange} />
      <SessionSection session="afternoon" form={form} onChange={handleChange} />
    </FormModal>
  );
}
