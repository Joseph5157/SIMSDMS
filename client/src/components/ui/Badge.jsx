import { STATUS_COLORS, ROLE_COLORS } from '../../utils/constants';

const STATUS_LABELS = {
  active:          'Active',
  inactive:        'Inactive',
  pending:         'Pending',
  open:            'Open',
  covered:         'Covered',
  expired:         'Expired',
  cancelled:       'Cancelled',
  cover_pending:   'Cover needed',
  scheduled:       'Scheduled',
  completed:       'Completed',
  absent:          'Absent',
  normal:          'On time',
  late:            'Late',
  hidden:          'Hidden',
  flagged:         '⚑ Flagged',
  not_checked_in:  'Not in',
  checked_in:      'Checked in',
  checked_out:     'Checked out',
  super_admin:     'Super Admin',
  admin:           'Admin',
  faculty:         'Faculty',
};

export default function Badge({ status, label, className = '' }) {
  const isRole = status === 'super_admin' || status === 'admin' || status === 'faculty';
  const cls = isRole
    ? (ROLE_COLORS[status] ?? 'bg-slate-100 text-slate-500')
    : (STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-500');

  const displayLabel = label ?? STATUS_LABELS[status] ?? status;

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cls} ${className}`}>
      {displayLabel}
    </span>
  );
}
