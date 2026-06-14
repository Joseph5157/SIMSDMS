import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
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

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const selectedType = typesData?.data?.find(t => t.id === form.violation_type_id);
  const isOthers = selectedType?.name?.toLowerCase() === 'others';

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

  const mySlots = (slotsData?.data ?? []).filter(s => s.status === 'scheduled' || s.status === 'completed');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Violation"
      size="xl"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} className="min-h-11 px-5">
            Cancel
          </Button>
          <Button type="submit" form="violation-form" loading={create.isPending} className="min-h-11 px-6">
            Record Violation
          </Button>
        </>
      }
    >
      <form id="violation-form" onSubmit={handleSubmit} className="flex flex-col gap-0">

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
          <Select label="Duty slot" value={form.duty_slot_id} onChange={set('duty_slot_id')} required>
            <option value="">Select duty slot…</option>
            {mySlots.map((s) => (
              <option key={s.id} value={s.id}>
                {new Date(s.duty_date).toLocaleDateString('en-IN')} · {s.session_type}
              </option>
            ))}
          </Select>
          <Select label="Violation type" value={form.violation_type_id} onChange={set('violation_type_id')} required>
            <option value="">Select type…</option>
            {typesData?.data?.map((t) => (
              <option key={t.id} value={t.id}>{t.name} (₹{t.default_fine})</option>
            ))}
          </Select>
          {isOthers && (
            <Input label="Describe violation" value={form.custom_violation} onChange={set('custom_violation')} required />
          )}
        </div>

        <div className="border-t border-slate-100" />

        {/* ── Fine ── */}
        <div className="flex flex-col gap-4 py-6">
          <SectionLabel>Fine</SectionLabel>
          <label htmlFor="warning" className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-4 cursor-pointer select-none hover:border-slate-300 transition-colors">
            <input
              type="checkbox"
              id="warning"
              checked={form.is_warning_only}
              onChange={set('is_warning_only')}
              className="w-[18px] h-[18px] cursor-pointer flex-shrink-0 rounded border-slate-300 accent-blue-600"
            />
            <div className="flex flex-col">
              <span className="text-[13.5px] font-medium text-slate-700">Warning only</span>
              <span className="text-[11px] text-slate-400">No fine will be charged</span>
            </div>
          </label>
          {!form.is_warning_only && (
            <Input
              label={`Fine amount (₹) — default: ₹${selectedType?.default_fine ?? 0}`}
              type="number"
              min="0"
              step="0.01"
              value={form.fine_amount}
              onChange={set('fine_amount')}
              placeholder={selectedType?.default_fine ?? ''}
            />
          )}
        </div>

        <div className="border-t border-slate-100" />

        {/* ── Notes ── */}
        <div className="flex flex-col gap-3 pt-6">
          <SectionLabel>Notes</SectionLabel>
          <Input label="Remarks (optional)" value={form.remarks} onChange={set('remarks')} />
        </div>

      </form>
    </Modal>
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
    <Modal
      open
      onClose={onClose}
      title="Flag for Review"
      description="This violation will be sent to an admin for review."
      size="sm"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} className="min-h-11 px-5">
            Cancel
          </Button>
          <Button type="submit" form="flag-form" loading={flag.isPending} className="min-h-11 px-6">
            Flag
          </Button>
        </>
      }
    >
      <form id="flag-form" onSubmit={handleSubmit}>
        <Input label="Reason for flagging" value={note} onChange={(e) => setNote(e.target.value)} required />
      </form>
    </Modal>
  );
}

export default function ViolationRecorderPage({ user }) {
  const [page, setPage]       = useState(1);
  const [showRecord, setShowRecord] = useState(false);
  const [flagging,   setFlagging]   = useState(null);

  const { data, isLoading } = useMyViolations({ page, limit: 20 });

  return (
    <Layout user={user}>
      <PageHeader
        title="Violations"
        subtitle="Violations you've recorded"
        action={<Button onClick={() => setShowRecord(true)}>+ Record Violation</Button>}
      />
      <Table>
        <thead><tr><Th>Student</Th><Th>Type</Th><Th>Fine</Th><Th>Date</Th><Th>Status</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
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
                  <Button variant="ghost" size="sm" onClick={() => setFlagging(v)}>Flag</Button>
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
