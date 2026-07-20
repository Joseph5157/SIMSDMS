import { useState, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { IconSearch, IconX } from '@tabler/icons-react';
import { useMediaQuery, useDebouncedValue } from '@mantine/hooks';
import { useStudentSearch } from '../../hooks/useStudents';
import useKeyboardInset from '../../hooks/useKeyboardInset';

// The /students/search response carries the raw course code + numeric year (not a
// display label), so build a readable meta line here.
const COURSE_LABELS = { b_pharm: 'B.Pharm', pharm_d: 'Pharm.D', m_pharm: 'M.Pharm' };
function studentMeta(s) {
  return [
    s.registration_number,
    COURSE_LABELS[s.course] ?? s.course,
    s.year != null ? `Year ${s.year}` : null,
    s.academic_year,
  ].filter(Boolean).join(' · ');
}

// ── StudentSearchOverlay ─────────────────────────────────────────────────────
/**
 * Dedicated full-screen student search (Option B — the "search container").
 *
 * Replaces the cramped inline typeahead for the Student field: tapping the field
 * opens this surface, which owns the whole viewport (mobile) / a centered command
 * panel (desktop). Selecting a student calls onSelect(student) and closes.
 *
 * Built as its own Radix Dialog so it nests cleanly INSIDE the ResponsiveSheet host
 * (also a Radix Dialog): Radix's focus-scope stack pauses the parent scope and hands
 * focus to our search input, which is the fix for the vaul focus-steal bug that
 * killed the first attempt (spec 021). No hand-rolled body portal, no focus war.
 * This is a deliberate exception to "consumers never import Radix/Framer directly"
 * (see ResponsiveSheet.jsx) — nesting requires its own Dialog.Root, ResponsiveSheet
 * can't provide that for a child. Keep this file's Radix/Framer imports.
 *
 * States are always explicit (never a silent empty box): keep-typing hint →
 * loading → no-results → results.
 *
 * Props: { open, onClose, onSelect } — onSelect receives the raw student row.
 */
export default function StudentSearchOverlay({ open, onClose, onSelect }) {
  const isMobile = useMediaQuery('(max-width: 639px)');
  const kbInset = useKeyboardInset();
  const inputRef = useRef(null);
  const [q, setQ] = useState('');
  // Debounce so we don't fire a request on every keystroke; the endpoint already
  // matches name OR reg (partials, ≥2 chars) via useStudentSearch.
  const [debounced] = useDebouncedValue(q.trim(), 250);
  const { data, isFetching } = useStudentSearch(debounced);
  const results = data?.data ?? [];

  const tooShort = debounced.length < 2;
  const loading = !tooShort && isFetching && results.length === 0;
  const empty = !tooShort && !isFetching && results.length === 0;

  // Always clear the query on close so the next open starts empty (no stale
  // results flashing). Covers Cancel, Esc, backdrop, and selecting a student.
  function close() {
    setQ('');
    onClose();
  }

  function choose(s) {
    onSelect(s);
    close();
  }

  const panelVariants = isMobile
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
    : { initial: { opacity: 0, scale: 0.97, y: 8 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.97, y: 8 } };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && close()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[200]"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            </Dialog.Overlay>

            <Dialog.Content
              asChild
              forceMount
              aria-describedby={undefined}
              // Focus the search input on open (not Radix's default first-focusable,
              // which would land on the Cancel/close button). preventDefault stops
              // Radix from moving focus itself, then we place it on the input.
              onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); }}
            >
              <motion.div
                className="fixed left-0 right-0 bottom-0 top-0 sm:top-[8vh] sm:bottom-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[92vw] sm:max-w-[560px] z-[201] flex flex-col outline-none bg-[var(--surface-card)] sm:rounded-[20px] sm:max-h-[78dvh] sm:shadow-[0_20px_60px_rgba(0,0,0,0.28)]"
                style={{
                  // On mobile the surface is edge-to-edge; lift its bottom above the
                  // soft keyboard so the results list is never hidden underneath it.
                  ...(isMobile && kbInset > 0 && { bottom: kbInset }),
                }}
                variants={panelVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ type: 'spring', damping: 34, stiffness: 340 }}
              >
                <Dialog.Title className="sr-only">Search students</Dialog.Title>

                {/* Search bar row */}
                <div
                  className="flex items-center gap-2.5 shrink-0"
                  style={{
                    padding: '12px 16px',
                    paddingTop: isMobile ? 'max(12px, env(safe-area-inset-top))' : 12,
                    borderBottom: '1px solid var(--divider)',
                  }}
                >
                  <div
                    className="flex items-center gap-2 flex-1 h-11 rounded-[var(--radius-lg)] px-3 border"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface-page)' }}
                  >
                    <IconSearch size={17} className="shrink-0 text-[var(--text-muted)]" />
                    <input
                      ref={inputRef}
                      className="flex-1 bg-transparent outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                      style={{ fontSize: 16 }}
                      placeholder="Search by name or reg. number…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    {q && (
                      <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => { setQ(''); inputRef.current?.focus(); }}
                        className="shrink-0 text-[var(--text-muted)] flex items-center"
                      >
                        <IconX size={15} />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    className="shrink-0 h-11 px-2 text-[length:var(--text-body)] font-semibold text-[var(--color-blue-600)]"
                  >
                    Cancel
                  </button>
                </div>

                {/* Results / state region */}
                <div
                  className="overflow-y-auto flex-1 min-h-0"
                  style={{ WebkitOverflowScrolling: 'touch', padding: '8px 12px 12px' }}
                >
                  {tooShort ? (
                    <StateRow>
                      {q.trim().length === 0
                        ? 'Start typing a name or registration number.'
                        : 'Keep typing — at least 2 characters.'}
                    </StateRow>
                  ) : loading ? (
                    <StateRow>
                      <span
                        className="w-4 h-4 rounded-full animate-spin"
                        style={{ border: '2px solid var(--border)', borderTopColor: 'var(--brand)' }}
                      />
                      Searching…
                    </StateRow>
                  ) : empty ? (
                    <StateRow>No students match “{debounced}”.</StateRow>
                  ) : (
                    <ul className="flex flex-col gap-2 list-none m-0 p-0">
                      {results.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => choose(s)}
                            className="w-full text-left rounded-[var(--radius-lg)] border px-4 py-3 transition-colors hover:bg-[var(--color-blue-50)] active:bg-[var(--color-blue-50)]"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface-card)', minHeight: 'var(--control-min)' }}
                          >
                            <span className="block font-semibold text-[length:var(--text-body)] text-[var(--text-primary)]">
                              {s.student_name}
                            </span>
                            <span className="block text-[length:var(--text-small)] text-[var(--text-muted)] mt-0.5">
                              {studentMeta(s)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function StateRow({ children }) {
  return (
    <div
      className="flex items-center justify-center gap-2.5 text-[length:var(--text-card)] text-[var(--text-muted)]"
      style={{ padding: '40px 20px', textAlign: 'center' }}
    >
      {children}
    </div>
  );
}
