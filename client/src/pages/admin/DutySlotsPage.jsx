import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import { Select } from '@mantine/core';
import Badge from '../../components/ui/Badge';
import { useMonthSlots } from '../../hooks/useDutySlots';
import Breadcrumb from '../../components/Breadcrumb';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function DutySlotsPage({ user }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading } = useMonthSlots(year, month);

  const slots = data?.data ?? [];
  const morning   = slots.filter((s) => s.session_type === 'morning');
  const afternoon = slots.filter((s) => s.session_type === 'afternoon');

  return (
    <Layout user={user}>
      <Breadcrumb items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Duty Slots' }]} />
      <PageHeader title="Duty Slots" subtitle="Monthly slot assignments" />

      <div className="flex items-center gap-2 mb-6">
        <Select
          w={100}
          value={String(year)}
          onChange={(v) => setYear(Number(v))}
          data={[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y => ({ value: String(y), label: String(y) }))}
        />
        <Select
          w={120}
          value={String(month)}
          onChange={(v) => setMonth(Number(v))}
          data={MONTHS.map((m, i) => ({ value: String(i+1), label: m }))}
        />
        <span className="text-[13px] text-slate-500">{slots.length} slot(s) total</span>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden">
        {['morning', 'afternoon'].map((session) => {
          const group = session === 'morning' ? morning : afternoon;
          return (
            <div key={session} style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 'var(--text-small)', fontWeight: 'var(--weight-bold)', color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wide)', marginBottom: 8 }}>
                {session} slots ({group.length})
              </p>
              <div style={{ backgroundColor: 'var(--surface-card)', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border)',
                overflow: 'hidden', marginBottom: 16 }}>
                {!group.length ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-card)' }}>
                    No {session} slots
                  </div>
                ) : (
                  group.map((s) => (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px', backgroundColor: 'var(--surface-card)',
                      borderBottom: '1px solid var(--border)', gap: 12,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 'var(--text-card-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', marginBottom: 2,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.faculty?.name}
                        </p>
                        <p style={{ fontSize: 'var(--text-small)', color: 'var(--text-muted)' }}>
                          {new Date(s.duty_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <Badge status={s.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
      {['morning', 'afternoon'].map((session) => {
        const group = session === 'morning' ? morning : afternoon;
        return (
          <div key={session} className="mb-6">
            <h3 className="text-[13px] font-semibold text-slate-700 mb-2 capitalize">{session} slots ({group.length})</h3>
            <Table>
              <thead><tr><Th>Date</Th><Th>Faculty</Th><Th>Department</Th><Th>Status</Th><Th className="hidden sm:table-cell">Covered by</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && <EmptyRow cols={5} message="Loading…" />}
                {!isLoading && !group.length && <EmptyRow cols={5} message={`No ${session} slots.`} />}
                {group.map((s) => (
                  <tr key={s.id}>
                    <Td className="font-medium">{new Date(s.duty_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</Td>
                    <Td>{s.faculty?.name}</Td>
                    <Td>{s.faculty?.department ?? '—'}</Td>
                    <Td><Badge status={s.status} /></Td>
                    <Td className="hidden sm:table-cell">{s.coveredBy?.name ?? (s.covered_by ? s.covered_by.slice(0, 8) + '…' : '—')}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        );
      })}
      </div>

      <div style={{
        marginTop: 16, padding: '12px 16px',
        backgroundColor: 'var(--surface-page)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
      }}>
        <p style={{ fontSize: 'var(--text-micro)', fontWeight: 'var(--weight-bold)', color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', marginBottom: 6 }}>
          This month summary
        </p>
        <div style={{ display: 'flex', gap: 20 }}>
          <div>
            <p style={{ fontSize: 20, fontWeight: 'var(--weight-extra)', color: 'var(--text-primary)' }}>
              {morning?.length ?? 0}
            </p>
            <p style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)' }}>Morning</p>
          </div>
          <div>
            <p style={{ fontSize: 20, fontWeight: 'var(--weight-extra)', color: 'var(--text-primary)' }}>
              {afternoon?.length ?? 0}
            </p>
            <p style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)' }}>Afternoon</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
