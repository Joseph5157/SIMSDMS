import Button from './Button';

export default function Pagination({ meta, page, onPage }) {
  if (!meta || meta.pages <= 1) return null;
  const from = (page - 1) * meta.limit + 1;
  const to   = Math.min(page * meta.limit, meta.total);
  return (
    <div className="flex items-center justify-between pt-4 text-[12px] text-slate-500">
      <span>Showing {from}–{to} of {meta.total}</span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</Button>
        <Button variant="secondary" size="sm" disabled={page >= meta.pages} onClick={() => onPage(page + 1)}>Next →</Button>
      </div>
    </div>
  );
}
