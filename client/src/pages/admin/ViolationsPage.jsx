import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import { Button, TextInput, Select, Modal } from '@mantine/core';
import Badge from '../../components/ui/Badge';
import FormModal from '../../components/ui/FormModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import { useViolations, useHideViolation, useResolveFlag, useViolationAuditLog } from '../../hooks/useViolations';

function ResolveFlagModal({ violation, onClose }) {
  const toast = useToast();
  const resolve = useResolveFlag();
  const [reason, setReason] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await resolve.mutateAsync({ id: violation.id, reason });
      toast({ message: 'Flag resolved.' });
      onClose();
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  return (
    <FormModal
      opened={!!violation}
      onClose={onClose}
      title="Resolve Flag"
      size="sm"
      onSubmit={handleSubmit}
      submitLabel="Resolve"
      loading={resolve.isPending}
    >
      <div className="text-[13px] text-slate-600 rounded-lg p-3"
        style={{ backgroundColor: 'var(--color-amber-bg)', border: '1px solid var(--color-amber-border)' }}>
        <strong>Flag note:</strong> {violation?.flag_note}
      </div>
      <TextInput
        label="Resolution note"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        required
      />
    </FormModal>
  );
}

function AuditModal({ violationId, onClose }) {
  const { data } = useViolationAuditLog(violationId);
  return (
    <Modal opened={!!violationId} onClose={onClose} title="Violation Audit Log" size="lg" centered>
      <div className="space-y-2">
        {data?.data?.map((log) => (
          <div key={log.id} className="border border-slate-200 rounded-lg p-3 text-[13px]">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>{log.changedBy?.name} · <Badge status={log.change_type} label={log.change_type} /></span>
              <span>{new Date(log.created_at).toLocaleString()}</span>
            </div>
            {log.reason && <p className="text-slate-600">{log.reason}</p>}
          </div>
        ))}
        {!data?.data?.length && <p className="text-slate-400 text-[13px]">No audit entries.</p>}
      </div>
    </Modal>
  );
}

export default function ViolationsPage({ user }) {
  const toast = useToast();
  const [page, setPage]       = useState(1);
  const [filters, setFilters] = useState({ record_status: '', is_flagged: '' });
  const [resolving, setResolving] = useState(null);
  const [auditing,  setAuditing]  = useState(null);
  const [hiding,    setHiding]    = useState(null);

  const { data, isLoading } = useViolations({ ...filters, page, limit: 20 });
  const hide = useHideViolation();

  async function handleHide() {
    try {
      await hide.mutateAsync(hiding.id);
      toast({ message: 'Violation hidden.' });
      setHiding(null);
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  return (
    <Layout user={user}>
      <PageHeader title="Violations" subtitle="All recorded student violations" />

      <div className="flex flex-wrap gap-3 mb-4">
        <Select
          w={144}
          placeholder="All status"
          clearable
          value={filters.record_status || null}
          onChange={(value) => { setFilters(f => ({ ...f, record_status: value ?? '' })); setPage(1); }}
          data={[
            { value: 'active', label: 'Active' },
            { value: 'hidden', label: 'Hidden' },
          ]}
        />
        <Select
          w={144}
          placeholder="All"
          clearable
          value={filters.is_flagged || null}
          onChange={(value) => { setFilters(f => ({ ...f, is_flagged: value ?? '' })); setPage(1); }}
          data={[
            { value: 'true',  label: 'Flagged only' },
            { value: 'false', label: 'Not flagged' },
          ]}
        />
      </div>

      {/* Mobile card list */}
      <div className="md:hidden" style={{ backgroundColor: 'var(--surface-card)', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
        {isLoading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-card)' }}>Loading…</div>}
        {!isLoading && !data?.data?.length && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-card)' }}>No violations found.</div>}
        {data?.data?.map((v) => (
          <div key={v.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', backgroundColor: 'var(--surface-card)',
            borderBottom: '1px solid var(--border)', gap: 12,
            opacity: v.record_status === 'hidden' ? 0.6 : 1,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 'var(--text-card-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', marginBottom: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {v.student?.student_name}
              </p>
              <p style={{ fontSize: 'var(--text-small)', color: 'var(--text-muted)' }}>
                {v.student?.registration_number} • {v.violationType?.name}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {v.is_flagged && <Badge status="pending" label="Flagged" />}
              <Badge status={v.record_status} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Student</Th><Th className="hidden md:table-cell">Faculty</Th>
              <Th>Type</Th><Th>Fine (₹)</Th><Th>Status</Th><Th>Flagged</Th><Th />
            </tr>
          </thead>
          <tbody>
            {isLoading && <EmptyRow cols={7} message="Loading…" />}
            {!isLoading && !data?.data?.length && <EmptyRow cols={7} />}
            {data?.data?.map((v) => (
              <tr key={v.id} className={v.is_flagged ? 'bg-amber-50' : v.record_status === 'hidden' ? 'opacity-50' : ''}>
                <Td>
                  <p className="font-medium text-slate-900">{v.student?.student_name}</p>
                  <p className="text-xs text-slate-400">{v.student?.registration_number}</p>
                </Td>
                <Td className="hidden md:table-cell">{v.faculty?.name}</Td>
                <Td>
                  {v.violationType?.name}
                  {v.custom_violation && <p className="text-xs text-slate-400">{v.custom_violation}</p>}
                </Td>
                <Td>{v.is_warning_only ? <span className="text-xs text-slate-500">Warning only</span> : `₹${v.fine_amount}`}</Td>
                <Td><Badge status={v.record_status} /></Td>
                <Td>{v.is_flagged && <Badge status="pending" label="Flagged" />}</Td>
                <Td>
                  <div className="flex gap-1">
                    {v.is_flagged && !v.flag_resolved_at && (
                      <Button variant="subtle" size="xs" onClick={() => setResolving(v)}>Resolve</Button>
                    )}
                    {v.record_status === 'active' && (
                      <Button variant="subtle" size="xs" onClick={() => setHiding(v)}>Hide</Button>
                    )}
                    <Button variant="subtle" size="xs" onClick={() => setAuditing(v.id)}>Log</Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <Pagination meta={data?.meta} page={page} onPage={setPage} />

      {resolving && <ResolveFlagModal violation={resolving} onClose={() => setResolving(null)} />}
      {auditing  && <AuditModal violationId={auditing} onClose={() => setAuditing(null)} />}
      {hiding && (
        <ConfirmDialog
          open
          title="Hide Violation"
          message="Hide this violation record? It will no longer appear in the active list."
          confirmText="Hide"
          isDangerous
          isLoading={hide.isPending}
          onConfirm={handleHide}
          onCancel={() => setHiding(null)}
        />
      )}
    </Layout>
  );
}
