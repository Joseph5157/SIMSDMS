import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout, { PageHeader } from '../../components/Layout';
import { Tabs, Button, Select, TextInput, Tooltip } from '@mantine/core';
import { IconClock, IconClockEdit, IconAlertTriangle, IconDeviceFloppy, IconTag } from '@tabler/icons-react';
import Breadcrumb from '../../components/Breadcrumb';
import { Table, Th, Td, EmptyRow, ErrorRow, ErrorBlock } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ViolationTypeDrawer from '../../components/ViolationTypeDrawer';
import { useToast } from '../../components/ui/Toast';
import { useDutyTimingSettings } from '../../hooks/useDutyTimingSettings';
import DutyTimingSettingsModal from '../../components/admin/DutyTimingSettingsModal';
import { useViolationSettings, useUpdateViolationSettings } from '../../hooks/useViolationSettings';
import { useViolationTypes, useDeactivateViolationType, useDeleteViolationType } from '../../hooks/useViolationTypes';
import { format12 } from '../../utils/timeFormat';

// ─── Duty Timing tab ──────────────────────────────────────────────────────────

const TIMING_ROWS = [
  { key: 'session_start',  label: 'Session start' },
  { key: 'late_threshold', label: 'Late-arrival cutoff' },
  { key: 'auto_checkout',  label: 'Auto clock-out' },
];

// Read-only summary card — shows the current times in plain 12-hour language so
// a wrong value (e.g. an afternoon clock-out at 4:00 AM) is obvious at a glance.
function TimingSummaryCard({ session, settings }) {
  const label = session === 'morning' ? 'Morning' : 'Afternoon';
  return (
    <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border)] p-3.5">
      <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">{label} session</p>
      {TIMING_ROWS.map((row) => (
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

function DutyTimingTab() {
  const { data: settings, isLoading } = useDutyTimingSettings();
  const [editing, setEditing] = useState(false);

  if (isLoading || !settings) {
    return <p className="text-[var(--text-muted)] text-[length:13px]">Loading…</p>;
  }

  return (
    <div className="max-w-[760px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        <TimingSummaryCard session="morning"   settings={settings} />
        <TimingSummaryCard session="afternoon" settings={settings} />
      </div>

      <Button leftSection={<IconClockEdit size={16} />} onClick={() => setEditing(true)}>
        Edit timings
      </Button>

      {editing && (
        <DutyTimingSettingsModal settings={settings} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}

// ─── Violations tab ───────────────────────────────────────────────────────────

const THRESHOLD_PRESETS = ['2', '3', '4', '5'];

function ViolationsTab() {
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
    if (THRESHOLD_PRESETS.includes(value)) {
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

  if (isLoading || !settings) {
    return <p className="text-[var(--text-muted)] text-[length:13px]">Loading…</p>;
  }

  return (
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
            ...THRESHOLD_PRESETS.map((p) => ({ value: p, label: `${p} violations` })),
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
  );
}

// ─── Violation Types tab ──────────────────────────────────────────────────────

function ViolationTypesTab() {
  const toast = useToast();
  const [showModal, setShowModal]       = useState(false);
  const [editing, setEditing]           = useState(null);
  const [showDeactivated, setShowDeact] = useState(false);
  const [deletingType, setDeletingType] = useState(null);

  const { data, isLoading, isError, refetch } = useViolationTypes(true);
  const deactivate = useDeactivateViolationType();
  const deleteType = useDeleteViolationType();

  async function handleDeactivate(t) {
    try {
      await deactivate.mutateAsync(t.id);
      toast({ message: 'Deactivated.' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  async function handleDelete() {
    try {
      await deleteType.mutateAsync(deletingType.id);
      toast({ message: 'Deleted.' });
      setDeletingType(null);
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  const allRows      = data?.data ?? [];
  const activeRows   = allRows.filter((t) => t.is_active);
  const inactiveRows = allRows.filter((t) => !t.is_active);

  function renderActions(t, size = 'xs') {
    return (
      <div className="flex flex-wrap gap-1">
        <Button
          variant="subtle" size={size}
          aria-label={`Edit ${t.name}`}
          onClick={() => { setEditing(t); setShowModal(true); }}
        >
          Edit
        </Button>
        {t.is_active && (
          t.is_system ? null : (
            <Button
              variant="subtle" color="gray" size={size}
              aria-label={`Deactivate ${t.name}`}
              onClick={() => handleDeactivate(t)}
            >
              Deactivate
            </Button>
          )
        )}
        {t.is_system ? (
          <Tooltip label="System types cannot be deleted" withArrow position="top">
            <Button
              variant="subtle" color="red" size={size}
              aria-label={`Delete ${t.name} (system type — cannot be deleted)`}
              disabled
              className="pointer-events-auto"
            >
              Delete
            </Button>
          </Tooltip>
        ) : (
          <Button
            variant="subtle" color="red" size={size}
            aria-label={`Delete ${t.name}`}
            onClick={() => setDeletingType(t)}
          >
            Delete
          </Button>
        )}
      </div>
    );
  }

  function renderMobileCard(t, i) {
    return (
      <div key={t.id} className={`bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-xl)] p-3.5 ${t.is_active ? '' : 'opacity-65'}`}>
        <div className="flex items-start justify-between gap-2.5 mb-2.5">
          <div className="min-w-0">
            <p className="text-[length:var(--text-card)] text-[var(--text-muted)] font-[var(--weight-semibold)]">#{i + 1}</p>
            <p className="text-[length:var(--text-body)] font-[var(--weight-semibold)] text-[var(--text-primary)]">{t.name}</p>
            <p className="text-[length:var(--text-card)] text-[var(--text-secondary)] mt-0.5">Default fine: <strong>₹{t.default_fine}</strong></p>
          </div>
          <div className="flex gap-1 shrink-0 flex-wrap justify-end">
            <Badge status={t.is_active ? 'active' : 'inactive'} />
            {t.is_system && <Badge status="pending" label="System" />}
          </div>
        </div>
        <div className="border-t border-[var(--border)] pt-2.5">
          {renderActions(t)}
        </div>
      </div>
    );
  }

  function renderTableRow(t, i) {
    return (
      <tr key={t.id} className={t.is_active ? '' : 'opacity-60'}>
        <Td>{i + 1}</Td>
        <Td className="font-medium">{t.name}</Td>
        <Td>₹{t.default_fine}</Td>
        <Td><Badge status={t.is_active ? 'active' : 'inactive'} /></Td>
        <Td>{t.is_system && <Badge status="pending" label="System" />}</Td>
        <Td>{renderActions(t)}</Td>
      </tr>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}>+ New Type</Button>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden flex flex-col gap-2">
        {isLoading && <p className="text-[length:var(--text-card)] text-[var(--text-muted)] text-center p-6">Loading…</p>}
        {isError && <ErrorBlock onRetry={refetch} />}
        {!isLoading && !isError && !activeRows.length && (
          <div className="px-4 py-6 text-center border border-dashed border-[var(--border)] rounded-[var(--radius-xl)]">
            <p className="text-[length:var(--text-card)] text-[var(--text-muted)]">No student violation types yet.</p>
          </div>
        )}
        {activeRows.map((t, i) => renderMobileCard(t, i))}

        {inactiveRows.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowDeact((s) => !s)}
              className="text-[length:var(--text-small)] text-[var(--text-muted)] bg-transparent border-0 cursor-pointer py-1.5 px-0 font-[var(--weight-semibold)]"
            >
              {showDeactivated ? '▲ Hide' : '▼ Show'} deactivated ({inactiveRows.length})
            </button>
            {showDeactivated && inactiveRows.map((t, i) => renderMobileCard(t, i))}
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr><Th>S.No</Th><Th>Name</Th><Th>Default Fine (₹)</Th><Th>Status</Th><Th>System</Th><Th /></tr>
          </thead>
          <tbody>
            {isLoading && <EmptyRow cols={6} message="Loading…" />}
            {isError && <ErrorRow cols={6} onRetry={refetch} />}
            {!isLoading && !isError && !activeRows.length && <EmptyRow cols={6} message="No student violation types yet." />}
            {activeRows.map((t, i) => renderTableRow(t, i))}
          </tbody>
        </Table>

        {inactiveRows.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowDeact((s) => !s)}
              className="text-[length:var(--text-small)] text-[var(--text-muted)] bg-transparent border-0 cursor-pointer py-1.5 px-0 font-[var(--weight-semibold)]"
            >
              {showDeactivated ? '▲ Hide' : '▼ Show'} deactivated types ({inactiveRows.length})
            </button>
            {showDeactivated && (
              <Table>
                <thead>
                  <tr><Th>S.No</Th><Th>Name</Th><Th>Default Fine (₹)</Th><Th>Status</Th><Th>System</Th><Th /></tr>
                </thead>
                <tbody>
                  {inactiveRows.map((t, i) => renderTableRow(t, i))}
                </tbody>
              </Table>
            )}
          </div>
        )}
      </div>

      <ViolationTypeDrawer open={showModal} editing={editing} onClose={() => { setShowModal(false); setEditing(null); }} />

      {deletingType && (
        <ConfirmDialog
          open
          title="Delete Student Violation Type"
          message={`Delete "${deletingType.name}"? This cannot be undone.`}
          confirmText="Delete"
          isDangerous
          isLoading={deleteType.isPending}
          onConfirm={handleDelete}
          onCancel={() => setDeletingType(null)}
        />
      )}
    </div>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────────

const TAB_VALUES = ['duty-timing', 'violations', 'violation-types'];

export default function SettingsPage({ user }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab');
  const tab = TAB_VALUES.includes(requested) ? requested : 'duty-timing';

  return (
    <Layout user={user}>
      <Breadcrumb items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Settings' }]} />
      <PageHeader title="Settings" subtitle="Duty timing and violation policy configuration" />

      <Tabs value={tab} onChange={(value) => setSearchParams({ tab: value })} mt="md">
        <Tabs.List>
          <Tabs.Tab value="duty-timing"     leftSection={<IconClock size={16} />}>Duty Timing</Tabs.Tab>
          <Tabs.Tab value="violations"      leftSection={<IconAlertTriangle size={16} />}>Violations</Tabs.Tab>
          <Tabs.Tab value="violation-types" leftSection={<IconTag size={16} />}>Violation Types</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="duty-timing"     pt="lg"><DutyTimingTab /></Tabs.Panel>
        <Tabs.Panel value="violations"      pt="lg"><ViolationsTab /></Tabs.Panel>
        <Tabs.Panel value="violation-types" pt="lg"><ViolationTypesTab /></Tabs.Panel>
      </Tabs>
    </Layout>
  );
}
