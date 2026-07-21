import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Button, Select, TextInput } from '@mantine/core';
import { IconDeviceFloppy } from '@tabler/icons-react';
import Breadcrumb from '../../components/Breadcrumb';
import { useToast } from '../../components/ui/Toast';
import { useViolationSettings, useUpdateViolationSettings } from '../../hooks/useViolationSettings';

const PRESETS = ['2', '3', '4', '5'];

export default function ViolationSettingsPage({ user }) {
  const toast = useToast();
  const { data: settings, isLoading } = useViolationSettings();
  const updateSettings = useUpdateViolationSettings();

  const [preset, setPreset] = useState('');
  const [custom, setCustom] = useState('');
  // Tracks which `settings` object the form was last seeded from — reseed
  // (during render, not an effect) whenever a freshly-fetched/saved settings
  // object arrives. A custom (non-preset) saved value shows in the "Custom
  // value" field; a preset value pre-selects its option.
  const [seededFrom, setSeededFrom] = useState(null);

  if (settings != null && seededFrom !== settings) {
    setSeededFrom(settings);
    const value = String(settings.repeat_violation_threshold);
    if (PRESETS.includes(value)) {
      setPreset(value);
      setCustom('');
    } else {
      setPreset('custom');
      setCustom(value);
    }
  }

  const effectiveValue = preset === 'custom' ? custom : preset;
  const parsed = parseInt(effectiveValue, 10);
  const isValid = effectiveValue !== '' && !isNaN(parsed) && parsed >= 1 && parsed <= 50;

  async function handleSave() {
    try {
      await updateSettings.mutateAsync({ repeat_violation_threshold: parsed });
      toast({ message: 'Counselling threshold updated.' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed to save setting.', type: 'error' });
    }
  }

  return (
    <Layout user={user}>
      <Breadcrumb items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Violation Settings' }]} />
      <PageHeader
        title="Violation Settings"
        subtitle="Repeat-violation threshold used by the Students Requiring Counselling card"
      />

      {isLoading || !settings ? (
        <p className="text-[var(--text-muted)] text-[length:13px]">Loading…</p>
      ) : (
        <div className="max-w-[480px] mx-auto bg-[var(--surface-card)] rounded-xl border border-[var(--border)] p-4">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Repeat Violation Threshold for Counselling</p>
          <p className="text-[13px] text-[var(--text-muted)] mb-4">
            Students with this many violations or more appear in the Students Requiring Counselling
            card, and in its Excel/PDF exports, everywhere in the app.
          </p>

          <div className="flex items-end gap-2">
            <Select
              label="Threshold"
              w={180}
              value={preset}
              onChange={(value) => setPreset(value ?? '')}
              data={[
                ...PRESETS.map((p) => ({ value: p, label: `${p} violations` })),
                { value: 'custom', label: 'Custom value' },
              ]}
            />
            {preset === 'custom' && (
              <TextInput
                label="Custom value"
                w={140}
                type="number"
                min={1}
                max={50}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
            )}
          </div>

          <Button
            mt="md"
            leftSection={<IconDeviceFloppy size={16} />}
            disabled={!isValid}
            loading={updateSettings.isPending}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </div>
      )}
    </Layout>
  );
}
