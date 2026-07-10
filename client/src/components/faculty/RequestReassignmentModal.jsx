import { useState, useEffect } from 'react';
import { Select, Modal, Textarea, Button } from '@mantine/core';
import Badge from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { useEligibleFaculty, useCreateReassignmentRequest } from '../../hooks/useDutyReassignmentRequests';

export default function RequestReassignmentModal({ slot, onClose }) {
  const toast = useToast();
  const [toFacultyId, setToFacultyId] = useState(null);
  const [reason, setReason] = useState('');

  const { data: eligibleData, isLoading: eligibleLoading } = useEligibleFaculty(slot?.id);
  const create = useCreateReassignmentRequest();

  useEffect(() => {
    if (slot) { setToFacultyId(null); setReason(''); }
  }, [slot]);

  const facultyOptions = (eligibleData?.data ?? []).map((f) => ({ value: f.id, label: f.name }));

  async function handleSend() {
    try {
      await create.mutateAsync({ duty_slot_id: slot.id, to_faculty_id: toFacultyId, reason: reason || undefined });
      toast({ message: 'Reassignment request sent. Waiting for your colleague to respond.' });
      onClose();
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed to send request.', type: 'error' });
    }
  }

  return (
    <Modal opened={!!slot} onClose={onClose} title="Request Duty Reassignment" centered>
      {slot && (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-page)] p-3 text-[length:13px]">
            <div className="flex justify-between py-0.5">
              <span className="text-[var(--text-muted)]">Duty date</span>
              <span className="font-semibold text-[var(--text-primary)]">
                {new Date(slot.duty_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between py-0.5 items-center">
              <span className="text-[var(--text-muted)]">Session</span>
              <Badge status={slot.status} label={slot.session_type} />
            </div>
          </div>

          <Select
            label="Select colleague"
            placeholder={eligibleLoading ? 'Loading eligible faculty…' : 'Select another faculty'}
            searchable
            data={facultyOptions}
            value={toFacultyId}
            onChange={setToFacultyId}
            disabled={eligibleLoading}
            nothingFoundMessage="No eligible faculty found for this date/session"
            comboboxProps={{ withinPortal: false }}
          />

          <Textarea
            label="Reason (optional)"
            placeholder="e.g. Unable to attend due to a personal commitment"
            autosize
            minRows={2}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="default" onClick={onClose} disabled={create.isPending}>Cancel</Button>
            <Button onClick={handleSend} loading={create.isPending} disabled={!toFacultyId}>Send Request</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
