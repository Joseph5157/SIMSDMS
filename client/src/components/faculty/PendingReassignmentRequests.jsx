import { Button } from '@mantine/core';
import { useToast } from '../ui/Toast';
import Skeleton from '../ui/Skeleton';
import { usePendingReassignmentRequests, useRespondToReassignmentRequest } from '../../hooks/useDutyReassignmentRequests';

export default function PendingReassignmentRequests() {
  const toast = useToast();
  const { data, isLoading } = usePendingReassignmentRequests();
  const respond = useRespondToReassignmentRequest();

  const requests = data?.data ?? [];
  const respondingRequestId = respond.variables?.id;

  if (isLoading) {
    return (
      <div className="mb-4">
        <Skeleton height="11px" width="180px" className="mb-3" />
        <div className="bg-[var(--surface-card)] rounded-[var(--radius-2xl)] border border-[var(--border)] px-[14px] py-3">
          <Skeleton height="14px" width="70%" className="mb-2" />
          <Skeleton height="11px" width="40%" />
        </div>
      </div>
    );
  }

  if (!requests.length) return null;

  async function handleRespond(id, status) {
    try {
      await respond.mutateAsync({ id, status });
      toast({ message: status === 'approved' ? 'Duty accepted — it is now yours.' : 'Request declined.' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed to respond.', type: 'error' });
    }
  }

  return (
    <div className="mb-4">
      <p className="text-[length:var(--text-micro)] font-[var(--weight-bold)] text-[var(--text-secondary)] uppercase tracking-[var(--tracking-wide)] mb-3">
        Reassignment requests for you
      </p>
      {/* Batch 6.2 (Spec 032, Milestone 6): same shared-container/row-divider
          treatment as DashboardPage.jsx's "Upcoming duties"/"Reassigned
          away" sections directly below this component on the Faculty
          dashboard — was one bordered card per request with a uniform
          (non-distinguishing) left-accent bar. */}
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-2xl)] border border-[var(--border)] overflow-hidden">
        {requests.map((r, i) => {
          const d = new Date(r.dutySlot.duty_date);
          return (
            <div key={r.id} className={`px-[14px] py-3 ${i < requests.length - 1 ? 'border-b border-[var(--divider)]' : ''}`}>
              <p className="text-[length:var(--text-card)] font-[var(--weight-semibold)] text-[var(--text-primary)]">
                {r.fromFaculty?.name} wants you to take over their {r.dutySlot.session_type} duty
              </p>
              <p className="text-[length:var(--text-micro)] text-[var(--text-muted)] mt-0.5">
                {d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                {r.reason ? ` · ${r.reason}` : ''}
              </p>
              <div className="mt-3 pt-3 border-t border-[var(--divider)] flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="default"
                  color="red"
                  loading={respond.isPending && respondingRequestId === r.id && respond.variables?.status === 'declined'}
                  disabled={respond.isPending && respondingRequestId === r.id}
                  onClick={() => handleRespond(r.id, 'declined')}
                  styles={{ root: { minHeight: 'var(--control-min)', fontWeight: 700 } }}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  color="green"
                  loading={respond.isPending && respondingRequestId === r.id && respond.variables?.status === 'approved'}
                  disabled={respond.isPending && respondingRequestId === r.id}
                  onClick={() => handleRespond(r.id, 'approved')}
                  styles={{ root: { minHeight: 'var(--control-min)', fontWeight: 700 } }}
                >
                  Accept
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
