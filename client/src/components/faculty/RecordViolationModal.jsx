import { useState } from 'react';
import { TextInput, Checkbox, Switch } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import ResponsiveSheet, { DrawerSpinner, cancelBtnStyle, primaryBtnStyle } from '../ui/ResponsiveSheet';
import { AppSelect } from '../ui/AppField';
import Alert from '../ui/Alert';
import StudentSearchOverlay from '../ui/StudentSearchOverlay';
import { useToast } from '../ui/Toast';
import { useCreateViolation } from '../../hooks/useViolations';
import { useViolationTypes } from '../../hooks/useViolationTypes';
import { useMonthSlots } from '../../hooks/useDutySlots';

function SectionLabel({ children }) {
  // --color-blue-700 is theme-aware (dark navy on light cards, light blue on dark
  // cards), so it clears WCAG AA (≥4.5:1) in both modes — the previous
  // blue-500/70 combo computed to ~2.4:1. Keep the size ≥12px for legibility.
  return (
    <p className="text-[length:12px] font-extrabold text-[var(--color-blue-700)] uppercase tracking-[0.14em] pb-1">
      {children}
    </p>
  );
}

export default function RecordViolationModal({ open, onClose, adminMode = false }) {
  const toast = useToast();
  // Duty slots/sessions are scheduled on IST calendar dates — derive "today" from
  // IST wall-clock, not the browser's local timezone (see server/lib/time.js).
  // Only the year/month are read from this below, so re-deriving it each render
  // (rather than freezing it via useMemo) is what we want.
  // eslint-disable-next-line react-hooks/purity
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);

  const { data: typesData }  = useViolationTypes();
  const { data: slotsData }  = useMonthSlots(now.getUTCFullYear(), now.getUTCMonth() + 1);

  const [form, setForm] = useState({
    student_id: '', duty_slot_id: '', violation_type_id: '',
    custom_violation: '', fine_amount: '', is_warning_only: false, remarks: '',
  });
  // studentQ holds the selected student's display label ("Name (REG)"); the actual
  // id lives in form.student_id. Search itself now happens in StudentSearchOverlay.
  const [studentQ, setStudentQ]   = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [showRemarks, setShowRemarks] = useState(false);
  const [quickAdd, setQuickAdd]   = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const create = useCreateViolation();

  function selectStudent(s) {
    setForm(f => ({ ...f, student_id: s.id }));
    setStudentQ(`${s.student_name} (${s.registration_number})`);
    clearFieldError('student_id');
  }

  const clearFieldError = (k) => setFieldErrors((fe) => (fe[k] ? { ...fe, [k]: undefined } : fe));

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
    clearFieldError(k);
  };

  const selectedType = typesData?.data?.find(t => String(t.id) === form.violation_type_id);
  const isOthers     = selectedType?.name?.toLowerCase() === 'others';

  // Auto-select today's duty slot when data loads
  const mySlots = (slotsData?.data ?? []).filter(s => s.status === 'scheduled' || s.status === 'completed');
  const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-${String(now.getUTCDate()).padStart(2,'0')}`;
  const todaySlots = mySlots.filter(s => String(s.duty_date).slice(0, 10) === todayStr);
  // Prefer whichever of today's slots is actively checked in right now. Fall back to a
  // time-of-day guess (IST) only when nothing is actively checked in, so the field still
  // pre-fills something reasonable before check-in / after check-out.
  const activeSlot = todaySlots.find(s => s.attendance?.in_time && !s.attendance?.out_time);
  const currentSession = now.getUTCHours() < 12 ? 'morning' : 'afternoon';
  const fallbackSlot = todaySlots.find(s => s.session_type === currentSession) ?? todaySlots[0] ?? null;
  const autoSlot = activeSlot ?? fallbackSlot;
  const sessionActive = Boolean(activeSlot);

  // Pre-fill duty slot if not yet set and auto-slot available
  const effectiveDutySlotId = form.duty_slot_id || (autoSlot ? String(autoSlot.id) : '');

  // Gate submission on the fields the server actually requires, so faculty don't burn a
  // round trip on a 422 the client could have caught for free. Admins record with no
  // duty slot, so the slot is not required in admin mode.
  const canSubmit = Boolean(
    form.student_id &&
    (adminMode || effectiveDutySlotId) &&
    form.violation_type_id &&
    (!isOthers || form.custom_violation.trim())
  );

  // Auto-fill fine when type changes
  function handleTypeChange(value) {
    const type = typesData?.data?.find(t => String(t.id) === value);
    setForm(f => ({
      ...f,
      violation_type_id: value ?? '',
      fine_amount: type ? String(type.default_fine) : f.fine_amount,
    }));
    clearFieldError('violation_type_id');
  }

  async function submitViolation() {
    if (!canSubmit) return;
    setFormError('');
    setFieldErrors({});
    const payload = {
      student_id: form.student_id,
      // Admin ad-hoc records carry no duty slot; faculty always do.
      ...(!adminMode && { duty_slot_id: effectiveDutySlotId }),
      violation_type_id: form.violation_type_id,
      is_warning_only: form.is_warning_only,
      remarks: form.remarks || undefined,
      ...(isOthers && { custom_violation: form.custom_violation }),
      ...(!form.is_warning_only && form.fine_amount && { fine_amount: parseFloat(form.fine_amount) }),
    };
    const studentName = studentQ.split(' (')[0];
    try {
      await create.mutateAsync(payload);
      if (quickAdd) {
        toast({ message: `Recorded for ${studentName}. Add next.` });
        setStudentQ('');
        setForm(f => ({ ...f, student_id: '', fine_amount: '', violation_type_id: '', custom_violation: '', remarks: '' }));
        setShowRemarks(false);
        // Re-open the search surface for the next student.
        setTimeout(() => setSearchOpen(true), 50);
      } else {
        toast({ message: 'Student violation recorded.' });
        onClose();
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors?.length) {
        // Server-side Zod validation — field names match this form's keys 1:1.
        const fe = {};
        data.errors.forEach((e) => { fe[e.field] = e.message; });
        setFieldErrors(fe);
        setFormError(data.message);
        toast({ message: data.message, type: 'error' });
      } else if (data?.message) {
        setFormError(data.message);
        toast({ message: data.message, type: 'error' });
      } else {
        const msg = 'Network error — check your connection and try again.';
        setFormError(msg);
        toast({ message: msg, type: 'error' });
      }
    }
  }

  const formBody = (
    <div className="flex flex-col">

      {/* ── Submit error ── */}
      {formError && (
        <div style={{ marginBottom: 16 }}>
          <Alert tone="danger" icon="⚠️">{formError}</Alert>
        </div>
      )}

      {/* ── Session status (faculty) / admin authority note (admin) ── */}
      <div style={{ marginBottom: 16 }}>
        {adminMode ? (
          <Alert tone="info" icon="🛡️">Recording as Admin — no duty session required.</Alert>
        ) : sessionActive ? (
          <Alert tone="success" icon="✓">
            {`Recording for ${activeSlot.session_type === 'morning' ? 'Morning' : 'Afternoon'} session · ${new Date(todayStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
          </Alert>
        ) : (
          <Alert tone="warning" icon="⚠️">Student violations can only be recorded during an active duty session.</Alert>
        )}
      </div>

      {/* ── Quick-add toggle ── */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <p style={{ fontSize: 'var(--text-card)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Quick-add mode</p>
          <p style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', marginTop: 1 }}>Stay open to record multiple violations</p>
        </div>
        <Switch checked={quickAdd} onChange={(e) => setQuickAdd(e.currentTarget.checked)} size="md" />
      </div>

      <div className="border-t border-[var(--divider)] mb-6" />

      {/* ── Duty slot (auto-selected label or dropdown) — faculty only. Admins
             record with no duty slot, so this whole section is hidden. ── */}
      {!adminMode && (
      <div className="flex flex-col gap-3 pb-6">
        <SectionLabel>Duty slot</SectionLabel>
        {autoSlot && todaySlots.length === 1 ? (
          <div style={{
            padding: '10px 14px', background: 'var(--color-blue-50)',
            border: '1px solid var(--color-blue-200)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-card)', color: 'var(--color-blue-700)',
            fontWeight: 600,
          }}>
            Recording for: {autoSlot.session_type === 'morning' ? 'Morning' : 'Afternoon'} session ·{' '}
            {new Date(todayStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </div>
        ) : (
          <AppSelect
            placeholder="Select duty slot…"
            value={effectiveDutySlotId || null}
            onChange={(value) => { setForm(f => ({ ...f, duty_slot_id: value ?? '' })); clearFieldError('duty_slot_id'); }}
            required
            error={fieldErrors.duty_slot_id}
            data={mySlots.map(s => ({
              value: String(s.id),
              label: `${new Date(s.duty_date).toLocaleDateString('en-IN')} · ${s.session_type}`,
            }))}
          />
        )}
      </div>
      )}

      <div className="border-t border-[var(--divider)]" />

      {/* ── Student ── */}
      <div className="flex flex-col gap-3 py-6">
        <SectionLabel>Student</SectionLabel>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="h-12 w-full rounded-xl border bg-[var(--surface-page)] px-4 flex items-center justify-between gap-2 text-left transition-all duration-150 focus:ring-2 focus:ring-[var(--brand)]/20 outline-none"
          style={{
            borderColor: fieldErrors.student_id ? 'var(--color-red-border)' : 'var(--border)',
          }}
        >
          <span
            className="truncate"
            style={{ fontSize: 16, color: studentQ ? 'var(--text-primary)' : 'var(--text-muted)' }}
          >
            {studentQ || 'Search by name or reg. number…'}
          </span>
          <IconChevronRight size={18} className="shrink-0 text-[var(--text-muted)]" />
        </button>
        {fieldErrors.student_id && (
          <p style={{ fontSize: 'var(--text-micro)', color: 'var(--color-red-text)', marginTop: -4 }}>
            {fieldErrors.student_id}
          </p>
        )}
      </div>

      <div className="border-t border-[var(--divider)]" />

      {/* ── Violation type + Fine ── */}
      <div className="flex flex-col gap-4 py-6">
        <SectionLabel>Student Violation</SectionLabel>
        <AppSelect
          label="Student violation type"
          placeholder="Select type…"
          value={form.violation_type_id || null}
          onChange={handleTypeChange}
          required
          error={fieldErrors.violation_type_id}
          data={(typesData?.data ?? []).map(t => ({
            value: String(t.id),
            label: `${t.name} (₹${t.default_fine})`,
          }))}
        />
        {isOthers && (
          <TextInput
            label="Describe violation"
            value={form.custom_violation}
            onChange={set('custom_violation')}
            error={fieldErrors.custom_violation}
            required
          />
        )}
        <Checkbox
          checked={form.is_warning_only}
          onChange={set('is_warning_only')}
          label="Warning only"
          description="No fine will be charged"
        />
        {!form.is_warning_only && selectedType && (
          <div>
            <p style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Fine amount
            </p>
            <div style={{
              padding: '10px 14px', background: 'var(--surface-page)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
              fontSize: 'var(--text-card)', fontWeight: 700, color: 'var(--text-primary)',
            }}>
              ₹{form.fine_amount}
            </div>
            <p style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', marginTop: 4 }}>
              Default fine for {selectedType.name} — set by Admin in Violation Types
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--divider)]" />

      {/* ── Notes (collapsible) ── */}
      <div className="pt-4">
        {!showRemarks ? (
          <button
            type="button"
            onClick={() => setShowRemarks(true)}
            style={{
              fontSize: 'var(--text-card)', color: 'var(--color-blue-600)',
              background: 'none', border: 'none', cursor: 'pointer',
              // Full 44px tap target (min-height + padding) — it sits right above
              // the sticky footer, so the taller target reduces mis-taps onto the
              // submit button. Left-aligned so the label position is unchanged.
              minHeight: 'var(--control-min)', padding: '10px 0', textAlign: 'left', fontWeight: 500,
            }}
          >
            + Add notes (optional)
          </button>
        ) : (
          <TextInput
            label="Remarks (optional)"
            value={form.remarks}
            onChange={set('remarks')}
            autoFocus
          />
        )}
      </div>

    </div>
  );

  const searchOverlay = (
    <StudentSearchOverlay
      open={searchOpen}
      onClose={() => setSearchOpen(false)}
      onSelect={selectStudent}
    />
  );

  return (
    <>
      <ResponsiveSheet
        open={open}
        onClose={onClose}
        title="Record Student Violation"
        size="xl"
        footer={
          <>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button
              disabled={create.isPending || !canSubmit}
              onClick={submitViolation}
              style={primaryBtnStyle(create.isPending || !canSubmit)}
            >
              {create.isPending && <DrawerSpinner />}
              {create.isPending ? 'Recording…' : 'Record Student Violation'}
            </button>
          </>
        }
      >
        <div style={{ padding: '16px 20px 8px' }}>
          {formBody}
        </div>
      </ResponsiveSheet>
      {searchOverlay}
    </>
  );
}
