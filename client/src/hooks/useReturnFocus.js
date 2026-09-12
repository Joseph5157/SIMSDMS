import { useState, useEffect } from 'react';

/**
 * Restores keyboard focus to the control that was focused right before an
 * overlay opened, once the overlay closes.
 *
 * Why this exists (030-D-02 / Spec 032 Batch 1.2): Mantine's own focus-return
 * (`useFocusReturn`, used internally by `Modal`/`Modal.Root`) only captures the
 * pre-open trigger on an `opened` false→true *update*, and only restores focus
 * after the closing CSS transition finishes. FormModal and ConfirmDialog are
 * always rendered by their callers as `{state && <FormModal opened .../>}` —
 * the component is created already `opened`, so Mantine's hook never sees an
 * update to capture from, and the parent unmounts the whole subtree the
 * instant it closes, before Mantine's transition-driven restore ever runs.
 *
 * Every current caller mounts the component already `opened` and unmounts it
 * on close, so a component instance only ever has one "opening" in its
 * lifetime — capturing the trigger once, in a lazy `useState` initializer
 * (which React runs exactly once, on mount, before any child effect —
 * including Mantine's own focus trap — can move focus into the overlay), is
 * enough. Restoring it from a plain effect cleanup means React runs it
 * whether `opened` later flips to false or the component is unmounted
 * outright.
 */
export default function useReturnFocus(opened) {
  const [trigger] = useState(() => {
    const active = opened && typeof document !== 'undefined' ? document.activeElement : null;
    return active && active !== document.body ? active : undefined;
  });

  useEffect(() => {
    if (!opened) return undefined;
    return () => {
      if (trigger && typeof trigger.focus === 'function' && document.body.contains(trigger)) {
        trigger.focus({ preventScroll: true });
      }
    };
  }, [opened, trigger]);
}
