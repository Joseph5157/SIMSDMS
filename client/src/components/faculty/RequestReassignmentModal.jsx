import { useState, useEffect } from 'react';
import { Textarea } from '@mantine/core';
import ResponsiveSheet, { DrawerSpinner, cancelBtnStyle, primaryBtnStyle } from '../ui/ResponsiveSheet';
import { AppSelect } from '../ui/AppField';
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
    // Reopening for a different slot reuses this mounted instance; reset runs
    // before paint, so there's no stale-selection flash.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const sendDisabled = create.isPending || !toFacultyId;

  return (
    <ResponsiveSheet
      open={!!slot}
      onClose={onClose}
      title="Request Duty Reassignment"
      footer={
        <>
          <button type="button" onClick={onClose} disabled={create.isPending} style={cancelBtnStyle}>
            Cancel
          </button>
          <button disabled={sendDisabled} onClick={handleSend} style={primaryBtnStyle(sendDisabled)}>
            {create.isPending && <DrawerSpinner />}
            {create.isPending ? 'Sending…' : 'Send Request'}
          </button>
        </>
      }
    >
      {slot && (
        <div className="px-5 pt-4 pb-2 flex flex-col gap-3">
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

          {/* AppSelect bakes in comboboxProps={{ withinPortal:false }} so the
              searchable dropdown stays tappable inside this overlay's stacking
              context; ResponsiveSheet lifts the whole sheet above the on-screen
              keyboard (useKeyboardInset), replacing the manual top-anchor +
              kbInset padding the old Mantine Modal had to do by hand. */}
          <AppSelect
            label="Select colleague"
            placeholder={eligibleLoading ? 'Loading eligible faculty…' : 'Select another faculty'}
            searchable
            data={facultyOptions}
            value={toFacultyId}
            onChange={setToFacultyId}
            disabled={eligibleLoading}
            nothingFoundMessage="No eligible faculty found for this date/session"
            maxDropdownHeight={200}
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
        </div>
      )}
    </ResponsiveSheet>
  );
}
