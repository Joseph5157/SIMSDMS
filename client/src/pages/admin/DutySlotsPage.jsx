import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import { useMonthSlots } from '../../hooks/useDutySlots';

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
      <PageHeader title="Duty Slots" subtitle="Monthly slot assignments" />

      <div className="flex items-center gap-3 mb-6">
        <select value={year} onChange={(e) => setYear(+e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          {[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y => <option key={y}>{y}</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(+e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <span className="text-sm text-gray-500">{slots.length} slot(s) total</span>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden">
        {['morning', 'afternoon'].map((session) => {
          const group = session === 'morning' ? morning : afternoon;
          return (
            <div key={session} style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 8 }}>
                {session} slots ({group.length})
              </p>
              <div style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
                overflow: 'hidden', marginBottom: 16 }}>
                {!group.length ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    No {session} slots
                  </div>
                ) : (
                  group.map((s) => (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px', backgroundColor: '#fff',
                      borderBottom: '1px solid #f1f5f9', gap: 12,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 2,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.faculty?.name}
                        </p>
                        <p style={{ fontSize: 12, color: '#94a3b8' }}>
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
            <h3 className="text-sm font-semibold text-gray-700 mb-2 capitalize">{session} slots ({group.length})</h3>
            <Table>
              <thead><tr><Th>Date</Th><Th>Faculty</Th><Th>Department</Th><Th>Status</Th><Th className="hidden sm:table-cell">Covered by</Th></tr></thead>
              <tbody className="divide-y divide-gray-100">
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
        backgroundColor: '#f8fafc', borderRadius: 12,
        border: '1px solid #e2e8f0',
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8',
          textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
          This month summary
        </p>
        <div style={{ display: 'flex', gap: 20 }}>
          <div>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
              {morning?.length ?? 0}
            </p>
            <p style={{ fontSize: 11, color: '#94a3b8' }}>Morning</p>
          </div>
          <div>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
              {afternoon?.length ?? 0}
            </p>
            <p style={{ fontSize: 11, color: '#94a3b8' }}>Afternoon</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
