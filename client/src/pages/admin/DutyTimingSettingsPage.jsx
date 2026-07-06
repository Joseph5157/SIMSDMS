import { useEffect, useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { NumberInput, Button } from '@mantine/core';
import { useToast } from '../../components/ui/Toast';
import { useDutyTimingSettings, useUpdateDutyTimingSettings } from '../../hooks/useDutyTimingSettings';
import Breadcrumb from '../../components/Breadcrumb';

const FIELDS = [
  'session_start_morning_hour', 'session_start_morning_min',
  'session_start_afternoon_hour', 'session_start_afternoon_min',
  'late_threshold_morning_hour', 'late_threshold_morning_min',
  'late_threshold_afternoon_hour', 'late_threshold_afternoon_min',
  'not_checked_in_morning_hour', 'not_checked_in_morning_min',
  'not_checked_in_afternoon_hour', 'not_checked_in_afternoon_min',
  'auto_checkout_morning_hour', 'auto_checkout_morning_min',
  'auto_checkout_afternoon_hour', 'auto_checkout_afternoon_min',
];

function TimeRow({ label, description, hourKey, minKey, form, setForm }) {
  return (
    <div className="flex items-end gap-3">
      <NumberInput
        label={label}
        description={description}
        min={0} max={23} allowDecimal={false}
        value={form[hourKey]}
        onChange={(v) => setForm((f) => ({ ...f, [hourKey]: typeof v === 'number' ? v : 0 }))}
        w={100}
      />
      <NumberInput
        label="Minute"
        min={0} max={59} allowDecimal={false}
        value={form[minKey]}
        onChange={(v) => setForm((f) => ({ ...f, [minKey]: typeof v === 'number' ? v : 0 }))}
        w={100}
      />
    </div>
  );
}

function SessionSection({ session, form, setForm }) {
  const label = session === 'morning' ? 'Morning' : 'Afternoon';
  return (
    <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border)] p-4">
      <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">{label} session</p>
      <div className="flex flex-col gap-4">
        <TimeRow
          label="Session start (hour)"
          description="When this session begins"
          hourKey={`session_start_${session}_hour`}
          minKey={`session_start_${session}_min`}
          form={form} setForm={setForm}
        />
        <TimeRow
          label="Late-arrival cutoff (hour)"
          description="Check-in after this time is flagged late"
          hourKey={`late_threshold_${session}_hour`}
          minKey={`late_threshold_${session}_min`}
          form={form} setForm={setForm}
        />
        <TimeRow
          label="Not-checked-in cutoff (hour)"
          description="Flagged on the live dashboard after this time"
          hourKey={`not_checked_in_${session}_hour`}
          minKey={`not_checked_in_${session}_min`}
          form={form} setForm={setForm}
        />
        <TimeRow
          label="Auto clock-out (hour)"
          description="Unchecked-out faculty are clocked out at this time"
          hourKey={`auto_checkout_${session}_hour`}
          minKey={`auto_checkout_${session}_min`}
          form={form} setForm={setForm}
        />
      </div>
    </div>
  );
}

export default function DutyTimingSettingsPage({ user }) {
  const toast = useToast();
  const { data: settings, isLoading } = useDutyTimingSettings();
  const updateSettings = useUpdateDutyTimingSettings();
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (settings && !form) {
      const initial = {};
      for (const key of FIELDS) initial[key] = settings[key];
      setForm(initial);
    }
  }, [settings, form]);

  async function handleSave() {
    try {
      await updateSettings.mutateAsync(form);
      toast({ message: 'Duty timing settings updated.' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed to save settings.', type: 'error' });
    }
  }

  return (
    <Layout user={user}>
      <Breadcrumb items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Duty Timing Settings' }]} />
      <PageHeader title="Duty Timing Settings" subtitle="Session start times, late cutoffs, not-checked-in cutoffs, and auto clock-out — per session" />

      {isLoading || !form ? (
        <p className="text-[var(--text-muted)] text-[length:13px]">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <SessionSection session="morning" form={form} setForm={setForm} />
            <SessionSection session="afternoon" form={form} setForm={setForm} />
          </div>

          <Button onClick={handleSave} loading={updateSettings.isPending}>
            Save Changes
          </Button>
        </>
      )}
    </Layout>
  );
}
