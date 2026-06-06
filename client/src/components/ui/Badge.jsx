import { STATUS_COLORS } from '../../utils/constants';

export default function Badge({ status, label }) {
  const cls = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label ?? status}
    </span>
  );
}
