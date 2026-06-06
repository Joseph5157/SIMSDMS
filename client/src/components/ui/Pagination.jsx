import Button from './Button';

export default function Pagination({ meta, page, onPage }) {
  if (!meta || meta.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-sm text-gray-600 pt-4">
      <span>Showing {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} of {meta.total}</span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</Button>
        <Button variant="secondary" size="sm" disabled={page >= meta.pages} onClick={() => onPage(page + 1)}>Next →</Button>
      </div>
    </div>
  );
}
