import { useNavigate } from 'react-router-dom';
import { useMyViolations } from '../../hooks/useViolations';
import StatCard from '../ui/StatCard';
import Skeleton from '../ui/Skeleton';
import { ROUTES } from '../../utils/constants';

function isSameMonth(dateStr, now) {
  const d = new Date(dateStr);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function mostCommonType(violations) {
  if (!violations.length) return { name: '—', count: 0 };
  const counts = new Map();
  for (const v of violations) {
    const name = v.violationType?.name ?? 'Other';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let top = null, topCount = 0;
  for (const [name, count] of counts) {
    if (count > topCount) { top = name; topCount = count; }
  }
  return { name: top ?? '—', count: topCount };
}

export default function MyViolationsSummary() {
  const navigate = useNavigate();
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
      <div className="flex items-center justify-between mb-3">
        <p style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          My violations
        </p>
        <button onClick={() => navigate(ROUTES.FACULTY_VIOLATIONS)}
          style={{ fontSize: 'var(--text-small)', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: '13px 8px', margin: '-13px -8px', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
          View all →
        </button>
      </div>

      {/* Batch 6.2 (Spec 032, Milestone 6): resolves 030-D-05's "Most Common"
          truncation — its value is a category-name string, not a short
          number like its 3 siblings, so it needs the same fix already
          applied to the equivalent card on the admin Student Violations
          analytics dashboard (ViolationsPage.jsx v3.24/3.25): unconditional
          `compact` + `mobileCenter` + its own full-width row on mobile. */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        <StatCard label="Total Recorded" value={totalCount} accent="blue" />
        <StatCard label="Students Reported" value={studentsCount} accent="indigo" />
        <StatCard label="This Month" value={thisMonth} accent="green" />
        <StatCard
          compact
          mobileCenter
          className="col-span-3 md:col-span-1"
          label="Most Common"
          value={mostCommon.name}
          sub={mostCommon.count ? `${mostCommon.count} case${mostCommon.count === 1 ? '' : 's'}` : undefined}
          accent="yellow"
        />
      </div>
    </div>
  );
}
