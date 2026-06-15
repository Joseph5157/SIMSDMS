import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import { Button, TextInput, Select, Checkbox } from '@mantine/core';
import Badge from '../../components/ui/Badge';
import FormModal from '../../components/ui/FormModal';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import { useMyViolations, useCreateViolation, useFlagViolation } from '../../hooks/useViolations';
import { useViolationTypes } from '../../hooks/useViolationTypes';
import { useMonthSlots } from '../../hooks/useDutySlots';
import { useStudentSearch } from '../../hooks/useStudents';

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-extrabold text-blue-500/70 uppercase tracking-[0.14em] pb-1">
      {children}
    </p>
  );
}

function RecordModal({ open, onClose }) {
  const toast = useToast();
  const now   = new Date();

  const { data: typesData }  = useViolationTypes();
  const { data: slotsData }  = useMonthSlots(now.getFullYear(), now.getMonth() + 1);

  const [form, setForm] = useState({
    student_id: '', duty_slot_id: '', violation_type_id: '',
    custom_violation: '', fine_amount: '', is_warning_only: false, remarks: '',
  });
  const [studentQ, setStudentQ] = useState('');
  const { data: searchResults } = useStudentSearch(studentQ);
  const create = useCreateViolation();

  // set() works for TextInput (e.target.value) and Checkbox (e.target.checked)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  // selectedType: compare as strings since Mantine Select returns string values
  const selectedType = typesData?.data?.find(t => String(t.id) === form.violation_type_id);
  const isOthers = selectedType?.name?.toLowerCase() === 'others';

  const mySlots = (slotsData?.data ?? []).filter(s => s.status === 'scheduled' || s.status === 'completed');

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      student_id: form.student_id,
      duty_slot_id: form.duty_slot_id,
      violation_type_id: form.violation_type_id,
      is_warning_only: form.is_warning_only,
      remarks: form.remarks || undefined,
      ...(isOthers && { custom_violation: form.custom_violation }),
      ...(!form.is_warning_only && form.fine_amount && { fine_amount: parseFloat(form.fine_amount) }),
    };
    try {
      await create.mutateAsync(payload);
      toast({ message: 'Violation recorded.' });
      onClose();
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
      {/* Single child so FormModal's Stack gap doesn't double-space sections */}
      <div className="flex flex-col">

        {/* ── Student ── */}
        <div className="flex flex-col gap-3 pb-6">
          <SectionLabel>Student</SectionLabel>
          <div className="relative">
            <input
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="Search by name or reg. number…"
              value={studentQ}
              onChange={(e) => setStudentQ(e.target.value)}
            />
            {searchResults?.data?.length > 0 && !form.student_id && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-10 border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-44 overflow-y-auto bg-white shadow-lg">
                {searchResults.data.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="w-full text-left px-4 py-3 text-[13px] text-slate-700 hover:bg-blue-50/60 transition-colors"
                    onClick={() => {
                      setForm(f => ({ ...f, student_id: s.id }));
                      setStudentQ(`${s.student_name} (${s.registration_number})`);
                    }}
                  >
                    <span className="font-medium text-slate-900">{s.student_name}</span>
                    <span className="text-slate-400"> — {s.registration_number}</span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">{s.course} · {s.semester_or_year}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* ── Duty & Violation ── */}
        <div className="flex flex-col gap-4 py-6">
          <SectionLabel>Duty & Violation</SectionLabel>
          <Select
            label="Duty slot"
            placeholder="Select duty slot…"
            value={form.duty_slot_id || null}
            onChange={(value) => setForm(f => ({ ...f, duty_slot_id: value ?? '' }))}
            required
            data={mySlots.map(s => ({
              value: String(s.id),
              label: `${new Date(s.duty_date).toLocaleDateString('en-IN')} · ${s.session_type}`,
            }))}
          />
          <Select
            label="Violation type"
            placeholder="Select type…"
            value={form.violation_type_id || null}
            onChange={(value) => setForm(f => ({ ...f, violation_type_id: value ?? '' }))}
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
        </div>

        <div className="border-t border-slate-100" />

        {/* ── Fine ── */}
        <div className="flex flex-col gap-4 py-6">
          <SectionLabel>Fine</SectionLabel>
          <Checkbox
            checked={form.is_warning_only}
            onChange={set('is_warning_only')}
            label="Warning only"
            description="No fine will be charged"
          />
          {!form.is_warning_only && (
            <TextInput
              label={`Fine amount (₹) — default: ₹${selectedType?.default_fine ?? 0}`}
              type="number"
              min="0"
              step="0.01"
              value={form.fine_amount}
              onChange={set('fine_amount')}
              placeholder={String(selectedType?.default_fine ?? '')}
            />
          )}
        </div>

        <div className="border-t border-slate-100" />

        {/* ── Notes ── */}
        <div className="flex flex-col gap-3 pt-6">
          <SectionLabel>Notes</SectionLabel>
          <TextInput
            label="Remarks (optional)"
            value={form.remarks}
            onChange={set('remarks')}
          />
        </div>

      </div>
    </FormModal>
  );
}

function FlagModal({ violation, onClose }) {
  const toast = useToast();
  const flag = useFlagViolation();
  const [note, setNote] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await flag.mutateAsync({ id: violation.id, flag_note: note });
      toast({ message: 'Violation flagged for review.' });
      onClose();
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  return (
    <FormModal
      opened={!!violation}
      onClose={onClose}
      title="Flag for Review"
      size="sm"
      onSubmit={handleSubmit}
      submitLabel="Flag"
      loading={flag.isPending}
    >
      <TextInput
        label="Reason for flagging"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        required
      />
    </FormModal>
  );
}

export default function ViolationRecorderPage({ user }) {
  const [page, setPage]             = useState(1);
  const [showRecord, setShowRecord] = useState(false);
  const [flagging,   setFlagging]   = useState(null);

  const { data, isLoading } = useMyViolations({ page, limit: 20 });

  return (
    <Layout user={user}>
      <PageHeader
        title="Violations"
        subtitle="Violations you've recorded"
        action={<Button size="sm" onClick={() => setShowRecord(true)}>+ Record Violation</Button>}
      />
      <Table>
        <thead>
          <tr>
            <Th>Student</Th><Th>Type</Th><Th>Fine</Th><Th>Date</Th><Th>Status</Th><Th />
          </tr>
        </thead>
        <tbody>
          {isLoading && <EmptyRow cols={6} message="Loading…" />}
          {!isLoading && !data?.data?.length && <EmptyRow cols={6} message="No violations recorded." />}
          {data?.data?.map((v) => (
            <tr key={v.id}>
              <Td>
                <p className="font-medium">{v.student?.student_name}</p>
                <p className="text-xs text-slate-400">{v.student?.registration_number}</p>
              </Td>
              <Td>{v.violationType?.name}</Td>
              <Td>{v.is_warning_only ? <span className="text-xs text-slate-500">Warning</span> : `₹${v.fine_amount}`}</Td>
              <Td className="text-xs">{new Date(v.created_at).toLocaleDateString('en-IN')}</Td>
              <Td>
                {v.is_flagged ? <Badge status="pending" label="Flagged" /> : <Badge status={v.record_status} />}
              </Td>
              <Td>
                {!v.is_flagged && v.record_status === 'active' && (
                  <Button variant="subtle" size="xs" onClick={() => setFlagging(v)}>Flag</Button>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination meta={data?.meta} page={page} onPage={setPage} />
      <RecordModal open={showRecord} onClose={() => setShowRecord(false)} />
      {flagging && <FlagModal violation={flagging} onClose={() => setFlagging(null)} />}
    </Layout>
  );
}
