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
    <Modal open onClose={onClose} title="Resolve Flag" size="sm">
      <div className="mb-3 text-sm text-gray-600 bg-yellow-50 rounded-lg p-3">
        <strong>Flag note:</strong> {violation.flag_note}
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Resolution note" value={reason} onChange={(e) => setReason(e.target.value)} required />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={resolve.isPending}>Resolve</Button>
        </div>
      </form>
    </Modal>
  );
}

function AuditModal({ violationId, onClose }) {
  const { data } = useViolationAuditLog(violationId);
  return (
    <Modal open onClose={onClose} title="Violation Audit Log" size="lg">
      <div className="space-y-2">
        {data?.data?.map((log) => (
          <div key={log.id} className="border rounded-lg p-3 text-sm">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{log.changedBy?.name} · <Badge status={log.change_type} label={log.change_type} /></span>
              <span>{new Date(log.created_at).toLocaleString()}</span>
            </div>
            {log.reason && <p className="text-gray-600">{log.reason}</p>}
          </div>
        ))}
        {!data?.data?.length && <p className="text-gray-400 text-sm">No audit entries.</p>}
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

  const { data, isLoading } = useViolations({ ...filters, page, limit: 20 });
  const hide = useHideViolation();

  async function handleHide(v) {
    if (!confirm('Hide this violation record?')) return;
    try {
      await hide.mutateAsync(v.id);
      toast({ message: 'Violation hidden.' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  return (
    <Layout user={user}>
      <PageHeader title="Violations" subtitle="All recorded student violations" />

      <div className="flex gap-3 mb-4">
        <Select value={filters.record_status} onChange={(e) => setFilters(f => ({ ...f, record_status: e.target.value }))} className="w-36">
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="hidden">Hidden</option>
        </Select>
        <Select value={filters.is_flagged} onChange={(e) => setFilters(f => ({ ...f, is_flagged: e.target.value }))} className="w-36">
          <option value="">All</option>
          <option value="true">Flagged only</option>
          <option value="false">Not flagged</option>
        </Select>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden" style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 16 }}>
        {isLoading && <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading…</div>}
        {!isLoading && !data?.data?.length && <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No violations found.</div>}
        {data?.data?.map((v) => (
          <div key={v.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', backgroundColor: '#fff',
            borderBottom: '1px solid #f1f5f9', gap: 12,
            opacity: v.record_status === 'hidden' ? 0.6 : 1,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {v.student?.student_name}
              </p>
              <p style={{ fontSize: 12, color: '#94a3b8' }}>
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
        <thead><tr><Th>Student</Th><Th className="hidden md:table-cell">Faculty</Th><Th>Type</Th><Th>Fine (₹)</Th><Th>Status</Th><Th>Flagged</Th><Th /></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading && <EmptyRow cols={7} message="Loading…" />}
          {!isLoading && !data?.data?.length && <EmptyRow cols={7} />}
          {data?.data?.map((v) => (
            <tr key={v.id} className={v.is_flagged ? 'bg-amber-50' : v.record_status === 'hidden' ? 'opacity-50' : ''}>
              <Td>
                <p className="font-medium text-gray-900">{v.student?.student_name}</p>
                <p className="text-xs text-gray-400">{v.student?.registration_number}</p>
              </Td>
              <Td className="hidden md:table-cell">{v.faculty?.name}</Td>
              <Td>{v.violationType?.name}{v.custom_violation && <p className="text-xs text-gray-400">{v.custom_violation}</p>}</Td>
              <Td>{v.is_warning_only ? <span className="text-xs text-gray-500">Warning only</span> : `₹${v.fine_amount}`}</Td>
              <Td><Badge status={v.record_status} /></Td>
              <Td>{v.is_flagged && <Badge status="pending" label="Flagged" />}</Td>
              <Td>
                <div className="flex gap-1">
                  {v.is_flagged && !v.flag_resolved_at && (
                    <Button variant="ghost" size="sm" onClick={() => setResolving(v)}>Resolve</Button>
                  )}
                  {v.record_status === 'active' && (
                    <Button variant="ghost" size="sm" onClick={() => handleHide(v)}>Hide</Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setAuditing(v.id)}>Log</Button>
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
    </Layout>
  );
}
