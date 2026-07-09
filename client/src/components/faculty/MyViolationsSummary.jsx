import { useMyViolations } from '../../hooks/useViolations';
import StatCard from '../ui/StatCard';
import { Table, Th, Td } from '../ui/Table';
import Skeleton from '../ui/Skeleton';

function isSameMonth(dateStr, now) {
  const d = new Date(dateStr);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function mostCommonType(violations) {
  if (!violations.length) return '—';
  const counts = new Map();
  for (const v of violations) {
    const name = v.violationType?.name ?? 'Other';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let top = null, topCount = 0;
  for (const [name, count] of counts) {
    if (count > topCount) { top = name; topCount = count; }
  }
  return top ? `${top} - ${topCount}` : '—';
}

export default function MyViolationsSummary() {
  const { data, isLoading } = useMyViolations({ limit: 100 });
  const violations = data?.data ?? [];
  const now = new Date();

  const totalCount    = violations.length;
  const studentsCount = new Set(violations.map((v) => v.student?.id).filter(Boolean)).size;
  const mostCommon    = mostCommonType(violations);
  const thisMonth     = violations.filter((v) => isSameMonth(v.created_at, now)).length;

  if (isLoading) {
    return <Skeleton height="220px" className="rounded-2xl" />;
  }

  return (
    <div>
      <p style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        My violations
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Recorded" value={totalCount} accent="blue" />
        <StatCard label="Students Reported" value={studentsCount} accent="indigo" />
        <StatCard label="Most Common" value={mostCommon} accent="yellow" />
        <StatCard label="This Month" value={thisMonth} accent="green" />
      </div>

      {violations.length === 0 ? (
        <div className="bg-[var(--surface-card)] rounded-[var(--radius-2xl)] border border-dashed border-[var(--border)] px-4 py-5 text-center">
          <p style={{ fontSize: 'var(--text-card)', color: 'var(--text-muted)' }}>No violations recorded yet.</p>
        </div>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Student</Th>
              <Th>Violation Type</Th>
              <Th>Date</Th>
              <Th>Fine</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {violations.map((v) => (
              <tr key={v.id}>
                <Td>{v.student?.student_name ?? '—'}</Td>
                <Td>{v.violationType?.name ?? '—'}</Td>
                <Td>{new Date(v.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Td>
                <Td>{v.is_warning_only ? '—' : `₹${v.fine_amount}`}</Td>
                <Td>{v.is_warning_only ? 'Warning' : 'Recorded'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
