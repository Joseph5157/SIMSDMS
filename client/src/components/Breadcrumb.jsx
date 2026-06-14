import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function Breadcrumb({ items = [] }) {
  if (!items.length) return null;

  return (
    <nav className="mb-4" aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 text-xs text-slate-500">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-slate-300">/</span>}
            {item.href ? (
              <Link
                to={item.href}
                className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-slate-700 font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
