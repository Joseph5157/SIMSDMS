import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDebouncedValue } from '@mantine/hooks';
import { FocusScope } from '@radix-ui/react-focus-scope';
import { useStudentSearch } from '../../hooks/useStudents';
import useKeyboardInset from '../../hooks/useKeyboardInset';

const COURSE_LABELS = { b_pharm: 'B.Pharm', pharm_d: 'Pharm.D', m_pharm: 'M.Pharm' };

function courseLabel(course) {
  return COURSE_LABELS[course] ?? course ?? '';
}

// Wraps children in a trapped Radix FocusScope only when `active`; otherwise
// renders them untouched. Used to pause a Radix parent's focus trap (vaul) on
// mobile without interfering with a Mantine parent on desktop.
function MaybeFocusScope({ active, children }) {
  if (!active) return children;
  return (
    <FocusScope
      asChild
      trapped
      loop
      onMountAutoFocus={(e) => e.preventDefault()}
      onUnmountAutoFocus={(e) => e.preventDefault()}
    >
      {children}
    </FocusScope>
  );
}

/**
 * StudentSearchOverlay — the single, app-wide student picker for every
 * "Record Student Violation" popup (faculty, admin, admin-override).
 *
 * Instead of an autocomplete dropdown cramped inside the modal (which competes
 * with the mobile keyboard for space), tapping the student field opens this
 * dedicated full-screen overlay: header + back button, an auto-focused search
 * box, and a large scrollable result list that owns the whole screen. Selecting
 * a student closes the overlay and hands the record back via onSelect.
 *
 * Props:
 *  - open:     whether the overlay is visible
 *  - onClose:  called when the user backs out without selecting
 *  - onSelect: called with the chosen student record { id, student_name, ... }
 *  - inputRef: optional ref forwarded to the search box. The opener uses it to
 *              focus the field synchronously inside the tap gesture (via
 *              flushSync) so the mobile soft keyboard actually appears — a plain
 *              effect-based focus runs after the gesture and iOS keeps the
 *              keyboard closed.
 *  - pauseParentTrap: wrap the panel in a Radix FocusScope so it pauses the
 *              parent popup's Radix focus trap (the vaul BottomDrawer on mobile),
 *              which otherwise steals focus from the input and flickers the
 *              keyboard. Only pass this when the parent is Radix-based (mobile);
 *              a Mantine parent (desktop) manages this itself via trapFocus and a
 *              nested FocusScope would fight it.
 */
export default function StudentSearchOverlay({ open, onClose, onSelect, inputRef: externalRef, pauseParentTrap = false }) {
  const [q, setQ] = useState('');
  // Debounce so we don't fire a request on every keystroke (large student DBs).
  const [debouncedQ] = useDebouncedValue(q, 250);
  const internalRef = useRef(null);
  const inputRef = externalRef ?? internalRef;
  const kbInset = useKeyboardInset();

  const trimmed = debouncedQ.trim();
  const { data, isFetching } = useStudentSearch(trimmed);
  const results = data?.data ?? [];

  // Start blank every time it opens; lock body scroll. Best-effort focus here
  // covers programmatic opens (e.g. quick-add); gesture-driven opens focus in
  // the opener so the mobile keyboard is raised (see the prop doc above).
  useEffect(() => {
    if (!open) return;
    setQ('');
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape backs out (desktop).
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const tooShort = trimmed.length < 2;
  const showEmpty = !tooShort && !isFetching && results.length === 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex flex-col sm:items-center sm:justify-start sm:pt-[7vh]"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Select student"
    >
      {/* On mobile, FocusScope(trapped) registers on Radix's focus-scope stack and
          PAUSES the parent vaul drawer's trap so it can't steal focus from the
          input — that steal was raising then dismissing the keyboard.
          onMountAutoFocus is prevented so our flushSync focus (in the opener)
          keeps the input, not the back button. Desktop skips this: the Mantine
          parent isn't on Radix's stack, so a nested FocusScope would fight it. */}
      <MaybeFocusScope active={pauseParentTrap}>
      <div
        className="flex flex-col w-full h-full bg-[var(--surface-card)] overflow-hidden sm:h-auto sm:max-h-[82vh] sm:w-[560px] sm:rounded-2xl sm:shadow-2xl"
        style={{ height: '100dvh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-[var(--border)] shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-page)] shrink-0"
            style={{ fontSize: 22, lineHeight: 1 }}
          >
            ‹
          </button>
          <h2 className="text-[length:16px] font-bold text-[var(--text-primary)]">Select Student</h2>
        </div>

        {/* ── Search box ── */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <input
            ref={inputRef}
            className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-page)] px-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:bg-[var(--surface-card)] focus:ring-2 focus:ring-[var(--brand)]/20"
            style={{ fontSize: 16 }}
            placeholder="Search by Student Name or Registration Number"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>

        {/* ── Results (owns all remaining space; padded so the keyboard never
               hides the last rows on mobile) ── */}
        <div
          className="flex-1 min-h-0 overflow-y-auto"
          style={{ paddingBottom: kbInset }}
        >
          {tooShort && (
            <p className="px-4 py-6 text-[length:13px] text-[var(--text-muted)] text-center">
              Type at least 2 characters to search.
            </p>
          )}
          {!tooShort && isFetching && results.length === 0 && (
            <p className="px-4 py-6 text-[length:13px] text-[var(--text-muted)] text-center">Searching…</p>
          )}
          {showEmpty && (
            <p className="px-4 py-6 text-[length:13px] text-[var(--text-muted)] text-center">
              No students found for “{trimmed}”.
            </p>
          )}
          <div className="divide-y divide-[var(--divider)]">
            {results.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s)}
                className="w-full text-left px-4 py-3.5 hover:bg-[var(--color-blue-50)] active:bg-[var(--color-blue-50)] transition-colors"
                style={{ minHeight: 60 }}
              >
                <p className="text-[length:15px] font-semibold text-[var(--text-primary)] truncate">
                  {s.student_name}
                </p>
                <p className="text-[length:13px] text-[var(--text-muted)] mt-0.5 truncate">
                  <span className="font-mono">{s.registration_number}</span>
                  {s.course ? ` · ${courseLabel(s.course)}` : ''}
                  {s.year ? ` · Year ${s.year}` : ''}
                  {s.academic_year ? ` · ${s.academic_year}` : ''}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
      </MaybeFocusScope>
    </div>,
    document.body,
  );
}
