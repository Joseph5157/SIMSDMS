import { useEffect, useRef, useState } from 'react';
import { TextInput, Checkbox, Switch } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import ResponsiveSheet from '../ui/ResponsiveSheet';
import AppButton from '../ui/AppButton';
import { AppSelect } from '../ui/AppField';
import Alert from '../ui/Alert';
import StudentSearchOverlay from '../ui/StudentSearchOverlay';
import { useToast } from '../ui/Toast';
import { useCreateViolation } from '../../hooks/useViolations';
import { useViolationTypes } from '../../hooks/useViolationTypes';
import { useMonthSlots } from '../../hooks/useDutySlots';
import { isActivelyCheckedIn } from '../../utils/dutyEligibility';

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

const VALIDATION_SUMMARY = 'Complete the highlighted fields before submitting.';

const INITIAL_FORM = {
  student_id: '', violation_type_id: '',
  custom_violation: '', fine_amount: '', is_warning_only: false, remarks: '',
};

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

  const [form, setForm] = useState(INITIAL_FORM);
  // studentQ holds the selected student's display label ("Name (REG)"); the actual
  // id lives in form.student_id. Search itself now happens in StudentSearchOverlay.
  const [studentQ, setStudentQ]   = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [showRemarks, setShowRemarks] = useState(false);
  const [quickAdd, setQuickAdd]   = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const create = useCreateViolation();

  // Synchronous in-flight guard — `create.isPending` only flips true after a
  // render commits, which leaves a window for a double click/tap to fire
  // mutateAsync twice before the button's `disabled` prop ever updates.
  const submittingRef = useRef(false);
  // Explicit focus management, contained to this component (see
  // docs/UI_ARCHITECTURE.md — ResponsiveSheet/StudentSearchOverlay are not
  // rewritten here): restores focus to whatever opened this sheet, and
  // separately to the student-search trigger when the nested overlay closes.
  const studentTriggerRef = useRef(null);
  const openerElRef = useRef(null);
  const prevOpenRef = useRef(false);
  const prevSearchOpenRef = useRef(false);
  const errorAlertRef = useRef(null);

  function resetDraft() {
    setForm(INITIAL_FORM);
    setStudentQ('');
    setFieldErrors({});
    setFormError('');
    setShowRemarks(false);
    setQuickAdd(false);
    create.reset();
  }

  // Lifecycle: a fresh open always starts from a clean form, and every close
  // path (Cancel, backdrop, Esc, successful submit) clears the abandoned draft
  // and any mutation/server error state — no automatic draft persistence.
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      openerElRef.current = document.activeElement;
      resetDraft();
    } else if (!open && prevOpenRef.current) {
      resetDraft();
      if (openerElRef.current && typeof openerElRef.current.focus === 'function') {
        openerElRef.current.focus();
      }
    }
    prevOpenRef.current = open;
    // resetDraft/create.reset intentionally excluded — its identity comes from
    // useMutation and re-running this effect for that would defeat the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // StudentSearchOverlay is its own independent Radix Dialog.Root (see its file
  // header for why), so its focus-return timing isn't guaranteed to land back on
  // this sheet's trigger button by default — do it explicitly instead.
  useEffect(() => {
    if (!searchOpen && prevSearchOpenRef.current) {
      studentTriggerRef.current?.focus();
    }
    prevSearchOpenRef.current = searchOpen;
  }, [searchOpen]);

  // The client-side "complete the highlighted fields" banner is only ever
  // correct while at least one of those fields is still invalid — once every
  // field clears (student picked, type picked, ...) it should disappear
  // instead of leaving a stale message up. Derived at render time rather
  // than cleared via a setState-in-effect: the banner is stale exactly when
  // formError still equals this literal string (server error text never
  // does) but every fieldError has since been resolved.
  const formErrorStale = formError === VALIDATION_SUMMARY && Object.values(fieldErrors).every((v) => !v);
  const visibleFormError = formErrorStale ? '' : formError;

  // Bring a submission error into view/focus rather than leaving it to be
  // discovered only if the faculty happens to scroll up.
  useEffect(() => {
    if (visibleFormError) errorAlertRef.current?.focus();
  }, [visibleFormError]);

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

  // Eligibility must mirror the backend exactly (server/controllers/violations
  // .controller.js createViolation): a today's duty slot with an OPEN attendance
  // record (checked in, not yet checked out) — never merely a scheduled or
  // completed slot id from anywhere in the month. A slot existing is not enough.
  const mySlots  = slotsData?.data ?? [];
  const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-${String(now.getUTCDate()).padStart(2,'0')}`;
  const todaySlots  = mySlots.filter(s => String(s.duty_date).slice(0, 10) === todayStr);
  const activeSlots = todaySlots.filter(s => isActivelyCheckedIn(s.attendance));
  const activeSlot  = activeSlots[0] ?? null;
  const effectiveDutySlotId = activeSlot ? String(activeSlot.id) : '';
  // Admin's recording authority is unrestricted (no duty session required) —
  // this attendance gate applies to faculty only, never to adminMode.
  const offDuty = !adminMode && !activeSlot;

  function validate() {
    const fe = {};
    if (!form.student_id) fe.student_id = 'Select a student to continue.';
    if (!form.violation_type_id) fe.violation_type_id = 'Select a student violation type.';
    if (isOthers && !form.custom_violation.trim()) fe.custom_violation = 'Describe the violation.';
    return fe;
  }

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
    if (submittingRef.current || offDuty) return;

    const fe = validate();
    if (Object.keys(fe).length) {
      // Never rely solely on a disabled button — clicking with missing fields
      // still gets a concise, field-associated explanation, brought into view.
      setFieldErrors(fe);
      setFormError(VALIDATION_SUMMARY);
      return;
    }

    submittingRef.current = true;
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
        // Active duty context + Quick Add stay put; only the student and
        // violation-specific fields clear for the next record.
        setForm(INITIAL_FORM);
        setStudentQ('');
        setFieldErrors({});
        setFormError('');
        setShowRemarks(false);
        // Re-open the search surface for the next student.
        setTimeout(() => setSearchOpen(true), 50);
      } else {
        toast({ message: 'Student violation recorded.' });
        resetDraft();
        onClose();
      }
    } catch (err) {
      const data = err.response?.data;
      // Shown once, inline (see the Alert below) — not duplicated in a toast.
      if (data?.errors?.length) {
        const fe2 = {};
        data.errors.forEach((e) => { fe2[e.field] = e.message; });
        setFieldErrors(fe2);
        setFormError(data.message);
      } else if (data?.message) {
        setFormError(data.message);
      } else {
        setFormError('Network error — check your connection and try again.');
      }
    } finally {
      submittingRef.current = false;
    }
  }

  function handleClose() {
    if (submittingRef.current) {
      // Prevent confusing close/cancel behavior while a submission commits —
      // ResponsiveSheet's dismiss gestures already route here via confirmClose
      // below; this covers the Cancel button itself.
      toast({ message: 'Still saving — please wait.', type: 'warning' });
      return;
    }
    resetDraft();
    onClose();
  }

  const pending = create.isPending;

  const offDutyBody = (
    <div className="px-1 py-2">
      <Alert tone="warning" icon="🔒" title="You're not checked in">
        Student violations can only be recorded while you're actively checked in to
        today's duty session. Check in from your dashboard, then come back to record here.
      </Alert>
    </div>
  );

  const formBody = (
    <div className="flex flex-col">

      {/* ── Submit error ── */}
      {visibleFormError && (
        <div style={{ marginBottom: 16 }}>
          <Alert tone="danger" icon="⚠️">
            <span ref={errorAlertRef} tabIndex={-1} className="outline-none">{visibleFormError}</span>
          </Alert>
        </div>
      )}

      {/* ── Active-duty context (faculty) / admin authority note (admin) —
             a single compact strip, not a duty-slot picker: eligibility is
             gated entirely on the one active session, so there is nothing to
             pick from. ── */}
      <div style={{ marginBottom: 16 }}>
        {adminMode ? (
          <Alert tone="info" icon="🛡️">Recording as Admin — no duty session required.</Alert>
        ) : (
          // formBody is always constructed even when offDuty is what actually
          // renders (see the ternary below) — guard against a null activeSlot
          // rather than relying on evaluation order to skip this branch.
          <Alert tone="success" icon="✓">
            {`${activeSlot?.session_type === 'morning' ? 'Morning' : 'Afternoon'} session · ${new Date(todayStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
          </Alert>
        )}
      </div>

      <div className="border-t border-[var(--divider)]" />

      {/* ── Student ── */}
      <div className="flex flex-col gap-3 py-6">
        <SectionLabel>Student</SectionLabel>
        <button
          ref={studentTriggerRef}
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

      <div className="border-t border-[var(--divider)] mt-6" />

      {/* ── Quick-add toggle — completion control, last in the flow ── */}
      <div className="pt-4">
        <Switch
          checked={quickAdd}
          onChange={(e) => setQuickAdd(e.currentTarget.checked)}
          size="md"
          label="Quick-add mode"
          description="Stay open to record multiple violations"
          labelPosition="left"
          styles={{ body: { justifyContent: 'space-between' }, labelWrapper: { flex: 1 } }}
        />
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
        onClose={handleClose}
        title="Record Student Violation"
        size="xl"
        mobileMode="fullscreen"
        confirmClose={pending}
        onDismissAttempt={() => toast({ message: 'Still saving — please wait.', type: 'warning' })}
        footer={
          offDuty ? (
            <AppButton variant="secondary" type="button" onClick={handleClose} style={{ flex: 1 }}>
              Close
            </AppButton>
          ) : (
            <>
              <AppButton variant="secondary" type="button" onClick={handleClose} disabled={pending} style={{ flex: 1 }}>Cancel</AppButton>
              <AppButton
                disabled={pending}
                loading={pending}
                onClick={submitViolation}
                style={{ flex: 2 }}
              >
                Record Student Violation
              </AppButton>
            </>
          )
        }
      >
        <div style={{ padding: '16px 20px 8px' }}>
          {offDuty ? offDutyBody : formBody}
        </div>
      </ResponsiveSheet>
      {searchOverlay}
    </>
  );
}
