import { useState, useRef } from 'react';
import { TextInput, Select, Checkbox, Switch } from '@mantine/core';
import FormModal from '../ui/FormModal';
import { useToast } from '../ui/Toast';
import { useCreateViolation } from '../../hooks/useViolations';
import { useViolationTypes } from '../../hooks/useViolationTypes';
import { useMonthSlots } from '../../hooks/useDutySlots';
import { useStudentSearch } from '../../hooks/useStudents';

function SectionLabel({ children }) {
  return (
    <p className="text-[length:10px] font-extrabold text-[var(--color-blue-500)]/70 uppercase tracking-[0.14em] pb-1">
      {children}
    </p>
  );
}

export default function RecordViolationModal({ open, onClose }) {
  const toast = useToast();
  const now   = new Date();

  const { data: typesData }  = useViolationTypes();
  const { data: slotsData }  = useMonthSlots(now.getFullYear(), now.getMonth() + 1);

  const [form, setForm] = useState({
    student_id: '', duty_slot_id: '', violation_type_id: '',
    custom_violation: '', fine_amount: '', is_warning_only: false, remarks: '',
  });
  const [studentQ, setStudentQ]   = useState('');
  const [showRemarks, setShowRemarks] = useState(false);
  const [quickAdd, setQuickAdd]   = useState(false);
  const studentInputRef = useRef(null);
  const { data: searchResults }   = useStudentSearch(studentQ);
  const create = useCreateViolation();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const selectedType = typesData?.data?.find(t => String(t.id) === form.violation_type_id);
  const isOthers     = selectedType?.name?.toLowerCase() === 'others';

  // Auto-select today's duty slot when data loads
  const mySlots = (slotsData?.data ?? []).filter(s => s.status === 'scheduled' || s.status === 'completed');
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const todaySlots = mySlots.filter(s => String(s.duty_date).slice(0, 10) === todayStr);
  // Guess session from time of day
  const currentSession = now.getHours() < 12 ? 'morning' : 'afternoon';
  const autoSlot = todaySlots.find(s => s.session_type === currentSession) ?? todaySlots[0] ?? null;

  // Pre-fill duty slot if not yet set and auto-slot available
  const effectiveDutySlotId = form.duty_slot_id || (autoSlot ? String(autoSlot.id) : '');

  // Auto-fill fine when type changes
  function handleTypeChange(value) {
    const type = typesData?.data?.find(t => String(t.id) === value);
    setForm(f => ({
      ...f,
      violation_type_id: value ?? '',
      fine_amount: type ? String(type.default_fine) : f.fine_amount,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      student_id: form.student_id,
      duty_slot_id: effectiveDutySlotId,
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
        setTimeout(() => studentInputRef.current?.focus(), 50);
      } else {
        toast({ message: 'Violation recorded.' });
        onClose();
      }
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  return (
    <FormModal
      opened={open}
      onClose={onClose}
      title="Record Violation"
      size="xl"
      onSubmit={handleSubmit}
      submitLabel="Record Violation"
      loading={create.isPending}
    >
      <div className="flex flex-col">

        {/* ── Quick-add toggle ── */}
        <div className="flex items-center justify-between pb-4">
          <div>
            <p style={{ fontSize: 'var(--text-card)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Quick-add mode</p>
            <p style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', marginTop: 1 }}>Stay open to record multiple violations</p>
          </div>
          <Switch checked={quickAdd} onChange={(e) => setQuickAdd(e.currentTarget.checked)} size="md" />
        </div>

        <div className="border-t border-[var(--divider)] mb-6" />

        {/* ── Duty slot (auto-selected label or dropdown) ── */}
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
              Recording for: {currentSession === 'morning' ? 'Morning' : 'Afternoon'} session ·{' '}
              {new Date(todayStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </div>
          ) : (
            <Select
              placeholder="Select duty slot…"
              value={effectiveDutySlotId || null}
              onChange={(value) => setForm(f => ({ ...f, duty_slot_id: value ?? '' }))}
              required
              data={mySlots.map(s => ({
                value: String(s.id),
                label: `${new Date(s.duty_date).toLocaleDateString('en-IN')} · ${s.session_type}`,
              }))}
            />
          )}
        </div>

        <div className="border-t border-[var(--divider)]" />

        {/* ── Student ── */}
        <div className="flex flex-col gap-3 py-6">
          <SectionLabel>Student</SectionLabel>
          <div className="relative">
            <input
              ref={studentInputRef}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-page)] px-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all duration-150 hover:border-[var(--border)] focus:bg-[var(--surface-card)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
              style={{ fontSize: 16 }}
              placeholder="Search by name or reg. number…"
              value={studentQ}
              onChange={(e) => { setStudentQ(e.target.value); setForm(f => ({ ...f, student_id: '' })); }}
            />
            {searchResults?.data?.length > 0 && !form.student_id && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-10 border border-[var(--border)] rounded-xl divide-y divide-[var(--divider)] max-h-44 overflow-y-auto bg-[var(--surface-card)] shadow-lg">
                {searchResults.data.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="w-full text-left px-4 py-3 text-[length:13px] text-[var(--text-secondary)] hover:bg-[var(--color-blue-50)] transition-colors"
                    onClick={() => {
                      setForm(f => ({ ...f, student_id: s.id }));
                      setStudentQ(`${s.student_name} (${s.registration_number})`);
                    }}
                  >
                    <span className="font-medium text-[var(--text-primary)]">{s.student_name}</span>
                    <span className="text-[var(--text-muted)]"> — {s.registration_number}</span>
                    <span className="block text-[length:11px] text-[var(--text-muted)] mt-0.5">{s.course} · {s.semester_or_year}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-[var(--divider)]" />

        {/* ── Violation type + Fine ── */}
        <div className="flex flex-col gap-4 py-6">
          <SectionLabel>Violation</SectionLabel>
          <Select
            label="Violation type"
            placeholder="Select type…"
            value={form.violation_type_id || null}
            onChange={handleTypeChange}
            required
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
              required
            />
          )}
          <Checkbox
            checked={form.is_warning_only}
            onChange={set('is_warning_only')}
            label="Warning only"
            description="No fine will be charged"
          />
          {!form.is_warning_only && (
            <TextInput
              label="Fine amount (₹)"
              type="number"
              min="0"
              step="0.01"
              value={form.fine_amount}
              onChange={set('fine_amount')}
              placeholder={String(selectedType?.default_fine ?? '')}
              description={selectedType ? `Default: ₹${selectedType.default_fine}` : undefined}
            />
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
                padding: 0, fontWeight: 500,
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
    </FormModal>
  );
}
