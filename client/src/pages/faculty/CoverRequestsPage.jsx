import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import { Button } from '@mantine/core';
import { useToast } from '../../components/ui/Toast';
import { useOpenCoverRequests, useVolunteer } from '../../hooks/useCoverRequests';
import PostCoverBroadcastModal from '../../components/faculty/PostCoverBroadcastModal';

export default function FacultyCoverRequestsPage({ user }) {
  const toast = useToast();
  const [showPost, setShowPost] = useState(false);

  const { data: open } = useOpenCoverRequests();
  const volunteer      = useVolunteer();
  const [pendingId, setPendingId] = useState(null);

  async function handleVolunteer(id) {
    setPendingId(id);
    try {
      await volunteer.mutateAsync(id);
      toast({ message: 'You have volunteered to cover this slot.' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Layout user={user}>
      <PageHeader
        title="Cover Requests"
        action={<Button size="md" onClick={() => setShowPost(true)}>+ Post Broadcast</Button>}
      />

      <Table>
        <thead>
          <tr>
            <Th>Faculty</Th><Th>Date</Th><Th>Session</Th><Th>Reason</Th><Th>Expires</Th><Th />
          </tr>
        </thead>
        <tbody>
          {!open?.data?.length && <EmptyRow cols={6} message="No open broadcasts right now." />}
          {open?.data?.map((cr) => (
            <tr key={cr.id}>
              <Td className="font-medium">
                {cr.requester?.name}
                {cr.requested_by === user?.id && (
                  <span className="ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[length:11px] font-semibold bg-[var(--surface-page)] text-[var(--text-muted)]">You</span>
                )}
              </Td>
              <Td>{cr.dutySlot ? new Date(cr.dutySlot.duty_date).toLocaleDateString('en-IN') : '—'}</Td>
              <Td className="capitalize">{cr.dutySlot?.session_type}</Td>
              <Td className="text-[var(--text-muted)] text-xs">{cr.reason ?? '—'}</Td>
              <Td className="text-xs text-[var(--text-muted)]">{new Date(cr.expires_at).toLocaleDateString('en-IN')}</Td>
              <Td>
                {cr.requested_by === user?.id ? (
                  <span className="text-xs text-[var(--text-muted)]">—</span>
                ) : !cr.volunteer_id
                  ? <Button size="xs" onClick={() => handleVolunteer(cr.id)} loading={pendingId === cr.id}>Volunteer</Button>
                  : <span className="text-xs text-[var(--text-muted)]">Volunteer assigned</span>}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <PostCoverBroadcastModal open={showPost} onClose={() => setShowPost(false)} />
    </Layout>
  );
}
