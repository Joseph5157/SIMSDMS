import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import { Button, TextInput } from '@mantine/core';
import Badge from '../../components/ui/Badge';
import FormModal from '../../components/ui/FormModal';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import { useMyViolations, useFlagViolation } from '../../hooks/useViolations';
import RecordViolationModal from '../../components/faculty/RecordViolationModal';

function FlagModal({ violation, onClose }) {
  const toast = useToast();
  const flag = useFlagViolation();
  const [note, setNote] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await flag.mutateAsync({ id: violation.id, flag_note: note });
      toast({ message: 'Student violation flagged for review.' });
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
        title="Student Violations"
        subtitle="Student violations you've recorded"
        action={<Button size="sm" onClick={() => setShowRecord(true)}>+ Record Student Violation</Button>}
      />
      <Table>
        <thead>
          <tr>
            <Th>Student</Th><Th>Type</Th><Th>Fine</Th><Th>Date</Th><Th>Status</Th><Th />
          </tr>
        </thead>
        <tbody>
          {isLoading && <EmptyRow cols={6} message="Loading…" />}
          {!isLoading && !data?.data?.length && <EmptyRow cols={6} message="No student violations recorded." />}
          {data?.data?.map((v) => (
            <tr key={v.id}>
              <Td>
                <p className="font-medium">{v.student?.student_name}</p>
                <p className="text-xs text-[var(--text-muted)]">{v.student?.registration_number}</p>
              </Td>
              <Td>{v.violationType?.name}</Td>
              <Td>{v.is_warning_only ? <span className="text-xs text-[var(--text-muted)]">Warning</span> : `₹${v.fine_amount}`}</Td>
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
      <RecordViolationModal open={showRecord} onClose={() => setShowRecord(false)} />
      {flagging && <FlagModal violation={flagging} onClose={() => setFlagging(null)} />}
    </Layout>
  );
}
