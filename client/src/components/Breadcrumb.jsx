import { Link } from 'react-router-dom';

export default function Breadcrumb({ items = [] }) {
  if (!items.length) return null;

  return (
    <nav className="mb-4" aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-[var(--text-muted)]">/</span>}
            {item.href ? (
              // inline-flex + min-h keeps the visible text compact while giving the
              // tap target the 44px floor (030-D-04 / DS-14 measured this link at 36x16).
              <Link
                to={item.href}
                className="inline-flex items-center min-h-[var(--control-min)] text-[var(--brand)] hover:text-[var(--brand)] hover:underline transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-[var(--text-secondary)] font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
