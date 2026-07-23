import ResponsiveSheet, { cancelBtnStyle } from '../ui/ResponsiveSheet';
import { useTrendBreakdown } from '../../hooks/useAnalytics';

const sectionTitle = "text-[length:var(--text-micro)] font-[800] text-[color:var(--text-muted)] uppercase tracking-[0.12em]";

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--divider)] last:border-b-0">
      <span className="text-[length:var(--text-small)] text-[var(--text-muted)]">{label}</span>
      <span className="text-[length:var(--text-card)] font-medium text-[var(--text-primary)]">{value ?? '—'}</span>
    </div>
  );
}

// Shown when an admin clicks a point on the Violation Trend chart — a
// read-only snapshot of that single period, scoped to the exact (already
// filter-and-range-clipped) bucket the trend endpoint computed.
export default function TrendBreakdownDrawer({ bucket, params, onClose }) {
  const { data, isLoading } = useTrendBreakdown(bucket, params);

  return (
    <ResponsiveSheet
      open={!!bucket}
      onClose={onClose}
      title={bucket?.label ?? 'Period detail'}
      subtitle="Violation breakdown for this period"
      footer={
        <button onClick={onClose} style={{ ...cancelBtnStyle, flex: 1 }}>Close</button>
      }
    >
      <div className="px-5 py-4 pb-2">
        {isLoading || !data ? (
          <p className="text-[length:var(--text-card)] text-[var(--text-muted)]">Loading…</p>
        ) : (
          <>
            <div className="mb-4">
              <InfoRow label="Total Violations" value={data.total_violations} />
              <InfoRow label="Students Involved" value={data.students_involved} />
              <InfoRow label="Most Frequent Violation" value={data.most_frequent_violation ? `${data.most_frequent_violation.name} (${data.most_frequent_violation.count})` : '—'} />
              <InfoRow label="Repeat Violators" value={data.repeat_violators_count} />
            </div>

            <p className={`${sectionTitle} mb-2`}>Recorded By</p>
            <div className="mb-2">
              {!data.recorded_by.length && (
                <p className="text-[length:var(--text-card)] text-[var(--text-muted)] py-2">No violations recorded in this period.</p>
              )}
              {data.recorded_by.map((r) => (
                <InfoRow key={r.name} label={r.name} value={r.count} />
              ))}
            </div>
          </>
        )}
      </div>
    </ResponsiveSheet>
  );
}
