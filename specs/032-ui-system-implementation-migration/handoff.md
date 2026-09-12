# Handoff Report

## task_id

032-ui-system-implementation-migration / Batch 1.2 — Overlay focus-return fix (FormModal + ConfirmDialog)

## status

complete

## completed

### Scenario addressed

030-D-02 / DS-05: "Form modal at 639/640/641 and ConfirmDialog at 390 all reported
`focusReturned: false`; Mantine Menu and direct Mantine Modal reported `true`."

### Reproduction before fix

Reproduced live (not just from the audit record) by loading `/admin/students` in Chrome via
`chrome-devtools` MCP, opening the "Promote" `FormModal` and the "Delete" `ConfirmDialog`, and closing
each with Escape: focus landed nowhere recoverable (lost to `document.body`) in both cases, at desktop
width and at 639/640/641 (FormModal) and 390 (ConfirmDialog). This matches 030-D-02 exactly. By
contrast, the Duty Slots reassignment dialog (`DutySlotsPage.jsx`, a direct `<Modal>` usage) and Mantine
`Menu` (Users page row-actions menu) correctly returned focus, matching 030-D-02's "true" results for
those two.

### Root cause

**Consumer-side mounting pattern, not a defect in FormModal/ConfirmDialog's own JSX or in Mantine
itself.** Read Mantine's `useFocusReturn` source
(`node_modules/@mantine/hooks/esm/use-focus-return/use-focus-return.mjs`) to confirm the mechanism:

1. It captures the pre-open trigger (`document.activeElement`) only on an `opened` **update**
   (`useDidUpdate`, which explicitly skips the first render).
2. It restores focus only via a 10ms-delayed `setTimeout` scheduled when `opened` transitions to
   `false`, whose cleanup (`window.clearTimeout`) fires on unmount.

Every current `FormModal`/`ConfirmDialog` caller renders the component as
`{state && <FormModal opened={!!state} .../>}` (confirmed by grep across all 7 `FormModal` and 7
`ConfirmDialog` consumer files) — the component is *created* already `opened={true}` and *unmounted
outright* the instant the consumer's `onClose`/`onCancel` sets `state` back to `null`/`false`. This
defeats both halves of Mantine's mechanism: there is never an observable `false→true` update for it to
capture from (so `lastActiveElement` stays `null`), and even if it were populated, the component is gone
before the 10ms timeout can fire. The Duty Slots reassignment modal instead renders `<Modal
opened={!!target} ...>` **unconditionally** (only its *contents* are conditional) — so `useFocusReturn`
observes real `opened` transitions across the component's whole lifetime, which is why it already worked.

### Ownership layer changed

**Shared component layer** (`FormModal` and `ConfirmDialog` themselves) — not a consumer fix, and not a
Mantine/library change. Since literally every current consumer of both components exhibits the same
unmount-on-close pattern, this is "genuinely shared" per the batch's own guidance, so the fix lives once
in the two shared components rather than being repeated across ~14 call sites.

### Fix

Added `client/src/hooks/useReturnFocus.js` — a small hook that:
- Captures `document.activeElement` in a **lazy `useState` initializer**, which React runs exactly once,
  synchronously, before any child effect (including Mantine's own focus trap) can move focus into the
  overlay — sidestepping the mount-vs-update timing gap in Mantine's own hook.
- Restores it from a plain `useEffect` cleanup keyed on the `opened`/`open` boolean, which React runs
  unconditionally whether the prop flips to `false` while the component stays mounted, **or** the
  component is unmounted outright (the actual case here) — no `setTimeout`, so there's no window in
  which an unmount can race it.
- Guards against the "trigger removed" edge case: skips restoring if the captured element is no longer
  in the document (`document.body.contains(el)`), and uses `{ preventScroll: true }` to match Mantine's
  own convention of not causing a scroll jump on restore.

Wired into both components with a single call each:
- `FormModal.jsx`: `useReturnFocus(opened);`
- `ConfirmDialog.jsx`: `useReturnFocus(open);`

No consumer file was touched. `ResponsiveSheet`, `Modal.Root`'s own focus trap (containment while open),
Escape handling, safe-area handling, and animations are all unchanged — this only adds an exit-focus
restoration path alongside the existing containment behavior.

### Files changed

- `client/src/hooks/useReturnFocus.js` (new)
- `client/src/components/ui/FormModal.jsx` (+2 lines: import + one hook call)
- `client/src/components/ui/ConfirmDialog.jsx` (+3 lines: import + one hook call)

```diff
--- a/client/src/components/ui/ConfirmDialog.jsx
+++ b/client/src/components/ui/ConfirmDialog.jsx
@@ -1,4 +1,5 @@
 import { Modal, Text, Group, Button } from '@mantine/core';
+import useReturnFocus from '../../hooks/useReturnFocus';
 ...
 }) {
+  useReturnFocus(open);
+
   return (
     <Modal
--- a/client/src/components/ui/FormModal.jsx
+++ b/client/src/components/ui/FormModal.jsx
@@ -1,6 +1,7 @@
 import { Modal, Stack, Group, Button, Alert } from '@mantine/core';
 import { useMediaQuery } from '@mantine/hooks';
 import { IconAlertCircle } from '@tabler/icons-react';
+import useReturnFocus from '../../hooks/useReturnFocus';
 ...
   const isMobile = useMediaQuery('(max-width: 640px)');
   const id = formId ?? 'form-modal-form';
+  useReturnFocus(opened);
```

### Verification matrix

All performed live in Chrome (`chrome-devtools` MCP) against the app's own dev stack, logged in as
`super_admin`, on `/admin/students` (has both a `FormModal` — "Promote" — and a `ConfirmDialog` —
"Delete") and `/admin/users` (Mantine Menu → `ConfirmDialog` — "Deactivate"/"Reactivate").

| Scenario | Width | Close method | Result |
| --- | --- | --- | --- |
| FormModal (Promote) | 1440 (desktop) | Escape | ✅ focus → "Promote" trigger |
| FormModal (Promote) | 1440 (desktop) | Cancel button click | ✅ focus → "Promote" trigger |
| FormModal (Promote) | 639 | Escape | ✅ focus → "Promote" trigger (exact 030-D scenario) |
| FormModal (Promote) | 640 | Escape | ✅ focus → "Promote" trigger (exact 030-D scenario) |
| FormModal (Promote) | 641 | Escape | ✅ focus → "Promote" trigger (exact 030-D scenario) |
| ConfirmDialog (Delete) | 1440 (desktop) | Escape | ✅ focus → "Delete" trigger |
| ConfirmDialog (Delete) | 390 | Escape | ✅ focus → "Delete" trigger (exact 030-D scenario) |
| ConfirmDialog (Deactivate, opened from a Mantine Menu item) | 1440 | Confirm (real mutation, "Deactivate") | ✅ no error; trigger (menu item) was already removed from the DOM when the menu closed, so the `document.body.contains` guard correctly skipped restoring focus to a detached node — graceful "trigger removed" edge case, not a regression (the original 030-D-02 defect also left focus nowhere in this case) |
| ConfirmDialog (Reactivate) | 1440 | Confirm | ✅ no error; same graceful edge case |
| Focus containment (Tab trap) | 1440 | N/A — Tab×6 inside open FormModal | ✅ cycles Close→Year→Semester→AcademicYear→Cancel→Promote→(wraps to)Close; never escapes to the page behind it — unaffected by this change |

`ResponsiveSheet` (Radix Dialog, `Dialog.Root` always mounted with `AnimatePresence`/`forceMount`
internally) was **not** live-tested — it lives only on the Reports page, which is explicitly out of
scope for this batch ("Do not work on Reports"). Verified instead by code inspection: it does not use
`FormModal`, `ConfirmDialog`, or the new hook, so nothing in this change can affect it. Its focus-return
mechanism is Radix's own (a fundamentally different, already-always-mounted pattern), and 030-D-02 did
not report a failure for it. `StudentSearchOverlay`'s documented nested-overlay exception was likewise
untouched and not re-verified, for the same reason (out of the failing-scenario set, and not modified).

### Lint / build / test results

- `npx eslint client/src/hooks/useReturnFocus.js client/src/components/ui/FormModal.jsx client/src/components/ui/ConfirmDialog.jsx` — clean (0 errors, 0 warnings). Note: the first two implementation attempts (a ref-based capture) were rejected by this repo's `react-hooks/refs` lint rule ("Cannot access refs during render"); the final `useState`-lazy-initializer approach was chosen specifically because it satisfies that rule without suppressing it.
- `npm run build --workspace=client` — succeeded (pre-existing >500kB chunk-size advisory only, unrelated).
- No existing unit or Playwright test covers `FormModal`/`ConfirmDialog` (consistent with 030's DS-23 finding of no client unit-test suite); none were run because none apply.
- `git diff --check` — clean (exit 0; only pre-existing CRLF warnings on unrelated files already modified before this task).

### Browser results

Zero new console errors or warnings introduced at any tested width/interaction. The only console output
throughout was pre-existing and unrelated: a Chrome DevTools "issues" notice that some form field lacks
an `id`/`name` attribute (present identically before this batch, on unrelated inputs on the Students/
Users pages — not touched by this change, out of scope per "do not perform unrelated accessibility
cleanup").

### Regressions checked

- **Focus trapping while open**: unaffected — Tab cycling inside an open FormModal stays contained and
  wraps correctly (verified above).
- **Escape behavior**: unaffected — Escape still closes both components exactly as before; the only
  change is where focus subsequently lands.
- **Safe-area / mobile sheet behavior**: not applicable to FormModal/ConfirmDialog (neither uses safe-
  area insets); `ResponsiveSheet`'s safe-area handling was not touched.
- **Scroll locking**: not touched — Mantine's own `RemoveScroll` behavior inside `Modal`/`Modal.Root` is
  unmodified; no code path affecting it was changed. Not independently re-verified beyond observing
  normal-looking open/close in every screenshot/snapshot above (no layout shift).
- **Animations**: unmodified — no styling, transition, or animation code was touched.
- **Radix/Mantine ownership boundaries**: unchanged — `FormModal`/`ConfirmDialog` still use Mantine
  exclusively; no new dependency was added; no second focus-management system was introduced (the new
  hook only supplements the existing exit-focus-return path, it does not replace or duplicate Mantine's
  in-overlay focus containment).

## failed_or_blocked

- None.

## commands_run

```
npx eslint client/src/hooks/useReturnFocus.js client/src/components/ui/FormModal.jsx client/src/components/ui/ConfirmDialog.jsx
npm run build --workspace=client
git diff --check
git diff -- client/src/components/ui/FormModal.jsx client/src/components/ui/ConfirmDialog.jsx
git status --porcelain=v1
git cat-file -t fa996f2 && git cat-file -t 91e5b3e
git stash list
# read-only source inspection:
node_modules/@mantine/hooks/esm/use-focus-return/use-focus-return.mjs
# live browser verification via chrome-devtools MCP against the already-running dev stack
# (client :5173, server :3000, dev DB sims-dms-postgres :5434 — all from the approved Batch 1.1 session)
```

## constraints_discovered

- This repo's ESLint config enables a `react-hooks/refs` rule (React Compiler's stricter rules) that
  rejects reading or writing `ref.current` during render outside a narrow, literal
  `if (ref.current == null) { ref.current = ... }` shape — even a version of that exact shape with one
  extra `&&` condition was rejected. This ruled out the otherwise-natural ref-based implementation and
  is why the fix uses a lazy `useState` initializer instead (see root cause / fix above). Worth knowing
  for any future hook that needs a "compute once, before children mount" value.
- Every `FormModal` and `ConfirmDialog` consumer (7 files each) uses the same
  `{state && <Component opened={!!state} .../>}` mounting pattern; none keep the component mounted and
  only toggle `opened`/`open`. The fix is written to be correct for both patterns, but only the
  unmount-on-close pattern was exercisable live, since that's 100% of current usage.
- `/admin/students` conveniently hosts both a `FormModal` ("Promote") and a `ConfirmDialog` ("Delete"),
  which made it the primary verification page; `/admin/users` was used for the "confirm action closes
  the dialog via a real mutation" and "trigger already removed from the DOM" edge case (via its Mantine
  Menu → ConfirmDialog flow), using the reversible Deactivate/Reactivate pair on the seeded
  `faculty.test@sims.edu` account (left in its original `Active` state afterward).

## deviations_from_constitution

- None.

## files_touched

- `client/src/hooks/useReturnFocus.js` (new)
- `client/src/components/ui/FormModal.jsx` (modified)
- `client/src/components/ui/ConfirmDialog.jsx` (modified)
- `specs/032-ui-system-implementation-migration/handoff.md` (this closure report, overwriting the
  Batch 1.1 closure report per the standing instruction to keep one current handoff per feature folder)

## deferred_for_later_batch

- `ResponsiveSheet` and `StudentSearchOverlay` were not part of the 030-D-02 failing set and were not
  touched; if a future audit finds a focus-return defect specific to Radix-based overlays, it would need
  separate root-cause analysis (Radix's mechanism is architecturally different from Mantine's) and a
  separate batch — nothing here should be assumed to cover them.
- No new adjacent issues were discovered during this batch's verification that need recording.

## open_questions_for_owner

- None blocking. Per the batch's hard stop: **Batch 1.3 (Reports mobile clipping interim fix) has not
  been started.** Awaiting owner review of this Batch 1.2 closure before any further Spec 032 work
  begins.
